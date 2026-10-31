const Voto = require('../models/Voto');
const Edizione = require('../models/Edizione');
const Giornata = require('../models/Giornata');
const User = require('../models/User');
const { registra } = require('../services/attivita');
const { stagioneCorrente } = require('../utils/stagione');
const { inviaATutti } = require('../services/notifiche');

// Le votazioni su un'edizione restano aperte fino al fischio d'inizio della
// giornata dopo. Senza data impostata su quella giornata, restano aperte finché
// non viene conclusa.
const chiusaDa = (dopo) => {
  if (!dopo) return false;
  if (dopo.conclusa) return true;
  return Boolean(dopo.data && new Date(dopo.data).getTime() <= Date.now());
};

async function votazioniChiuse(edizione) {
  if (edizione.votiChiusi) return true;
  const dopo = await Giornata.findOne({ stagione: edizione.stagione || stagioneCorrente(), numero: edizione.giornataNumero + 1 }).select('data conclusa').lean();
  return chiusaDa(dopo);
}

// Categorie di voto disponibili per edizione. Tenute qui (non in DB) perché
// cambiano raramente e servono sia al form di voto che ai conteggi. Le etichette
// viaggiano insieme all'id: il frontend non ne tiene più una copia sua, così
// aggiungere una categoria è una riga sola e non due file da tenere allineati.
//
// L'id non va mai cambiato una volta pubblicato: è la chiave con cui sono
// registrati i voti già dati.
const CATEGORIE_DEF = [
  { id: 'fenomeno', etichetta: 'Fenomeno di giornata', breve: 'Fenomeno', descrizione: 'Ha spaccato tutto, e si vede.' },
  { id: 'bidone', etichetta: 'Il Brocco della settimana', breve: 'Brocco', descrizione: 'Doveva essere un purosangue, era un ronzino.' },
  { id: 'culo', etichetta: 'San Culo', breve: 'San Culo', descrizione: 'Ha vinto senza capire come. Accendetegli un cero.' },
  { id: 'sfigato', etichetta: 'Il Cornuto e mazziato', breve: 'Cornuto', descrizione: 'Ha fatto tutto giusto e ha perso lo stesso.' },
  { id: 'piangina', etichetta: 'Muro del pianto', breve: 'Pianto', descrizione: 'Ha riempito la chat di lamenti.' },
  { id: 'formazione', etichetta: 'Formazione da denuncia', breve: 'Formazione', descrizione: 'Schierata col cuore, non con la testa.' }
];
// Nota: 'panchina' (Il Panchinaro d'oro) è stata tolta. I voti già dati restano a
// database ma non compaiono più né nei conteggi né nei trofei, perché tutto
// filtra sull'elenco qui sopra.

const CATEGORIE = CATEGORIE_DEF.map((c) => c.id);

const categorie = (req, res) => res.json({ categorie: CATEGORIE_DEF });

// Un voto per utente per categoria per edizione: se esiste già, viene aggiornato
// (cambio voto), non duplicato — garantito anche a livello di indice unico nel modello.
const vota = async (req, res) => {
  const { edizioneId, categoria, squadraId } = req.body;
  if (!edizioneId || !categoria || !squadraId) {
    return res.status(400).json({ errore: 'Dati voto incompleti' });
  }
  if (!CATEGORIE.includes(categoria)) {
    return res.status(400).json({ errore: 'Categoria non valida' });
  }

  // Senza questo si potevano registrare voti su un'edizione qualsiasi (anche
  // inesistente): righe che nessuna schermata mostra più e che restano lì.
  const edizione = await Edizione.findById(edizioneId).select('giornataNumero stagione votiChiusi').lean();
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });
  if (await votazioniChiuse(edizione)) {
    return res.status(403).json({ errore: 'Votazioni chiuse: il tribunale ha già emesso le sentenze' });
  }
  // La propria squadra si può votare, come tutte le altre.
  const io = await User.findById(req.utente.id).select('squadra').lean();

  const voto = await Voto.findOneAndUpdate(
    { edizione: edizioneId, categoria, votante: req.utente.id },
    { votato: squadraId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Una riga per edizione, non una per categoria: e mai per chi ha votato chi.
  await registra({
    autore: req.utente.id, tipo: 'voti', squadra: io?.squadra,
    dati: { giornata: edizione.giornataNumero }, chiave: String(edizioneId),
    unisci: 'tieni', finestra: 24 * 3600 * 1000
  });

  res.json({ voto });
};

// Com'è andata un'edizione. Il proprio voto si vede sempre; i conteggi di tutti
// solo a chi ha votato ogni categoria, oppure a votazioni chiuse: così chi deve
// ancora votare non si fa trascinare dalla maggioranza. Il controllo sta qui e
// non solo nell'app, altrimenti basterebbe aprire l'indirizzo della pagina.
const risultati = async (req, res) => {
  const { edizioneId } = req.params;
  const edizione = await Edizione.findById(edizioneId).select('giornataNumero stagione votiChiusi').lean();
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });

  const [voti, chiuse, utentiTotali] = await Promise.all([
    Voto.find({ edizione: edizioneId, categoria: { $in: CATEGORIE } }).lean(),
    votazioniChiuse(edizione),
    User.countDocuments({ attivo: true })
  ]);

  const mioVoto = {};
  const perVotante = new Map();
  for (const v of voti) {
    const chi = String(v.votante);
    perVotante.set(chi, (perVotante.get(chi) || 0) + 1);
    if (chi === String(req.utente.id)) mioVoto[v.categoria] = String(v.votato);
  }
  const votantiCompleti = [...perVotante.values()].filter((n) => n >= CATEGORIE.length).length;
  const hoVotatoTutto = Object.keys(mioVoto).length >= CATEGORIE.length;
  const visibili = chiuse || hoVotatoTutto;

  let conteggi = null;
  if (visibili) {
    conteggi = {};
    for (const cat of CATEGORIE) conteggi[cat] = {};
    for (const v of voti) {
      const id = String(v.votato);
      conteggi[v.categoria][id] = (conteggi[v.categoria][id] || 0) + 1;
    }
  }

  res.json({ conteggi, mioVoto, chiuse, visibili, votantiCompleti, utentiTotali });
};

