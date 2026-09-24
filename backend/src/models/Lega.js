const mongoose = require('mongoose');

// Impostazioni della lega: un solo documento. Per ora solo il nome, che
// l'amministratore sceglie dal Profilo; finché è vuoto i testi dicono "la Lega".
const legaSchema = new mongoose.Schema({
  chiave: { type: String, default: 'lega', unique: true },
  nome: { type: String, default: '', trim: true, maxlength: 40 }
}, { timestamps: true });

module.exports = mongoose.model('Lega', legaSchema);
