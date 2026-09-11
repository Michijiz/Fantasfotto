const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Squadra = require('../models/Squadra');

// Dopo MAX_TENTATIVI PIN sbagliati consecutivi, login bloccato per BLOCCO_MINUTI.
// Con un PIN da 4 cifre ci sono solo 10.000 combinazioni: senza blocco si
// indovina in poco tempo.
const MAX_TENTATIVI = 5;
const BLOCCO_MINUTI = 15;

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

// I campi arrivano da JSON: un PIN numerico (1234 invece di "1234") farebbe
// esplodere bcrypt con un 500. Normalizziamo tutto a stringa.
const testo = (v) => (v == null ? '' : String(v).trim());

const registrati = async (req, res) => {
  const username = testo(req.body.username).toLowerCase();
  const nomeVisualizzato = testo(req.body.nomeVisualizzato);
  const pin = testo(req.body.pin);
  const squadraId = testo(req.body.squadraId);
  const codiceInvito = testo(req.body.codiceInvito);

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
    username,
    nomeVisualizzato,
    pinHash,
    squadra: squadra._id
  });

  const token = firmaToken(user);
  res.status(201).json({ token, utente: pubblico(user) });
};

const login = async (req, res) => {
  const username = testo(req.body.username).toLowerCase();
  const pin = testo(req.body.pin);
  if (!username || !pin) {
    return res.status(400).json({ errore: 'Username e PIN richiesti' });
  }

  const user = await User.findOne({ username, attivo: true });
  if (!user) {
    return res.status(401).json({ errore: 'Credenziali non valide' });
  }

  if (user.bloccatoFino && user.bloccatoFino > new Date()) {
    const minuti = Math.ceil((user.bloccatoFino.getTime() - Date.now()) / 60000);
    return res.status(429).json({ errore: `Troppi tentativi sbagliati: riprova tra ${minuti} min` });
  }

  const valido = await bcrypt.compare(pin, user.pinHash);
  if (!valido) {
    // $inc atomico: due tentativi in parallelo non si sovrascrivono il contatore.
    const aggiornato = await User.findByIdAndUpdate(
      user._id,
      { $inc: { tentativiFalliti: 1 } },
      { new: true }
    );
    if (aggiornato && aggiornato.tentativiFalliti >= MAX_TENTATIVI) {
      await User.updateOne(
        { _id: user._id },
        { $set: { tentativiFalliti: 0, bloccatoFino: new Date(Date.now() + BLOCCO_MINUTI * 60000) } }
      );
      return res.status(429).json({ errore: `Troppi tentativi sbagliati: riprova tra ${BLOCCO_MINUTI} min` });
    }
    return res.status(401).json({ errore: 'Credenziali non valide' });
  }

  if (user.tentativiFalliti || user.bloccatoFino) {
    await User.updateOne({ _id: user._id }, { $set: { tentativiFalliti: 0, bloccatoFino: null } });
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
