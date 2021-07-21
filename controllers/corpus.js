const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const mkdirp = require('mkdirp');
const csv = require('csv-writer');
const appRoot = require('app-root-path');

const Corpus = require('../models/Corpus');
const Manuscript = require('../models/Manuscript');
const Audio = require('../models/Audio');

/**
 * GET /corpus/list
 * list corpuses the user created.
 */
exports.getList = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }
  Corpus
    .find({
      createdBy: req.user._id
    })
    .populate('createdBy')
    .then((corpus) => {
      res.render('corpus/list', {
        title: req.__('List of corpuses'),
        published_corpus: corpus
      });
    });
};

/**
 * GET /corpus/view/:corpusid
 * detailed information of the specific corpus.
 */
exports.getView = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }

  Corpus
    .findById(req.params.corpusid)
    .populate('createdBy')
    .populate('recordedBy')
    .populate('manuscripts')
    .then((corpus) => {
      if (corpus === null) {
        req.flash('errors', {
          msg: req.__('The corpus does not exist.')
        });
        return res.redirect('/webrec');
      }
      const promises = [];
      for (let i = 0; i < corpus.manuscripts.length; i++) {
        promises.push(Audio
          .find({
            manuscript: corpus.manuscripts[i]._id
          })
          .then((audio) => {
            corpus.manuscripts[i].num_of_recorded = audio === undefined ? 0 : audio.length;
          }));
      }
      // speaker_numberごとに録音すべき原稿の総数が異なりうるので，近いうちに対応せねばなるまい．
      for (let i = 0; i < corpus.recordedBy.length; i++) {
        const user = corpus.recordedBy[i];
        promises.push(Audio
          .find({
            recordedBy: user._id,
            corpus: corpus._id
          })
          .then((audio) => {
            corpus.recordedBy[i].num_of_record = audio === undefined ? 0 : audio.length;
          }));
      }
      Promise
        .all(promises)
        .then(() => {
          res.render('corpus/view', {
            title: corpus.name,
            corpusname: corpus.name,
            description: corpus.description,
            createdBy: corpus.createdBy,
            recordedBy: corpus.recordedBy,
            manuscripts: corpus.manuscripts,
            corpusid: req.params.corpusid
          });
        });
    });
};

/**
 * GET /corpus/edit
 * corpus create or edit page.
 */
exports.getEdit = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }
  res.render('corpus/edit', {
    title: req.__('Create a new corpus'),
  });
};

/**
 * POST /corpus/edit
 * register or edit a specific corpus.
 */
exports.postEdit = (req, res, next) => {
  req.assert('corpusname', 'Corpusname cannot be blank').notEmpty();
  req.assert('description', 'Description cannot be blank').notEmpty();
  req.assert('manuscript', 'Manuscript cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/webrec/corpus/edit');
  }

  const createCorpus = () =>
    Corpus
    .findOne({
      name: req.body.corpusname,
      createdBy: req.user._id,
    })
    .then((existingCorpus) => {
      if (existingCorpus) {
        req.flash('errors', {
          msg: req.__('Corpus with that name already exists.')
        });
        throw res.redirect('/corpus/edit');
      }
      const corpus = new Corpus({
        name: req.body.corpusname,
        description: req.body.description,
        createdBy: req.user._id,
      });
      return corpus.save();
    });

  const addScript = corpus => new Promise((resolve, reject) => {
    let lines = req.body.manuscript.split(/\r\n|\r|\n/g);
    lines = lines.filter(ele => ele !== '');
    const numOfManuscript = [];
    let numOfSpeaker = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].split(',');
      const speakerNumber = line[6];
      if (numOfManuscript[speakerNumber]) {
        numOfManuscript[speakerNumber] += 1;
      } else {
        numOfManuscript[speakerNumber] = 1;
      }
      if (numOfSpeaker < speakerNumber) {
        numOfSpeaker = speakerNumber;
      }
      const manuscript = new Manuscript({
        first_dir: line[0],
        second_dir: line[1],
        third_dir: line[2],
        audioname: line[3],
        content: line[4],
        intonation: line[5],
        speaker_number: speakerNumber,
        manuscript_number: numOfManuscript[speakerNumber],
        corpus: corpus._id,
      });
      manuscript.save()
        .catch((err) => {
          if (err) {
            reject(err);
          }
        });
      corpus.manuscripts.push(manuscript);
    }
    corpus.num_of_manuscript = numOfManuscript.reduce((total, data) => total + data);
    corpus.num_of_speaker = numOfSpeaker;
    corpus.next_speaker_number = 1;
    corpus.save()
      .then(resolve(corpus.name))
      .catch((err) => {
        if (err) {
          reject(err);
        }
      });
  });

  createCorpus()
    .then(addScript)
    .then((name) => {
      if (!res.finished) {
        req.flash('success', {
          msg: req.__('The corpus {{name}} created.', {
            name
          })
        });
        res.redirect('/webrec');
      }
    })
    .catch(err => next(err));
};

