const express = require('express');
const mongoose = require('mongoose');
const Voto = require('../models/Voto');
const Edizione = require('../models/Edizione');
const Squadra = require('../models/Squadra');
const { richiediAuth } = require('../middleware/auth');

const router = express.Router();

const CATEGORIE = [
  { key: 'culo', label: '🍀 Più culo della giornata' },
  { key: 'bidone', label: '🗑️ Bidone della giornata' },
  { key: 'peggiore', label: '😤 Il peggiore in campo' },
  { key: 'blessed', label: '✨ Blessed della giornata' },
  { key: 'coraggiosa', label: '💪 Formazione più coraggiosa' },
  { key: 'ingiusto', label: '😈 Meritava di perdere, ha vinto' },
  { key: 'mvp', label: '🔥 MVP della giornata' }
];

router.get('/categorie', richiediAuth, (req, res) => res.json(CATEGORIE));

// Voti aggregati (conteggi) per una edizione, categoria per categoria
router.get('/edizione/:edizioneId', richiediAuth, async (req, res) => {
  const voti = await Voto.find({ edizione: req.params.edizioneId });

  const conteggi = {};
  CATEGORIE.forEach(c => { conteggi[c.key] = {}; });
  voti.forEach(v => {
    const idSquadra = String(v.votato);
    if (!conteggi[v.categoria]) conteggi[v.categoria] = {};
    conteggi[v.categoria][idSquadra] = (conteggi[v.categoria][idSquadra] || 0) + 1;
  });

  // il voto che l'utente corrente ha già dato per categoria (per evidenziarlo lato UI)
  const mieiVoti = {};
  voti.filter(v => String(v.votante) === String(req.utente.id)).forEach(v => {
    mieiVoti[v.categoria] = String(v.votato);
  });

  res.json({ conteggi, mieiVoti });
});

// Vota (o cambia voto): un voto per utente per categoria per edizione
router.post('/', richiediAuth, async (req, res) => {
  try {
    const { edizioneId, categoria, votato } = req.body;
    if (!edizioneId || !categoria || !votato) {
      return res.status(400).json({ errore: 'Dati mancanti' });
    }
    if (!CATEGORIE.find(c => c.key === categoria)) {
      return res.status(400).json({ errore: 'Categoria non valida' });
    }

    const edizione = await Edizione.findById(edizioneId);
    if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });
    if (edizione.votazioniChiuse) return res.status(403).json({ errore: 'Votazioni chiuse per questa giornata' });

    if (!mongoose.isValidObjectId(votato)) {
      return res.status(400).json({ errore: 'Squadra non valida' });
    }
    const squadra = await Squadra.findOne({ _id: votato, attiva: true });
    if (!squadra) return res.status(400).json({ errore: 'Squadra non valida' });

    await Voto.findOneAndUpdate(
      { edizione: edizioneId, categoria, votante: req.utente.id },
      { votato },
      { upsert: true, new: true }
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ errore: 'Errore nel salvataggio del voto' });
  }
});

// Albo d'oro: totali per categoria su tutta la stagione, top 3
router.get('/albo', richiediAuth, async (req, res) => {
  const voti = await Voto.find();
  const totali = {};
  CATEGORIE.forEach(c => { totali[c.key] = {}; });
  voti.forEach(v => {
    const idSquadra = String(v.votato);
    if (!totali[v.categoria]) totali[v.categoria] = {};
    totali[v.categoria][idSquadra] = (totali[v.categoria][idSquadra] || 0) + 1;
  });

  const squadre = await Squadra.find().select('nome stemma');
  const mappaSquadre = new Map(squadre.map(s => [String(s._id), s]));

  const albo = CATEGORIE.map(c => ({
    key: c.key,
    label: c.label,
    top: Object.entries(totali[c.key] || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([idSquadra, n]) => ({
        squadra: mappaSquadre.get(idSquadra) || null,
        voti: n
      }))
  }));

  res.json(albo);
});

module.exports = router;
