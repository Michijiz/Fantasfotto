const express = require('express');
const cors = require('cors');
const { connettiDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const squadreRoutes = require('./routes/squadre');
const giornateRoutes = require('./routes/giornate');
const edizioniRoutes = require('./routes/edizioni');
const votiRoutes = require('./routes/voti');
const schedineRoutes = require('./routes/schedine');
const uploadRoutes = require('./routes/upload');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Non richiede il DB: utile per i probe di uptime e per verificare che il processo
// sia in piedi anche se Mongo è irraggiungibile.
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Garantisce la connessione al DB prima di ogni altra richiesta (necessario su
// Vercel, dove ogni invocazione può ripartire da zero).
app.use(async (req, res, next) => {
  try {
    await connettiDB();
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ errore: 'Database non raggiungibile' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/squadre', squadreRoutes);
app.use('/api/giornate', giornateRoutes);
app.use('/api/edizioni', edizioniRoutes);
app.use('/api/voti', votiRoutes);
app.use('/api/schedine', schedineRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => res.status(404).json({ errore: 'Rotta non trovata' }));
app.use(errorHandler);

module.exports = app;
