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
  rosa: [{ type: String }],              // elenco calciatori senza ruolo (vecchio formato)
  // Anno di fondazione, facoltativo: compare nella fascia dell'interno squadra.
  fondataNel: { type: Number, min: 1800, max: 2100 },
  // La rosa divisa per ruolo. I nomi rimasti in `rosa` sono quelli inseriti prima
  // che esistessero i ruoli: l'app li mostra come "Senza ruolo" finché qualcuno
  // non li sposta qui.
  rosaRuoli: {
    P: [{ type: String }],
    D: [{ type: String }],
    C: [{ type: String }],
    A: [{ type: String }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Squadra', squadraSchema);
