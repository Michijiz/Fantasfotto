const mongoose = require('mongoose');

// Il diario della lega: chi ha fatto cosa ("Tizio ha cambiato lo stemma",
// "Caio ha giocato la schedina"). Alimenta il banner in Home e la pagina Allenatori.
//
// Si scrive solo da services/attivita.js, che accorpa le azioni ripetute: dieci
// salvataggi di fila della stessa squadra sono una riga, non dieci.
const TIPI = ['iscrizione', 'profilo', 'tema', 'squadra', 'album', 'schedina', 'voti', 'edizione'];

const attivitaSchema = new mongoose.Schema({
  tipo: { type: String, enum: TIPI, required: true },
  autore: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' },
  // Dettagli per comporre la frase (campi cambiati, numero di giornata, titolo…).
  dati: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Cosa rende "la stessa azione" ai fini dell'accorpamento (es. la giornata).
  chiave: { type: String, default: '' },
  // Quando è successa l'ultima volta: si aggiorna quando si accorpa.
  quando: { type: Date, default: Date.now }
});

attivitaSchema.index({ quando: -1 });
attivitaSchema.index({ autore: 1, tipo: 1, chiave: 1, quando: -1 });
// Il diario non è un archivio: dopo 60 giorni le righe spariscono da sole.
attivitaSchema.index({ quando: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

module.exports = mongoose.model('Attivita', attivitaSchema);
module.exports.TIPI = TIPI;
