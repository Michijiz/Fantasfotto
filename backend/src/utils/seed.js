// Crea le squadre della lega, se non esistono già. È l'unico modo di aggiungerne
// una: dall'app non si creano più.
//
//   npm run seed -- "US Ticchiu" "Bubbeo FC" "Real Cumbia"
//
// Ripetibile senza danni: una squadra già presente viene lasciata com'è, con
// stemma, bio e rosa intatti.
require('dotenv').config();
const mongoose = require('mongoose');
const Squadra = require('../models/Squadra');

async function seed() {
  const nomi = process.argv.slice(2).map((n) => n.trim()).filter(Boolean);

  if (nomi.length === 0) {
    console.log('Uso: npm run seed -- "Nome Squadra" ["Altra Squadra" ...]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  for (const nome of nomi) {
    const gia = await Squadra.findOne({ nome });
    if (gia) {
      console.log(`[seed] "${nome}" esiste già, lasciata com'è.`);
      continue;
    }
    await Squadra.create({ nome });
    console.log(`[seed] "${nome}" creata.`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
