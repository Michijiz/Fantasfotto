const mongoose = require('mongoose');

// L'edizione è l'articolo mandato in stampa. giornataNumero è un'etichetta (per il
// timbro/byline), non necessariamente un riferimento a un documento Giornata.
const edizioneSchema = new mongoose.Schema({
  giornataNumero: { type: Number, required: true },
  direttore: { type: String, required: true },
  occhiello: { type: String, required: true },
  titolo: { type: String, required: true },
  corpo: [{ type: String }],
  immagineUrl: { type: String, default: '' },
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
