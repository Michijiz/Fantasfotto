const express = require('express');
const Edizione = require('../models/Edizione');
const { richiediAuth, richiediAdmin } = require('../middleware/auth');

const router = express.Router();

const TITOLI = [
  t => `CROLLO VERTICALE: ${t.ultimo} scivola all'ultimo posto e trascina tutti nel baratro`,
  t => `${t.vincitore} DOMINA LA SCENA: la corona della giornata è sua con ${t.puntiVincitore || '??'} punti`,
  t => `TERREMOTO IN LEGA: ${t.bidone} tradisce la fiducia di tutti`,
  t => `MIRACOLO ${t.fenomeno}: la prestazione che nessuno si aspettava`,
  t => `DISASTRO ANNUNCIATO: ${t.ultimo} si ferma a soli ${t.puntiUltimo || '??'} punti`,
  t => `LA LEGA IN GINOCCHIO: ${t.bidone} delude ancora una volta`
];
const OCCHIELLI = [
  t => `Giornata ${t.giornata} — La verità che nessuno voleva sentire`,
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

// Elenco edizioni (per archivio), più recenti prima
router.get('/', richiediAuth, async (req, res) => {
  const edizioni = await Edizione.find().sort({ giornata: -1 });
  res.json(edizioni);
});

// Ultima edizione pubblicata
router.get('/ultima', richiediAuth, async (req, res) => {
  const e = await Edizione.findOne().sort({ giornata: -1 });
  res.json(e || null);
});

router.get('/:id', richiediAuth, async (req, res) => {
  const e = await Edizione.findById(req.params.id);
  if (!e) return res.status(404).json({ errore: 'Edizione non trovata' });
  res.json(e);
});

// Pubblica nuova edizione - solo direttore/admin di turno (qualsiasi admin)
router.post('/', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { vincitore, puntiVincitore, ultimo, puntiUltimo, fenomeno, bidone, direttore } = req.body;
    const ultimaEdizione = await Edizione.findOne().sort({ giornata: -1 });
    const giornata = (ultimaEdizione?.giornata || 0) + 1;

    const t = {
      vincitore: vincitore || 'Un anonimo',
      ultimo: ultimo || 'Un anonimo',
      fenomeno: fenomeno || vincitore || 'Un anonimo',
      bidone: bidone || ultimo || 'Un anonimo',
      puntiVincitore, puntiUltimo, giornata
    };

    const edizione = await Edizione.create({
      giornata,
      direttore: direttore || req.utente.nomeVisualizzato,
      occhiello: pick(OCCHIELLI)(t),
      titolo: pick(TITOLI)(t),
      corpo: [pick(P_FENOMENO)(t), pick(P_BIDONE)(t), pick(P_CHIUSURA)(t)],
      stats: { vincitore: t.vincitore, puntiVincitore, ultimo: t.ultimo, puntiUltimo, fenomeno: t.fenomeno, bidone: t.bidone },
      createdBy: req.utente.id
    });

    res.status(201).json(edizione);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nella pubblicazione' });
  }
});

module.exports = router;
