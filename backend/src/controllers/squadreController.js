const Squadra = require('../models/Squadra');
const Giornata = require('../models/Giornata');
const User = require('../models/User');
const { calcolaClassifica } = require('../utils/regolamento');

// Ogni squadra porta con sé i suoi allenatori (più persone possono condividerne
// una): nome, avatar e tema, quanto serve a elenco e interno squadra.
const lista = async (req, res) => {
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

// L'utente autenticato aggiorna solo la propria squadra (profilo, non i punti).
// Il nome è modificabile: ora che le squadre non si creano più dall'app, se uno
// se lo ritrova scritto male deve poterlo correggere da qualche parte.
const aggiornaMiaSquadra = async (req, res) => {
  const { nome, stemma, maglia, foto, bio, rosa, fondataNel, rosaRuoli } = req.body;
  const utente = await User.findById(req.utente.id);
  if (!utente) return res.status(404).json({ errore: 'Utente non trovato' });

  const aggiornamenti = {};

  if (nome !== undefined) {
    const pulito = String(nome).trim();
    if (!pulito) return res.status(400).json({ errore: 'Il nome della squadra non può restare vuoto' });

    const gia = await Squadra.findOne({ nome: pulito, _id: { $ne: utente.squadra } }).lean();
    if (gia) return res.status(400).json({ errore: 'Esiste già una squadra con questo nome: siate originali' });

    aggiornamenti.nome = pulito;
  }

  if (stemma !== undefined) aggiornamenti.stemma = stemma;
  if (maglia !== undefined) aggiornamenti.maglia = maglia;
  if (foto !== undefined) aggiornamenti.foto = foto;
  if (bio !== undefined) aggiornamenti.bio = bio;
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

  const squadra = await Squadra.findByIdAndUpdate(utente.squadra, aggiornamenti, { new: true, runValidators: true });
  res.json({ squadra });
};

module.exports = { lista, classifica, aggiornaMiaSquadra };
