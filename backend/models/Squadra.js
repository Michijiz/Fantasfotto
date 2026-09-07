const mongoose = require('mongoose');

const squadraSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true, trim: true },
  stemma: { type: String, default: '' },  // emoji o url immagine
  maglia: { type: String, default: '' },  // url immagine maglia
  foto: { type: String, default: '' },    // url foto squadra
  bio: { type: String, default: '' },     // storia/racconto della squadra
  rosa: [{ type: String }]                // elenco calciatori
}, { timestamps: true });

module.exports = mongoose.model('Squadra', squadraSchema);
