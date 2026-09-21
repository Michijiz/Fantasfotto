// Loghi e maglie delle squadre della lega, serviti da `public/`.
//
// Perché un file e non il database: lo stemma su `Squadra` resta l'immagine che
// l'allenatore carica dal Profilo e ha sempre la precedenza. Questa tabella è la
// dotazione di redazione — i loghi disegnati per la lega — e fa da riserva per le
// squadre che non hanno ancora caricato niente, così l'app non parte più piena di
// scudetti grigi. Nessuna migrazione da fare: è tutto lato frontend.
//
// I loghi sono le versioni a 256px dei PNG in `public/icons/` (quelli *senza*
// `-kit`, che sono invece le maglie): gli originali pesano fino a 900 KB l'uno e
// a 28px di lato erano quasi 4 MB scaricati per niente ad ogni apertura.
//
// Dunder Mifflin non ha un logo, solo la maglia: nell'elenco e nelle classifiche
// resta il monogramma di riserva (vedi `Stemma.jsx`).

// Un elemento per squadra. `nomi` sono le grafie che si possono incontrare nel
// database: la prima è quella "ufficiale", le altre servono solo a farsi trovare.
const SQUADRE = [
  { nomi: ['ASs Gotiche-Gotiche', 'Gotiche'], logo: '/loghi/asgotiche.png', maglia: '/icons/asgotiche-kit.png' },
  { nomi: ['Chiavo Veronica FC'], logo: '/loghi/chiavoveronica.png', maglia: '/icons/chiavoveronica-kit.png' },
  { nomi: ['Mieccio & Annintra'], logo: '/loghi/mieccioeannitra.png', maglia: '/icons/mieccioeannitra-kit.png' },
  { nomi: ['FFC Noi United', 'Noi United'], logo: '/loghi/noiunited.png', maglia: '/icons/noiunited-kit.png' },
  { nomi: ['Real Cumbia'], logo: '/loghi/realcumbia.png', maglia: '/icons/realcumbia-kit.png' },
  { nomi: ['US Ticchio'], logo: '/loghi/usticchio.png', maglia: '/icons/usticchio-kit.png' },
  { nomi: ['Dunder Mifflin'], logo: '', maglia: '/icons/dundermiffilin-kit.png' }
];

// Il nome della squadra lo scrive l'allenatore dal Profilo, quindi non coincide
// quasi mai con la grafia qui sopra: "US Ticchio", "U.S. Ticchio" e "Us  Ticchio"
// devono trovare lo stesso logo. Si confrontano solo lettere e cifre, minuscole,
// senza accenti e senza le sigle di contorno ("fc", "ssd", "as"...).
const SIGLE = /^(fc|ffc|ac|as|ass|us|uc|ssd|asd|ssc|sc|cf|la|il|lo|the)$/;

function slug(nome) {
  const parti = String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  // Via anche i pezzi da una lettera sola: "U.S. Ticchio" si spezza in
  // "u", "s", "ticchio" e senza questo diventerebbe "usticchio", che non
  // assomiglia più a "ticchio" quanto basta.
  const senzaSigle = parti.filter((p) => p.length > 1 && !SIGLE.test(p));
  return (senzaSigle.length ? senzaSigle : parti).join('');
}

// Indice costruito una volta sola all'avvio: slug → voce.
const INDICE = new Map();
for (const voce of SQUADRE) {
  for (const nome of voce.nomi) INDICE.set(slug(nome), voce);
}

// Distanza di Levenshtein, abbandonata appena supera `max`: serve solo a tollerare
// un refuso ("Ticchiu" per "Ticchio", "Annitra" per "Annintra"), non a indovinare.
function distanza(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let riga = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const precedente = riga;
    riga = [i];
    let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      riga[j] = Math.min(precedente[j] + 1, riga[j - 1] + 1, precedente[j - 1] + costo);
      if (riga[j] < minimo) minimo = riga[j];
    }
    if (minimo > max) return max + 1;
  }
  return riga[b.length];
}

const cache = new Map();

// Trova la voce di una squadra dal nome. Tre tentativi in ordine di sicurezza:
// slug identico, uno contenuto nell'altro ("Noi United" per "FFC Noi United"),
// e infine un refuso di al massimo due caratteri — ma solo su nomi abbastanza
// lunghi, altrimenti due caratteri sono mezza parola e una squadra nuova
// finirebbe col logo di un'altra.
function trova(nome) {
  const chiave = slug(nome);
  if (!chiave) return null;
  if (cache.has(chiave)) return cache.get(chiave);

  let voce = INDICE.get(chiave) || null;

  if (!voce) {
    for (const [k, v] of INDICE) {
      if (k.includes(chiave) || chiave.includes(k)) { voce = v; break; }
    }
  }

  if (!voce && chiave.length >= 6) {
    const soglia = 2;
    let minima = soglia + 1;
    for (const [k, v] of INDICE) {
      const d = distanza(chiave, k, soglia);
      if (d < minima) { minima = d; voce = v; }
    }
    if (minima > soglia) voce = null;
  }

  cache.set(chiave, voce);
  return voce;
}

export function logoSquadra(nome) {
  return trova(nome)?.logo || '';
}

export function magliaSquadra(nome) {
  return trova(nome)?.maglia || '';
}

// Iniziali per il monogramma di riserva: "Dunder Mifflin" → "DM", "US Ticchio" → "TI".
// Sempre due lettere: una sola dentro un cerchio sembra un refuso.
export function inizialiSquadra(nome) {
  const parti = String(nome || '').split(/[\s&._-]+/).filter(Boolean);
  const utili = parti.filter((p) => p.length > 1 && !SIGLE.test(p.toLowerCase()));
  const scelte = utili.length ? utili : parti;
  if (scelte.length === 0) return '?';
  if (scelte.length === 1) return scelte[0].slice(0, 2).toUpperCase();
  return (scelte[0][0] + scelte[1][0]).toUpperCase();
}
