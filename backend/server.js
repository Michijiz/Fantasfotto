require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const edizioniRoutes = require('./routes/edizioni');
const votiRoutes = require('./routes/voti');
const squadreRoutes = require('./routes/squadre');
const giornateRoutes = require('./routes/giornate');

const app = express();
app.use(cors());
app.use(express.json());

// Cache della connessione per riuso tra invocazioni serverless (Vercel)
let connessa = false;
async function assicuraConnessione() {
  if (connessa) return;
  await mongoose.connect(process.env.MONGODB_URI);
  connessa = true;
  console.log('Connesso a MongoDB');
}

// Garantisce la connessione prima di ogni richiesta (sia in locale che su Vercel)
app.use(async (req, res, next) => {
  try {
    await assicuraConnessione();
    next();
  } catch (err) {
    res.status(500).json({ errore: 'Database non raggiungibile' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/edizioni', edizioniRoutes);
app.use('/api/voti', votiRoutes);
app.use('/api/squadre', squadreRoutes);
app.use('/api/giornate', giornateRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  // Esecuzione locale: ascolta su una porta
  app.listen(PORT, () => console.log(`Server in ascolto sulla porta ${PORT}`));
}

module.exports = app;
