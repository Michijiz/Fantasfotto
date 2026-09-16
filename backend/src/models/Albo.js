const mongoose = require('mongoose');

// Una riga dell'albo d'oro: chi ha vinto la lega in una stagione. Inserito a mano
// dall'admin (non c'è un concetto di "stagione" altrove nel modello dati: qui è
// solo un'etichetta libera, es. "2023/2024").
const alboSchema = new mongoose.Schema({
  stagione: { type: String, required: true, trim: true },
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  punti: { type: Number },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Albo', alboSchema);
