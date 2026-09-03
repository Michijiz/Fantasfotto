require('dotenv').config();
const mongoose = require('mongoose');
const Squadra = require('../models/Squadra');

// Modifica questo elenco con i nomi reali delle squadre della tua lega
const SQUADRE = [
  'I Draghi di Fuffa',
  'Real Divano FC',
  "Panchina d'Oro",
  // ...aggiungi tutte le squadre della lega
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const nome of SQUADRE) {
    await Squadra.findOneAndUpdate({ nome }, { nome }, { upsert: true });
  }
  console.log(`Seed completato: ${SQUADRE.length} squadre`);
  process.exit(0);
})();
