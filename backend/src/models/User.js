const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  nomeVisualizzato: { type: String, required: true, trim: true },
  pinHash: { type: String, required: true },
  ruolo: { type: String, enum: ['admin', 'giocatore'], default: 'giocatore' },
  avatar: { type: String, default: '' }, // emoji o iniziali
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  attivo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
