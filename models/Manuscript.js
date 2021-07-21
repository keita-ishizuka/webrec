const mongoose = require('mongoose');

const manuscriptSchema = new mongoose.Schema({
  first_dir: String,
  second_dir: String,
  third_dir: String,
  audioname: String,
  content: String,
  intonation: String,
  // next: mongoose.Schema.Types.ObjectId,
  // prev: mongoose.Schema.Types.ObjectId,
  speaker_number: Number,
  manuscript_number: Number,
  corpus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Corpus'
  },
}, {
  timestamps: true
});

const Manuscript = mongoose.model('Manuscript', manuscriptSchema);

module.exports = Manuscript;
