const mongoose = require('mongoose');

const accoppiamentoSchema = new mongoose.Schema({
  squadraCasa: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  squadraTrasferta: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  punteggioCasa: { type: Number, default: null },
  punteggioTrasferta: { type: Number, default: null }
}, { _id: true });

// Punteggio per squadra non legato a un accoppiamento diretto: usato quando l'admin
// pubblica un'edizione senza calendario/scontri già importato. Le due fonti
// (accoppiamenti e punteggi) si sommano in classifica.
const punteggioSquadraSchema = new mongoose.Schema({
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  punti: { type: Number, required: true }
}, { _id: false });

const giornataSchema = new mongoose.Schema({
  numero: { type: Number, required: true, unique: true },
  serieANumero: { type: Number }, // giornata corrispondente del campionato reale
  data: { type: Date },
  accoppiamenti: [accoppiamentoSchema],
  punteggi: [punteggioSquadraSchema],

  // true quando tutti i punteggi sono definitivi e la giornata può alimentare Edizione/Voto
  conclusa: { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Giornata', giornataSchema);
