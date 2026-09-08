const mongoose = require('mongoose');

const votoSchema = new mongoose.Schema({
  edizione: { type: mongoose.Schema.Types.ObjectId, ref: 'Edizione', required: true },
  categoria: { type: String, required: true }, // es. 'culo', 'bidone', 'blessed', ...
  votante: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  votato: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true }
}, { timestamps: true });

// Un solo voto per utente, per categoria, per edizione. Cambiare voto = update, non insert.
votoSchema.index({ edizione: 1, categoria: 1, votante: 1 }, { unique: true });

module.exports = mongoose.model('Voto', votoSchema);
