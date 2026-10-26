const mongoose = require('mongoose');
const { stagioneCorrente } = require('../utils/stagione');

// Due righe su uno scontro della giornata. Si lega alla COPPIA di squadre (casa,
// trasferta) e non all'id dello scontro: la redazione può risalvare il calendario
// senza che i commenti restino orfani. Stessa regola delle schedine: invertire casa
// e trasferta è un altro scontro.
const commentoSchema = new mongoose.Schema({
  squadraCasa: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  squadraTrasferta: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  testo: { type: String, required: true, trim: true, maxlength: 280 }
}, { _id: false });

// L'edizione è l'articolo mandato in stampa, una per giornata di ogni stagione.
// giornataNumero è un'etichetta (per il timbro/byline), non un riferimento a un
// documento Giornata.
//
// I premi del tabellino NON stanno qui: miglior e peggior punteggio si calcolano
// dai fantapunti della giornata e il Re dei Gufi dalle schedine vinte (vedi
// edizioniController). Salvarli sull'articolo voleva dire una copia che restava
// indietro appena si correggeva un punteggio.
//
// createdBy è l'autore vero (un utente); `direttore` è solo la firma stampata,
// libera, con pseudonimi ammessi.
const edizioneSchema = new mongoose.Schema({
  stagione: { type: String, required: true, trim: true, default: () => stagioneCorrente() },
  giornataNumero: { type: Number, required: true, min: 1 },
  direttore: { type: String, required: true, trim: true },
  occhiello: { type: String, required: true, trim: true },
  titolo: { type: String, required: true, trim: true },
  corpo: [{ type: String }],
  commenti: [commentoSchema],
  immagineUrl: { type: String, default: '' },
  didascalia: { type: String, default: '', trim: true, maxlength: 140 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Una sola edizione per giornata: la seconda stampa della G9 farebbe sparire dalla
// schermata i voti dati alla prima.
edizioneSchema.index({ stagione: 1, giornataNumero: 1 }, { unique: true });

module.exports = mongoose.model('Edizione', edizioneSchema);
