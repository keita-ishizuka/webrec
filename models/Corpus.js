const mongoose = require('mongoose');

const corpusSchema = new mongoose.Schema({
  name: String,
  description: String,
  num_of_manuscript: Number,
  num_of_speaker: Number,
  next_speaker_number: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recordedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  manuscripts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript'
  }],
}, {
  timestamps: true
});

const Corpus = mongoose.model('Corpus', corpusSchema);

module.exports = Corpus;
