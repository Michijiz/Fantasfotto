// Il materiale che la Gazzetta prepara da sola per chi scrive: le pagelle, le due
// righe su ogni scontro e gli spunti della giornata. Tutto parte dai numeri veri
// (fantapunti, gol, calendario): niente è inventato, niente chiama servizi esterni.
// Le frasi sono bozze in tono da giornale satirico, pensate per essere ritoccate:
// chi scrive può cambiarle, rigenerarle o scriverne di sue.
import { conRisultato, estremiGiornata, formaRecente, haPunteggi, idDi, scontriGiocabili } from './lega';
import { formattaFantapunti, formattaQuota } from './regolamento';

// Rotazione deterministica: la stessa giornata e la stessa squadra danno sempre la
// stessa frase (altrimenti ogni apertura della pagina cambierebbe il testo), e
// `variante` serve al tasto "Altra versione".
const impronta = (testo) => [...String(testo)].reduce((t, c) => (t * 31 + c.charCodeAt(0)) % 100003, 7);
const scegli = (righe, seme) => righe[Math.abs(seme) % righe.length];

// "1 fantapunto", "1,5 fantapunti".
const puntiTesto = (n) => `${formattaFantapunti(n)} ${Number(n) === 1 ? 'fantapunto' : 'fantapunti'}`;

// --- pagelle -----------------------------------------------------------------

// Scala fissa, uguale ogni giornata: sotto i 60 fantapunti è 4, poi mezzo voto ogni
// 4 punti, fino al 10. Un 7 vale sempre lo stesso, indipendentemente da come sono
// andati gli altri.
export function votoDa(fantapunti) {
  const grezzo = 4 + (Number(fantapunti) - 60) / 8;
  return Math.min(10, Math.max(4, Math.round(grezzo * 2) / 2));
}

export const formattaVoto = (voto) => Number(voto).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

// Tre battute per fascia di voto, scelte a rotazione.
const FASCE = [
  { fino: 4, righe: [
    'Fondo del barile: anche il barile si vergogna.',
    'Una serata da dimenticare, e infatti nessuno la ricorderà.',
    'Ha giocato? Le prove sono contrastanti.'
  ] },
  { fino: 5.5, righe: [
    'Insufficiente, ma con la media di chi non ha studiato.',
    'Compitino consegnato in bianco.',
    'Tanta buona volontà, nessun risultato.'
  ] },
  { fino: 6.5, righe: [
    'Il sei politico: presente, giustificato, dimenticabile.',
    'Né carne né pesce, ma almeno non ha fatto danni.',
    'Sufficienza stiracchiata: si è salvato per distrazione altrui.'
  ] },
  { fino: 7.5, righe: [
    'Buona prova, di quelle che fanno storcere il naso agli avversari.',
    'Settimana di grazia: qualcuno controlli se ha firmato un patto.',
    'Solido, concreto, quasi noioso.'
  ] },
  { fino: 8.5, righe: [
    'Prestazione da prima pagina: si è meritato il titolone.',
    'Spietato: gli avversari chiedono la moviola, ma non c\'è.',
    'Quando gira così, il fantacalcio sembra facile.'
  ] },
  { fino: 10, righe: [
    'Capolavoro: mettete la cornice e chiamate il museo.',
    'Fuori classifica: si invoca il controllo antidoping.',
    'Una giornata così capita una volta a stagione. Lui l\'ha usata.'
  ] }
];

export function battutaPer(voto, seme) {
  const fascia = FASCE.find((f) => voto <= f.fino) || FASCE[FASCE.length - 1];
  return scegli(fascia.righe, seme);
}

// La pagella di una squadra: { voto, battuta } dai suoi fantapunti.
export function pagellaAuto(squadraId, fantapunti, numeroGiornata, variante = 0) {
  const voto = votoDa(fantapunti);
  return { voto, battuta: battutaPer(voto, impronta(squadraId) + numeroGiornata * 7 + variante) };
}

// Le squadre della giornata con i fantapunti, dalla migliore alla peggiore.
export function squadreConPunti(giornata) {
  const righe = [];
  for (const a of scontriGiocabili(giornata)) {
    if (a.fantapuntiCasa != null) righe.push({ squadra: a.squadraCasa, fp: a.fantapuntiCasa });
    if (a.fantapuntiTrasferta != null) righe.push({ squadra: a.squadraTrasferta, fp: a.fantapuntiTrasferta });
  }
  return righe.sort((x, y) => y.fp - x.fp);
}

// --- due righe per scontro ---------------------------------------------------

