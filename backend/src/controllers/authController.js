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
    squadra: user.squadra,
    tema: user.tema || TEMA_DEFAULT
  };
}

// Lo slug del tema arriva dal frontend (id di una squadra di Serie A o
// 'palermo'): qui non si valida contro un elenco — sarebbe una seconda verità da
// tenere allineata a src/temi.js — ma si controlla che sia uno slug plausibile.
const TEMA_DEFAULT = 'palermo';
const temaValido = (v) => /^[a-z][a-z0-9-]{1,23}$/.test(v);

// I campi arrivano da JSON: un PIN numerico (1234 invece di "1234") farebbe
// esplodere bcrypt con un 500. Normalizziamo tutto a stringa.
const testo = (v) => (v == null ? '' : String(v).trim());

const registrati = async (req, res) => {
  const username = testo(req.body.username).toLowerCase();
  const nomeVisualizzato = testo(req.body.nomeVisualizzato);
  const pin = testo(req.body.pin);
  const squadraId = testo(req.body.squadraId);
  const codiceInvito = testo(req.body.codiceInvito);
  const temaRichiesto = testo(req.body.tema).toLowerCase();

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
    squadra: squadra._id,
    tema: temaValido(temaRichiesto) ? temaRichiesto : TEMA_DEFAULT
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

// Il tema segue l'utente, non il dispositivo: cambiandolo dal telefono lo si
// ritrova anche aprendo l'app dal browser del computer.
const aggiornaTema = async (req, res) => {
  const tema = testo(req.body.tema).toLowerCase();
  if (!temaValido(tema)) {
    return res.status(400).json({ errore: 'Tema non valido' });
  }

  const user = await User.findByIdAndUpdate(
    req.utente.id,
    { $set: { tema } },
    { new: true }
  ).populate('squadra', 'nome stemma');

  if (!user) return res.status(404).json({ errore: 'Utente non trovato' });
  res.json({ utente: pubblico(user) });
};

module.exports = { registrati, login, me, aggiornaTema };
