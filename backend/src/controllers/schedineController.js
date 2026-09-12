const Schedina = require('../models/Schedina');
const Giornata = require('../models/Giornata');
const Squadra = require('../models/Squadra');
const User = require('../models/User');
const {
  arricchisciGiornata, arricchisciConQuote, calcolaClassifica, esitoSchedina
} = require('../utils/regolamento');

const POPOLA_SQUADRE = [
  { path: 'accoppiamenti.squadraCasa', select: 'nome stemma' },
  { path: 'accoppiamenti.squadraTrasferta', select: 'nome stemma' }
];

// La giornata su cui si gioca: la prima non ancora conclusa. Se il calendario non
// è stato caricato (nessun accoppiamento) non c'è niente da pronosticare.
async function giornataAperta() {
  return Giornata.findOne({ conclusa: false }).sort('numero').populate(POPOLA_SQUADRE).lean();
}

// Classifica corrente, usata solo per calcolare le quote.
async function tabelloneCorrente() {
  const [squadre, giornate] = await Promise.all([
    Squadra.find().sort('nome').lean(),
    Giornata.find({ conclusa: true }).sort('numero').lean()
  ]);
  return calcolaClassifica(squadre, giornate);
}

// Una schedina si può compilare finché la giornata non è conclusa e, se ha una
// data, finché quella data non è passata: dopo il primo fischio non si gufa più.
function chiusa(giornata) {
  if (!giornata) return true;
  if (giornata.conclusa) return true;
  return Boolean(giornata.data && new Date(giornata.data).getTime() <= Date.now());
}

// L'ultima giornata già archiviata, con la mia schedina: serve a far vedere com'è
// andata. Senza, appena la giornata si chiude la schedina sparisce dalla pagina e
// nessuno vede più se l'aveva azzeccata.
async function giornataPrecedente(utenteId) {
  const grezza = await Giornata.findOne({ conclusa: true })
    .sort('-numero').populate(POPOLA_SQUADRE).lean();
  if (!grezza) return null;

  const giornata = arricchisciGiornata(grezza);
  const miaSchedina = await Schedina.findOne({
    utente: utenteId, giornataNumero: giornata.numero
  }).lean();
  return { giornata, miaSchedina };
}

const apertura = async (req, res) => {
  const [grezza, precedente] = await Promise.all([
    giornataAperta(),
    giornataPrecedente(req.utente.id)
  ]);

  if (!grezza) {
    return res.json({
      giornata: null, miaSchedina: null, chiusa: true, motivo: 'nessuna-giornata', precedente
    });
  }

  const tabellone = await tabelloneCorrente();
  const giornata = arricchisciConQuote(arricchisciGiornata(grezza), tabellone);

  const miaSchedina = await Schedina.findOne({
    utente: req.utente.id,
    giornataNumero: giornata.numero
  }).lean();

  res.json({
    giornata,
    miaSchedina,
    chiusa: chiusa(giornata),
    motivo: giornata.accoppiamenti.length === 0 ? 'calendario-mancante' : null,
    precedente
  });
};

const salva = async (req, res) => {
  const { giornataNumero, pronostici } = req.body;
  if (!giornataNumero || !Array.isArray(pronostici) || pronostici.length === 0) {
    return res.status(400).json({ errore: 'Schedina vuota' });
  }

  const grezza = await Giornata.findOne({ numero: giornataNumero }).populate(POPOLA_SQUADRE).lean();
  if (!grezza) return res.status(404).json({ errore: 'Giornata non trovata' });
  if (chiusa(grezza)) return res.status(400).json({ errore: 'Schedine chiuse per questa giornata' });

  const tabellone = await tabelloneCorrente();
  const giornata = arricchisciConQuote(arricchisciGiornata(grezza), tabellone);
  const perId = new Map(giornata.accoppiamenti.map((a) => [String(a._id), a]));

  // La multipla è su tutti gli scontri: una schedina parziale non si salva.
  if (pronostici.length !== giornata.accoppiamenti.length) {
    return res.status(400).json({ errore: 'Manca il pronostico su qualche scontro' });
  }

  const daSalvare = [];
  for (const p of pronostici) {
    const scontro = perId.get(String(p.accoppiamento));
    if (!scontro) return res.status(400).json({ errore: 'Scontro non valido' });
    if (!['1', 'X', '2'].includes(p.esito)) {
      return res.status(400).json({ errore: 'Pronostico non valido' });
    }
    daSalvare.push({
      accoppiamento: scontro._id,
      squadraCasa: scontro.squadraCasa?._id || scontro.squadraCasa,
      squadraTrasferta: scontro.squadraTrasferta?._id || scontro.squadraTrasferta,
      esito: p.esito,
      quota: scontro.quote[p.esito]
    });
  }

  const quotaTotale = Math.round(daSalvare.reduce((tot, p) => tot * p.quota, 1) * 100) / 100;

  const utente = await User.findById(req.utente.id).lean();
  const schedina = await Schedina.findOneAndUpdate(
    { utente: req.utente.id, giornataNumero },
    {
      $set: { pronostici: daSalvare, quotaTotale, esito: 'attesa', squadra: utente.squadra },
      $setOnInsert: { utente: req.utente.id, giornataNumero }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ schedina });
};

// Ricalcola l'esito di tutte le schedine di una giornata. Idempotente: si può
// richiamare a ogni pubblicazione senza fare danni. Torna le schedine vinte.
async function risolviSchedine(giornataNumero) {
  const grezza = await Giornata.findOne({ numero: giornataNumero }).lean();
  if (!grezza) return [];

  const giornata = arricchisciGiornata(grezza);
  const schedine = await Schedina.find({ giornataNumero });

  const vinte = [];
  for (const s of schedine) {
    const esito = esitoSchedina(s.pronostici, giornata);
    if (s.esito !== esito) {
      s.esito = esito;
      await s.save();
    }
    if (esito === 'vinta') vinte.push(s);
  }
  return vinte;
}

// Tutte le schedine di una giornata. Finché si può ancora giocare si vede solo
// quante ne sono state consegnate: nessuno sbircia i pronostici altrui.
const perGiornata = async (req, res) => {
  const numero = Number(req.params.numero);
  const grezza = await Giornata.findOne({ numero }).lean();
  if (!grezza) return res.status(404).json({ errore: 'Giornata non trovata' });

  const schedine = await Schedina.find({ giornataNumero: numero })
    .populate('squadra', 'nome stemma')
    .populate('utente', 'nomeVisualizzato')
    .populate('pronostici.squadraCasa', 'nome stemma')
    .populate('pronostici.squadraTrasferta', 'nome stemma')
    .lean();

  if (!chiusa(grezza)) {
    return res.json({ chiusa: false, quante: schedine.length, schedine: [] });
  }
  res.json({ chiusa: true, quante: schedine.length, schedine });
};

// Le mie schedine passate, per la strisciata "come è andata finora".
const mie = async (req, res) => {
  const schedine = await Schedina.find({ utente: req.utente.id })
    .sort('-giornataNumero')
    .limit(12)
    .lean();
  res.json({ schedine });
};

module.exports = { apertura, salva, perGiornata, mie, risolviSchedine };
