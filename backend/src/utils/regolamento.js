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

module.exports = {
  REGOLE,
  fantapuntiInGol,
  puntiPerGol,
  risolviAccoppiamento,
  arricchisciGiornata,
  calcolaClassifica
};