const express = require('express');
const Giornata = require('../models/Giornata');
const Squadra = require('../models/Squadra');
const { richiediAuth, richiediAdmin } = require('../middleware/auth');

const router = express.Router();

async function popolaGiornata(query) {
  return query
    .populate('accoppiamenti.squadraCasa', 'nome stemma')
    .populate('accoppiamenti.squadraTrasferta', 'nome stemma');
}

// Elenco giornate, più recenti prima
router.get('/', richiediAuth, async (req, res) => {
  const giornate = await popolaGiornata(Giornata.find().sort({ numero: -1 }));
  res.json(giornate);
});

// Prossima giornata non ancora conclusa (per countdown in home)
router.get('/prossima', richiediAuth, async (req, res) => {
  const g = await popolaGiornata(Giornata.findOne({ conclusa: false }).sort({ numero: 1 }));
  res.json(g || null);
});

router.get('/:id', richiediAuth, async (req, res) => {
  const g = await popolaGiornata(Giornata.findById(req.params.id));
  if (!g) return res.status(404).json({ errore: 'Giornata non trovata' });
  res.json(g);
});

// Crea giornata manualmente, accoppiamenti già con gli ObjectId delle squadre
router.post('/', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { numero, data, accoppiamenti } = req.body;
    if (!numero || !Array.isArray(accoppiamenti) || !accoppiamenti.length) {
      return res.status(400).json({ errore: 'Numero giornata e almeno un accoppiamento sono obbligatori' });
    }

    const esistente = await Giornata.findOne({ numero });
    if (esistente) return res.status(409).json({ errore: 'Esiste già una giornata con questo numero' });

    const giornata = await Giornata.create({
      numero,
      data: data || undefined,
      accoppiamenti,
      createdBy: req.utente.id
    });

    res.status(201).json(giornata);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nella creazione della giornata' });
  }
});

// Import da CSV incollato: intestazioni squadraCasa,squadraTrasferta,punteggioCasa,punteggioTrasferta
// Le squadre vengono matchate per nome (case-insensitive) contro quelle già censite.
router.post('/importa', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { numero, data, csv } = req.body;
    if (!numero || !csv) {
      return res.status(400).json({ errore: 'Numero giornata e contenuto CSV sono obbligatori' });
    }

    const righe = csv.split('\n').map(r => r.trim()).filter(Boolean);
    if (righe.length < 2) {
      return res.status(400).json({ errore: 'CSV vuoto o senza righe dati' });
    }

    const intestazioni = righe[0].split(',').map(h => h.trim().toLowerCase());
    const idxCasa = intestazioni.indexOf('squadracasa');
    const idxTrasferta = intestazioni.indexOf('squadratrasferta');
    const idxPuntiCasa = intestazioni.indexOf('punteggiocasa');
    const idxPuntiTrasferta = intestazioni.indexOf('punteggiotrasferta');

    if (idxCasa === -1 || idxTrasferta === -1) {
      return res.status(400).json({ errore: 'Intestazioni mancanti: servono almeno squadraCasa,squadraTrasferta' });
    }

    const squadre = await Squadra.find({ attiva: true });
    const mappaNomi = new Map(squadre.map(s => [s.nome.trim().toLowerCase(), s._id]));

    const accoppiamenti = [];
    const nomiNonTrovati = new Set();

    righe.slice(1).forEach(riga => {
      const colonne = riga.split(',').map(c => c.trim());
      const nomeCasa = colonne[idxCasa];
      const nomeTrasferta = colonne[idxTrasferta];

      const idCasa = mappaNomi.get((nomeCasa || '').toLowerCase());
      const idTrasferta = mappaNomi.get((nomeTrasferta || '').toLowerCase());
      if (!idCasa) nomiNonTrovati.add(nomeCasa);
      if (!idTrasferta) nomiNonTrovati.add(nomeTrasferta);

      accoppiamenti.push({
        squadraCasa: idCasa,
        squadraTrasferta: idTrasferta,
        punteggioCasa: idxPuntiCasa !== -1 && colonne[idxPuntiCasa] !== '' ? Number(colonne[idxPuntiCasa]) : null,
        punteggioTrasferta: idxPuntiTrasferta !== -1 && colonne[idxPuntiTrasferta] !== '' ? Number(colonne[idxPuntiTrasferta]) : null
      });
    });

    if (nomiNonTrovati.size) {
      return res.status(400).json({
        errore: `Squadre non censite: ${[...nomiNonTrovati].join(', ')}. Registrale prima di importare.`
      });
    }

    const giornata = await Giornata.findOneAndUpdate(
      { numero },
      { numero, data: data || undefined, accoppiamenti, createdBy: req.utente.id },
      { upsert: true, new: true }
    );

    res.status(201).json(giornata);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nell\'importazione del calendario' });
  }
});

