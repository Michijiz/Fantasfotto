// Popola le 8 squadre di base della lega, se non esistono già. Esegui con:
//   npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const Squadra = require('../models/Squadra');

const SQUADRE_BASE = [
 
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const nome of SQUADRE_BASE) {
    await Squadra.findOneAndUpdate(
      { nome },
      { nome },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`[seed] ${SQUADRE_BASE.length} squadre pronte.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
