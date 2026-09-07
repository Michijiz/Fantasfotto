const mongoose = require('mongoose');

const accoppiamentoSchema = new mongoose.Schema({
  squadraCasa: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  squadraTrasferta: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  punteggioCasa: { type: Number, default: null },
  punteggioTrasferta: { type: Number, default: null }
}, { _id: true });

const giornataSchema = new mongoose.Schema({
  numero: { type: Number, required: true, unique: true },
  serieANumero: { type: Number }, // giornata corrispondente del campionato reale, utile per l'articolo
  data: { type: Date },
  accoppiamenti: [accoppiamentoSchema],

  // true quando tutti i punteggi sono definitivi e la giornata può alimentare Edizione/Voto
  conclusa: { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Giornata', giornataSchema);
