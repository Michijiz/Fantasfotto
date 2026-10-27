const mongoose = require('mongoose');

// Il diario della lega: chi ha giocato la schedina e chi ha emesso i verdetti
// ("Caio ha giocato la schedina della G5"). Alimenta il banner in Home e la
// pagina Allenatori.
//
// Solo queste due azioni: sono quelle che interessano agli altri e che accadono
// una volta a giornata. Temi, profili, stemmi, foto e iscrizioni non vengono
// registrati (ogni ritocco sarebbe una scrittura e una riga in più da leggere
// ogni minuto per nulla). Per aggiungere un tipo basta metterlo qui e chiamare
// registra() dove succede, più la sua frase in frontend/src/utils/attivita.js.
//
// Si scrive solo da services/attivita.js, che accorpa le azioni ripetute.
const TIPI = ['schedina', 'voti'];

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
