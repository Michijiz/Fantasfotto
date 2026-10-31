// Conti sulla lega che servono a più pagine (Profilo, Squadra, Gazzetta, Lega).
// Lavorano sulle giornate già arricchite dal backend: ogni scontro ha
// golCasa/golTrasferta e fantapuntiCasa/fantapuntiTrasferta (null finché mancano).

export const idDi = (v) => (v && typeof v === 'object' ? v._id : v);

export const conRisultato = (a) => a.golCasa != null && a.golTrasferta != null;

// Gli scontri con entrambe le squadre ancora esistenti: una squadra cancellata
// lascia il riferimento a null, e quello scontro non si può mostrare.
export const scontriGiocabili = (g) => (g?.accoppiamenti || []).filter((a) => a.squadraCasa && a.squadraTrasferta);

// Lo scontro di `squadraId` in quella giornata (null se riposa o non c'è).
export function scontroDi(g, squadraId) {
  if (!squadraId) return null;
  return scontriGiocabili(g).find((a) => idDi(a.squadraCasa) === squadraId || idDi(a.squadraTrasferta) === squadraId) || null;
}

// La giornata ha almeno un fantapunteggio inserito.
export const haPunteggi = (g) => (g?.accoppiamenti || [])
  .some((a) => a.fantapuntiCasa != null || a.fantapuntiTrasferta != null);

// Esito di uno scontro dal punto di vista di `squadraId`: 'V', 'N', 'P' o null.
export function esitoPer(a, squadraId) {
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

// Lo stato a parole, con il conto alla rovescia prima del fischio d'inizio:
// "fischio d'inizio tra 2g 14h", "in campo", "fischio finale". Senza data
// impostata e a giornata non conclusa non c'è niente da dire (null).
export function tempoGiornata(g) {
  if (!g) return null;
  if (g.conclusa) return 'fischio finale';
  if (!g.data) return null;
  const diffMs = new Date(g.data).getTime() - Date.now();
  if (diffMs <= 0) return 'in campo';
  const giorni = Math.floor(diffMs / 86400000);
  const ore = Math.floor((diffMs % 86400000) / 3600000);
  return `fischio d'inizio tra ${giorni}g ${ore}h`;
}

// Quale giornata raccontare per prima: la più recente già giocata (conclusa o con
// punteggi) che non ha ancora la sua edizione. Null se non c'è nulla da scrivere.
export function giornataDaStampare(giornate, edizioni) {
  const scritte = new Set(edizioni.map((e) => e.giornataNumero));
  const candidate = giornate.filter((g) => !scritte.has(g.numero) && (g.conclusa || haPunteggi(g)));
  return candidate.length ? Math.max(...candidate.map((g) => g.numero)) : null;
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
