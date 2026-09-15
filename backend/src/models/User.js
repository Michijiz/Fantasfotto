const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  nomeVisualizzato: { type: String, required: true, trim: true },
  pinHash: { type: String, required: true },
  ruolo: { type: String, enum: ['admin', 'giocatore'], default: 'giocatore' },
  avatar: { type: String, default: '' }, // emoji o iniziali
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },

  // Tema colore dell'app: l'id di una squadra di Serie A (o 'palermo', il tema
  // storico della Gazzetta). L'elenco vero vive nel frontend (src/temi.js): qui
  // si salva solo lo slug scelto, così aggiungere una squadra non tocca il DB.
  tema: { type: String, default: 'palermo', trim: true, lowercase: true },
  attivo: { type: Boolean, default: true },

  // Protezione del PIN (4-6 cifre, quindi indovinabile a forza di tentativi):
  // dopo troppi PIN sbagliati l'accesso si blocca per qualche minuto.
  tentativiFalliti: { type: Number, default: 0 },
  bloccatoFino: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
