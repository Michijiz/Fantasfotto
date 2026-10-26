// Migrazione a "una lega, più stagioni". Idempotente: si può lanciare a ogni
// avvio senza fare danni, e quando non c'è niente da fare costa pochi controlli.
//
//  1. Giornate, schedine ed edizioni nate prima della stagione ricevono quella
//     in corso (o STAGIONE_CORRENTE, se impostata).
//  2. Le vecchie edizioni perdono `stats`: i premi ora si calcolano al volo.
//  3. Si tolgono i vecchi indici unici sul solo numero di giornata. Se restassero,
//     la G1 della stagione prossima verrebbe rifiutata come doppione.
//  4. Si creano i nuovi indici unici. Se esistono due edizioni per la stessa
//     giornata l'indice non si può costruire: lo si dice chiaro nei log invece di
//     lasciarlo fallire in silenzio, e le due vanno sistemate a mano.
const Giornata = require('../models/Giornata');
const Schedina = require('../models/Schedina');
const Edizione = require('../models/Edizione');
const { stagioneCorrente } = require('./stagione');

const INDICI_VECCHI = [
  [Giornata, 'numero_1'],
  [Schedina, 'utente_1_giornataNumero_1']
];

async function togliIndice(Modello, nome) {
  try {
    await Modello.collection.dropIndex(nome);
    console.log(`[migrazione] Tolto il vecchio indice ${Modello.modelName}.${nome}`);
  } catch (err) {
    // 27 = IndexNotFound, 26 = NamespaceNotFound (collezione ancora vuota/inesistente).
    if (err.code !== 27 && err.code !== 26) throw err;
  }
}

async function migraStagione() {
  const stagione = stagioneCorrente();

  for (const Modello of [Giornata, Schedina, Edizione]) {
    const { modifiedCount } = await Modello.collection.updateMany(
      { stagione: { $exists: false } },
      { $set: { stagione } }
    );
    if (modifiedCount) console.log(`[migrazione] ${Modello.modelName}: ${modifiedCount} documenti in stagione ${stagione}`);
  }

  // Collection nativa: `stats` non è più nello schema e mongoose, in strict mode,
  // scarterebbe l'$unset di un campo che non conosce.
  await Edizione.collection.updateMany({ stats: { $exists: true } }, { $unset: { stats: '' } });

  for (const [Modello, nome] of INDICI_VECCHI) await togliIndice(Modello, nome);

  for (const Modello of [Giornata, Schedina, Edizione]) {
    try {
      await Modello.createIndexes();
    } catch (err) {
      console.error(
        `[migrazione] Indici di ${Modello.modelName} non creati: ${err.message}. ` +
        'Se è un doppione (due edizioni per la stessa giornata) va sistemato a mano.'
      );
    }
  }
}

// Una sola volta per processo: su Vercel ogni avvio a freddo la rilancia, ma le
// richieste successive della stessa istanza non ripetono i controlli.
let inCorso = null;
function assicuraMigrazione() {
  if (!inCorso) {
    inCorso = migraStagione().catch((err) => {
      inCorso = null; // riprova alla prossima connessione
      console.error('[migrazione] Fallita:', err);
    });
  }
  return inCorso;
}

module.exports = { migraStagione, assicuraMigrazione };

// Uso manuale: `npm run migra:stagione`.
if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => migraStagione())
    .then(() => { console.log('[migrazione] Fatto'); return mongoose.disconnect(); })
    .catch((err) => { console.error(err); process.exit(1); });
}
