const Schedina = require('../models/Schedina');
const Giornata = require('../models/Giornata');
const Squadra = require('../models/Squadra');
const User = require('../models/User');
const {
  arricchisciGiornata, arricchisciConQuote, calcolaClassifica, esitoSchedina,
  calcolaQuoteGiornata, quoteDaForma
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

// Apre il banco: fissa una volta sola le quote degli scontri di una giornata.
// Da qui in poi il tabellone di quella giornata non cambia più, quindi due
// schedine con gli stessi pronostici valgono uguale anche se consegnate a giorni
// di distanza. Prima le quote si ricalcolavano a ogni consegna sulla classifica
// di quell'istante: bastava che la redazione chiudesse la giornata precedente —
// cosa che succede a metà settimana, a schedine già aperte — perché la stessa
// identica multipla passasse da 9,67 a 4,62.
//
// Idempotente: se le quote ci sono già non tocca niente e non scrive. Tocca solo
// gli scontri che ne sono sprovvisti, così uno scontro aggiunto dopo prende le
// sue senza rifare quelle degli altri.
// Torna true se ha scritto, così chi chiama sa se deve rileggere la giornata.
async function assicuraQuote(numero) {
  const giornata = await Giornata.findOne({ numero });
  if (!giornata || giornata.accoppiamenti.length === 0) return false;

  const scoperti = giornata.accoppiamenti.filter((a) => a.quote?.casa == null);
  if (scoperti.length === 0) return false;

  const tabellone = await tabelloneCorrente();
  const calcolate = calcolaQuoteGiornata(giornata.toObject(), tabellone);

  giornata.accoppiamenti.forEach((a, i) => {
    if (a.quote?.casa != null) return;
    a.quote = quoteDaForma(calcolate[i]);
  });
  if (!giornata.quoteFissateIl) giornata.quoteFissateIl = new Date();

  await giornata.save();
  return true;
}

// Le schedine si risolvono da sole appena i risultati ci sono: non serve che la
// redazione riapra e risalvi la giornata perché smettano di dire "in attesa".
// Gira all'apertura della pagina, costa una query quando non c'è niente da fare
// e non scrive nulla se nessun esito è cambiato (risolviSchedine è idempotente).
// Le cinque più recenti bastano: più indietro di così non c'è niente di aperto.
async function risolviArretrate() {
  const numeri = await Schedina.distinct('giornataNumero', { esito: 'attesa' });
  const recenti = numeri.sort((a, b) => b - a).slice(0, 5);
  for (const numero of recenti) await risolviSchedine(numero);
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
  await risolviArretrate();

  let grezza = await giornataAperta();
  // Il banco si apre alla prima richiesta della giornata: è il momento in cui
  // qualcuno potrebbe giocarla, quindi è lì che le quote devono cristallizzarsi.
  if (grezza && await assicuraQuote(grezza.numero)) grezza = await giornataAperta();

  const precedente = await giornataPrecedente(req.utente.id);

  if (!grezza) {
    return res.json({
      giornata: null, miaSchedina: null, chiusa: true, motivo: 'nessuna-giornata', precedente
    });
  }

  // Niente tabellone: le quote stanno sugli scontri e non si ricalcolano più.
  const giornata = arricchisciConQuote(arricchisciGiornata(grezza));

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

  // Se per qualche motivo il banco non si fosse ancora aperto (schedina consegnata
  // senza passare dalla pagina), lo si apre adesso. Le quote restano comunque
  // quelle fissate una volta sola: qui non si ricalcola niente, ed è il motivo per
  // cui il numero che vedi a schermo è lo stesso che ti viene salvato.
  await assicuraQuote(giornataNumero);

  const grezza = await Giornata.findOne({ numero: giornataNumero }).populate(POPOLA_SQUADRE).lean();
  if (!grezza) return res.status(404).json({ errore: 'Giornata non trovata' });
  if (chiusa(grezza)) return res.status(400).json({ errore: 'Schedine chiuse per questa giornata' });

  const giornata = arricchisciConQuote(arricchisciGiornata(grezza));
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
  if (!utente) return res.status(401).json({ errore: 'Utente non trovato' });

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

// Tutte le schedine di una giornata. Finché si può ancora giocare si vede chi ha
// consegnato (nome e squadra), ma non i pronostici: lo scontrino resta segreto
// fino alla chiusura, così nessuno copia.
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
    const partecipanti = schedine.map((s) => ({ utente: s.utente, squadra: s.squadra }));
    return res.json({ chiusa: false, quante: schedine.length, partecipanti, schedine: [] });
  }
  res.json({ chiusa: true, quante: schedine.length, schedine });
};

// Il bilancio personale per la pagina Profilo: quante schedine consegnate e
// quante azzeccate per intero. Le giornate ancora aperte non contano come giocate.
const mie = async (req, res) => {
  const [giocate, vinte] = await Promise.all([
    Schedina.countDocuments({ utente: req.utente.id, esito: { $ne: 'attesa' } }),
    Schedina.countDocuments({ utente: req.utente.id, esito: 'vinta' })
  ]);
  res.json({ giocate, vinte });
};

module.exports = { apertura, salva, perGiornata, risolviSchedine, mie };