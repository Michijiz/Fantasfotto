const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Squadra = require('../models/Squadra');

function firmaToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, ruolo: user.ruolo, squadra: user.squadra },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

function pubblico(user) {
  return {
    id: user._id,
    username: user.username,
    nomeVisualizzato: user.nomeVisualizzato,
    ruolo: user.ruolo,
    avatar: user.avatar,
    squadra: user.squadra
  };
}

const registrati = async (req, res) => {
  const { username, nomeVisualizzato, pin, squadraId, codiceInvito } = req.body;

  if (!username || !nomeVisualizzato || !pin || !squadraId || !codiceInvito) {
    return res.status(400).json({ errore: 'Compila tutti i campi' });
  }
  if (codiceInvito !== process.env.CODICE_INVITO) {
    return res.status(403).json({ errore: 'Codice invito non valido' });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ errore: 'Il PIN deve avere 4-6 cifre' });
  }

  const squadra = await Squadra.findById(squadraId);
  if (!squadra) {
    return res.status(400).json({ errore: 'Squadra non valida' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const user = await User.create({
    username: username.toLowerCase().trim(),
    nomeVisualizzato: nomeVisualizzato.trim(),
    pinHash,
    squadra: squadra._id
  });

  const token = firmaToken(user);
  res.status(201).json({ token, utente: pubblico(user) });
};

const login = async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ errore: 'Username e PIN richiesti' });
  }

  const user = await User.findOne({ username: username.toLowerCase().trim(), attivo: true });
  if (!user) {
    return res.status(401).json({ errore: 'Credenziali non valide' });
  }

  const valido = await bcrypt.compare(pin, user.pinHash);
  if (!valido) {
    return res.status(401).json({ errore: 'Credenziali non valide' });
  }

  const token = firmaToken(user);
  res.json({ token, utente: pubblico(user) });
};

const me = async (req, res) => {
  const user = await User.findById(req.utente.id).populate('squadra', 'nome stemma');
  if (!user) return res.status(404).json({ errore: 'Utente non trovato' });
  res.json({ utente: pubblico(user) });
};

module.exports = { registrati, login, me };
