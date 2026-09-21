const mongoose = require('mongoose');

const squadraSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true, trim: true },
  // URL dell'immagine caricata dall'allenatore. Nei record più vecchi qui può
  // esserci un'emoji: il frontend (components/ui/Stemma.jsx) accetta come immagine
  // solo ciò che è davvero un indirizzo e per il resto ripiega sul logo di lega.
  stemma: { type: String, default: '' },
  maglia: { type: String, default: '' }, // url immagine maglia
  foto: { type: String, default: '' },   // url foto squadra
  bio: { type: String, default: '' },    // storia/racconto della squadra
  rosa: [{ type: String }]               // elenco calciatori
}, { timestamps: true });

module.exports = mongoose.model('Squadra', squadraSchema);
