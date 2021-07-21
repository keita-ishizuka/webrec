const Corpus = require('../models/Corpus');

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  if (req.user) {
    Corpus
      .find({
        recordedBy: req.user._id,
      })
      // .distinct('corpus')
      .populate('createdBy')
      .sort({
        createdAt: -1
      })
      .then((corpus) => {
        res.render('home', {
          title: req.__('home'),
          recent_corpus: corpus
        });
      });
  } else {
    res.render('index', {
      title: req.__('home')
    });
  }
};

exports.documentation = (req, res) => {
  res.render('documentation', {
    title: req.__('documentation')
  });
};

exports.setLocale = (req, res) => {
  res.cookie('i18nlocale', req.params.locale, {
    maxAge: 900000,
    httpOnly: true
  });
  return res.redirect('back');
};
