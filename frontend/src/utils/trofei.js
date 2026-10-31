import { estremiGiornata, idDi } from './lega';

// I trofei di una squadra, di tre famiglie:
//  · il campionato, dall'albo d'oro (campione, 2ª, 3ª);
//  · i verdetti, vinti a votazioni chiuse (arrivano dal backend già decisi);
//  · i premi automatici delle edizioni: Re dei Gufi, miglior punteggio, maglia nera.
// Ogni trofeo è un gruppo { id, quanti, dettagli }: `dettagli` sono le stagioni o le
// giornate in cui è stato vinto, in ordine cronologico.

export const TROFEI_CAMPIONATO = ['campione', 'argento', 'bronzo'];
export const TROFEI_AUTOMATICI = ['gufi', 'top', 'nera'];

// Etichette fisse per i trofei che non sono categorie di voto. Le categorie di voto
// portano la loro etichetta dal backend (vedi `categorieVoto` nel contesto).
const ETICHETTE_FISSE = {
  campione: { etichetta: 'Campione', breve: 'Campione' },
  argento: { etichetta: 'Secondo posto', breve: '2ª' },
  bronzo: { etichetta: 'Terzo posto', breve: '3ª' },
  gufi: { etichetta: 'Re dei Gufi', breve: 'Re dei Gufi' },
  top: { etichetta: 'Miglior punteggio', breve: 'Top di giornata' },
  nera: { etichetta: 'Maglia nera', breve: 'Maglia nera' }
};

// L'etichetta di un trofeo, dato il suo id e l'elenco delle categorie di voto.
export function etichettaTrofeo(id, categorie = []) {
  const cat = categorie.find((c) => c.id === id);
  if (cat) return { etichetta: cat.etichetta, breve: cat.breve || cat.etichetta };
  return ETICHETTE_FISSE[id] || { etichetta: id, breve: id };
}

// L'ordine in cui i trofei si mostrano: prima il campionato, poi i verdetti, poi i
// premi automatici.
export const ordineTrofei = (categorie = []) => [
  ...TROFEI_CAMPIONATO,
  ...categorie.map((c) => c.id),
  ...TROFEI_AUTOMATICI
];

// Tutti i trofei vinti da `squadraId`, solo i tipi di cui ha almeno uno.
export function trofeiSquadra(squadraId, { albo = [], edizioni = [], giornate = [], trofeiVerdetti = [], categorie = [] }) {
  const gruppi = new Map();
  const dai = (id, dettaglio, ordine) => {
    if (!gruppi.has(id)) gruppi.set(id, []);
    gruppi.get(id).push({ dettaglio, ordine });
  };

  // Le stagioni dell'albo hanno un'etichetta di testo ("2024/2025"): l'ordine
  // alfabetico coincide con quello cronologico.
  for (const a of albo) {
    if (idDi(a.squadra) === squadraId) dai('campione', a.stagione, a.stagione);
    if (idDi(a.secondo) === squadraId) dai('argento', a.stagione, a.stagione);
    if (idDi(a.terzo) === squadraId) dai('bronzo', a.stagione, a.stagione);
  }

  for (const t of trofeiVerdetti) {
    if (t.squadre.includes(squadraId)) dai(t.categoria, `G${t.giornata}`, t.giornata);
  }

  for (const e of edizioni) {
    const g = `G${e.giornataNumero}`;
    const { migliore, peggiore } = estremiGiornata(giornate, e.giornataNumero);
    if (migliore && idDi(migliore.squadra) === squadraId) dai('top', g, e.giornataNumero);
    if (peggiore && idDi(peggiore.squadra) === squadraId) dai('nera', g, e.giornataNumero);
    if ((e.stats?.reDeiGufi || []).some((s) => idDi(s) === squadraId)) dai('gufi', g, e.giornataNumero);
  }

  return ordineTrofei(categorie)
    .filter((id) => gruppi.has(id))
    .map((id) => {
      const voci = gruppi.get(id).sort((x, y) => (x.ordine < y.ordine ? -1 : x.ordine > y.ordine ? 1 : 0));
      return { id, quanti: voci.length, dettagli: voci.map((v) => v.dettaglio) };
    });
}

// Chi ha vinto quanti trofei di ogni tipo, per tutta la lega: serve all'albo.
// Per ogni tipo, le squadre che ne hanno almeno uno, dalla più decorata.
export function classificaTrofei(squadre, dati) {
  const perTipo = new Map();
  for (const s of squadre) {
    for (const g of trofeiSquadra(s._id, dati)) {
      if (!perTipo.has(g.id)) perTipo.set(g.id, []);
      perTipo.get(g.id).push({ squadra: s, quanti: g.quanti });
    }
  }
  for (const righe of perTipo.values()) {
    righe.sort((x, y) => y.quanti - x.quanti || String(x.squadra.nome).localeCompare(String(y.squadra.nome), 'it'));
  }
  return perTipo;
}
