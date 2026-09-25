const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Squadra = require('../models/Squadra');
const Giornata = require('../models/Giornata');
const User = require('../models/User');
const { calcolaClassifica } = require('../utils/regolamento');
const { urlDelNostroCloud } = require('../services/cloudinary');
const { registra } = require('../services/attivita');

// Quante foto può tenere l'album di una squadra.
const MAX_ALBUM = 30;

// I ritagli della pagina squadra che si possono spegnere e riordinare. Deve
// combaciare con RITAGLI_SQUADRA in frontend/src/squadra.js.
const RITAGLI = ['derby', 'forma', 'storia', 'rosa', 'album', 'albo'];

const COLORE = /^#[0-9a-f]{6}$/i;

// La lista squadre serve anche alla schermata d'iscrizione, che non ha ancora un
// token: lì bastano nome e stemma. Album, allenatori e il resto della pagina li
// vede solo chi è dentro la lega.
function haToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  try {
    jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// Ogni squadra porta con sé i suoi allenatori (più persone possono condividerne
// una): nome, avatar e tema, quanto serve a elenco e interno squadra.
const lista = async (req, res) => {
  if (!haToken(req)) {
    const squadre = await Squadra.find().sort('nome').select('nome stemma').lean();
    return res.json({ squadre });
  }

  const [squadre, utenti] = await Promise.all([
    Squadra.find().sort('nome').lean(),
    User.find({ attivo: true }).select('nomeVisualizzato avatar tema squadra').lean()
  ]);
  const perSquadra = new Map();
  for (const u of utenti) {
    const chiave = String(u.squadra);
    if (!perSquadra.has(chiave)) perSquadra.set(chiave, []);
    perSquadra.get(chiave).push({ id: u._id, nomeVisualizzato: u.nomeVisualizzato, avatar: u.avatar || '', tema: u.tema });
  }
  res.json({ squadre: squadre.map((s) => ({ ...s, allenatori: perSquadra.get(String(s._id)) || [] })) });
};

// Le squadre NON si creano più dall'app: la lega è chiusa e iscrivere una squadra
// nuova è un fatto raro, che non vale un bottone sempre a portata di dito (e un
// bottone che crea record a caso è un bottone che prima o poi viene premuto per
// sbaglio). Per aggiungerle si usa `npm run seed -- "Nome Squadra"` sul backend.

// Classifica di campionato sulle giornate concluse, secondo il regolamento:
// fantapunti → gol (soglia 66, poi un gol ogni 4), V/N/P da 3/1/0, ordinamento
// per punti, punti totali, gol fatti, differenza reti, gol subiti, avulsa.
// Logica in utils/regolamento.js.
//
// Ogni riga: la squadra + giocate, vinte, pareggiate, perse, punti (punti-lega),
// puntiTotali (fantapunti), golFatti, golSubiti, differenzaReti.
const classifica = async (req, res) => {
  const [squadre, giornate] = await Promise.all([
    Squadra.find().sort('nome').lean(),
    Giornata.find({ conclusa: true }).sort('numero').lean()
  ]);

  res.json({ tabellone: calcolaClassifica(squadre, giornate) });
};

const errore = (status, messaggio) => Object.assign(new Error(messaggio), { status, esposto: true });

// Testo facoltativo con tetto di lunghezza: si taglia invece di rifiutare, così
// un incolla troppo lungo non fa perdere tutto il resto del modulo.
const testo = (v, max) => String(v ?? '').trim().slice(0, max);

// Stemma, maglia e copertina: vuoto (= torna a quella di redazione), invariato
// (i record vecchi possono avere emoji o indirizzi d'altri tempi, e non si
// toccano), oppure un'immagine caricata sul nostro Cloudinary.
function immagine(nuova, attuale, cosa) {
  const valore = String(nuova ?? '').trim();
  if (!valore || valore === String(attuale || '').trim()) return valore;
  if (!urlDelNostroCloud(valore)) throw errore(400, `${cosa}: si possono usare solo immagini caricate dall'app`);
  return valore;
}

const soloRitagli = (v) => [...new Set((Array.isArray(v) ? v : []).map((x) => String(x).toLowerCase()))]
  .filter((x) => RITAGLI.includes(x));

async function squadraDellUtente(req) {
  const utente = await User.findById(req.utente.id).select('squadra ruolo').lean();
  if (!utente) throw errore(404, 'Utente non trovato');
  return utente;
}

// L'utente autenticato aggiorna solo la propria squadra (profilo, non i punti).
// Si aggiorna solo ciò che arriva nel body: un campo assente resta com'è, così
// nessun salvataggio parziale cancella quello che c'era già.
const aggiornaMiaSquadra = async (req, res) => {
  const {
    nome, stemma, maglia, foto, bio, rosa, fondataNel, rosaRuoli,
    occhiello, slogan, colori, pagina
  } = req.body;
  const utente = await squadraDellUtente(req);
  const attuale = await Squadra.findById(utente.squadra).lean();
  if (!attuale) return res.status(404).json({ errore: 'Squadra non trovata' });

  const aggiornamenti = {};

  if (nome !== undefined) {
    const pulito = String(nome).trim();
    if (!pulito) return res.status(400).json({ errore: 'Il nome della squadra non può restare vuoto' });

    const gia = await Squadra.findOne({ nome: pulito, _id: { $ne: utente.squadra } }).lean();
    if (gia) return res.status(400).json({ errore: 'Esiste già una squadra con questo nome: siate originali' });

    aggiornamenti.nome = pulito;
  }

  if (stemma !== undefined) aggiornamenti.stemma = immagine(stemma, attuale.stemma, 'Stemma');
  if (maglia !== undefined) aggiornamenti.maglia = immagine(maglia, attuale.maglia, 'Maglia');
  if (foto !== undefined) aggiornamenti.foto = immagine(foto, attuale.foto, 'Copertina');
  if (bio !== undefined) aggiornamenti.bio = String(bio ?? '');
  if (occhiello !== undefined) aggiornamenti.occhiello = testo(occhiello, 40);
  if (slogan !== undefined) aggiornamenti.slogan = testo(slogan, 120);

  if (colori !== undefined) {
    const lista = (Array.isArray(colori) ? colori : []).map((c) => String(c).trim().toLowerCase()).filter(Boolean);
    if (lista.some((c) => !COLORE.test(c))) {
      return res.status(400).json({ errore: 'I colori vanno scritti come #rrggbb' });
    }
    aggiornamenti.colori = lista.slice(0, 2);
  }

  if (pagina !== undefined && pagina && typeof pagina === 'object') {
    if (pagina.stileTitolo !== undefined) {
      aggiornamenti['pagina.stileTitolo'] = pagina.stileTitolo === 'contorno' ? 'contorno' : 'pieno';
    }
    if (pagina.nascosti !== undefined) aggiornamenti['pagina.nascosti'] = soloRitagli(pagina.nascosti);
    if (pagina.ordine !== undefined) aggiornamenti['pagina.ordine'] = soloRitagli(pagina.ordine);
  }

  if (rosa !== undefined) {
    aggiornamenti.rosa = Array.isArray(rosa)
      ? rosa
      : String(rosa).split(',').map((n) => n.trim()).filter(Boolean);
  }

  if (fondataNel !== undefined) {
    const anno = String(fondataNel ?? '').trim();
    if (anno && !/^\d{4}$/.test(anno)) {
      return res.status(400).json({ errore: "L'anno di fondazione va scritto con quattro cifre" });
    }
    aggiornamenti.fondataNel = anno ? Number(anno) : null;
  }

  if (rosaRuoli !== undefined && rosaRuoli && typeof rosaRuoli === 'object') {
    const pulisci = (v) => (Array.isArray(v) ? v : String(v || '').split(','))
      .map((n) => String(n).trim()).filter(Boolean).slice(0, 40);
    aggiornamenti.rosaRuoli = { P: pulisci(rosaRuoli.P), D: pulisci(rosaRuoli.D), C: pulisci(rosaRuoli.C), A: pulisci(rosaRuoli.A) };
    // Chi salva la rosa per ruolo ha già sistemato i vecchi nomi senza ruolo.
    if (rosa === undefined) aggiornamenti.rosa = [];
  }

  const squadra = await Squadra.findByIdAndUpdate(utente.squadra, { $set: aggiornamenti }, { new: true, runValidators: true });

  const campi = campiCambiati(attuale, squadra.toObject());
  if (campi.length) {
    await registra({
      autore: req.utente.id, tipo: 'squadra', squadra: squadra._id,
      dati: { campi, nome: squadra.nome, ...(campi.includes('nome') ? { vecchioNome: attuale.nome } : {}) },
      chiave: String(squadra._id), unisci: 'campi'
    });
  }

  res.json({ squadra });
};

// Cosa è cambiato davvero tra prima e dopo il salvataggio, con i nomi che usa il
// diario della lega (frontend/src/utils/attivita.js li trasforma in parole).
function campiCambiati(prima, dopo) {
  const uguale = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const pagina = (x) => ({ s: x?.pagina?.stileTitolo || 'pieno', n: x?.pagina?.nascosti || [], o: x?.pagina?.ordine || [] });
  const rosa = (x) => ({ r: x?.rosaRuoli || {}, v: x?.rosa || [] });
  const confronti = [
    ['nome', (x) => x.nome],
    ['stemma', (x) => x.stemma || ''],
    ['maglia', (x) => x.maglia || ''],
    ['foto', (x) => x.foto || ''],
    ['colori', (x) => x.colori || []],
    ['slogan', (x) => x.slogan || ''],
    ['occhiello', (x) => x.occhiello || ''],
    ['storia', (x) => x.bio || ''],
    ['fondata', (x) => x.fondataNel || null],
    ['rosa', rosa],
    ['pagina', pagina]
  ];
  return confronti.filter(([, leggi]) => !uguale(leggi(prima), leggi(dopo))).map(([nome]) => nome);
}

// --- Album ------------------------------------------------------------------

// Aggiunge una foto all'album della propria squadra. Il tetto si controlla nella
// stessa scrittura (l'elemento MAX_ALBUM-1 non deve esistere): due caricamenti
// contemporanei non possono sforarlo.
const aggiungiFoto = async (req, res) => {
  const utente = await squadraDellUtente(req);
  const url = String(req.body?.url || '').trim();
  if (!urlDelNostroCloud(url)) return res.status(400).json({ errore: "Si possono aggiungere solo immagini caricate dall'app" });

  const squadra = await Squadra.findOneAndUpdate(
    { _id: utente.squadra, [`album.${MAX_ALBUM - 1}`]: { $exists: false } },
    { $push: { album: { url, didascalia: testo(req.body?.didascalia, 100), autore: req.utente.id } } },
    { new: true, runValidators: true }
  );
  if (!squadra) return res.status(400).json({ errore: `L'album è pieno: massimo ${MAX_ALBUM} foto. Togline qualcuna` });

  await registra({
    autore: req.utente.id, tipo: 'album', squadra: squadra._id,
    dati: { quante: 1, nome: squadra.nome }, chiave: String(squadra._id), unisci: 'somma', finestra: 2 * 3600 * 1000
  });
  res.json({ squadra });
};

// Cambia la didascalia di una foto della propria squadra.
const didascaliaFoto = async (req, res) => {
  const utente = await squadraDellUtente(req);
  if (!mongoose.isValidObjectId(req.params.fotoId)) return res.status(404).json({ errore: 'Foto non trovata' });

  const squadra = await Squadra.findOneAndUpdate(
    { _id: utente.squadra, 'album._id': req.params.fotoId },
    { $set: { 'album.$.didascalia': testo(req.body?.didascalia, 100) } },
    { new: true }
  );
  if (!squadra) return res.status(404).json({ errore: 'Foto non trovata' });
  res.json({ squadra });
};

// Toglie una foto dall'album: la può togliere chi allena la squadra, oppure
// l'amministratore (in una lega goliardica prima o poi serve). La foto sparisce
// dalla pagina ma il file su Cloudinary resta: niente si perde per un tocco sbagliato.
const togliFoto = async (req, res) => {
  const { id, fotoId } = req.params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(fotoId)) {
    return res.status(404).json({ errore: 'Foto non trovata' });
  }
  const utente = await squadraDellUtente(req);
  const suaSquadra = String(utente.squadra) === String(id);
  if (!suaSquadra && utente.ruolo !== 'admin') {
    return res.status(403).json({ errore: "Le foto le toglie chi allena la squadra (o l'amministratore)" });
  }

  const squadra = await Squadra.findOneAndUpdate(
    { _id: id, 'album._id': fotoId },
    { $pull: { album: { _id: fotoId } } },
    { new: true }
  );
  if (!squadra) return res.status(404).json({ errore: 'Foto non trovata' });
  res.json({ squadra });
};

module.exports = { lista, classifica, aggiornaMiaSquadra, aggiungiFoto, didascaliaFoto, togliFoto };
