const express = require('express');
const mongoose = require('mongoose');
const Edizione = require('../models/Edizione');
const Squadra = require('../models/Squadra');
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
    .populate('stats.vincitore', 'nome stemma')
    .populate('stats.ultimo', 'nome stemma')
    .populate('stats.fenomeno', 'nome stemma')
    .populate('stats.bidone', 'nome stemma');
}

// Elenco edizioni (per archivio), più recenti prima
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

// Pubblica nuova edizione - solo direttore/admin di turno (qualsiasi admin).
// L'edizione (articolo) e la Giornata (punteggi/classifica) sono due modelli separati, ma si
// pubblicano insieme in un solo passaggio: l'admin scrive a mano numero giornata, vincitore/
// ultimo (obbligatori, con i relativi punti), fenomeno/bidone (opzionali, di default coincidono
// con vincitore/ultimo) e, opzionalmente, il punteggio di ciascuna delle 8 squadre. Se i
// punteggi sono presenti, alla pubblicazione viene creata/aggiornata anche la Giornata
// corrispondente (numero = giornataNumero, con $set per non toccare un eventuale calendario/
// accoppiamenti già importato per quella stessa giornata), che alimenta il tabellone/classifica
// in Home. immagineUrl è opzionale: url Cloudinary caricata via /api/upload.
router.post('/', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { giornataNumero, direttore, vincitore, puntiVincitore, ultimo, puntiUltimo, fenomeno, bidone, immagineUrl, punteggi } = req.body;

    if (giornataNumero === undefined || giornataNumero === null || giornataNumero === '') {
      return res.status(400).json({ errore: 'Numero giornata obbligatorio' });
    }
    if (!vincitore || !ultimo) {
      return res.status(400).json({ errore: 'Vincitore e ultimo classificato sono obbligatori' });
    }
    if (!mongoose.isValidObjectId(vincitore) || !mongoose.isValidObjectId(ultimo)) {
      return res.status(400).json({ errore: 'Squadra vincitore/ultimo non valida' });
    }

    const idFenomeno = fenomeno || vincitore;
    const idBidone = bidone || ultimo;
    if (!mongoose.isValidObjectId(idFenomeno) || !mongoose.isValidObjectId(idBidone)) {
      return res.status(400).json({ errore: 'Squadra fenomeno/bidone non valida' });
    }

    const idsDaCaricare = [...new Set([vincitore, ultimo, idFenomeno, idBidone])];
    const squadreCoinvolte = await Squadra.find({ _id: { $in: idsDaCaricare } });
    const mappaSquadre = new Map(squadreCoinvolte.map(s => [String(s._id), s]));

    const squadraVincitore = mappaSquadre.get(String(vincitore));
    const squadraUltimo = mappaSquadre.get(String(ultimo));
    if (!squadraVincitore || !squadraUltimo) {
      return res.status(400).json({ errore: 'Squadra vincitore/ultimo non trovata' });
    }
    const squadraFenomeno = mappaSquadre.get(String(idFenomeno)) || squadraVincitore;
    const squadraBidone = mappaSquadre.get(String(idBidone)) || squadraUltimo;

    // Punteggi delle squadre per questa giornata (opzionali): validati e ripuliti prima di
    // toccare il database. Un punteggio scartato (squadra non valida, punti non numerici) non
    // blocca la pubblicazione dell'articolo: viene semplicemente ignorato.
    let punteggiValidi = [];
    if (Array.isArray(punteggi) && punteggi.length) {
      const idSquadreCensite = new Set((await Squadra.find().select('_id')).map(s => String(s._id)));
      punteggiValidi = punteggi
        .filter(p => p && mongoose.isValidObjectId(p.squadraId) && idSquadreCensite.has(String(p.squadraId)))
        .map(p => ({ squadra: p.squadraId, punti: Number(p.punti) }))
        .filter(p => !Number.isNaN(p.punti));
    }

    const t = {
      vincitore: squadraVincitore.nome,
      puntiVincitore: puntiVincitore ?? '??',
      ultimo: squadraUltimo.nome,
      puntiUltimo: puntiUltimo ?? '??',
      fenomeno: squadraFenomeno.nome,
      bidone: squadraBidone.nome,
      giornataNumero
    };

    const edizione = await Edizione.create({
      giornataNumero,
      direttore: direttore || req.utente.nomeVisualizzato,
      occhiello: pick(OCCHIELLI)(t),
      titolo: pick(TITOLI)(t),
      corpo: [pick(P_FENOMENO)(t), pick(P_BIDONE)(t), pick(P_CHIUSURA)(t)],
      immagineUrl: immagineUrl || '',
      stats: {
        vincitore: squadraVincitore._id,
        puntiVincitore: puntiVincitore !== undefined && puntiVincitore !== '' ? Number(puntiVincitore) : undefined,
        ultimo: squadraUltimo._id,
        puntiUltimo: puntiUltimo !== undefined && puntiUltimo !== '' ? Number(puntiUltimo) : undefined,
        fenomeno: squadraFenomeno._id,
        bidone: squadraBidone._id
      },
      createdBy: req.utente.id
    });

    if (punteggiValidi.length) {
      await Giornata.findOneAndUpdate(
        { numero: giornataNumero },
        {
          $set: { conclusa: true, punteggi: punteggiValidi },
          $setOnInsert: { numero: giornataNumero, createdBy: req.utente.id }
        },
        { upsert: true, new: true }
      );
    }

    const edizionePopolata = await popolaEdizione(Edizione.findById(edizione._id));
    res.status(201).json(edizionePopolata);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nella pubblicazione' });
  }
});

module.exports = router;