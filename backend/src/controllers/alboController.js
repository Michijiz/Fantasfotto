const mongoose = require('mongoose');
const Albo = require('../models/Albo');
const User = require('../models/User');
const { urlDelNostroCloud } = require('../services/cloudinary');

const POPOLA = [
  { path: 'squadra', select: 'nome stemma' },
  { path: 'secondo', select: 'nome stemma' },
  { path: 'terzo', select: 'nome stemma' }
];

// Ordine decrescente per stagione: funziona anche solo con etichette testuali
// tipo "2023/2024" perché l'ordine alfabetico coincide con quello cronologico.
const lista = async (req, res) => {
  const albo = await Albo.find().sort('-stagione').populate(POPOLA);
  res.json({ albo });
};

const errore = (status, messaggio) => Object.assign(new Error(messaggio), { status });
const vuoto = (v) => v === '' || v === null || v === undefined;

function mancaQualcosa(body) {
  return !body.stagione || !body.squadra;
}

// Gli allenatori della squadra in questo momento, da fissare nella voce.
async function allenatoriDi(squadraId) {
  const utenti = await User.find({ squadra: squadraId, attivo: true }).select('nomeVisualizzato').sort('nomeVisualizzato').lean();
  return utenti.map((u) => ({ id: u._id, nome: u.nomeVisualizzato }));
}

// I campi facoltativi vuoti vanno tolti, non ignorati. Passare `undefined` dentro
// l'oggetto di findByIdAndUpdate non azzera niente — mongoose salta le chiavi
// undefined — quindi una volta scritti i punti non si potevano più togliere.
// Servono $set e $unset separati.
//
// Podio e foto si toccano solo se arrivano nel body: un client vecchio che non li
// conosce non cancella quelli già salvati.
function pezziAggiornamento(body, attuale = null) {
  const { stagione, squadra, punti, note } = body;
  const set = { stagione: String(stagione).trim(), squadra };
  const unset = {};

  if (vuoto(punti)) unset.punti = '';
  else set.punti = Number(punti);

  set.note = vuoto(note) ? '' : String(note).slice(0, 200);

  for (const posto of ['secondo', 'terzo']) {
    if (body[posto] === undefined) continue;
    if (vuoto(body[posto])) { unset[posto] = ''; continue; }
    if (!mongoose.isValidObjectId(body[posto])) throw errore(400, 'Squadra del podio non valida');
    set[posto] = body[posto];
  }
  const podio = [squadra, set.secondo, set.terzo].filter(Boolean).map(String);
  if (new Set(podio).size !== podio.length) throw errore(400, 'Una squadra può stare sul podio una volta sola');

  if (body.foto !== undefined) {
    const foto = String(body.foto || '').trim();
    if (foto && foto !== (attuale?.foto || '') && !urlDelNostroCloud(foto)) {
      throw errore(400, "La foto va caricata dall'app");
    }
    set.foto = foto;
  }

  return Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set };
}

const crea = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Indica stagione e squadra vincitrice' });
  }
  const { $set } = pezziAggiornamento(req.body);
  const voce = await Albo.create({ ...$set, allenatori: await allenatoriDi($set.squadra) });
  await voce.populate(POPOLA);
  res.status(201).json({ voce });
};

const aggiorna = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Indica stagione e squadra vincitrice' });
  }
  const attuale = await Albo.findById(req.params.id).lean();
  if (!attuale) return res.status(404).json({ errore: 'Voce non trovata' });

  const pezzi = pezziAggiornamento(req.body, attuale);
  // Gli allenatori si rifissano solo se cambia la squadra campione (una
  // correzione), o se la voce è di prima che esistessero e non ne ha.
  const cambiata = String(attuale.squadra) !== String(pezzi.$set.squadra);
  if (cambiata || !attuale.allenatori?.length) {
    pezzi.$set.allenatori = await allenatoriDi(pezzi.$set.squadra);
  }

  const voce = await Albo.findByIdAndUpdate(req.params.id, pezzi, { new: true, runValidators: true });
  await voce.populate(POPOLA);
  res.json({ voce });
};

const elimina = async (req, res) => {
  const voce = await Albo.findById(req.params.id);
  if (!voce) return res.status(404).json({ errore: 'Voce non trovata' });
  await voce.deleteOne();
  res.json({ ok: true });
};

module.exports = { lista, crea, aggiorna, elimina };
