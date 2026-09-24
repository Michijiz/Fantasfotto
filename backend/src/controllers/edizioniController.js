const Edizione = require('../models/Edizione');
const Voto = require('../models/Voto');
const { risolviSchedine } = require('./schedineController');

const POPOLA_STATS = [
  'stats.vincitore', 'stats.ultimo', 'stats.fenomeno', 'stats.bidone', 'stats.reDeiGufi'
].map((path) => ({ path, select: 'nome stemma' }));

const lista = async (req, res) => {
  const edizioni = await Edizione.find().sort('-giornataNumero').populate(POPOLA_STATS);
  res.json({ edizioni });
};

// "Ultima" vuol dire la giornata più avanti, non il pezzo scritto per ultimo:
// pubblicando in ritardo l'edizione della 3ª dopo quella della 5ª, in Dashboard
// compariva la 3ª come ultima uscita. A parità di numero vince la più recente.
const ultima = async (req, res) => {
  const edizione = await Edizione.findOne().sort({ giornataNumero: -1, createdAt: -1 }).populate(POPOLA_STATS);
  res.json({ edizione });
};

// I fantapunti NON si inseriscono più da qui: stanno sulla Giornata, insieme agli
// scontri (vedi giornateController.salva). Scrivere gli stessi numeri in due posti
// voleva dire due posti in cui sbagliarli e un solo posto in cui accorgersene.
// L'edizione è tornata a essere l'articolo più i premi di giornata.

function campiEdizione(body) {
  const {
    giornataNumero, direttore, occhiello, titolo, corpo, immagineUrl, didascalia,
    vincitore, puntiVincitore, ultimo, puntiUltimo, fenomeno, bidone
  } = body;

  return {
    giornataNumero,
    direttore,
    occhiello,
    titolo,
    corpo,
    immagineUrl,
    didascalia,
    stats: {
      vincitore: vincitore || undefined,
      puntiVincitore,
      ultimo: ultimo || undefined,
      puntiUltimo,
      fenomeno: fenomeno || vincitore || undefined,
      bidone: bidone || ultimo || undefined
    }
  };
}

function mancaQualcosa(body) {
  return !body.giornataNumero || !body.direttore || !body.occhiello
    || !body.titolo || !body.corpo?.length;
}

// Le squadre di chi ha azzeccato tutta la schedina di quella giornata. Si ricalcola
// sia alla pubblicazione sia alla modifica: se l'edizione viene scritta prima che i
// punteggi siano a posto, basta risalvarla per rimettere a posto anche il premio.
async function calcolaReDeiGufi(giornataNumero) {
  const vinte = await risolviSchedine(giornataNumero);
  return [...new Set(vinte.map((s) => String(s.squadra)))];
}

const crea = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Compila i campi obbligatori dell\'articolo' });
  }

  const campi = campiEdizione(req.body);
  campi.stats.reDeiGufi = await calcolaReDeiGufi(campi.giornataNumero);

  const edizione = await Edizione.create({ ...campi, createdBy: req.utente.id });
  await edizione.populate(POPOLA_STATS);
  res.status(201).json({ edizione });
};

// Correzione di un'edizione già in stampa: un refuso nel titolo non deve costare
// la cancellazione e la riscrittura del pezzo.
const aggiorna = async (req, res) => {
  if (mancaQualcosa(req.body)) {
    return res.status(400).json({ errore: 'Compila i campi obbligatori dell\'articolo' });
  }

  const campi = campiEdizione(req.body);
  campi.stats.reDeiGufi = await calcolaReDeiGufi(campi.giornataNumero);

  const edizione = await Edizione.findByIdAndUpdate(req.params.id, campi, { new: true });
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });

  await edizione.populate(POPOLA_STATS);
  res.json({ edizione });
};

// Elimina anche i voti dell'edizione: senza l'edizione i conteggi non sono più
// raggiungibili da nessuna schermata e resterebbero solo a occupare spazio.
// I punteggi della giornata NON vengono toccati: la classifica vive sulla
// Giornata, non sull'articolo.
const elimina = async (req, res) => {
  const edizione = await Edizione.findById(req.params.id);
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });

  await Voto.deleteMany({ edizione: edizione._id });
  await edizione.deleteOne();

  res.json({ ok: true });
};

module.exports = { lista, ultima, crea, aggiorna, elimina };