/**
 * GET /corpus/delete/:corpusid
 * only the author can delete a corpus.
 */
exports.getDelete= (req, res) => {
    if (!req.user) {
        return res.redirect('/webrec');
    }
    // 消去すべきは4つ
    // データベース上のデータとして，コーパス，コーパスに属するaudio，manuscript
    // サーバー上のデータとして，録音されたwavファイル．

    // コーパスを削除する権限があるか確認
    Corpus
        .findOne({
            _id: req.params.corpusid,
            createdBy: req.user._id,
        })
        .then((corpus) => {
            if (!corpus) {
                req.flash('errors', {
                    msg: req.__('The corpus does not exist. Otherwise, you are not the owner of the corpus.')
                });
                return res.redirect('/webrec');
            }
            else {
                // コーパスに関連するaudioの実体(wavファイル)をサーバーから削除
                corpusDir = appRoot + `/uploads/${req.params.corpusid}`;
                console.log(corpusDir);
                fs.rmdirSync(corpusDir, { recursive: true });

                // コーパスに関連するaudioをmongodbから削除
                Audio
                    .deleteMany({
                        corpus: req.params.corpusid
                    }, (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });

                // コーパスに関連するmanuscriptをmongodbから削除
                Manuscript
                    .deleteMany({
                        corpus: req.params.corpusid
                    }, (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                // コーパスをmongodbから削除
                Corpus
                    .deleteOne({
                        _id: req.params.corpusid,
                        createdBy: req.user._id,
                    }, (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });

                req.flash('success', {
                    msg: req.__('The corpus {{name}} was deleted.', {
                        name: corpus.name
                    })
                });
                return res.redirect('/webrec');
            }
        });
};

/**
 * GET /corpus/download/:corpusid
 * only the author can download a corpus.
 */
exports.getDownload = (req, res) => {
  if (!req.user) {
    return res.redirect('/webrec');
  }
  Corpus
    .findOne({
      _id: req.params.corpusid,
      createdBy: req.user._id,
    })
    .populate('recordedBy')
    .then((corpus) => {
      if (!corpus) {
        req.flash('errors', {
          msg: req.__('The corpus does not exist. Otherwise, you are not the owner of the corpus.')
        });
        return res.redirect('/webrec');
      }

      const projectRoot = process.cwd();

      const csvDest = path.join(projectRoot, `uploads//${req.params.corpusid}/speakers.csv`);
      console.log(csvDest);
      const createCsvWriter = csv.createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: csvDest,
        header: [{
            id: 'name',
            title: 'name'
          },
          {
            id: 'gender',
            title: 'gender'
          },
          {
            id: 'birthplace',
            title: 'birthplace'
          },
          {
            id: 'residence',
            title: 'residence'
          },
          {
            id: 'profession',
            title: 'profession'
          },
          {
            id: 'birthyear',
            title: 'birthyear'
          },
          {
            id: 'proficiency',
            title: 'proficiency'
          }
        ]
      });

      // const records = [
      //   { name: 'Bob', lang: 'French, English' },
      //   { name: 'Mary', lang: 'English' }
      // ];
      const records = [];
      for (let i = 0; i < corpus.recordedBy.length; i++) {
        const {
          profile
        } = corpus.recordedBy[i];
        const row = {
          name: profile.name,
          gender: profile.gender,
          birthplace: profile.birthplace,
          residence: profile.residence,
          profession: profile.profession,
          birthyear: profile.birthyear,
          proficiency: profile.proficiency
        };
        records.push(row);
      }
      csvWriter.writeRecords(records) // returns a promise
        .then(() => {
          console.log('...Done');
        });

      // const promises = [];
      // promises.push()
      // create a file to stream archive data to.
      const outputDest = path.join(projectRoot, `uploads/tmp/${req.user.profile.name}/`);
      console.log(outputDest);
      const made = mkdirp.sync(outputDest);
      console.log(`made directories, starting with ${made}`);

      const outputZip = path.join(outputDest, `${corpus.name}.zip`);
      const output = fs.createWriteStream(outputZip);
      const archive = archiver('zip', {
        zlib: {
          level: 9
        } // Sets the compression level.
      });
      // listen for all archive data to be written
      // 'close' event is fired only when a file descriptor is involved
      output.on('close', () => {
        console.log(`${archive.pointer()} total bytes`);
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.download(outputZip);
      });
      // This event is fired when the data source is drained no matter what was the data source.
      // It is not part of this library but rather from the NodeJS Stream API.
      // @see: https://nodejs.org/api/stream.html#stream_event_end
      output.on('end', () => {
        console.log('Data has been drained');
      });
      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          // log warning
        } else {
          // throw error
          throw err;
        }
      });
      // good practice to catch this error explicitly
      archive.on('error', (err) => {
        throw err;
      });
      // pipe archive data to the file
      archive.pipe(output);
      // append files from a sub-directory and naming it `new-subdir` within the archive

      const inputDest = path.join(projectRoot, `uploads/${req.params.corpusid}/`);
      console.log(outputZip);
      archive.directory(inputDest, corpus.name);
      // finalize the archive (ie we are done appending files but streams have to finish yet)
      // 'close', 'end' or 'finish' may be fired right after calling this method
      // so register to them beforehand
      archive.finalize();

      console.log('download');
      // res.redirect('back');
    });
};

