const mongoose = require('mongoose');
const Edizione = require('../models/Edizione');
const Giornata = require('../models/Giornata');
const Schedina = require('../models/Schedina');
const Voto = require('../models/Voto');
const { registra } = require('../services/attivita');
const { urlDelNostroCloud } = require('../services/cloudinary');
const { stagioneCorrente, filtroStagione } = require('../utils/stagione');

// L'autore è l'utente che ha stampato l'edizione; la firma (`direttore`) è solo
// l'etichetta che si legge sul giornale.
const POPOLA_AUTORE = { path: 'createdBy', select: 'nomeVisualizzato' };

const errore = (status, messaggio) => Object.assign(new Error(messaggio), { status });

// Il Re dei Gufi non si salva: si ricava dalle schedine vinte di quella giornata
// ogni volta che l'edizione viene letta. Salvato sull'articolo era una copia che
// restava indietro appena si correggeva un punteggio (le schedine si ricalcolano,
// l'edizione no), e faceva scrivere "tutti gufi a vuoto" anche a giornata ancora
// aperta. Una sola query per tutte le edizioni richieste, non una per edizione.
//
// L'output tiene la forma di prima, `stats.reDeiGufi` con le squadre già
// popolate, così le pagine non cambiano.
async function conReDeiGufi(edizioni) {
  if (edizioni.length === 0) return edizioni;

  const vinte = await Schedina.find({
    esito: 'vinta',
    $or: edizioni.map((e) => ({ stagione: e.stagione, giornataNumero: e.giornataNumero }))
  }).select('stagione giornataNumero squadra').populate('squadra', 'nome stemma').lean();

  const perGiornata = new Map();
  for (const s of vinte) {
    if (!s.squadra) continue;
    const chiave = `${s.stagione}|${s.giornataNumero}`;
    if (!perGiornata.has(chiave)) perGiornata.set(chiave, new Map());
    perGiornata.get(chiave).set(String(s.squadra._id), s.squadra);
  }

  return edizioni.map((e) => ({
    ...e,
    stats: { reDeiGufi: [...(perGiornata.get(`${e.stagione}|${e.giornataNumero}`)?.values() || [])] }
  }));
}

const lista = async (req, res) => {
  const edizioni = await Edizione.find(filtroStagione(req))
    .sort({ stagione: -1, giornataNumero: -1 })
    .populate(POPOLA_AUTORE)
    .lean();
  res.json({ edizioni: await conReDeiGufi(edizioni) });
};

// "Ultima" vuol dire la giornata più avanti, non il pezzo scritto per ultimo:
// pubblicando in ritardo l'edizione della 3ª dopo quella della 5ª, in Dashboard
// compariva la 3ª come ultima uscita. Si guarda la stagione in corso: a inizio
// stagione, prima della prima edizione, la Gazzetta è vuota e non mostra più
// l'ultimo pezzo dell'anno scorso.
const ultima = async (req, res) => {
  const edizione = await Edizione.findOne({ stagione: stagioneCorrente() })
    .sort({ giornataNumero: -1, createdAt: -1 })
    .populate(POPOLA_AUTORE)
    .lean();
  const [con] = await conReDeiGufi(edizione ? [edizione] : []);
  res.json({ edizione: con || null });
};

// I fantapunti NON si inseriscono da qui: stanno sulla Giornata, insieme agli
// scontri (vedi giornateController.salva). Scrivere gli stessi numeri in due posti
// voleva dire due posti in cui sbagliarli e un solo posto in cui accorgersene.
// L'edizione è l'articolo; i premi del tabellino si calcolano.

const MAX = {
  firma: 60, occhiello: 80, titolo: 160, didascalia: 140, paragrafo: 4000, paragrafi: 60,
  commento: 280, commenti: 30
};

const chiaveScontro = (casa, trasferta) => `${casa}>${trasferta}`;

// I commenti per scontro arrivano come [{ squadraCasa, squadraTrasferta, testo }].
// Un testo vuoto vuol dire "nessun commento per questo scontro" e viene scartato:
// il modulo manda un campo per ogni scontro, compilato o no.
function leggiCommenti(grezzi) {
  if (!Array.isArray(grezzi) || grezzi.length > MAX.commenti) {
    throw errore(400, 'Commenti non validi');
  }
  const visti = new Set();
  const commenti = [];
  for (const c of grezzi) {
    const testo = typeof c?.testo === 'string' ? c.testo.trim() : '';
    if (!testo) continue;
    const casa = String(c.squadraCasa || '');
    const trasferta = String(c.squadraTrasferta || '');
    if (!mongoose.isValidObjectId(casa) || !mongoose.isValidObjectId(trasferta)) {
      throw errore(400, 'Commento su uno scontro non valido');
    }
    if (testo.length > MAX.commento) {
      throw errore(400, `Un commento è troppo lungo (massimo ${MAX.commento} caratteri)`);
    }
    const chiave = chiaveScontro(casa, trasferta);
    if (visti.has(chiave)) throw errore(400, 'Due commenti sullo stesso scontro');
    visti.add(chiave);
    commenti.push({ squadraCasa: casa, squadraTrasferta: trasferta, testo });
  }
  return commenti;
}

// I commenti devono riguardare scontri che esistono nel calendario di quella
// giornata: un commento su uno scontro che non c'è non si vedrebbe da nessuna parte.
async function verificaScontri(stagione, giornataNumero, commenti) {
  if (!commenti || commenti.length === 0) return;
  const giornata = await Giornata.findOne({ stagione, numero: giornataNumero })
    .select('accoppiamenti.squadraCasa accoppiamenti.squadraTrasferta').lean();
  const presenti = new Set((giornata?.accoppiamenti || [])
    .map((a) => chiaveScontro(a.squadraCasa, a.squadraTrasferta)));
  if (commenti.some((c) => !presenti.has(chiaveScontro(c.squadraCasa, c.squadraTrasferta)))) {
    throw errore(400, `Un commento riguarda uno scontro che non è nel calendario della G${giornataNumero}`);
  }
}

