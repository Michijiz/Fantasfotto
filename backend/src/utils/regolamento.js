// Regole di lega applicate lato server ai punteggi delle giornate.
//
// Bonus/malus dei singoli calciatori e modificatore difesa NON si calcolano qui:
// arrivano già dentro il totale fantapunti di Leghe Fantacalcio. Qui si applica
// solo quello che dipende dal totale: conversione fantapunti → gol, esito dello
// scontro diretto e ordinamento della classifica.
//
// Le stesse costanti sono replicate in frontend/src/utils/regolamento.js (pagina
// Regolamento): se cambiano qui, vanno cambiate anche là.

const REGOLE = {
  sogliaPrimoGol: 66,
  ampiezzaFascia: 4,
  puntiVittoria: 3,
  puntiPareggio: 1,
  puntiSconfitta: 0
};

// I fantapunti vanno a mezzi punti, ma una somma di float può sporcarsi: il
// margine evita che 69.99999999 finisca nella fascia sbagliata.
const EPS = 1e-9;

function fantapuntiInGol(fantapunti) {
  if (fantapunti == null) return null;
  const fp = Number(fantapunti);
  if (Number.isNaN(fp)) return null;
  if (fp + EPS < REGOLE.sogliaPrimoGol) return 0;
  return Math.floor((fp - REGOLE.sogliaPrimoGol + EPS) / REGOLE.ampiezzaFascia) + 1;
}

function puntiPerGol(golFatti, golSubiti) {
  if (golFatti > golSubiti) return REGOLE.puntiVittoria;
  if (golFatti < golSubiti) return REGOLE.puntiSconfitta;
  return REGOLE.puntiPareggio;
}

// Funziona sia con ref non popolati (ObjectId) sia con squadre popolate ({ _id, nome }).
const idDi = (ref) => String(ref?._id ?? ref);

const arrotonda = (n) => Math.round(n * 10) / 10;

// Punteggi "per squadra" inseriti dal form Nuova Edizione, indicizzati per id.
function mappaPunteggi(giornata) {
  return new Map((giornata?.punteggi || []).map((p) => [idDi(p.squadra), p.punti]));
}

// Il risultato di uno scontro: il punteggio scritto sull'accoppiamento ha la
// precedenza; se manca, si usa quello della squadra inserito con l'edizione.
// Così basta pubblicare l'edizione con i punteggi e il calendario si compila da solo.
function risolviAccoppiamento(accoppiamento, punteggiPerSquadra) {
  const idCasa = idDi(accoppiamento.squadraCasa);
  const idTrasferta = idDi(accoppiamento.squadraTrasferta);

  const fantapuntiCasa = accoppiamento.punteggioCasa ?? punteggiPerSquadra.get(idCasa) ?? null;
  const fantapuntiTrasferta = accoppiamento.punteggioTrasferta ?? punteggiPerSquadra.get(idTrasferta) ?? null;
  const completo = fantapuntiCasa != null && fantapuntiTrasferta != null;

  return {
    idCasa,
    idTrasferta,
    fantapuntiCasa,
    fantapuntiTrasferta,
    golCasa: completo ? fantapuntiInGol(fantapuntiCasa) : null,
    golTrasferta: completo ? fantapuntiInGol(fantapuntiTrasferta) : null
  };
}

// Aggiunge a una giornata (oggetto lean) i campi calcolati per ogni scontro,
// senza toccare i punteggi salvati: fantapuntiCasa/Trasferta, golCasa/Trasferta.
function arricchisciGiornata(giornata) {
  if (!giornata) return giornata;
  const punteggi = mappaPunteggi(giornata);
  return {
    ...giornata,
    accoppiamenti: (giornata.accoppiamenti || []).map((a) => {
      const r = risolviAccoppiamento(a, punteggi);
      return {
        ...a,
        fantapuntiCasa: r.fantapuntiCasa,
        fantapuntiTrasferta: r.fantapuntiTrasferta,
        golCasa: r.golCasa,
        golTrasferta: r.golTrasferta
      };
    })
  };
}

// Criteri del regolamento, in ordine: punti, punti totali, gol fatti,
// differenza reti, gol subiti (meno è meglio).
function confrontaCriteri(a, b) {
  return (
    b.punti - a.punti ||
    b.puntiTotali - a.puntiTotali ||
    b.golFatti - a.golFatti ||
    b.differenzaReti - a.differenzaReti ||
    a.golSubiti - b.golSubiti
  );
}

