const Attivita = require('../models/Attivita');

// Finestra entro cui la stessa azione della stessa persona si accorpa alla riga
// precedente invece di aprirne una nuova.
const FINESTRA_MS = 30 * 60 * 1000;

// Registra un'attività nel diario della lega. Non lancia MAI: il diario è un
// contorno, e un suo errore non deve far fallire il salvataggio vero (una
// schedina persa perché il banner non si è scritto sarebbe assurdo).
//
//   autore     id dell'utente
//   tipo       vedi models/Attivita.js
//   squadra    id della squadra coinvolta (facoltativo)
//   dati       dettagli per la frase
//   chiave     cosa rende "la stessa azione" (default: nessuna distinzione)
//   unisci     come fondere i dati con quelli della riga accorpata:
//              'campi' unisce gli elenchi `campi`, 'somma' somma `quante`,
//              'tieni' conserva i dati della riga già scritta,
//              altrimenti vincono i dati nuovi
//   finestra   ms entro cui accorpare (default 30 minuti)
async function registra({ autore, tipo, squadra, dati = {}, chiave = '', unisci, finestra = FINESTRA_MS }) {
  try {
    if (!autore || !tipo) return;
    const ora = new Date();

    const precedente = await Attivita.findOne({
      autore, tipo, chiave, quando: { $gte: new Date(ora.getTime() - finestra) }
    }).sort({ quando: -1 });

    if (precedente) {
      const vecchi = precedente.dati || {};
      let nuovi = { ...vecchi, ...dati };
      if (unisci === 'campi') {
        nuovi.campi = [...new Set([...(vecchi.campi || []), ...(dati.campi || [])])];
      } else if (unisci === 'tieni') {
        // Conta la prima volta (es. "ha giocato la schedina", non "l'ha rigiocata"
        // perché ha corretto un pronostico due minuti dopo).
        nuovi = vecchi;
      } else if (unisci === 'somma') {
        nuovi.quante = (vecchi.quante || 0) + (dati.quante || 0);
      }
      precedente.dati = nuovi;
      precedente.markModified('dati');
      precedente.quando = ora;
      if (squadra) precedente.squadra = squadra;
      await precedente.save();
      return;
    }

    await Attivita.create({ autore, tipo, squadra, dati, chiave, quando: ora });
  } catch (err) {
    console.error('[attivita] non registrata:', err?.message || err);
  }
}

module.exports = { registra };