// Valida e ripulisce il corpo della richiesta. Lancia un errore 400 con il
// messaggio da mostrare; `attuale` è l'edizione già salvata, se si sta correggendo.
function campiEdizione(body, attuale = null) {
  const numero = Number(body.giornataNumero);
  if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
    throw errore(400, 'Il numero di giornata deve essere un intero tra 1 e 99');
  }

  const testo = (v) => (typeof v === 'string' ? v.trim() : '');
  const direttore = testo(body.direttore);
  const occhiello = testo(body.occhiello);
  const titolo = testo(body.titolo);
  const corpo = Array.isArray(body.corpo) ? body.corpo.map(testo).filter(Boolean) : [];

  if (!direttore || !occhiello || !titolo || corpo.length === 0) {
    throw errore(400, 'Compila i campi obbligatori dell\'articolo');
  }
  if (direttore.length > MAX.firma) throw errore(400, `La firma è troppo lunga (massimo ${MAX.firma} caratteri)`);
  if (occhiello.length > MAX.occhiello) throw errore(400, `L'occhiello è troppo lungo (massimo ${MAX.occhiello} caratteri)`);
  if (titolo.length > MAX.titolo) throw errore(400, `Il titolo è troppo lungo (massimo ${MAX.titolo} caratteri)`);
  if (corpo.length > MAX.paragrafi || corpo.some((p) => p.length > MAX.paragrafo)) {
    throw errore(400, 'Il pezzo è troppo lungo: spezzalo in paragrafi più corti');
  }

  // Stesso criterio di stemmi e maglie: foto vuota, invariata (le edizioni vecchie
  // possono avere indirizzi d'altri tempi e non si toccano) oppure caricata da noi.
  const immagineUrl = testo(body.immagineUrl);
  if (immagineUrl && immagineUrl !== (attuale?.immagineUrl || '').trim() && !urlDelNostroCloud(immagineUrl)) {
    throw errore(400, 'Foto: si possono usare solo immagini caricate dall\'app');
  }

  const didascalia = testo(body.didascalia);
  if (didascalia.length > MAX.didascalia) {
    throw errore(400, `La didascalia è troppo lunga (massimo ${MAX.didascalia} caratteri)`);
  }

  const campi = { giornataNumero: numero, direttore, occhiello, titolo, corpo, immagineUrl, didascalia };
  // Chi non manda `commenti` (per esempio una versione dell'app rimasta in cache
  // sul telefono) non deve cancellare quelli già scritti: il campo si tocca solo
  // se arriva esplicito.
  if (body.commenti !== undefined) campi.commenti = leggiCommenti(body.commenti);
  return campi;
}

const giaStampata = (numero) => errore(
  409, `La G${numero} ha già la sua edizione: correggi quella invece di stamparne un'altra`
);

// Rilegge un'edizione nella forma di lista (autore e premi inclusi).
async function leggi(id) {
  const edizione = await Edizione.findById(id).populate(POPOLA_AUTORE).lean();
  const [con] = await conReDeiGufi(edizione ? [edizione] : []);
  return con;
}

const crea = async (req, res) => {
  const campi = campiEdizione(req.body);
  const stagione = stagioneCorrente();

  if (await Edizione.exists({ stagione, giornataNumero: campi.giornataNumero })) {
    throw giaStampata(campi.giornataNumero);
  }

  await verificaScontri(stagione, campi.giornataNumero, campi.commenti);

  // L'indice unico copre la corsa tra due direttori che stampano insieme: il
  // controllo sopra dà il messaggio giusto, l'indice è la garanzia.
  const edizione = await Edizione.create({ ...campi, stagione, createdBy: req.utente.id });
  await registra({
    autore: req.utente.id, tipo: 'edizione',
    dati: { giornata: edizione.giornataNumero, titolo: edizione.titolo }, chiave: String(edizione._id)
  });
  res.status(201).json({ edizione: await leggi(edizione._id) });
};

// Correzione di un'edizione già in stampa: un refuso nel titolo non deve costare
// la cancellazione e la riscrittura del pezzo.
const aggiorna = async (req, res) => {
  const edizione = await Edizione.findById(req.params.id);
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });

  const campi = campiEdizione(req.body, edizione);

  // Spostare l'articolo su un'altra giornata cambia anche quando chiudono i
  // verdetti (si guarda la giornata dopo) e a cosa si riferiscono i voti già dati:
  // finché ci sono voti non si fa. Va comunque a una giornata ancora libera.
  if (campi.giornataNumero !== edizione.giornataNumero) {
    const [occupata, haVoti] = await Promise.all([
      Edizione.exists({ stagione: edizione.stagione, giornataNumero: campi.giornataNumero, _id: { $ne: edizione._id } }),
      Voto.exists({ edizione: edizione._id })
    ]);
    if (occupata) throw giaStampata(campi.giornataNumero);
    if (haVoti) {
      throw errore(409, 'Questa edizione ha già dei verdetti: non si può spostare su un\'altra giornata');
    }
  }

  await verificaScontri(edizione.stagione, campi.giornataNumero, campi.commenti);

  edizione.set(campi);
  await edizione.save();
  res.json({ edizione: await leggi(edizione._id) });
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