/**
 * GET /corpus/
 * corpus create or edit page.
 */
// exports.getEdit = (req, res) => {
//   if (!req.user) {
//     return res.redirect('/webrec');
//   }
//   res.render('corpus/edit', {
//     title: req.__('Create a new corpus'),
//   });
// };

/**
 * POST /corpus/edit
 * register or edit a specific corpus.
 */
// exports.postEdit = (req, res, next) => {
//   req.assert('corpusname', 'Corpusname cannot be blank').notEmpty();
//   req.assert('description', 'Description cannot be blank').notEmpty();
//   req.assert('manuscript', 'Manuscript cannot be blank').notEmpty();

//   const errors = req.validationErrors();

//   if (errors) {
//     req.flash('errors', errors);
//     return res.redirect('/corpus/edit');
//   }

//   const createCorpus = () =>
//     Corpus
//       .findOne({
//         name: req.body.corpusname,
//         createdBy: req.user._id,
//       })
//       .then((existingCorpus) => {
//         if (existingCorpus) {
//           req.flash('errors', { msg: req.__('Corpus with that name already exists.') });
//           throw res.redirect('/corpus/edit');
//         }
//         const corpus = new Corpus({
//           name: req.body.corpusname,
//           description: req.body.description,
//           createdBy: req.user._id,
//         });
//         return corpus.save();
//       });

//   const addScript = corpus => new Promise((resolve, reject) => {
//     let lines = req.body.manuscript.split(/\r\n|\r|\n/g);
//     lines = lines.filter(ele => ele !== '');
//     const numOfManuscript = [];
//     let numOfSpeaker = 0;
//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i].split(',');
//       const speakerNumber = line[6];
//       if (numOfManuscript[speakerNumber]) {
//         numOfManuscript[speakerNumber] += 1;
//       } else {
//         numOfManuscript[speakerNumber] = 1;
//       }
//       if (numOfSpeaker < speakerNumber) {
//         numOfSpeaker = speakerNumber;
//       }
//       const manuscript = new Manuscript({
//         first_dir: line[0],
//         second_dir: line[1],
//         third_dir: line[2],
//         audioname: line[3],
//         content: line[4],
//         intonation: line[5],
//         speaker_number: speakerNumber,
//         manuscript_number: numOfManuscript[speakerNumber],
//         corpus: corpus._id,
//       });
//       manuscript.save()
//         .catch((err) => { if (err) { reject(err); } });
//       corpus.manuscripts.push(manuscript);
//     }
//     corpus.num_of_manuscript = numOfManuscript.reduce((total, data) => total + data);
//     corpus.num_of_speaker = numOfSpeaker;
//     corpus.next_speaker_number = 1;
//     corpus.save()
//       .then(resolve(corpus.name))
//       .catch((err) => { if (err) { reject(err); } });
//   });

//   createCorpus()
//     .then(addScript)
//     .then((name) => {
//       if (!res.finished) {
//         req.flash('success', { msg: req.__('The corpus {{name}} created.', { name }) });
//         res.redirect('/webrec');
//       }
//     })
//     .catch(err => next(err));
// };