// Classifica avulsa: solo gli scontri diretti tra le squadre ancora appaiate.
// Ordine interno: punti negli scontri diretti, poi differenza reti, poi gol
// fatti. Se restano pari anche lì, ordine alfabetico.
function ordinaAvulsa(gruppo, scontri) {
  const ids = new Set(gruppo.map((r) => String(r._id)));
  const mini = new Map(gruppo.map((r) => [String(r._id), { punti: 0, gf: 0, gs: 0 }]));

  for (const s of scontri) {
    if (!ids.has(s.idCasa) || !ids.has(s.idTrasferta)) continue;
    const casa = mini.get(s.idCasa);
    const trasferta = mini.get(s.idTrasferta);
    casa.punti += puntiPerGol(s.golCasa, s.golTrasferta);
    trasferta.punti += puntiPerGol(s.golTrasferta, s.golCasa);
    casa.gf += s.golCasa;
    casa.gs += s.golTrasferta;
    trasferta.gf += s.golTrasferta;
    trasferta.gs += s.golCasa;
  }

  return [...gruppo].sort((a, b) => {
    const ma = mini.get(String(a._id));
    const mb = mini.get(String(b._id));
    return (
      mb.punti - ma.punti ||
      (mb.gf - mb.gs) - (ma.gf - ma.gs) ||
      mb.gf - ma.gf ||
      String(a.nome).localeCompare(String(b.nome), 'it')
    );
  });
}

function calcolaClassifica(squadre, giornate) {
  const righe = new Map(
    squadre.map((s) => [String(s._id), {
      ...s,
      giocate: 0,
      vinte: 0,
      pareggiate: 0,
      perse: 0,
      punti: 0,
      puntiTotali: 0,
      golFatti: 0,
      golSubiti: 0,
      differenzaReti: 0
    }])
  );
  const scontri = [];

  const registraPartita = (id, fatti, subiti) => {
    const r = righe.get(id);
    if (!r) return;
    r.giocate += 1;
    r.golFatti += fatti;
    r.golSubiti += subiti;
    r.punti += puntiPerGol(fatti, subiti);
    if (fatti > subiti) r.vinte += 1;
    else if (fatti < subiti) r.perse += 1;
    else r.pareggiate += 1;
  };

  for (const g of giornate) {
    const punteggi = mappaPunteggi(g);
    // Una squadra contribuisce ai punti totali una sola volta per giornata,
    // anche se il suo punteggio compare sia nello scontro sia nell'edizione.
    const contate = new Set();
    const aggiungiFantapunti = (id, fp) => {
      if (fp == null || contate.has(id)) return;
      contate.add(id);
      const r = righe.get(id);
      if (r) r.puntiTotali += Number(fp);
    };

    for (const a of g.accoppiamenti || []) {
      const r = risolviAccoppiamento(a, punteggi);
      aggiungiFantapunti(r.idCasa, r.fantapuntiCasa);
      aggiungiFantapunti(r.idTrasferta, r.fantapuntiTrasferta);
      if (r.golCasa == null || r.golTrasferta == null) continue;
      registraPartita(r.idCasa, r.golCasa, r.golTrasferta);
      registraPartita(r.idTrasferta, r.golTrasferta, r.golCasa);
      scontri.push(r);
    }

    // Squadre con punteggio ma senza scontro in calendario (calendario non ancora
    // importato): entrano nei punti totali, non nei punti-lega.
    for (const [id, fp] of punteggi) aggiungiFantapunti(id, fp);
  }

  const ordinate = [...righe.values()]
    .map((r) => ({
      ...r,
      puntiTotali: arrotonda(r.puntiTotali),
      differenzaReti: r.golFatti - r.golSubiti
    }))
    .sort(confrontaCriteri);

  // Blocchi di squadre pari su tutti i criteri → classifica avulsa tra loro.
  const risultato = [];
  let i = 0;
  while (i < ordinate.length) {
    let j = i + 1;
    while (j < ordinate.length && confrontaCriteri(ordinate[i], ordinate[j]) === 0) j += 1;
    const gruppo = ordinate.slice(i, j);
    risultato.push(...(gruppo.length > 1 ? ordinaAvulsa(gruppo, scontri) : gruppo));
    i = j;
  }

  return risultato;
}

