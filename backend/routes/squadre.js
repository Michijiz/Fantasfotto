const express = require('express');
const Squadra = require('../models/Squadra');
const User = require('../models/User');
const Voto = require('../models/Voto');
const Edizione = require('../models/Edizione');
const { richiediAuth } = require('../middleware/auth');

const router = express.Router();

// Elenco squadre (no auth: serve anche nel form di registrazione)
router.get('/', async (req, res) => {
  const squadre = await Squadra.find().sort({ nome: 1 });
  res.json(squadre);
});

// Calcola i premi vinti dai giocatori di una squadra, giornata per giornata
async function calcolaPremiSquadra(nomiAllenatori) {
  const edizioni = await Edizione.find().select('_id giornata');
  const premi = [];

  for (const ed of edizioni) {
    const voti = await Voto.find({ edizione: ed._id });
    const perCategoria = {};
    voti.forEach(v => {
      perCategoria[v.categoria] = perCategoria[v.categoria] || {};
      perCategoria[v.categoria][v.votato] = (perCategoria[v.categoria][v.votato] || 0) + 1;
    });

    Object.entries(perCategoria).forEach(([categoria, conteggi]) => {
      const ordinati = Object.entries(conteggi).sort((a, b) => b[1] - a[1]);
      if (!ordinati.length) return;
      const max = ordinati[0][1];
      const vincitori = ordinati.filter(([, n]) => n === max).map(([nome]) => nome);
      if (vincitori.some(nome => nomiAllenatori.includes(nome))) {
        premi.push({ giornata: ed.giornata, categoria, voti: max });
      }
    });
  }
  return premi.sort((a, b) => b.giornata - a.giornata);
}

// Dettaglio squadra: allenatori, storia, stemma, rosa, premi vinti
router.get('/:id', richiediAuth, async (req, res) => {
  try {
    const squadra = await Squadra.findById(req.params.id);
    if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });

    const allenatori = await User.find({ squadra: squadra._id, attivo: true })
      .select('nomeVisualizzato avatar username');

    const premi = await calcolaPremiSquadra(allenatori.map(a => a.nomeVisualizzato));

    res.json({ squadra, allenatori, premi });
  } catch (e) {
    res.status(500).json({ errore: 'Errore nel caricamento della squadra' });
  }
});

// Modifica squadra: solo un allenatore della squadra (o admin)
router.patch('/:id', richiediAuth, async (req, res) => {
  try {
    const squadra = await Squadra.findById(req.params.id);
    if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });

    const puoModificare = req.utente.ruolo === 'admin' ||
      String(req.utente.squadra) === String(squadra._id);
    if (!puoModificare) {
      return res.status(403).json({ errore: 'Puoi modificare solo la tua squadra' });
    }

    const { foto, maglia, bio, rosa, stemma } = req.body;
    if (stemma !== undefined) squadra.stemma = stemma;
    if (foto !== undefined) squadra.foto = foto;
    if (maglia !== undefined) squadra.maglia = maglia;
    if (bio !== undefined) squadra.bio = bio;
    if (Array.isArray(rosa)) squadra.rosa = rosa;

    await squadra.save();
    res.json(squadra);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nel salvataggio della squadra' });
  }
});

module.exports = router;
