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
const alboRoutes = require('./routes/albo');
const legaRoutes = require('./routes/lega');
const utentiRoutes = require('./routes/utenti');
const attivitaRoutes = require('./routes/attivita');
const pushRoutes = require('./routes/push');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Non richiede il DB: utile per i probe di uptime e per verificare che il processo
// sia in piedi anche se Mongo è irraggiungibile.
app.get('/api/health', (req, res) => res.json({ ok: true }));

// L'upload delle immagini sta PRIMA della connessione al DB: il token si verifica
// da solo (JWT) e il file va dritto a Cloudinary, il database non serve. Prima
// ogni caricamento a freddo aspettava anche la connessione a Mongo e la migrazione
// d'avvio, e sulle funzioni Vercel a tempo limitato una foto da qualche MB poteva
// sforare: l'errore si vedeva solo "qualche volta", cioè a ogni partenza a freddo.
app.use('/api/upload', uploadRoutes);

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
app.use('/api/albo', alboRoutes);
app.use('/api/lega', legaRoutes);
app.use('/api/utenti', utentiRoutes);
app.use('/api/attivita', attivitaRoutes);
app.use('/api/push', pushRoutes);

app.use((req, res) => res.status(404).json({ errore: 'Rotta non trovata' }));
app.use(errorHandler);

module.exports = app;
