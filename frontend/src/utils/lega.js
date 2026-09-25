// Conti sulla lega che servono a più pagine (Profilo, Squadra, Gazzetta, Lega).
// Lavorano sulle giornate già arricchite dal backend: ogni scontro ha
// golCasa/golTrasferta e fantapuntiCasa/fantapuntiTrasferta (null finché mancano).

export const idDi = (v) => (v && typeof v === 'object' ? v._id : v);

const conRisultato = (a) => a.golCasa != null && a.golTrasferta != null;

// Esito di uno scontro dal punto di vista di `squadraId`: 'V', 'N', 'P' o null.
function esitoPer(a, squadraId) {
  const casa = idDi(a.squadraCasa) === squadraId;
  const trasferta = idDi(a.squadraTrasferta) === squadraId;
  if ((!casa && !trasferta) || !conRisultato(a)) return null;
  const fatti = casa ? a.golCasa : a.golTrasferta;
  const subiti = casa ? a.golTrasferta : a.golCasa;
  return fatti > subiti ? 'V' : fatti < subiti ? 'P' : 'N';
}

// Ultimi risultati della squadra, dal più vecchio al più recente.
export function formaRecente(giornate, squadraId, quanti = 5) {
  const esiti = [];
  for (const g of [...giornate].sort((x, y) => x.numero - y.numero)) {
    for (const a of g.accoppiamenti || []) {
      const esito = esitoPer(a, squadraId);
      if (esito) esiti.push({ numero: g.numero, esito });
    }
  }
  return esiti.slice(-quanti);
}

// Il derby personale: vinte/pari/perse di `mia` contro `loro`, e il prossimo
// scontro diretto non ancora giocato (se c'è in calendario).
export function derbyPersonale(giornate, mia, loro) {
  const conto = { vinte: 0, pari: 0, perse: 0, giocati: 0 };
  let prossimo = null;
  for (const g of [...giornate].sort((x, y) => x.numero - y.numero)) {
    for (const a of g.accoppiamenti || []) {
      const coppia = [idDi(a.squadraCasa), idDi(a.squadraTrasferta)];
      if (!coppia.includes(mia) || !coppia.includes(loro)) continue;
      const esito = esitoPer(a, mia);
      if (esito === 'V') conto.vinte++;
      else if (esito === 'N') conto.pari++;
      else if (esito === 'P') conto.perse++;
      if (esito) conto.giocati++;
      else if (!prossimo) prossimo = g;
    }
  }
  return { ...conto, prossimo };
}

// Miglior e peggior punteggio di una giornata, calcolati dai fantapunti: non si
// scelgono più a mano nel modulo dell'edizione.
export function estremiGiornata(giornate, numero) {
  const g = giornate.find((x) => x.numero === numero);
  if (!g) return { migliore: null, peggiore: null };
  const punti = [];
  for (const a of g.accoppiamenti || []) {
    if (a.fantapuntiCasa != null && a.squadraCasa) punti.push({ squadra: a.squadraCasa, fp: a.fantapuntiCasa });
    if (a.fantapuntiTrasferta != null && a.squadraTrasferta) punti.push({ squadra: a.squadraTrasferta, fp: a.fantapuntiTrasferta });
  }
  if (punti.length === 0) return { migliore: null, peggiore: null };
  punti.sort((x, y) => y.fp - x.fp);
  return { migliore: punti[0], peggiore: punti[punti.length - 1] };
}

// Stato di una giornata in calendario.
export function statoGiornata(g) {
  if (g.conclusa) return 'conclusa';
  if (g.data && new Date(g.data).getTime() <= Date.now()) return 'in campo';
  return 'da giocare';
}

// Le menzioni di una squadra: titoli dall'albo d'oro, premi automatici dalle
// giornate (miglior e peggior punteggio) e il Re dei Gufi dalle edizioni.
export function menzioni(albo, edizioni, giornate, squadraId) {
  const voci = [];
  for (const a of albo) {
    if (idDi(a.squadra) === squadraId) voci.push({ chiave: `albo-${a._id}`, testo: `Campione · ${a.stagione}`, oro: true, coppa: 'oro' });
    if (idDi(a.secondo) === squadraId) voci.push({ chiave: `albo2-${a._id}`, testo: `2ª · ${a.stagione}`, coppa: 'argento' });
    if (idDi(a.terzo) === squadraId) voci.push({ chiave: `albo3-${a._id}`, testo: `3ª · ${a.stagione}`, coppa: 'bronzo' });
  }
  for (const e of edizioni) {
    const g = `G${e.giornataNumero}`;
    const { migliore, peggiore } = estremiGiornata(giornate, e.giornataNumero);
    if (migliore && idDi(migliore.squadra) === squadraId) voci.push({ chiave: `m-${e._id}`, testo: `Miglior punteggio · ${g}` });
    if (peggiore && idDi(peggiore.squadra) === squadraId) voci.push({ chiave: `p-${e._id}`, testo: `Peggior punteggio · ${g}` });
    if ((e.stats?.reDeiGufi || []).some((s) => idDi(s) === squadraId)) voci.push({ chiave: `r-${e._id}`, testo: `Re dei Gufi · ${g}` });
  }
  return voci;
}

