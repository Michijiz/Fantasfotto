// La stagione è l'etichetta "2026-27". Una lega vive più stagioni, e il numero di
// giornata ricomincia da 1 a ogni stagione: senza questa etichetta la G1 di
// quest'anno e quella dell'anno prossimo sarebbero lo stesso documento.
//
// Si ricava dalla data (la stagione cambia il 1° luglio, prima di qualunque
// calendario di campionato) e si può forzare con STAGIONE_CORRENTE, per esempio
// per chiudere una stagione in ritardo o per provare il cambio in locale.
function stagioneCorrente(adesso = new Date()) {
  const fissata = String(process.env.STAGIONE_CORRENTE || '').trim();
  if (fissata) return fissata;

  const anno = adesso.getFullYear();
  const inizio = adesso.getMonth() >= 6 ? anno : anno - 1;
  return `${inizio}-${String((inizio + 1) % 100).padStart(2, '0')}`;
}

// Filtro per le rotte di lettura: di norma la stagione in corso, oppure
// ?stagione=2025-26 per una passata, oppure ?stagione=tutte per l'intero archivio.
function filtroStagione(req) {
  const richiesta = String(req.query?.stagione || '').trim();
  if (richiesta === 'tutte') return {};
  return { stagione: richiesta || stagioneCorrente() };
}

module.exports = { stagioneCorrente, filtroStagione };
