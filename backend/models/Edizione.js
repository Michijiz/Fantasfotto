const mongoose = require('mongoose');

// L'edizione NON è più legata a un documento Giornata nel DB: è semplicemente un articolo
// mandato in stampa. giornataNumero è solo un'etichetta (per il timbro/byline), non un
// riferimento — l'admin la scrive a mano insieme a vincitore/ultimo/punti.
const edizioneSchema = new mongoose.Schema({
  giornataNumero: { type: Number, required: true },
  direttore: { type: String, required: true },
  occhiello: { type: String, required: true },
  titolo: { type: String, required: true },
  corpo: [{ type: String }],
  immagineUrl: { type: String, default: '' }, // foto grande dell'articolo (upload su Cloudinary)
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