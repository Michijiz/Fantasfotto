const mongoose = require('mongoose');

const edizioneSchema = new mongoose.Schema({
  giornata: { type: Number, required: true },
  direttore: { type: String, required: true },
  occhiello: { type: String, required: true },
  titolo: { type: String, required: true },
  corpo: [{ type: String }],
  stats: {
    vincitore: String,
    puntiVincitore: String,
    ultimo: String,
    puntiUltimo: String,
    fenomeno: String,
    bidone: String
  },
  votazioniChiuse: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Edizione', edizioneSchema);
