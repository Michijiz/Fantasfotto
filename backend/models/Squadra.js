const mongoose = require('mongoose');

const squadraSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true, unique: true },
  stemma: { type: String, default: '' }, // emoji o url immagine
  coloreKit: { type: String, default: '' }, // es. '#c8102e', per badge/UI

  // Chi gestisce la squadra (il fantallenatore principale)
  proprietario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Eventuali co-gestori (es. squadre condivise tra amici)
  membri: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  attiva: { type: Boolean, default: true },

  // Storico sintetico per giornata, popolato quando si collega Squadra a Giornata/Edizione.
  // Tenuto volutamente libero per ora: lo strutturiamo meglio quando arriva il modello Giornata.
  storico: [{
    giornata: { type: mongoose.Schema.Types.ObjectId, ref: 'Giornata' },
    punti: Number,
    posizione: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Squadra', squadraSchema);
