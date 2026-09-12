const Voto = require('../models/Voto');

// Categorie di voto disponibili per edizione. Tenute qui (non in DB) perché
// cambiano raramente e servono sia al form di voto che ai conteggi. Le etichette
// viaggiano insieme all'id: il frontend non ne tiene più una copia sua, così
// aggiungere una categoria è una riga sola e non due file da tenere allineati.
//
// L'id non va mai cambiato una volta pubblicato: è la chiave con cui sono
// registrati i voti già dati.
const CATEGORIE_DEF = [
  { id: 'fenomeno', etichetta: 'Fenomeno di giornata', breve: 'Fenomeno', descrizione: 'Ha spaccato tutto, e si vede.' },
  { id: 'bidone', etichetta: 'Bidone di giornata', breve: 'Bidone', descrizione: 'Il disastro annunciato.' },
  { id: 'culo', etichetta: 'Il più culo', breve: 'Culo', descrizione: 'Ha vinto senza capire come.' },
  { id: 'sfigato', etichetta: 'Il più sfigato', breve: 'Sfigato', descrizione: 'Ha perso pur facendo tutto giusto.' },
  { id: 'piangina', etichetta: 'Il più piangina', breve: 'Piangina', descrizione: 'Chi ha rotto di più in chat.' },
  { id: 'formazione', etichetta: 'Formazione da denuncia', breve: 'Formazione', descrizione: 'Schierata col cuore, non con la testa.' },
  { id: 'panchina', etichetta: 'Re delle panchine', breve: 'Panchine', descrizione: 'Ha lasciato fuori i migliori.' },
  { id: 'mercato', etichetta: 'Colpo di mercato', breve: 'Mercato', descrizione: "L'affare (o il misfatto) della settimana." }
];

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

  const voto = await Voto.findOneAndUpdate(
    { edizione: edizioneId, categoria, votante: req.utente.id },
    { votato: squadraId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ voto });
};

// Conteggio voti per squadra, raggruppato per categoria, per un'edizione — usato dai
// bottoni "verdetti" e per evidenziare la scelta dell'utente corrente.
const risultati = async (req, res) => {
  const { edizioneId } = req.params;

  const voti = await Voto.find({ edizione: edizioneId }).lean();

  const conteggi = {};
  for (const cat of CATEGORIE) conteggi[cat] = {};

  for (const v of voti) {
    const cat = conteggi[v.categoria] || (conteggi[v.categoria] = {});
    const id = String(v.votato);
    cat[id] = (cat[id] || 0) + 1;
  }

  const mioVoto = {};
  for (const v of voti) {
    if (String(v.votante) === String(req.utente.id)) {
      mioVoto[v.categoria] = String(v.votato);
    }
  }

  res.json({ conteggi, mioVoto });
};

module.exports = { CATEGORIE, CATEGORIE_DEF, categorie, vota, risultati };
