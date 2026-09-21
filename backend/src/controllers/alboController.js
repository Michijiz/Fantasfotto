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

// punti e note sono facoltativi: vuoti vanno tolti, non ignorati. Passare
// `undefined` dentro l'oggetto di findByIdAndUpdate non azzera niente — mongoose
// salta le chiavi undefined — quindi una volta scritti i punti non si potevano
// più togliere. Servono $set e $unset separati.
function pezziAggiornamento(body) {
  const { stagione, squadra, punti, note } = body;
  const set = { stagione, squadra };
  const unset = {};

  const puntiVuoti = punti === '' || punti === null || punti === undefined;
  if (puntiVuoti) unset.punti = '';
  else set.punti = Number(punti);

  const noteVuote = note === '' || note === null || note === undefined;
  set.note = noteVuote ? '' : String(note);

  return Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set };
}

const crea = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Indica stagione e squadra vincitrice' });
  }
  const { $set } = pezziAggiornamento(req.body);
  const voce = await Albo.create($set);
  await voce.populate(POPOLA_SQUADRA);
  res.status(201).json({ voce });
};

const aggiorna = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Indica stagione e squadra vincitrice' });
  }
  const voce = await Albo.findByIdAndUpdate(req.params.id, pezziAggiornamento(req.body), { new: true });
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
