const express = require('express');
const Squadra = require('../models/Squadra');
const { richiediAuth, richiediAdmin } = require('../middleware/auth');

const router = express.Router();

// Elenco squadre attive
router.get('/', richiediAuth, async (req, res) => {
  const squadre = await Squadra.find({ attiva: true })
    .populate('proprietario', 'nomeVisualizzato avatar username')
    .populate('membri', 'nomeVisualizzato avatar username')
    .sort({ nome: 1 });
  res.json(squadre);
});

router.get('/:id', richiediAuth, async (req, res) => {
  const squadra = await Squadra.findById(req.params.id)
    .populate('proprietario', 'nomeVisualizzato avatar username')
    .populate('membri', 'nomeVisualizzato avatar username');
  if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });
  res.json(squadra);
});

// Crea squadra - solo il direttore/admin la registra ufficialmente in lega
router.post('/', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { nome, stemma, coloreKit, proprietario, membri } = req.body;

    if (!nome || !proprietario) {
      return res.status(400).json({ errore: 'Nome e proprietario sono obbligatori' });
    }

    const esistente = await Squadra.findOne({ nome: nome.trim() });
    if (esistente) return res.status(409).json({ errore: 'Esiste già una squadra con questo nome' });

    const squadra = await Squadra.create({
      nome: nome.trim(),
      stemma: stemma || '',
      coloreKit: coloreKit || '',
      proprietario,
      membri: membri || []
    });

    res.status(201).json(squadra);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nella creazione della squadra' });
  }
});

// Modifica squadra - il proprietario può curare l'aspetto (stemma, colore), l'admin può cambiare tutto
router.put('/:id', richiediAuth, async (req, res) => {
  try {
    const squadra = await Squadra.findById(req.params.id);
    if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });

    const isAdmin = req.utente.ruolo === 'admin';
    const isProprietario = String(squadra.proprietario) === String(req.utente.id);
    if (!isAdmin && !isProprietario) {
      return res.status(403).json({ errore: 'Solo il proprietario o il direttore possono modificare questa squadra' });
    }

    const { nome, stemma, coloreKit, proprietario, membri } = req.body;

    // Cambiare nome o proprietario è una modifica "amministrativa": solo l'admin
    if (isAdmin) {
      if (nome) squadra.nome = nome.trim();
      if (proprietario) squadra.proprietario = proprietario;
      if (membri) squadra.membri = membri;
    }
    if (stemma !== undefined) squadra.stemma = stemma;
    if (coloreKit !== undefined) squadra.coloreKit = coloreKit;

    await squadra.save();
    res.json(squadra);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nella modifica della squadra' });
  }
});

// Disattiva squadra (soft delete, coerente con User.attivo) - solo admin
router.delete('/:id', richiediAuth, richiediAdmin, async (req, res) => {
  const squadra = await Squadra.findByIdAndUpdate(req.params.id, { attiva: false }, { new: true });
  if (!squadra) return res.status(404).json({ errore: 'Squadra non trovata' });
  res.json({ ok: true });
});

module.exports = router;
