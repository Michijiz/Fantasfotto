const Squadra = require('../models/Squadra');
const Giornata = require('../models/Giornata');
const User = require('../models/User');
const { calcolaClassifica } = require('../utils/regolamento');

const lista = async (req, res) => {
  const squadre = await Squadra.find().sort('nome');
  res.json({ squadre });
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
  const { nome, stemma, maglia, foto, bio, rosa } = req.body;
  const utente = await User.findById(req.utente.id);
  if (!utente) return res.status(404).json({ errore: 'Utente non trovato' });

  const aggiornamenti = {};

  if (nome !== undefined) {
    const pulito = String(nome).trim();
    if (!pulito) return res.status(400).json({ errore: 'Il nome della squadra non può essere vuoto' });

    const gia = await Squadra.findOne({ nome: pulito, _id: { $ne: utente.squadra } }).lean();
    if (gia) return res.status(400).json({ errore: 'Esiste già una squadra con questo nome' });

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

  const squadra = await Squadra.findByIdAndUpdate(utente.squadra, aggiornamenti, { new: true });
  res.json({ squadra });
};

module.exports = { lista, classifica, aggiornaMiaSquadra };
