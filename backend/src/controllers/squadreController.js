const Squadra = require('../models/Squadra');
const Giornata = require('../models/Giornata');
const User = require('../models/User');
const { calcolaClassifica } = require('../utils/regolamento');

const lista = async (req, res) => {
  const squadre = await Squadra.find().sort('nome');
  res.json({ squadre });
};

// Non c'è più un seed fisso: le squadre della lega si creano da qui, una alla volta
// (di norma dall'admin, dalla pagina Squadre). Il nome deve restare unico (vincolo
// anche a livello di schema).
const crea = async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ errore: 'Nome squadra richiesto' });
  }
  const squadra = await Squadra.create({ nome: nome.trim() });
  res.status(201).json({ squadra });
};

const dettaglio = async (req, res) => {
  const squadra = await Squadra.findById(req.params.id);
  if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });
  res.json({ squadra });
};

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
const aggiornaMiaSquadra = async (req, res) => {
  const { stemma, maglia, foto, bio, rosa } = req.body;
  const utente = await User.findById(req.utente.id);
  if (!utente) return res.status(404).json({ errore: 'Utente non trovato' });

  const aggiornamenti = {};
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

module.exports = { lista, dettaglio, crea, classifica, aggiornaMiaSquadra };
