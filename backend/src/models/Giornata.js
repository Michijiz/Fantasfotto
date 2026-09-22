const mongoose = require('mongoose');

const accoppiamentoSchema = new mongoose.Schema({
  squadraCasa: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  squadraTrasferta: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  punteggioCasa: { type: Number, default: null },
  punteggioTrasferta: { type: Number, default: null },

  // Le quote 1/X/2 appartengono allo SCONTRO, non alla schedina. Si fissano una
  // volta sola, quando la giornata apre il banco (schedineController.assicuraQuote),
  // e da lì non si toccano più: due schedine identiche sulla stessa giornata
  // devono valere uguale, chiunque le consegni e in qualunque momento.
  // Prima si ricalcolavano a ogni consegna sulla classifica di quell'istante, e
  // bastava che la redazione chiudesse la giornata precedente perché la stessa
  // identica multipla passasse da 9,67 a 4,62.
  quote: {
    casa: { type: Number },
    pareggio: { type: Number },
    trasferta: { type: Number }
  }
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

  // Quando il banco si è aperto, cioè quando le quote degli scontri sono state
  // fissate. Serve solo a raccontarlo: a decidere è la presenza delle quote.
  quoteFissateIl: { type: Date },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Giornata', giornataSchema);