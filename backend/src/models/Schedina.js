const mongoose = require('mongoose');

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
  giornataNumero: { type: Number, required: true },
  pronostici: [pronosticoSchema],
  quotaTotale: { type: Number, default: 1 },

  // Niente valuta e niente punteggio: la multipla è o tutta giusta o persa.
  esito: { type: String, enum: ['attesa', 'vinta', 'persa'], default: 'attesa' }
}, { timestamps: true });

// Una sola schedina per utente per giornata: rigiocarla è un update, non un insert.
schedinaSchema.index({ utente: 1, giornataNumero: 1 }, { unique: true });

module.exports = mongoose.model('Schedina', schedinaSchema);
