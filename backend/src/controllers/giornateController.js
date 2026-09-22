const Giornata = require('../models/Giornata');
const Schedina = require('../models/Schedina');
const { arricchisciGiornata, chiaveCoppia } = require('../utils/regolamento');
const { risolviSchedine } = require('./schedineController');

// Le giornate in uscita hanno, per ogni accoppiamento, i campi calcolati
// fantapuntiCasa/fantapuntiTrasferta e golCasa/golTrasferta (null finché manca
// uno dei due punteggi). I punteggi salvati restano quelli originali: i campi
// calcolati non vanno rimandati indietro con PATCH.

const POPOLA = [
  { path: 'accoppiamenti.squadraCasa', select: 'nome stemma' },
  { path: 'accoppiamenti.squadraTrasferta', select: 'nome stemma' }
];

const lista = async (req, res) => {
  const giornate = await Giornata.find()
    .sort('-numero')
    .populate(POPOLA)
    .lean();
  res.json({ giornate: giornate.map(arricchisciGiornata) });
};

// La prossima giornata non ancora conclusa, usata per il derby-preview in Home.
const prossima = async (req, res) => {
  const giornata = await Giornata.findOne({ conclusa: false })
    .sort('numero')
    .populate(POPOLA)
    .lean();
  res.json({ giornata: arricchisciGiornata(giornata) });
};

// Salvataggio di una giornata per numero invece che per id: è l'unico modo pratico
// di lavorare dall'admin, perché una Giornata può essere già nata da sola. Qui
// stanno insieme le due cose che riguardano la stessa giornata — chi gioca contro
// chi e quanti fantapunti ha fatto ognuno — così i numeri si scrivono in un posto
// solo e in un posto solo si correggono.
//
// $set mirato (non sostituzione del documento) per non perdere i campi non inviati.
const salva = async (req, res) => {
  const numero = Number(req.params.numero ?? req.body.numero);
  const { serieANumero, data, accoppiamenti, punteggi, conclusa } = req.body;
  if (!numero) return res.status(400).json({ errore: 'Numero giornata richiesto' });

  const aggiornamenti = { createdBy: req.utente.id };

  if (accoppiamenti !== undefined) {
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
    // Gli scontri arrivano dal form come oggetti nudi, senza _id: facendone $set
    // così com'erano, mongoose creava ogni volta sottodocumenti NUOVI, con id
    // nuovi. Le schedine però puntano all'id dello scontro salvato al momento in
    // cui sono state giocate: dopo il primo salvataggio dei punteggi quei
    // riferimenti diventavano orfani e le schedine restavano "in attesa" per
    // sempre. Qui l'id si riprende da quello che c'è già, riconoscendo lo scontro
    // dalle due squadre. Se la coppia cambia (anche solo invertendo campo e
    // trasferta) è un altro scontro e un id nuovo è giusto.
    const esistente = await Giornata.findOne({ numero }).select('accoppiamenti').lean();
    const perCoppia = new Map(
      (esistente?.accoppiamenti || []).map((a) => [chiaveCoppia(a.squadraCasa, a.squadraTrasferta), a])
    );

    aggiornamenti.accoppiamenti = coppie.map((a) => {
      const base = { squadraCasa: a.squadraCasa, squadraTrasferta: a.squadraTrasferta };
      const vecchio = perCoppia.get(chiaveCoppia(a.squadraCasa, a.squadraTrasferta));
      if (!vecchio) return base;
      // Insieme all'id si porta dietro anche la quota già fissata: le quote di una
      // giornata si aprono una volta sola, e un salvataggio dei punteggi non deve
      // rimetterle in discussione sotto a chi ha già consegnato.
      return { ...base, _id: vecchio._id, quote: vecchio.quote };
    });
  }

  if (punteggi !== undefined) {
    const validi = [];
    for (const p of punteggi || []) {
      if (!p.squadra || p.punti === '' || p.punti === null || p.punti === undefined) continue;
      const valore = Number(p.punti);
      if (Number.isNaN(valore)) {
        return res.status(400).json({ errore: 'Punteggio non numerico' });
      }
      // Un fantapunteggio fuori da questo intervallo è una battitura sbagliata,
      // non un risultato: meglio fermarsi che sporcare la classifica.
      if (valore < 0 || valore > 200) {
        return res.status(400).json({ errore: 'Punteggio fuori scala (0-200): controlla la digitazione' });
      }
      validi.push({ squadra: p.squadra, punti: valore });
    }
    aggiornamenti.punteggi = validi;
  }

  if (serieANumero !== undefined) aggiornamenti.serieANumero = serieANumero || undefined;
  if (data !== undefined) aggiornamenti.data = data || undefined;
  if (conclusa !== undefined) aggiornamenti.conclusa = Boolean(conclusa);

  const giornata = await Giornata.findOneAndUpdate(
    { numero },
    { $set: aggiornamenti, $setOnInsert: { numero } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // I risultati possono essere cambiati (anche in correzione): le schedine di quella
  // giornata vanno ricalcolate subito, non alla prossima pubblicazione.
  await risolviSchedine(numero);

  res.json({ giornata });
};

// Elimina la giornata e le schedine che la riguardavano: lasciarle orfane
// significherebbe mostrare pronostici su scontri che non esistono più.
// Le edizioni NON vengono toccate: l'articolo è un pezzo di giornale, resta in
// archivio anche se i numeri della giornata sono stati buttati.
const elimina = async (req, res) => {
  const giornata = await Giornata.findById(req.params.id);
  if (!giornata) return res.status(404).json({ errore: 'Giornata non trovata' });

  await Schedina.deleteMany({ giornataNumero: giornata.numero });
  await giornata.deleteOne();

  res.json({ ok: true, numero: giornata.numero });
};

// `salva` è l'unica via di scrittura: fa da creazione e da correzione (upsert per
// numero) ed è l'unica che controlla i doppioni e la scala dei punteggi. Le vecchie
// POST / e PATCH /:id non le usava nessuna schermata e scrivevano senza quei
// controlli: una rotta che nessuno chiama ma che accetta numeri fuori scala.
module.exports = { lista, prossima, salva, elimina };