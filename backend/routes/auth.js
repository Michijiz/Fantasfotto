const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Squadra = require('../models/Squadra');

const router = express.Router();

function firmaToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, ruolo: user.ruolo, nomeVisualizzato: user.nomeVisualizzato, squadra: user.squadra },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

// Registrazione: serve un codice invito della lega per evitare iscrizioni random
router.post('/registrati', async (req, res) => {
  try {
    const { username, nomeVisualizzato, pin, codiceInvito, avatar, squadraId } = req.body;

    if (!username || !nomeVisualizzato || !pin) {
      return res.status(400).json({ errore: 'Username, nome e PIN sono obbligatori' });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ errore: 'Il PIN deve avere tra 4 e 6 cifre' });
    }
    if (codiceInvito !== process.env.LEGA_INVITE_CODE) {
      return res.status(403).json({ errore: 'Codice invito della lega non valido' });
    }
    if (!squadraId) {
      return res.status(400).json({ errore: 'Devi selezionare una squadra' });
    }

    const squadra = await Squadra.findById(squadraId);
    if (!squadra) return res.status(400).json({ errore: 'Squadra non valida' });

    const esistente = await User.findOne({ username: username.toLowerCase().trim() });
    if (esistente) return res.status(409).json({ errore: 'Username già in uso' });

    const pinHash = await bcrypt.hash(pin, 10);
    const isFirstUser = (await User.countDocuments()) === 0;

    const user = await User.create({
      username: username.toLowerCase().trim(),
      nomeVisualizzato: nomeVisualizzato.trim(),
      pinHash,
      avatar: avatar || '',
      squadra: squadraId,
      ruolo: isFirstUser ? 'admin' : 'giocatore' // il primo iscritto diventa direttore/admin
    });

    const token = firmaToken(user);
    res.status(201).json({
      token,
      utente: { id: user._id, username: user.username, nomeVisualizzato: user.nomeVisualizzato, ruolo: user.ruolo, avatar: user.avatar, squadra: user.squadra }
    });
  } catch (e) {
    res.status(500).json({ errore: 'Errore durante la registrazione' });
  }
});

// Login: username + PIN
router.post('/login', async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) return res.status(400).json({ errore: 'Username e PIN obbligatori' });

    const user = await User.findOne({ username: username.toLowerCase().trim(), attivo: true });
    if (!user) return res.status(401).json({ errore: 'Credenziali non valide' });

    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) return res.status(401).json({ errore: 'Credenziali non valide' });

    const token = firmaToken(user);
    res.json({
      token,
      utente: { id: user._id, username: user.username, nomeVisualizzato: user.nomeVisualizzato, ruolo: user.ruolo, avatar: user.avatar, squadra: user.squadra }
    });
  } catch (e) {
    res.status(500).json({ errore: 'Errore durante il login' });
  }
});

// Lista giocatori della lega (per popolare i bottoni di voto)
router.get('/giocatori', async (req, res) => {
  const utenti = await User.find({ attivo: true }).select('nomeVisualizzato avatar ruolo username squadra');
  res.json(utenti);
});

module.exports = router;
