const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  nomeVisualizzato: { type: String, required: true, trim: true },
  pinHash: { type: String, required: true },
  ruolo: { type: String, enum: ['admin', 'giocatore'], default: 'giocatore' },
  avatar: { type: String, default: '' }, // emoji o iniziali
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  attivo: { type: Boolean, default: true },

  // Protezione del PIN (4-6 cifre, quindi indovinabile a forza di tentativi):
  // dopo troppi PIN sbagliati l'accesso si blocca per qualche minuto.
  tentativiFalliti: { type: Number, default: 0 },
  bloccatoFino: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