// Vuota se lo scontro non ha ancora un risultato: senza numeri non c'è niente da
// raccontare, e inventarlo sarebbe peggio che lasciare il campo libero.
export function commentoScontro(scontro, variante = 0) {
  if (!conRisultato(scontro)) return '';
  const { squadraCasa: casa, squadraTrasferta: trasferta } = scontro;
  const gc = scontro.golCasa;
  const gt = scontro.golTrasferta;
  const margine = scontro.fantapuntiCasa != null && scontro.fantapuntiTrasferta != null
    ? Math.abs(scontro.fantapuntiCasa - scontro.fantapuntiTrasferta)
    : null;
  const scarto = margine == null ? 'un buon margine' : `${puntiTesto(margine)} di scarto`;
  const seme = impronta(`${idDi(casa)}${idDi(trasferta)}`) + variante;

  if (gc === gt) {
    return scegli([
      `${casa.nome} e ${trasferta.nome} si annullano ${gc}–${gt}: un punto a testa e la noia in omaggio.`,
      `Pareggio ${gc}–${gt} tra ${casa.nome} e ${trasferta.nome}: nessuno ha vinto, entrambi hanno già trovato le scuse.`,
      `${gc}–${gt} tra ${casa.nome} e ${trasferta.nome}. Una tregua firmata a metà campo.`
    ], seme);
  }

  const vince = gc > gt ? casa : trasferta;
  const perde = gc > gt ? trasferta : casa;
  const gv = Math.max(gc, gt);
  const gp = Math.min(gc, gt);

  if (Math.abs(gc - gt) >= 3 || (margine != null && margine >= 20)) {
    return scegli([
      `${vince.nome} travolge ${perde.nome} ${gv}–${gp}: ${scarto}, più un sopralluogo che una partita.`,
      `Per ${perde.nome} una serata da dimenticare: ${vince.nome} vince ${gv}–${gp} e non fa prigionieri.`,
      `${vince.nome} ${gv}–${gp} su ${perde.nome}: ${scarto}, la pietà non era contemplata.`
    ], seme);
  }
  if (margine != null && margine < 6) {
    return scegli([
      `${vince.nome} batte ${perde.nome} ${gv}–${gp} per un soffio: ${scarto}.`,
      `${vince.nome} la spunta su ${perde.nome} ${gv}–${gp}, ma a ${perde.nome} resta il rimpianto: ${scarto}.`,
      `Finisce ${gv}–${gp} per ${vince.nome} contro ${perde.nome}. Si decide sul filo: ${scarto}.`
    ], seme);
  }
  return scegli([
    `${vince.nome} supera ${perde.nome} ${gv}–${gp} e porta a casa i tre punti.`,
    `Tre punti per ${vince.nome}, che batte ${perde.nome} ${gv}–${gp} senza troppe storie.`,
    `${vince.nome} ${gv}–${gp} su ${perde.nome}: ${scarto}, e la classifica ringrazia.`
  ], seme);
}

// --- spunti della giornata ---------------------------------------------------

