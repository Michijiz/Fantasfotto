const Albo = require('../models/Albo');

const POPOLA_SQUADRA = { path: 'squadra', select: 'nome stemma' };

// Ordine decrescente per stagione: funziona anche solo con etichette testuali
// tipo "2023/2024" perché l'ordine alfabetico coincide con quello cronologico.
const lista = async (req, res) => {
  const albo = await Albo.find().sort('-stagione').populate(POPOLA_SQUADRA);
  res.json({ albo });
};

function mancaQualcosa(body) {
  return !body.stagione || !body.squadra;
}

const crea = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Indica stagione e squadra vincitrice' });
  }
  const { stagione, squadra, punti, note } = req.body;
  const voce = await Albo.create({
    stagione, squadra, punti: punti === '' ? undefined : punti, note
  });
  await voce.populate(POPOLA_SQUADRA);
  res.status(201).json({ voce });
};

const aggiorna = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Indica stagione e squadra vincitrice' });
  }
  const { stagione, squadra, punti, note } = req.body;
  const voce = await Albo.findByIdAndUpdate(
    req.params.id,
    { stagione, squadra, punti: punti === '' ? undefined : punti, note },
    { new: true }
  );
  if (!voce) return res.status(404).json({ errore: 'Voce non trovata' });
  await voce.populate(POPOLA_SQUADRA);
  res.json({ voce });
};

const elimina = async (req, res) => {
  const voce = await Albo.findById(req.params.id);
  if (!voce) return res.status(404).json({ errore: 'Voce non trovata' });
  await voce.deleteOne();
  res.json({ ok: true });
};

module.exports = { lista, crea, aggiorna, elimina };