// Aggiorna punteggi/stato di una giornata (es. via via che le partite finiscono)
router.put('/:id', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const giornata = await Giornata.findById(req.params.id);
    if (!giornata) return res.status(404).json({ errore: 'Giornata non trovata' });

    const { accoppiamenti, conclusa, data } = req.body;

    if (Array.isArray(accoppiamenti)) {
      accoppiamenti.forEach(agg => {
        const match = giornata.accoppiamenti.id(agg._id);
        if (match) {
          if (agg.punteggioCasa !== undefined) match.punteggioCasa = agg.punteggioCasa;
          if (agg.punteggioTrasferta !== undefined) match.punteggioTrasferta = agg.punteggioTrasferta;
        }
      });
    }
    if (conclusa !== undefined) giornata.conclusa = conclusa;
    if (data !== undefined) giornata.data = data;

    await giornata.save();
    res.json(giornata);
  } catch (e) {
    res.status(500).json({ errore: 'Errore nell\'aggiornamento della giornata' });
  }
});

router.delete('/:id', richiediAuth, richiediAdmin, async (req, res) => {
  const giornata = await Giornata.findByIdAndDelete(req.params.id);
  if (!giornata) return res.status(404).json({ errore: 'Giornata non trovata' });
  res.json({ ok: true });
});

// Parsa il testo copiato dalla pagina "Calendario" di Leghe Fantacalcio.
// Formato atteso, ripetuto per ogni giornata:
//   "N° Giornata (M° giornata di Serie A)"
//   nome squadra / punteggio, ripetuto 8 volte (4 accoppiamenti in sequenza: casa poi trasferta)
function parsaCalendarioLeghe(testo) {
  const righe = testo.split('\n').map(r => r.trim()).filter(Boolean);
  const regexHeader = /^(\d+)°\s*Giornata(?:\s*\((\d+)°\s*giornata di Serie A\))?/i;

  const giornate = [];
  let i = 0;
  while (i < righe.length) {
    const match = righe[i].match(regexHeader);
    if (!match) { i++; continue; }

    const numero = Number(match[1]);
    const serieANumero = match[2] ? Number(match[2]) : undefined;
    i++;

    const voci = [];
    while (i < righe.length && !regexHeader.test(righe[i])) {
      const nome = righe[i];
      const punteggioRaw = righe[i + 1];
      if (punteggioRaw === undefined) break;
      voci.push({ nome, punteggioRaw });
      i += 2;
    }

    const accoppiamenti = [];
    for (let k = 0; k + 1 < voci.length; k += 2) {
      accoppiamenti.push({
        nomeCasa: voci[k].nome,
        nomeTrasferta: voci[k + 1].nome
      });
    }

    giornate.push({ numero, serieANumero, accoppiamenti });
  }

  return giornate;
}

// Import massivo del calendario dell'intera stagione, incollando il testo copiato dalla pagina
// "Calendario" di Leghe Fantacalcio. I punteggi non vengono letti da qui (sono placeholder a 0
// finché non si gioca): questo endpoint crea solo gli accoppiamenti, non i risultati.
// Le giornate il cui numero esiste già non vengono toccate, per non perdere risultati già inseriti.
router.post('/importa-calendario', richiediAuth, richiediAdmin, async (req, res) => {
  try {
    const { testo } = req.body;
    if (!testo || !testo.trim()) {
      return res.status(400).json({ errore: 'Testo del calendario mancante' });
    }

    const giornateTestuali = parsaCalendarioLeghe(testo);
    if (!giornateTestuali.length) {
      return res.status(400).json({ errore: 'Non ho riconosciuto nessuna giornata nel testo incollato' });
    }

    const squadre = await Squadra.find({ attiva: true });
    const mappaNomi = new Map(squadre.map(s => [s.nome.trim().toLowerCase(), s._id]));

    const nomiNonTrovati = new Set();
    giornateTestuali.forEach(g => {
      g.accoppiamenti.forEach(a => {
        if (!mappaNomi.has(a.nomeCasa.toLowerCase())) nomiNonTrovati.add(a.nomeCasa);
        if (!mappaNomi.has(a.nomeTrasferta.toLowerCase())) nomiNonTrovati.add(a.nomeTrasferta);
      });
    });

    if (nomiNonTrovati.size) {
      return res.status(400).json({
        errore: `Squadre non censite: ${[...nomiNonTrovati].join(', ')}. Registrale prima di importare il calendario.`
      });
    }

    const numeriEsistenti = new Set(
      (await Giornata.find({ numero: { $in: giornateTestuali.map(g => g.numero) } }).select('numero')).map(g => g.numero)
    );

    const daCreare = giornateTestuali.filter(g => !numeriEsistenti.has(g.numero));

    const documenti = daCreare.map(g => ({
      numero: g.numero,
      serieANumero: g.serieANumero,
      accoppiamenti: g.accoppiamenti.map(a => ({
        squadraCasa: mappaNomi.get(a.nomeCasa.toLowerCase()),
        squadraTrasferta: mappaNomi.get(a.nomeTrasferta.toLowerCase()),
        punteggioCasa: null,
        punteggioTrasferta: null
      })),
      createdBy: req.utente.id
    }));

    if (documenti.length) await Giornata.insertMany(documenti);

    res.status(201).json({
      create: documenti.length,
      saltate: giornateTestuali.length - documenti.length,
      numeriSaltati: giornateTestuali.filter(g => numeriEsistenti.has(g.numero)).map(g => g.numero)
    });
  } catch (e) {
    res.status(500).json({ errore: 'Errore nell\'importazione del calendario' });
  }
});

module.exports = router;
