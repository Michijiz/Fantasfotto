const mongoose = require('mongoose');

const edizioneSchema = new mongoose.Schema({
  giornata: { type: mongoose.Schema.Types.ObjectId, ref: 'Giornata', required: true, unique: true },
  direttore: { type: String, required: true },
  occhiello: { type: String, required: true },
  titolo: { type: String, required: true },
  corpo: [{ type: String }],
  stats: {
    vincitore: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' },
    puntiVincitore: Number,
    ultimo: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' },
    puntiUltimo: Number,
    fenomeno: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' },
    bidone: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' }
  },
  votazioniChiuse: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Edizione', edizioneSchema);
