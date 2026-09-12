const Edizione = require('../models/Edizione');
const Giornata = require('../models/Giornata');
const { risolviSchedine } = require('./schedineController');

const POPOLA_STATS = [
  'stats.vincitore', 'stats.ultimo', 'stats.fenomeno', 'stats.bidone', 'stats.reDeiGufi'
].map((path) => ({ path, select: 'nome stemma' }));

const lista = async (req, res) => {
  const edizioni = await Edizione.find().sort('-giornataNumero').populate(POPOLA_STATS);
  res.json({ edizioni });
};

const ultima = async (req, res) => {
  const edizione = await Edizione.findOne().sort('-createdAt').populate(POPOLA_STATS);
  res.json({ edizione });
};

const dettaglio = async (req, res) => {
  const edizione = await Edizione.findById(req.params.id).populate(POPOLA_STATS);
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });
  res.json({ edizione });
};

// Registra i punteggi delle squadre su una Giornata conclusa, così alimentano il
// Tabellone anche senza calendario/scontri importati. $set (non sostituzione
// totale del documento) preserva eventuali accoppiamenti già presenti.
async function registraPunteggi(giornataNumero, punteggiSquadre, utenteId) {
  const aggiornamento = {
    $set: { punteggi: punteggiSquadre, conclusa: true, createdBy: utenteId },
    $setOnInsert: { numero: giornataNumero }
  };
  try {
    await Giornata.findOneAndUpdate({ numero: giornataNumero }, aggiornamento, {
      upsert: true, setDefaultsOnInsert: true
    });
  } catch (err) {
    // Race condition nota di Mongo su upsert concorrenti sulla stessa chiave unica
    // (es. doppio click sul bottone "Manda in stampa"): a quel punto il documento
    // esiste già, quindi un update semplice (senza upsert) completa comunque.
    if (err.code !== 11000) throw err;
    await Giornata.updateOne(
      { numero: giornataNumero },
      { $set: { punteggi: punteggiSquadre, conclusa: true, createdBy: utenteId } }
    );
  }
}

const crea = async (req, res) => {
  const {
    giornataNumero, direttore, occhiello, titolo, corpo, immagineUrl,
    vincitore, puntiVincitore, ultimo: ultimoId, puntiUltimo, fenomeno, bidone,
    punteggiSquadre
  } = req.body;

  if (!giornataNumero || !direttore || !occhiello || !titolo || !corpo?.length) {
    return res.status(400).json({ errore: 'Compila i campi obbligatori dell\'articolo' });
  }

  // Prima i punteggi, poi le schedine: il Re dei Gufi si può calcolare solo quando
  // i risultati della giornata sono già a posto.
  if (Array.isArray(punteggiSquadre) && punteggiSquadre.length) {
    await registraPunteggi(giornataNumero, punteggiSquadre, req.utente.id);
  }

  const schedineVinte = await risolviSchedine(giornataNumero);
  const reDeiGufi = [...new Set(schedineVinte.map((s) => String(s.squadra)))];

  const edizione = await Edizione.create({
    giornataNumero,
    direttore,
    occhiello,
    titolo,
    corpo,
    immagineUrl,
    stats: {
      vincitore: vincitore || undefined,
      puntiVincitore,
      ultimo: ultimoId || undefined,
      puntiUltimo,
      fenomeno: fenomeno || vincitore || undefined,
      bidone: bidone || ultimoId || undefined,
      reDeiGufi
    },
    createdBy: req.utente.id
  });

  await edizione.populate(POPOLA_STATS);
  res.status(201).json({ edizione });
};

module.exports = { lista, ultima, dettaglio, crea };
