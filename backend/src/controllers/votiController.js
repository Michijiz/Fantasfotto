const Voto = require('../models/Voto');

// Categorie di voto disponibili per edizione. Tenute qui (non in DB) perché cambiano
// raramente e servono sia al form di voto che ai conteggi.
const CATEGORIE = ['fenomeno', 'bidone', 'culo', 'sfigato'];

const categorie = (req, res) => res.json({ categorie: CATEGORIE });

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

module.exports = { CATEGORIE, categorie, vota, risultati };
