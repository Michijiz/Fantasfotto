require('dotenv').config();
const mongoose = require('mongoose');
const Squadra = require('../models/Squadra');

// Squadre della lega
const SQUADRE = [
  'Noi United',
  'Bubbeo Fc',
  'ASs Gotiche-Gotiche',
  'Dunder Mifflin',
  'US TICCHIU',
  'Real Cumbia',
  'mieccioEannintra',
  'Chiavo Veronica FC',
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const nome of SQUADRE) {
    await Squadra.findOneAndUpdate({ nome }, { nome }, { upsert: true });
  }
  console.log(`Seed completato: ${SQUADRE.length} squadre`);
  process.exit(0);
})();