// "di Totò", "di Totò e Peppe", "di Totò e altri 2".
export function nomiAllenatori(allenatori = []) {
  const nomi = allenatori.map((a) => a.nomeVisualizzato);
  if (nomi.length === 0) return '';
  if (nomi.length === 1) return nomi[0];
  if (nomi.length === 2) return `${nomi[0]} e ${nomi[1]}`;
  return `${nomi[0]} e altri ${nomi.length - 1}`;
}

export const RUOLI_ROSA = [
  { id: 'P', nome: 'Portieri' },
  { id: 'D', nome: 'Difensori' },
  { id: 'C', nome: 'Centrocampisti' },
  { id: 'A', nome: 'Attaccanti' }
];

// La rosa divisa per ruolo; i nomi del vecchio formato finiscono in "Senza ruolo".
export function rosaPerRuolo(squadra) {
  const r = squadra?.rosaRuoli || {};
  const gruppi = RUOLI_ROSA.map((ruolo) => ({ ...ruolo, nomi: r[ruolo.id] || [] }));
  if (squadra?.rosa?.length) gruppi.push({ id: '?', nome: 'Senza ruolo', nomi: squadra.rosa });
  const totale = gruppi.reduce((t, g) => t + g.nomi.length, 0);
  return { gruppi: gruppi.filter((g) => g.nomi.length > 0), totale };
}

// --- Albo d'oro --------------------------------------------------------------

// La bacheca: per ogni squadra i titoli vinti (e i podi), in ordine di trofei.
// Ci sono anche le squadre a secco: la bacheca vuota fa parte dello spettacolo.
export function bacheca(albo, squadre) {
  const conta = new Map(squadre.map((s) => [s._id, { squadra: s, titoli: 0, secondi: 0, terzi: 0, stagioni: [] }]));
  for (const a of albo) {
    const vincitrice = conta.get(idDi(a.squadra));
    if (vincitrice) { vincitrice.titoli += 1; vincitrice.stagioni.push(a.stagione); }
    const seconda = conta.get(idDi(a.secondo));
    if (seconda) seconda.secondi += 1;
    const terza = conta.get(idDi(a.terzo));
    if (terza) terza.terzi += 1;
  }
  return [...conta.values()].sort((x, y) => (
    y.titoli - x.titoli || y.secondi - x.secondi || y.terzi - x.terzi
    || String(x.squadra.nome).localeCompare(String(y.squadra.nome), 'it')
  ));
}

// Chi ha il conteggio più alto (con i pari merito). Null se nessuno ha niente.
function inTesta(conteggi) {
  const massimo = Math.max(0, ...conteggi.values());
  if (massimo === 0) return null;
  return { ids: [...conteggi.entries()].filter(([, n]) => n === massimo).map(([id]) => id), volte: massimo };
}

const aggiungi = (mappa, id) => { if (id) mappa.set(id, (mappa.get(id) || 0) + 1); };

// I record di lega calcolati da soli dalle giornate e dalle edizioni: Re dei gufi,
// miglior punteggio di giornata e maglia nera (peggior punteggio).
export function recordLega(giornate, edizioni) {
  const gufi = new Map();
  const top = new Map();
  const nera = new Map();
  for (const e of edizioni) for (const s of e.stats?.reDeiGufi || []) aggiungi(gufi, idDi(s));
  for (const g of giornate) {
    if (!g.conclusa) continue;
    const { migliore, peggiore } = estremiGiornata(giornate, g.numero);
    aggiungi(top, idDi(migliore?.squadra));
    aggiungi(nera, idDi(peggiore?.squadra));
  }
  return [
    { id: 'gufi', nome: 'Re dei gufi', ...inTesta(gufi) },
    { id: 'top', nome: 'Più volte top di giornata', ...inTesta(top) },
    { id: 'nera', nome: 'Più volte maglia nera', ...inTesta(nera) }
  ].filter((r) => r.ids);
}
