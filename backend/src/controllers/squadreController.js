const Squadra = require('../models/Squadra');
const Giornata = require('../models/Giornata');
const User = require('../models/User');

const lista = async (req, res) => {
  const squadre = await Squadra.find().sort('nome');
  res.json({ squadre });
};

const dettaglio = async (req, res) => {
  const squadra = await Squadra.findById(req.params.id);
  if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });
  res.json({ squadra });
};

// Somma i punti di ogni squadra su tutte le giornate concluse: sia dai punteggi
// "semplici" (form Nuova Edizione) sia dagli accoppiamenti con risultato importato.
const classifica = async (req, res) => {
  const [squadre, giornate] = await Promise.all([
    Squadra.find().sort('nome').lean(),
    Giornata.find({ conclusa: true }).lean()
  ]);

  const punti = new Map(squadre.map((s) => [String(s._id), 0]));

  for (const g of giornate) {
    for (const p of g.punteggi || []) {
      const id = String(p.squadra);
      punti.set(id, (punti.get(id) || 0) + p.punti);
    }
    for (const a of g.accoppiamenti || []) {
      if (a.punteggioCasa != null) {
        const id = String(a.squadraCasa);
        punti.set(id, (punti.get(id) || 0) + a.punteggioCasa);
      }
      if (a.punteggioTrasferta != null) {
        const id = String(a.squadraTrasferta);
        punti.set(id, (punti.get(id) || 0) + a.punteggioTrasferta);
      }
    }
  }

  const tabellone = squadre
    .map((s) => ({ ...s, punti: punti.get(String(s._id)) || 0 }))
    .sort((a, b) => b.punti - a.punti);

  res.json({ tabellone });
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

module.exports = { lista, dettaglio, classifica, aggiornaMiaSquadra };
