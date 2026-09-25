const mongoose = require('mongoose');

// Una foto dell'album della squadra. Il file vive su Cloudinary: qui c'è solo
// l'indirizzo, chi l'ha caricata e una didascalia facoltativa.
const fotoSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  didascalia: { type: String, default: '', trim: true, maxlength: 100 },
  autore: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creataIl: { type: Date, default: Date.now }
});

const squadraSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true, trim: true },
  // URL dell'immagine caricata dall'allenatore. Nei record più vecchi qui può
  // esserci un'emoji: il frontend (components/ui/Stemma.jsx) accetta come immagine
  // solo ciò che è davvero un indirizzo e per il resto ripiega sul logo di lega.
  stemma: { type: String, default: '' },
  maglia: { type: String, default: '' }, // url immagine maglia (vuoto = maglia di redazione)
  foto: { type: String, default: '' },   // url della foto di copertina
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
  },

  // --- Personalizzazione della pagina squadra --------------------------------
  // Tutto facoltativo, con valori di default che riproducono la pagina di prima:
  // le squadre già esistenti non cambiano aspetto finché qualcuno non le tocca.
  occhiello: { type: String, default: '', trim: true, maxlength: 40 },
  slogan: { type: String, default: '', trim: true, maxlength: 120 },
  // Colori sociali della squadra (esadecimali). Vuoto = fascia d'inchiostro.
  colori: [{ type: String, trim: true, lowercase: true }],
  pagina: {
    stileTitolo: { type: String, enum: ['pieno', 'contorno'], default: 'pieno' },
    // Ritagli spenti e ordine dei ritagli. Si salvano solo gli id: un ritaglio
    // aggiunto in futuro compare a tutti in coda, senza migrare nulla.
    nascosti: [{ type: String, trim: true, lowercase: true }],
    ordine: [{ type: String, trim: true, lowercase: true }]
  },
  album: [fotoSchema]
}, { timestamps: true });

module.exports = mongoose.model('Squadra', squadraSchema);
