// "Culo calendario": quanto il calendario ha aiutato o penalizzato ogni squadra.
//
// Idea: in ogni giornata una squadra gioca contro UNA sola avversaria, ma il suo
// punteggio avrebbe potuto affrontarle tutte. I "punti giusti" sono la media dei punti
// che avrebbe fatto contro ciascuna delle altre; il culo è la differenza tra i punti
// presi davvero e quelli giusti, sommata su tutta la stagione.
//
//   culo = Σ giornate ( punti contro l'avversaria vera − media dei punti contro tutte )
//
// Le regole di gol e punti sono quelle della lega (utils/regolamento.js), quindi la
// classifica del culo e quella vera parlano la stessa lingua: i punti reali qui dentro
// coincidono con quelli di calcolaClassifica.

const { fantapuntiInGol, puntiPerGol, arricchisciGiornata, calcolaClassifica } = require('./regolamento');

const idDi = (ref) => String(ref?._id ?? ref);
const arrotonda = (n, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;

// Soglie del Culo Index (percentuale). Con vittoria 3 / pareggio 1 / sconfitta 0 anche
// una lega perfettamente equa ha un indice alto, perché un singolo scontro vale 0 o 3
// mentre la media vale quasi sempre una via di mezzo. Su leghe simulate (8-12 squadre,
// squadre simili o molto diverse, poco o molto rumore) l'indice sta quasi sempre tra 25
// e 49 con mediana ~39: le soglie dividono quella fascia. Sono indicative, da rivedere
// quando ci sono stagioni vere. Sotto le 4 giornate l'indice oscilla troppo per fidarsene.
const SOGLIE_INDICE = { media: 33, alto: 45 };
const GIORNATE_MINIME_INDICE = 4;

// Fantapunti di ogni squadra in una giornata, dagli scontri e, per chi non è ancora in
// calendario, dai punteggi per squadra; più gli scontri di cui si conosce il risultato.
function punteggiDellaGiornata(giornata) {
  const arricchita = arricchisciGiornata(giornata);
  const fantapunti = new Map();
  for (const a of arricchita.accoppiamenti || []) {
    if (a.fantapuntiCasa != null) fantapunti.set(idDi(a.squadraCasa), Number(a.fantapuntiCasa));
    if (a.fantapuntiTrasferta != null) fantapunti.set(idDi(a.squadraTrasferta), Number(a.fantapuntiTrasferta));
  }
  for (const p of giornata.punteggi || []) {
    if (!fantapunti.has(idDi(p.squadra))) fantapunti.set(idDi(p.squadra), Number(p.punti));
  }
  const scontri = (arricchita.accoppiamenti || []).filter((a) => a.golCasa != null && a.golTrasferta != null);
  return { fantapunti, scontri, tutti: arricchita.accoppiamenti || [] };
}

// Media dei punti che `squadra` avrebbe fatto contro tutte le altre squadre con un
// punteggio in quella giornata. null se non c'è nessuna avversaria con cui confrontarla.
function puntiMedi(squadra, golPerSquadra) {
  const golMiei = golPerSquadra.get(squadra);
  let somma = 0;
  let n = 0;
  for (const [altra, golAltra] of golPerSquadra) {
    if (altra === squadra) continue;
    somma += puntiPerGol(golMiei, golAltra);
    n += 1;
  }
  return n ? somma / n : null;
}

function giudizioIndice(indice) {
  if (indice > SOGLIE_INDICE.alto) return 'Lega molto influenzata dal culo';
  if (indice > SOGLIE_INDICE.media) return 'Lega nella media';
  return 'Lega onesta';
}

function calcolaCulo(squadre, giornate) {
  const righe = new Map(squadre.map((s) => [String(s._id), {
    squadra: String(s._id), nome: s.nome, stemma: s.stemma,
    punti: 0, puntiGiusti: 0, culo: 0, perGiornata: []
  }]));

  let sommaCuloPartite = 0;
  let partite = 0;
  const giornateConDati = new Set();

  for (const g of giornate) {
    const { fantapunti, scontri } = punteggiDellaGiornata(g);
    const gol = new Map([...fantapunti].map(([t, fp]) => [t, fantapuntiInGol(fp)]));

    for (const a of scontri) {
      const casa = idDi(a.squadraCasa);
      const trasferta = idDi(a.squadraTrasferta);
      const mediaCasa = puntiMedi(casa, gol);
      const mediaTrasferta = puntiMedi(trasferta, gol);
      if (mediaCasa == null || mediaTrasferta == null || !righe.has(casa) || !righe.has(trasferta)) continue;

      const veriCasa = puntiPerGol(a.golCasa, a.golTrasferta);
      const veriTrasferta = puntiPerGol(a.golTrasferta, a.golCasa);
      for (const [id, veri, media] of [[casa, veriCasa, mediaCasa], [trasferta, veriTrasferta, mediaTrasferta]]) {
        const r = righe.get(id);
        r.punti += veri;
        r.puntiGiusti += media;
        r.culo += veri - media;
        r.perGiornata.push({ numero: g.numero, culo: arrotonda(veri - media), punti: veri, attesi: arrotonda(media) });
      }
      sommaCuloPartite += Math.abs(veriCasa - mediaCasa) + Math.abs(veriTrasferta - mediaTrasferta);
      partite += 1;
      giornateConDati.add(g.numero);
    }
  }

  if (partite === 0) {
    return { vuoto: true, giornate: 0, partite: 0, righe: [], indice: null, sculato: null, sfigato: null };
  }

  // Posizione reale: quella della classifica vera (con tutti i suoi criteri di spareggio).
  const tabellone = calcolaClassifica(squadre, giornate);
  const posReale = new Map(tabellone.map((r, i) => [String(r._id), i + 1]));
  const fantapuntiTotali = new Map(tabellone.map((r) => [String(r._id), r.puntiTotali]));

  // Posizione giusta: per punti giusti; a parità i fantapunti totali, poi il nome. Il
  // confronto arrotonda per non farsi ingannare dai decimali delle medie.
  const chiave = (r) => Math.round(r.puntiGiusti * 1e6);
  const ordineGiusto = [...righe.values()].sort((a, b) =>
    chiave(b) - chiave(a)
    || (fantapuntiTotali.get(b.squadra) ?? 0) - (fantapuntiTotali.get(a.squadra) ?? 0)
    || String(a.nome).localeCompare(String(b.nome), 'it'));
  const posGiusta = new Map(ordineGiusto.map((r, i) => [r.squadra, i + 1]));

  const n = squadre.length;
  const completa = [...righe.values()].map((r) => ({
    ...r,
    posReale: posReale.get(r.squadra),
    posGiusta: posGiusta.get(r.squadra),
    // Trofeo: i punti rubati più le posizioni rubate, queste ultime pesate di più in alto.
    punteggioTrofeo: r.culo + ((posGiusta.get(r.squadra) - posReale.get(r.squadra)) * (n + 1 - posReale.get(r.squadra))) / n
  })).sort((a, b) => a.posReale - b.posReale);

  const perTrofeo = [...completa].sort((a, b) => b.punteggioTrofeo - a.punteggioTrofeo);
  const sintesi = (r) => ({ squadra: r.squadra, nome: r.nome, stemma: r.stemma, culo: arrotonda(r.culo) });

  const totalePunti = completa.reduce((t, r) => t + r.punti, 0);
  const valoreIndice = totalePunti ? (sommaCuloPartite / totalePunti) * 100 : 0;

  return {
    vuoto: false,
    giornate: giornateConDati.size,
    partite,
    righe: completa.map((r) => ({
      squadra: r.squadra, nome: r.nome, stemma: r.stemma,
      punti: r.punti, puntiGiusti: arrotonda(r.puntiGiusti), culo: arrotonda(r.culo),
      posReale: r.posReale, posGiusta: r.posGiusta, perGiornata: r.perGiornata
    })),
    indice: {
      valore: arrotonda(valoreIndice, 1),
      giudizio: giudizioIndice(valoreIndice),
      campionePiccolo: giornateConDati.size < GIORNATE_MINIME_INDICE
    },
    sculato: sintesi(perTrofeo[0]),
    sfigato: sintesi(perTrofeo[perTrofeo.length - 1])
  };
}

// "E se...": in ogni giornata A e B si scambiano le avversarie. Se si affrontano tra
// loro, o una delle due non ha un risultato, quella giornata resta com'è. La classifica
// "dopo" usa gli stessi criteri di quella vera, così le posizioni sono confrontabili.
function calcolaInvertiti(squadre, giornate, idA, idB) {
  const nomi = new Map(squadre.map((s) => [String(s._id), s.nome]));
  const cambiate = [];

  const modificate = giornate.map((g) => {
    // Un'unica versione arricchita: gli scontri si confrontano per identità d'oggetto.
    const { fantapunti, scontri, tutti } = punteggiDellaGiornata(g);
    const scontroA = tutti.find((a) => [idDi(a.squadraCasa), idDi(a.squadraTrasferta)].includes(idA));
    const scontroB = tutti.find((a) => [idDi(a.squadraCasa), idDi(a.squadraTrasferta)].includes(idB));
    if (!scontroA || !scontroB || scontroA === scontroB) return g;
    if (!scontri.includes(scontroA) || !scontri.includes(scontroB)) return g;

    const altraDi = (scontro, id) => (idDi(scontro.squadraCasa) === id ? idDi(scontro.squadraTrasferta) : idDi(scontro.squadraCasa));
    const avversariaA = altraDi(scontroA, idA);
    const avversariaB = altraDi(scontroB, idB);
    const nuovo = (casa, trasferta) => ({
      squadraCasa: casa, squadraTrasferta: trasferta,
      punteggioCasa: fantapunti.get(casa), punteggioTrasferta: fantapunti.get(trasferta)
    });
    const accoppiamenti = (g.accoppiamenti || []).map((a, i) => {
      const originale = tutti[i];
      if (originale === scontroA) return nuovo(idA, avversariaB);
      if (originale === scontroB) return nuovo(idB, avversariaA);
      return a;
    });

    const riga = (id, contro) => {
      const golMiei = fantapuntiInGol(fantapunti.get(id));
      const golLoro = fantapuntiInGol(fantapunti.get(contro));
      return { avversaria: nomi.get(contro), golFatti: golMiei, golSubiti: golLoro, fantapunti: fantapunti.get(id), fantapuntiAvversaria: fantapunti.get(contro) };
    };
    cambiate.push({
      numero: g.numero,
      a: { reale: riga(idA, avversariaA), invertita: riga(idA, avversariaB) },
      b: { reale: riga(idB, avversariaB), invertita: riga(idB, avversariaA) }
    });
    return { ...g, accoppiamenti };
  });

  const prima = calcolaClassifica(squadre, giornate);
  const dopo = calcolaClassifica(squadre, modificate);
  const posPrima = new Map(prima.map((r, i) => [String(r._id), i + 1]));
  const puntiPrima = new Map(prima.map((r) => [String(r._id), r.punti]));

  return {
    righe: dopo.map((r, i) => ({
      squadra: String(r._id), nome: r.nome, stemma: r.stemma,
      puntiPrima: puntiPrima.get(String(r._id)), puntiDopo: r.punti,
      posPrima: posPrima.get(String(r._id)), posDopo: i + 1
    })),
    giornateCambiate: cambiate
  };
}

module.exports = { calcolaCulo, calcolaInvertiti, SOGLIE_INDICE, GIORNATE_MINIME_INDICE };
