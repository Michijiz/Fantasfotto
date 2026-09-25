const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registra } = require('../services/attivita');
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
    squadra: user.squadra,
    tema: user.tema || TEMA_DEFAULT,
    avatar: user.avatar || '',
    profilo: profiloPubblico(user.profilo)
  };
}

// Limiti dei testi del profilo: gli stessi del modello, ripetuti qui per tagliare
// invece di rifiutare (un motto di 170 caratteri si accorcia, non fa fallire il
// salvataggio di tutto il resto).
const LIMITI_PROFILO = { occhiello: 40, sottotitolo: 60, motto: 160, didascalia: 100 };
const STILI_TITOLO = ['pieno', 'contorno'];

function profiloPubblico(p = {}) {
  return {
    occhiello: p.occhiello || '',
    sottotitolo: p.sottotitolo || '',
    motto: p.motto || '',
    didascalia: p.didascalia || '',
    sfondo: p.sfondo || 'tema',
    stileTitolo: STILI_TITOLO.includes(p.stileTitolo) ? p.stileTitolo : 'pieno',
    nascosti: Array.isArray(p.nascosti) ? [...p.nascosti] : []
  };
}

// Lo slug del tema arriva dal frontend (id di una squadra di Serie A o
// 'palermo'): qui non si valida contro un elenco — sarebbe una seconda verità da
// tenere allineata a src/temi.js — ma si controlla che sia uno slug plausibile.
const TEMA_DEFAULT = 'palermo';
const temaValido = (v) => /^[a-z][a-z0-9-]{1,23}$/.test(v);
// Stessa logica per avatar, sfondo e ritagli: slug plausibili, l'elenco vero
// vive nel frontend.
const slugValido = temaValido;

// I campi arrivano da JSON: un PIN numerico (1234 invece di "1234") farebbe
// esplodere bcrypt con un 500. Normalizziamo tutto a stringa.
const testo = (v) => (v == null ? '' : String(v).trim());

// Ruoli chiedibili in fase di iscrizione. 'admin' non è nell'elenco apposta: si
// assegna a mano sul database, non lo si sceglie da un menù a tendina.
const RUOLI_ISCRIZIONE = ['giocatore', 'redattore'];

// Se CODICE_REDAZIONE è configurato, chi si iscrive come redattore deve saperlo:
// senza, "redattore" sarebbe una voce che chiunque può spuntare per riscrivere i
// punteggi altrui. Se la variabile non c'è, la scelta resta libera — in una lega
// di amici va benissimo e non blocca nessuno.
function verificaRuolo(ruoloRichiesto, codiceRedazione) {
  const ruolo = RUOLI_ISCRIZIONE.includes(ruoloRichiesto) ? ruoloRichiesto : 'giocatore';
  if (ruolo !== 'redattore') return { ruolo };

  const atteso = testo(process.env.CODICE_REDAZIONE);
  if (atteso && codiceRedazione !== atteso) {
    return { errore: 'Codice della redazione sbagliato: la direzione non si improvvisa' };
  }
  return { ruolo };
}

