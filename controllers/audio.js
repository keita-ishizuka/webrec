const Audio = require('../models/Audio');
const Corpus = require('../models/Corpus');
const Manuscript = require('../models/Manuscript');
const Record = require('../models/Record');

/**
 * GET /audio/list/
 * list all the corpuses.
 */
exports.getList = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }
  Corpus
    .find({})
    .populate('createdBy')
    .then((corpus) => {
      res.render('audio/list', {
        title: req.__('Choose a corpus to record'),
        published_corpus: corpus
      });
    });
};

/**
 * GET /audio/view/:corpusId
 */
exports.getView = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }

  const promises = [];
  promises.push(Corpus.findById(req.params.corpusId));
  promises.push(Manuscript
    .find({
      corpus: req.params.corpusId
    })
    .sort({
      manuscript_number: 1
    }));
  promises.push(Record
    .findOne({
      recordedBy: req.user._id,
      corpus: req.params.corpusId
    }));

  Promise
    .all(promises)
    .then((response) => {
      const corpus = response[0];
      let manuscripts = response[1];
      const record = response[2];
      if (record === null) {
        const record = new Record({
          recordedBy: req.user._id,
          corpus: req.params.corpusId,
          speaker_number: corpus.next_speaker_number,
        });
        record.save();
        manuscripts = manuscripts.filter(item => (item.speaker_number === corpus.next_speaker_number));
        corpus.next_speaker_number = (corpus.next_speaker_number % corpus.num_of_speaker) + 1;
        corpus.recordedBy.push(req.user);
        corpus.save();
      } else {
        manuscripts = manuscripts.filter(item => (item.speaker_number === record.speaker_number));
      }
      const promises = [];
      for (let i = 0; i < manuscripts.length; i++) {
        promises.push(Audio
          .findOne({
            manuscript: manuscripts[i]._id,
            recordedBy: req.user._id
          })
          .then((audio) => {
            manuscripts[i].audio = audio;
          }));
      }
      Promise
        .all(promises)
        .then(() => {
          res.render('audio/view', {
            title: corpus.name,
            manuscripts,
          });
        });
    });
};

/**
 * GET /audio/record/:manuscriptId
 */
exports.getRecord = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }
  // if (req.params.manuscriptId === 'start') {
  //   req.flash('errors', { msg: req.__('This is the first manuscript') });
  //   return res.redirect('back');
  // }
  // if (req.params.manuscriptId === 'end') {
  //   req.flash('errors', { msg: req.__('This is the end of manuscripts') });
  //   return res.redirect('back');
  // }

  const promises = [];

  promises.push(Audio.findOne({
    manuscript: req.params.manuscriptId,
    recordedBy: req.user._id
  }));
  promises.push(Manuscript
    .findById(req.params.manuscriptId)
    .populate('corpus'));

  Promise
    .all(promises)
    .then((response) => {
      const audio = response[0];
      console.log(audio);
      const manuscript = response[1];
      const second = Date.now();

      // contentの[]を<rb></rb>、()を<rt></rt>に置換し、それらを<ruby></ruby>で囲んでてルビを振る
      let rubied = manuscript.content.replace(/\[([^\]]*)\]/g, '<ruby><rb>$1</rb>');
      rubied = rubied.replace(/\(([^\)]*)\)/g, '<rt>$1</rt></ruby>');

      const promises = [];
      promises.push(Manuscript.findOne({
        speaker_number: manuscript.speaker_number,
        manuscript_number: manuscript.manuscript_number - 1,
        corpus: manuscript.corpus._id
      }));
      promises.push(Manuscript.findOne({
        speaker_number: manuscript.speaker_number,
        manuscript_number: manuscript.manuscript_number + 1,
        corpus: manuscript.corpus._id
      }));
      promises.push(Manuscript.find({
        speaker_number: manuscript.speaker_number,
        corpus: manuscript.corpus._id
      }));
      Promise
        .all(promises)
        .then((response) => {
          const prev = response[0];
          const next = response[1];
          const allManuscripts = response[2];
          let numOfRecord = 0;

          const promises = [];
          for (let i = 0; i < allManuscripts.length; i++) {
            promises.push(Audio
              .find({
                manuscript: allManuscripts[i]._id,
                recordedBy: req.user._id
              })
              // eslint-disable-next-line no-loop-func
              .then((audio) => {
                if (audio !== undefined && audio.length !== 0) {
                  numOfRecord += 1;
                }
              }));
          }
          Promise
            .all(promises)
            .then(() => {
              res.render('audio/record', {
                manuscriptid: manuscript._id,
                first_dir: manuscript.first_dir,
                second_dir: manuscript.second_dir,
                third_dir: manuscript.third_dir,
                audioname: manuscript.audioname,
                content: rubied,
                prev: response[0] === null ? 'start' : prev._id,
                next: response[1] === null ? 'end' : next._id,
                intonation: manuscript.intonation,
                title: manuscript.corpus.name,
                corpusid: manuscript.corpus._id,
                audiopath: audio === null ? '' : `${audio.filepath}?${second}`,
                // audiopath: '',
                num_of_manuscripts: allManuscripts.length,
                num_of_record: numOfRecord
              });
            });
        });
    });
};

/**
 * POST /audio/record
 */
exports.postRecord = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }
  console.log(req.body.audioIsValid);
  if (req.body.audioIsValid === 'true') {
    Audio
      .deleteOne({
        manuscript: req.body.manuscriptid,
        recordedBy: req.user._id,
      })
      .catch(err => next(err));

    Manuscript
      .findById(req.body.manuscriptid)
      .then((manuscript) => {
        // 同じ原稿に対する同じユーザーの音声は同一のファイル名で保存されるようにmulterで設定しているので，古い音声データは自動で削除される．
        const audio = new Audio({
          filepath: req.file.path,
          manuscript: req.body.manuscriptid,
          corpus: manuscript.corpus._id,
          recordedBy: req.user._id,
        });
        audio.save()
          .catch(err => next(err));
        //res.redirect('back');
      });
  }
  res.status(300).send({
    audiopath: req.file.path
  });
};

// Manuscript
//   .findById(req.body.manuscriptid)
//   //.populate('audio')
//   .then((manuscript) => {
//     console.log(manuscript.audio.length);
//     console.log(manuscript.audio[0]);
//     manuscript.audio.some((val, ind) => {
//       if (val.recordedBy === req.user._id) {
//         //console.log(ind);
//         manuscript.audio.splice(ind, 1);
//       }
//     });
//     const audio = new Audio({
//       filepath: req.file.path,
//       manuscript: manuscript._id,
//       recordedBy: req.user._id,
//     });
//     audio.save()
//       .catch(err => next(err));
//     manuscript.audio.push(audio);
//     manuscript.save()
//       .catch(err => next(err));
//   });
