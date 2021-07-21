const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema({
  filepath: String,
  manuscript: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript'
  },
  corpus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corpus'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true
});

const Audio = mongoose.model('Audio', audioSchema);

module.exports = Audio;
