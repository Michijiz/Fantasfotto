const mongoose = require('mongoose');

// Cache della connessione per riuso tra invocazioni serverless (Vercel) e per non
// riconnettersi ad ogni richiesta in locale.
let connessa = false;

async function connettiDB() {
  if (connessa && mongoose.connection.readyState === 1) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI non impostata (vedi .env.example)');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  connessa = true;
  console.log('[db] Connesso a MongoDB');
}

module.exports = { connettiDB };
