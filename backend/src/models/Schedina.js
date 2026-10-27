const mongoose = require('mongoose');
const { stagioneCorrente } = require('../utils/stagione');

// Un pronostico per ogni scontro della giornata. La quota viene congelata al
// momento del salvataggio: la classifica cambia, ma "cosa avevi previsto e a
// quanto lo davi" deve restare leggibile anche a giornata finita.
const pronosticoSchema = new mongoose.Schema({
  accoppiamento: { type: mongoose.Schema.Types.ObjectId, required: true },
  squadraCasa: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  squadraTrasferta: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  esito: { type: String, enum: ['1', 'X', '2'], required: true },
  quota: { type: Number, required: true }
}, { _id: false });

const schedinaSchema = new mongoose.Schema({
  utente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  stagione: { type: String, required: true, trim: true, default: () => stagioneCorrente() },
  giornataNumero: { type: Number, required: true },
  pronostici: [pronosticoSchema],
  quotaTotale: { type: Number, default: 1 },

  // Niente valuta e niente punteggio: la multipla è o tutta giusta o persa.
  esito: { type: String, enum: ['attesa', 'vinta', 'persa'], default: 'attesa' },

  // Quando il giocatore ha toccato "Scopri se hai gufato bene". Sta sul server e
  // non nel browser perché la rivelazione è sua e vale su ogni dispositivo.
  rivelataIl: { type: Date }
}, { timestamps: true });

// Una sola schedina per utente per giornata di una stagione, e una volta consegnata
// non si tocca più: il secondo insert viene respinto da questo indice.
schedinaSchema.index({ utente: 1, stagione: 1, giornataNumero: 1 }, { unique: true });
schedinaSchema.index({ stagione: 1, giornataNumero: 1, esito: 1 });

module.exports = mongoose.model('Schedina', schedinaSchema);
