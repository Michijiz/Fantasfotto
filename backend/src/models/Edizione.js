const mongoose = require('mongoose');
const { stagioneCorrente } = require('../utils/stagione');

// Due righe su uno scontro della giornata. Si lega alla COPPIA di squadre (casa,
// trasferta) e non all'id dello scontro: la redazione può risalvare il calendario
// senza che i commenti restino orfani. Stessa regola delle schedine: invertire casa
// e trasferta è un altro scontro.
const commentoSchema = new mongoose.Schema({
  squadraCasa: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  squadraTrasferta: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  testo: { type: String, required: true, trim: true, maxlength: 280 },
  // true = la riga l'ha scritta il generatore e nessuno l'ha toccata: "Aggiorna
  // dai dati" può rigenerarla. Una riga scritta o ritoccata a mano resta com'è.
  auto: { type: Boolean, default: false }
}, { _id: false });

// La pagella di una squadra nella giornata: voto in mezzi punti e una battuta.
// Il voto nasce dai fantapunti (scala fissa, vedi frontend/src/utils/spunti.js) ma
// si salva come testo definitivo: ricalcolare un punteggio dopo la stampa non deve
// cambiare retroattivamente quello che i lettori hanno già letto.
const pagellaSchema = new mongoose.Schema({
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  voto: { type: Number, required: true, min: 0, max: 10 },
  battuta: { type: String, default: '', trim: true, maxlength: 140 },
  auto: { type: Boolean, default: false }
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
  pagelle: [pagellaSchema],
  immagineUrl: { type: String, default: '' },
  didascalia: { type: String, default: '', trim: true, maxlength: 140 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Una sola edizione per giornata: la seconda stampa della G9 farebbe sparire dalla
// schermata i voti dati alla prima.
edizioneSchema.index({ stagione: 1, giornataNumero: 1 }, { unique: true });

module.exports = mongoose.model('Edizione', edizioneSchema);
