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

module.exports = { lista, prossima, crea, aggiorna };
