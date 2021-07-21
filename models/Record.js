const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  recordedBy: mongoose.Schema.Types.ObjectId,
  corpus: mongoose.Schema.Types.ObjectId,
  speaker_number: Number,
  //num_of_recorded: Number,
}, {
  timestamps: true
});

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;