const registrati = async (req, res) => {
  const username = testo(req.body.username).toLowerCase();
  const nomeVisualizzato = testo(req.body.nomeVisualizzato);
  const pin = testo(req.body.pin);
  const squadraId = testo(req.body.squadraId);
  const codiceInvito = testo(req.body.codiceInvito);
  const temaRichiesto = testo(req.body.tema).toLowerCase();
  const ruoloRichiesto = testo(req.body.ruolo).toLowerCase();
  const codiceRedazione = testo(req.body.codiceRedazione);
  const avatarRichiesto = testo(req.body.avatar).toLowerCase();

  if (!username || !nomeVisualizzato || !pin || !squadraId || !codiceInvito) {
    return res.status(400).json({ errore: 'Manca qualcosa: anche in redazione si compila tutto' });
  }
  if (codiceInvito !== process.env.CODICE_INVITO) {
    return res.status(403).json({ errore: 'Codice invito sbagliato: chiedilo al direttore, gentilmente' });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ errore: 'Il PIN va da 4 a 6 cifre. Niente di più, niente di meno' });
  }

  const { ruolo, errore } = verificaRuolo(ruoloRichiesto, codiceRedazione);
  if (errore) return res.status(403).json({ errore });

  if (await User.exists({ username })) {
    return res.status(409).json({ errore: 'Username già preso: qualcuno è arrivato prima' });
  }

  const squadra = await Squadra.findById(squadraId);
  if (!squadra) {
    return res.status(400).json({ errore: 'Squadra non trovata: riprova' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const user = await User.create({
    username,
    nomeVisualizzato,
    pinHash,
    ruolo,
    squadra: squadra._id,
    tema: temaValido(temaRichiesto) ? temaRichiesto : TEMA_DEFAULT,
    avatar: slugValido(avatarRichiesto) ? avatarRichiesto : ''
  });

  await registra({ autore: user._id, tipo: 'iscrizione', squadra: squadra._id });

  const token = firmaToken(user);
  res.status(201).json({ token, utente: pubblico(user) });
};

const login = async (req, res) => {
  const username = testo(req.body.username).toLowerCase();
  const pin = testo(req.body.pin);
  if (!username || !pin) {
    return res.status(400).json({ errore: 'Servono username e PIN: la redazione non apre agli sconosciuti' });
  }

  const user = await User.findOne({ username, attivo: true });
  if (!user) {
    return res.status(401).json({ errore: 'Username o PIN sbagliati. Riprova, con calma' });
  }

  if (user.bloccatoFino && user.bloccatoFino > new Date()) {
    const minuti = Math.ceil((user.bloccatoFino.getTime() - Date.now()) / 60000);
    return res.status(429).json({ errore: `Troppi tentativi: la redazione riapre tra ${minuti} minuti` });
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
      return res.status(429).json({ errore: `Troppi tentativi: la redazione riapre tra ${BLOCCO_MINUTI} minuti` });
    }
    return res.status(401).json({ errore: 'Username o PIN sbagliati. Riprova, con calma' });
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

  const prima = await User.findById(req.utente.id).select('tema').lean();

  const user = await User.findByIdAndUpdate(
    req.utente.id,
    { $set: { tema } },
    { new: true }
  ).populate('squadra', 'nome stemma');

  if (!user) return res.status(404).json({ errore: 'Utente non trovato' });
  if (prima && (prima.tema || TEMA_DEFAULT) !== tema) {
    await registra({ autore: user._id, tipo: 'tema', squadra: user.squadra?._id || user.squadra, dati: { tema } });
  }
  res.json({ utente: pubblico(user) });
};

// La pagina Profilo: nome da mostrare, avatar e i testi/le scelte del ritaglio.
// Si aggiorna solo ciò che arriva: un campo assente resta com'è, un testo vuoto
// lo cancella (ed è il modo per togliere un sottotitolo).
const aggiornaProfilo = async (req, res) => {
  const set = {};
  const { body } = req;

  if (body.nomeVisualizzato !== undefined) {
    const nome = testo(body.nomeVisualizzato).slice(0, 30);
    if (!nome) return res.status(400).json({ errore: 'Il titolo non può restare vuoto: anche i misteri hanno un nome' });
    set.nomeVisualizzato = nome;
  }

  if (body.avatar !== undefined) {
    const avatar = testo(body.avatar).toLowerCase();
    if (avatar && !slugValido(avatar)) return res.status(400).json({ errore: 'Avatar non valido' });
    set.avatar = avatar;
  }

  const p = body.profilo && typeof body.profilo === 'object' ? body.profilo : null;
  if (p) {
    for (const [campo, max] of Object.entries(LIMITI_PROFILO)) {
      if (p[campo] !== undefined) set[`profilo.${campo}`] = testo(p[campo]).slice(0, max);
    }
    if (p.sfondo !== undefined) {
      const sfondo = testo(p.sfondo).toLowerCase();
      set['profilo.sfondo'] = slugValido(sfondo) ? sfondo : 'tema';
    }
    if (p.stileTitolo !== undefined) {
      set['profilo.stileTitolo'] = STILI_TITOLO.includes(p.stileTitolo) ? p.stileTitolo : 'pieno';
    }
    if (p.nascosti !== undefined) {
      const elenco = Array.isArray(p.nascosti) ? p.nascosti : [];
      set['profilo.nascosti'] = [...new Set(elenco.map((v) => testo(v).toLowerCase()).filter(slugValido))].slice(0, 12);
    }
  }

  if (Object.keys(set).length === 0) {
    return res.status(400).json({ errore: 'Niente da aggiornare' });
  }

  const prima = await User.findById(req.utente.id).select('nomeVisualizzato avatar profilo').lean();

  const user = await User.findByIdAndUpdate(
    req.utente.id,
    { $set: set },
    { new: true, runValidators: true }
  ).populate('squadra', 'nome stemma');

  if (!user) return res.status(404).json({ errore: 'Utente non trovato' });

  // Nel diario della lega finisce solo ciò che si vede: nome, avatar e i testi.
  if (prima) {
    const campi = [];
    if (set.nomeVisualizzato !== undefined && set.nomeVisualizzato !== prima.nomeVisualizzato) campi.push('nome');
    if (set.avatar !== undefined && set.avatar !== (prima.avatar || '')) campi.push('avatar');
    const testiCambiati = Object.keys(LIMITI_PROFILO)
      .some((c) => set[`profilo.${c}`] !== undefined && set[`profilo.${c}`] !== (prima.profilo?.[c] || ''));
    if (testiCambiati) campi.push('testi');
    if (campi.length) {
      await registra({
        autore: user._id, tipo: 'profilo', squadra: user.squadra?._id || user.squadra,
        dati: { campi, nome: user.nomeVisualizzato }, unisci: 'campi'
      });
    }
  }
  res.json({ utente: pubblico(user) });
};

// Cambio del PIN dal Profilo: serve quello attuale, il nuovo deve avere 4-6 cifre
// ed essere diverso dal vecchio.
const cambiaPin = async (req, res) => {
  const attuale = testo(req.body.pinAttuale);
  const nuovo = testo(req.body.nuovoPin);
  if (!/^\d{4,6}$/.test(nuovo)) {
    return res.status(400).json({ errore: 'Il PIN va da 4 a 6 cifre. Niente di più, niente di meno' });
  }
  const user = await User.findById(req.utente.id);
  if (!user) return res.status(404).json({ errore: 'Utente non trovato' });
  if (!(await bcrypt.compare(attuale, user.pinHash))) {
    return res.status(400).json({ errore: 'Il PIN attuale non è giusto' });
  }
  if (attuale === nuovo) {
    return res.status(400).json({ errore: 'Il nuovo PIN è uguale al vecchio: così non vale' });
  }
  user.pinHash = await bcrypt.hash(nuovo, 10);
  await user.save();
  res.json({ ok: true });
};

module.exports = { registrati, login, me, aggiornaTema, aggiornaProfilo, cambiaPin, profiloPubblico };
