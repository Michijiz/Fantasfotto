const express = require('express');
const mongoose = require('mongoose');
const Edizione = require('../models/Edizione');
const Giornata = require('../models/Giornata');
const { richiediAuth, richiediAdmin } = require('../middleware/auth');

const router = express.Router();

const TITOLI = [
  t => `CROLLO VERTICALE: ${t.ultimo} scivola all'ultimo posto e trascina tutti nel baratro`,
  t => `${t.vincitore} DOMINA LA SCENA: la corona della giornata è sua con ${t.puntiVincitore ?? '??'} punti`,
  t => `TERREMOTO IN LEGA: ${t.bidone} tradisce la fiducia di tutti`,
  t => `MIRACOLO ${t.fenomeno}: la prestazione che nessuno si aspettava`,
  t => `DISASTRO ANNUNCIATO: ${t.ultimo} si ferma a soli ${t.puntiUltimo ?? '??'} punti`,
  t => `LA LEGA IN GINOCCHIO: ${t.bidone} delude ancora una volta`
];
const OCCHIELLI = [
  t => `Giornata ${t.giornataNumero} — La verità che nessuno voleva sentire`,
  () => `Cronaca di un'ennesima follia della Lega`,
  () => `Il Direttore non le manda a dire`,
  () => `Fonti vicine alla Lega confermano il disastro`
];
const P_FENOMENO = [
  t => `Nel mezzo del caos, spicca la prestazione di ${t.fenomeno}, che si conferma il vero trascinatore della giornata e lascia la Lega senza parole.`,
  t => `${t.fenomeno} illumina la giornata con una prova sontuosa, mentre il resto della Lega osserva in silenzio, invidiosa.`,
  t => `Applausi per ${t.fenomeno}, autore di una prestazione che rimarrà negli annali, almeno fino alla prossima giornata.`
];
const P_BIDONE = [
  t => `Dall'altra parte della barricata, ${t.bidone} conferma tutte le paure della vigilia con una prova sottotono.`,
  t => `${t.bidone} si presenta con grandi ambizioni e le disattende puntualmente, tra lo sconforto generale.`,
  t => `Non tutte le giornate sono da ricordare: ${t.bidone} lo sa bene, dopo una prestazione da dimenticare.`
];
const P_CHIUSURA = [
  () => `La classifica generale resta un campo di battaglia aperto, e nella Lega nessuno può dirsi al sicuro.`,
  () => `Il countdown per la prossima giornata è già iniziato: la Lega non perdona e non dimentica.`,
  () => `Resta da vedere chi sarà il prossimo a finire sul banco degli imputati.`
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function popolaEdizione(query) {
  return query
    .populate('giornata', 'numero data')
    .populate('stats.vincitore', 'nome stemma')
    .populate('stats.ultimo', 'nome stemma')
    .populate('stats.fenomeno', 'nome stemma')
    .populate('stats.bidone', 'nome stemma');
}

// Elenco edizioni (per archivio). NB: ordinate per data di pubblicazione, non per numero
// giornata (non è più un campo diretto, ma un riferimento) - va bene finché si pubblica in ordine.
router.get('/', richiediAuth, async (req, res) => {
  const edizioni = await popolaEdizione(Edizione.find().sort({ createdAt: -1 }));
  res.json(edizioni);
});

// Ultima edizione pubblicata
router.get('/ultima', richiediAuth, async (req, res) => {
  const e = await popolaEdizione(Edizione.findOne().sort({ createdAt: -1 }));
  res.json(e || null);
});

router.get('/:id', richiediAuth, async (req, res) => {
  const e = await popolaEdizione(Edizione.findById(req.params.id));
  if (!e) return res.status(404).json({ errore: 'Edizione non trovata' });
  res.json(e);
});

// Calcola la classifica (squadra -> punti) di una giornata dai suoi accoppiamenti
function classificaGiornata(giornata) {
  const righe = [];
  giornata.accoppiamenti.forEach(a => {
    if (a.punteggioCasa != null) righe.push({ squadra: a.squadraCasa, punti: a.punteggioCasa });
    if (a.punteggioTrasferta != null) righe.push({ squadra: a.squadraTrasferta, punti: a.punteggioTrasferta });
  });
  return righe.sort((x, y) => y.punti - x.punti);
}

// Pubblica nuova edizione - solo direttore/admin di turno (qualsiasi admin)
// Vincitore/ultimo si calcolano dai punteggi reali della Giornata; fenomeno/bidone sono
// una scelta editoriale (di default coincidono con vincitore/ultimo se non specificati).
router.post('/', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { giornataId, direttore, fenomeno, bidone } = req.body;
    if (!giornataId || !mongoose.isValidObjectId(giornataId)) {
      return res.status(400).json({ errore: 'Giornata non valida' });
    }

    const giornata = await Giornata.findById(giornataId).populate('accoppiamenti.squadraCasa accoppiamenti.squadraTrasferta', 'nome');
    if (!giornata) return res.status(404).json({ errore: 'Giornata non trovata' });
    if (!giornata.conclusa) {
      return res.status(400).json({ errore: 'La giornata non è ancora conclusa: mancano dei punteggi' });
    }

    const giaPubblicata = await Edizione.findOne({ giornata: giornataId });
    if (giaPubblicata) return res.status(409).json({ errore: 'Esiste già un\'edizione per questa giornata' });

    const classifica = classificaGiornata(giornata);
    if (!classifica.length) {
      return res.status(400).json({ errore: 'Nessun punteggio disponibile per questa giornata' });
    }

    const testaClassifica = classifica[0];
    const codaClassifica = classifica[classifica.length - 1];

    const idFenomeno = fenomeno || String(testaClassifica.squadra._id);
    const idBidone = bidone || String(codaClassifica.squadra._id);

    const squadraFenomeno = classifica.find(r => String(r.squadra._id) === String(idFenomeno))?.squadra || testaClassifica.squadra;
    const squadraBidone = classifica.find(r => String(r.squadra._id) === String(idBidone))?.squadra || codaClassifica.squadra;

    const t = {
      vincitore: testaClassifica.squadra.nome,
      puntiVincitore: testaClassifica.punti,
      ultimo: codaClassifica.squadra.nome,
      puntiUltimo: codaClassifica.punti,
      fenomeno: squadraFenomeno.nome,
      bidone: squadraBidone.nome,
      giornataNumero: giornata.numero
    };

    const edizione = await Edizione.create({
      giornata: giornataId,
      direttore: direttore || req.utente.nomeVisualizzato,
      occhiello: pick(OCCHIELLI)(t),
      titolo: pick(TITOLI)(t),
      corpo: [pick(P_FENOMENO)(t), pick(P_BIDONE)(t), pick(P_CHIUSURA)(t)],
      stats: {
        vincitore: testaClassifica.squadra._id,
        puntiVincitore: testaClassifica.punti,
        ultimo: codaClassifica.squadra._id,
        puntiUltimo: codaClassifica.punti,
        fenomeno: squadraFenomeno._id,
        bidone: squadraBidone._id
      },
      createdBy: req.utente.id
    });

    const edizionePopolata = await popolaEdizione(Edizione.findById(edizione._id));
    res.status(201).json(edizionePopolata);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ errore: 'Esiste già un\'edizione per questa giornata' });
    }
    res.status(500).json({ errore: 'Errore nella pubblicazione' });
  }
});

module.exports = router;
