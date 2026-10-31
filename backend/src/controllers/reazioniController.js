const mongoose = require('mongoose');
const Edizione = require('../models/Edizione');
const Reazione = require('../models/Reazione');

// Le sole reazioni ammesse: poche e fisse, come i timbri su un ritaglio.
const EMOJI = ['🔥', '😂', '💀', '👏'];

const errore = (status, messaggio) => Object.assign(new Error(messaggio), { status, esposto: true });

async function conteggi(edizioneId, utenteId) {
  const righe = await Reazione.find({ edizione: edizioneId }).select('utente emoji').lean();
  const per = Object.fromEntries(EMOJI.map((e) => [e, 0]));
  const mie = [];
  for (const r of righe) {
    if (per[r.emoji] !== undefined) per[r.emoji] += 1;
    if (String(r.utente) === String(utenteId)) mie.push(r.emoji);
  }
  return { emoji: EMOJI, conteggi: per, mie };
}

const lista = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw errore(400, 'Edizione non valida');
  res.json(await conteggi(req.params.id, req.utente.id));
};

// Tocca per mettere, tocca di nuovo per togliere.
const alterna = async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body || {};
  if (!mongoose.isValidObjectId(id)) throw errore(400, 'Edizione non valida');
  if (!EMOJI.includes(emoji)) throw errore(400, 'Reazione non valida');
  if (!(await Edizione.exists({ _id: id }))) throw errore(404, 'Edizione non trovata');

  const filtro = { edizione: id, utente: req.utente.id, emoji };
  const tolta = await Reazione.findOneAndDelete(filtro);
  if (!tolta) await Reazione.create(filtro);
  res.json(await conteggi(id, req.utente.id));
};

module.exports = { lista, alterna };