// ===================== Schedina: quote e pronostici =====================
//
// Nessuna valuta, nessuna puntata: la quota serve solo a dire "quanto era
// scontata questa previsione". Si calcola dal distacco in classifica tra le due
// squadre (differenza di posizione), non dai fantapunti: funziona anche a
// stagione appena iniziata, quando i punti-lega sono tutti a zero.

const QUOTE = {
  base: 1.8,
  passoFavorita: 0.08,   // quanto scende la quota della favorita per ogni posizione di distacco
  minFavorita: 1.2,
  passoSfavorita: 0.25,  // quanto sale quella della sfavorita
  maxSfavorita: 6,
  basePareggio: 3,
  passoPareggio: 0.1,    // il pari si allunga un po' quando le due sono lontane
  maxPareggio: 4.5
};

const arrotondaQuota = (n) => Math.round(n * 100) / 100;

// Torna { '1': q, 'X': q, '2': q } per uno scontro, dato il distacco con segno:
// negativo = la squadra di casa sta più in alto, positivo = sta più in basso.
function quotePerScontro(distaccoConSegno) {
  const d = Math.abs(Number(distaccoConSegno) || 0);
  const favorita = arrotondaQuota(Math.max(QUOTE.minFavorita, QUOTE.base - QUOTE.passoFavorita * d));
  const sfavorita = arrotondaQuota(Math.min(QUOTE.maxSfavorita, QUOTE.base + QUOTE.passoSfavorita * d));
  const pareggio = arrotondaQuota(Math.min(QUOTE.maxPareggio, QUOTE.basePareggio + QUOTE.passoPareggio * d));

  // distacco 0 = stessa posizione (impossibile) o classifica non ancora formata:
  // in quel caso 1 e 2 valgono uguale.
  if (distaccoConSegno === 0) return { 1: QUOTE.base, X: pareggio, 2: QUOTE.base };
  return distaccoConSegno < 0
    ? { 1: favorita, X: pareggio, 2: sfavorita }
    : { 1: sfavorita, X: pareggio, 2: favorita };
}

// Mappa id squadra → posizione (1-based) a partire da un tabellone già ordinato.
function mappaPosizioni(tabellone) {
  return new Map(tabellone.map((r, i) => [String(r._id), i + 1]));
}

// Aggiunge a ogni accoppiamento di una giornata le quote 1/X/2 calcolate sulla
// classifica passata. La giornata va già passata da arricchisciGiornata.
function arricchisciConQuote(giornata, tabellone) {
  if (!giornata) return giornata;
  const posizioni = mappaPosizioni(tabellone || []);
  return {
    ...giornata,
    accoppiamenti: (giornata.accoppiamenti || []).map((a) => {
      const posCasa = posizioni.get(idDi(a.squadraCasa)) ?? 0;
      const posTrasferta = posizioni.get(idDi(a.squadraTrasferta)) ?? 0;
      const distacco = posCasa && posTrasferta ? posCasa - posTrasferta : 0;
      return { ...a, quote: quotePerScontro(distacco) };
    })
  };
}

// '1' | 'X' | '2' per uno scontro già giocato, null se mancano i gol.
function esitoAccoppiamento(accoppiamento) {
  const { golCasa, golTrasferta } = accoppiamento;
  if (golCasa == null || golTrasferta == null) return null;
  if (golCasa > golTrasferta) return '1';
  if (golCasa < golTrasferta) return '2';
  return 'X';
}

// Esito della multipla: 'vinta' solo se ogni pronostico è azzeccato, 'persa' se
// almeno uno sbaglia, 'attesa' finché manca anche un solo risultato.
function esitoSchedina(pronostici, giornataArricchita) {
  const esiti = new Map(
    (giornataArricchita?.accoppiamenti || []).map((a) => [String(a._id), esitoAccoppiamento(a)])
  );

  let completa = true;
  for (const p of pronostici || []) {
    const reale = esiti.get(String(p.accoppiamento));
    if (reale == null) { completa = false; continue; }
    if (reale !== p.esito) return 'persa';
  }
  return completa && (pronostici || []).length > 0 ? 'vinta' : 'attesa';
}

module.exports = {
  REGOLE,
  QUOTE,
  fantapuntiInGol,
  puntiPerGol,
  risolviAccoppiamento,
  arricchisciGiornata,
  calcolaClassifica,
  quotePerScontro,
  arricchisciConQuote,
  esitoAccoppiamento,
  esitoSchedina
};