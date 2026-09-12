const Giornata = require('../models/Giornata');
const { arricchisciGiornata } = require('../utils/regolamento');

// Le giornate in uscita hanno, per ogni accoppiamento, i campi calcolati
// fantapuntiCasa/fantapuntiTrasferta e golCasa/golTrasferta (null finché manca
// uno dei due punteggi). I punteggi salvati restano quelli originali: i campi
// calcolati non vanno rimandati indietro con PATCH.

const lista = async (req, res) => {
  const giornate = await Giornata.find()
    .sort('-numero')
    .populate('accoppiamenti.squadraCasa', 'nome stemma')
    .populate('accoppiamenti.squadraTrasferta', 'nome stemma')
    .lean();
  res.json({ giornate: giornate.map(arricchisciGiornata) });
};

// La prossima giornata non ancora conclusa, usata per il derby-preview in Home.
const prossima = async (req, res) => {
  const giornata = await Giornata.findOne({ conclusa: false })
    .sort('numero')
    .populate('accoppiamenti.squadraCasa', 'nome stemma')
    .populate('accoppiamenti.squadraTrasferta', 'nome stemma')
    .lean();
  res.json({ giornata: arricchisciGiornata(giornata) });
};

const crea = async (req, res) => {
  const { numero, serieANumero, data, accoppiamenti } = req.body;
  if (!numero) return res.status(400).json({ errore: 'Numero giornata richiesto' });

  const giornata = await Giornata.create({
    numero,
    serieANumero,
    data,
    accoppiamenti: accoppiamenti || [],
    createdBy: req.utente.id
  });
  res.status(201).json({ giornata });
};

// Salvataggio del calendario di una giornata, per numero invece che per id: è
// l'unico modo pratico di lavorare dall'admin, perché una Giornata può essere già
// nata da sola quando è stata pubblicata un'edizione con i punteggi. $set mirato
// (non sostituzione del documento) così i punteggi già registrati restano.
const salva = async (req, res) => {
  const numero = Number(req.params.numero ?? req.body.numero);
  const { serieANumero, data, accoppiamenti, conclusa } = req.body;
  if (!numero) return res.status(400).json({ errore: 'Numero giornata richiesto' });

  const coppie = (accoppiamenti || []).filter((a) => a.squadraCasa && a.squadraTrasferta);

  // Una squadra non può giocare due volte nella stessa giornata: è quasi sempre
  // un errore di battitura nel form, e falserebbe la classifica in silenzio.
  const viste = new Set();
  for (const a of coppie) {
    for (const id of [String(a.squadraCasa), String(a.squadraTrasferta)]) {
      if (viste.has(id)) {
        return res.status(400).json({ errore: 'Una squadra compare in due scontri della stessa giornata' });
      }
      viste.add(id);
    }
  }

  const aggiornamenti = { accoppiamenti: coppie, createdBy: req.utente.id };
  if (serieANumero !== undefined) aggiornamenti.serieANumero = serieANumero || undefined;
  if (data !== undefined) aggiornamenti.data = data || undefined;
  if (conclusa !== undefined) aggiornamenti.conclusa = conclusa;

  const giornata = await Giornata.findOneAndUpdate(
    { numero },
    { $set: aggiornamenti, $setOnInsert: { numero } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ giornata });
};

const aggiorna = async (req, res) => {
  const { accoppiamenti, punteggi, conclusa } = req.body;
  const aggiornamenti = {};
  if (accoppiamenti !== undefined) aggiornamenti.accoppiamenti = accoppiamenti;
  if (punteggi !== undefined) aggiornamenti.punteggi = punteggi;
  if (conclusa !== undefined) aggiornamenti.conclusa = conclusa;

  const giornata = await Giornata.findByIdAndUpdate(req.params.id, aggiornamenti, { new: true });
  if (!giornata) return res.status(404).json({ errore: 'Giornata non trovata' });
  res.json({ giornata });
};

module.exports = { lista, prossima, crea, salva, aggiorna };