// Fatti veri della giornata, ognuno con una frase pronta da inserire nel pezzo.
// Se i punteggi non ci sono ancora, la lista è vuota: la pagina lo dice.
export function spuntiGiornata(giornate, numero) {
  const giornata = giornate.find((g) => g.numero === numero);
  if (!giornata || !haPunteggi(giornata)) return [];

  const spunti = [];
  const aggiungi = (id, etichetta, testo) => spunti.push({ id, etichetta, testo });
  const completi = scontriGiocabili(giornata)
    .filter((a) => a.fantapuntiCasa != null && a.fantapuntiTrasferta != null)
    .map((a) => ({ a, margine: Math.abs(a.fantapuntiCasa - a.fantapuntiTrasferta) }));

  const { migliore, peggiore } = estremiGiornata(giornate, numero);
  if (migliore) {
    aggiungi('top', 'Il migliore', `${migliore.squadra.nome} firma il miglior punteggio della giornata: ${puntiTesto(migliore.fp)}.`);
  }
  if (peggiore && migliore && peggiore.squadra !== migliore.squadra) {
    const distacco = formattaFantapunti(migliore.fp - peggiore.fp);
    aggiungi('flop', 'Il peggiore', `${peggiore.squadra.nome} chiude con il peggior punteggio, ${puntiTesto(peggiore.fp)}: ${distacco} in meno del migliore.`);
  }

  const ordinati = [...completi].sort((x, y) => y.margine - x.margine);
  const larga = ordinati[0];
  const stretta = ordinati[ordinati.length - 1];
  const nomiVinc = ({ a }) => (a.fantapuntiCasa >= a.fantapuntiTrasferta
    ? [a.squadraCasa.nome, a.squadraTrasferta.nome] : [a.squadraTrasferta.nome, a.squadraCasa.nome]);
  if (larga && larga.margine >= 10) {
    const [v, p] = nomiVinc(larga);
    aggiungi('larga', 'Il distacco', `${v} schiaccia ${p}: ${puntiTesto(larga.margine)} di differenza, il divario più largo della giornata.`);
  }
  if (stretta && stretta !== larga && stretta.margine < 8) {
    const [v, p] = nomiVinc(stretta);
    aggiungi('stretta', 'All\'ultimo respiro', `${v} su ${p} si decide per ${puntiTesto(stretta.margine)}: la partita più tirata.`);
  }

  const giocati = scontriGiocabili(giornata).filter(conRisultato);
  const pareggi = giocati.filter((a) => a.golCasa === a.golTrasferta).length;
  if (pareggi >= 2) aggiungi('pareggi', 'Pareggi', `${pareggi} pareggi su ${giocati.length} partite: la giornata del vorrei ma non posso.`);
  else if (pareggi === 0 && giocati.length >= 3) aggiungi('senzapari', 'Niente pareggi', `Nessun pareggio su ${giocati.length} partite: qui si vince o si perde, e di solito si perde.`);

  // Colpaccio: ha vinto chi la quota dava per sfavorito (l'1 o il 2 sopra 3,5).
  for (const a of giocati) {
    if (a.golCasa === a.golTrasferta || !a.quote) continue;
    const casaVince = a.golCasa > a.golTrasferta;
    const quota = casaVince ? a.quote.casa : a.quote.trasferta;
    if (quota >= 3.5) {
      const [v, p] = casaVince ? [a.squadraCasa.nome, a.squadraTrasferta.nome] : [a.squadraTrasferta.nome, a.squadraCasa.nome];
      aggiungi(`colpaccio-${idDi(a.squadraCasa)}`, 'Il colpaccio', `Colpaccio di ${v} su ${p}: il banco pagava ${formattaQuota(quota)} e il banco ha perso.`);
    }
  }

  // Strisce: tre vittorie o tre sconfitte di fila fino a questa giornata.
  const finoQui = giornate.filter((g) => g.numero <= numero);
  const viste = new Set();
  for (const a of scontriGiocabili(giornata)) {
    for (const s of [a.squadraCasa, a.squadraTrasferta]) {
      const id = idDi(s);
      if (viste.has(id)) continue;
      viste.add(id);
      const forma = formaRecente(finoQui, id, 12).map((f) => f.esito);
      let serie = 0;
      const ultima = forma[forma.length - 1];
      if (ultima !== 'V' && ultima !== 'P') continue;
      for (let i = forma.length - 1; i >= 0 && forma[i] === ultima; i--) serie++;
      if (serie >= 3) {
        aggiungi(`serie-${id}`, ultima === 'V' ? 'La striscia' : 'La crisi', ultima === 'V'
          ? `${s.nome} è a ${serie} vittorie di fila: qualcuno controlli che non stia giocando con le mani.`
          : `${s.nome} ha perso ${serie} partite di fila: ormai non è una crisi, è un abbonamento.`);
      }
    }
  }
  return spunti;
}

// Qualche idea per il titolo, dai fatti più forti della giornata.
export function titoliSuggeriti(giornate, numero) {
  const giornata = giornate.find((g) => g.numero === numero);
  if (!giornata || !haPunteggi(giornata)) return [];
  const { migliore, peggiore } = estremiGiornata(giornate, numero);
  const titoli = [];
  if (migliore && peggiore && migliore.squadra !== peggiore.squadra) {
    titoli.push(`${migliore.squadra.nome} sul trono, ${peggiore.squadra.nome} nel fango`);
    titoli.push(`${formattaFantapunti(migliore.fp)} a ${formattaFantapunti(peggiore.fp)}: la giornata in due numeri`);
  }
  const vincenti = scontriGiocabili(giornata).filter((a) => conRisultato(a) && a.golCasa !== a.golTrasferta);
  const larga = [...vincenti].sort((x, y) => Math.abs(y.golCasa - y.golTrasferta) - Math.abs(x.golCasa - x.golTrasferta))[0];
  if (larga) {
    const casaVince = larga.golCasa > larga.golTrasferta;
    const [v, p] = casaVince ? [larga.squadraCasa, larga.squadraTrasferta] : [larga.squadraTrasferta, larga.squadraCasa];
    titoli.push(`${v.nome} travolge ${p.nome} ${Math.max(larga.golCasa, larga.golTrasferta)}–${Math.min(larga.golCasa, larga.golTrasferta)}`);
  }
  return titoli.slice(0, 3);
}
