const mongoose = require('mongoose');

// Le reazioni rapide sotto un'edizione. Una riga per (edizione, utente, emoji):
// toccare di nuovo la stessa emoji toglie la reazione.
const reazioneSchema = new mongoose.Schema({
  edizione: { type: mongoose.Schema.Types.ObjectId, ref: 'Edizione', required: true },
  utente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { timestamps: true });

reazioneSchema.index({ edizione: 1, utente: 1, emoji: 1 }, { unique: true });

module.exports = mongoose.model('Reazione', reazioneSchema);