// I trofei dei verdetti: per ogni edizione a votazioni chiuse, chi ha vinto ogni
// categoria (più squadre in caso di pari merito). Prima della chiusura non si dice
// niente: sarebbe un modo per vedere i conteggi senza aver votato.
// Nota: l'ultima edizione di una stagione non si chiude finché non esiste la
// giornata dopo, quindi i suoi trofei compaiono solo allora.
const trofei = async (req, res) => {
  const [edizioni, giornate] = await Promise.all([
    Edizione.find().select('giornataNumero stagione votiChiusi').lean(),
    Giornata.find().select('stagione numero data conclusa').lean()
  ]);
  const chiave = (stagione, numero) => `${stagione}|${numero}`;
  const perChiave = new Map(giornate.map((g) => [chiave(g.stagione, g.numero), g]));
  const chiuse = edizioni.filter((e) => e.votiChiusi || chiusaDa(perChiave.get(chiave(e.stagione || stagioneCorrente(), e.giornataNumero + 1))));
  if (chiuse.length === 0) return res.json({ trofei: [] });

  const conteggi = await Voto.aggregate([
    { $match: { edizione: { $in: chiuse.map((e) => e._id) }, categoria: { $in: CATEGORIE } } },
    { $group: { _id: { edizione: '$edizione', categoria: '$categoria', squadra: '$votato' }, n: { $sum: 1 } } }
  ]);

  const perGruppo = new Map();
  for (const c of conteggi) {
    const k = `${c._id.edizione}|${c._id.categoria}`;
    if (!perGruppo.has(k)) perGruppo.set(k, []);
    perGruppo.get(k).push({ squadra: String(c._id.squadra), n: c.n });
  }

  const numeroDi = new Map(chiuse.map((e) => [String(e._id), e.giornataNumero]));
  const elenco = [];
  for (const [k, righe] of perGruppo) {
    const [edizioneId, categoria] = k.split('|');
    const massimo = Math.max(...righe.map((r) => r.n));
    elenco.push({
      edizioneId, giornata: numeroDi.get(edizioneId), categoria, voti: massimo,
      squadre: righe.filter((r) => r.n === massimo).map((r) => r.squadra)
    });
  }
  elenco.sort((a, b) => a.giornata - b.giornata);
  res.json({ trofei: elenco });
};

// La redazione chiude (o riapre) i verdetti di un'edizione senza aspettare la
// giornata dopo. Riaprire non ha effetto se la giornata dopo è già iniziata: lì si
// chiudono da soli.
const chiusura = async (req, res) => {
  const { edizioneId } = req.params;
  const chiusi = req.body?.chiusi !== false;
  const edizione = await Edizione.findByIdAndUpdate(edizioneId, { votiChiusi: chiusi }, { new: true }).select('giornataNumero votiChiusi').lean();
  if (!edizione) return res.status(404).json({ errore: 'Edizione non trovata' });
  if (chiusi) {
    await inviaATutti(
      { titolo: 'Verdetti chiusi', corpo: `Giornata ${edizione.giornataNumero}: guarda chi ha vinto i trofei`, url: '/gioca' },
      { escludiUtente: req.utente.id }
    );
  }
  res.json({ votiChiusi: edizione.votiChiusi });
};

module.exports = { categorie, vota, risultati, trofei, chiusura };
