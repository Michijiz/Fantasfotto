import { repartiModulo } from './utils/regolamento';

// Le scelte della pagina squadra che gli allenatori fanno da "Componi la squadra".
// Il server salva solo gli id (vedi squadreController.aggiornaMiaSquadra): deve
// combaciare con RITAGLI in backend/src/controllers/squadreController.js.

// I ritagli della pagina, nell'ordine di default. Tutti si possono spegnere e
// spostare; la copertina (stemma, nome, allenatori, numeri) resta sempre in testa.
export const RITAGLI_SQUADRA = [
  { id: 'derby', nome: 'Il derby personale', nota: 'lo vede chi visita, contro la sua squadra' },
  { id: 'forma', nome: 'La forma' },
  { id: 'storia', nome: 'La storia' },
  { id: 'rosa', nome: 'La rosa' },
  { id: 'formazione', nome: 'La formazione ideale' },
  { id: 'album', nome: "L'album" },
  { id: 'albo', nome: 'La bacheca' }
];

const IDS = RITAGLI_SQUADRA.map((r) => r.id);

// Ordine salvato + ritagli nuovi in coda: uno aggiunto in futuro compare a tutti.
export function ordineRitagli(ordine) {
  const salvato = (ordine || []).filter((id) => IDS.includes(id));
  return [...new Set([...salvato, ...IDS])];
}

// La bozza di "Componi la squadra" a partire dalla squadra pubblicata. I campi
// mancanti prendono il valore che riproduce la pagina di prima.
export function bozzaSquadra(squadra) {
  const r = squadra?.rosaRuoli || {};
  return {
    nome: squadra?.nome || '',
    occhiello: squadra?.occhiello || '',
    slogan: squadra?.slogan || '',
    fondataNel: squadra?.fondataNel ? String(squadra.fondataNel) : '',
    bio: squadra?.bio || '',
    foto: squadra?.foto || '',
    stemma: squadra?.stemma || '',
    maglia: squadra?.maglia || '',
    colori: Array.isArray(squadra?.colori) ? squadra.colori.slice(0, 2) : [],
    rosaRuoli: { P: r.P || [], D: r.D || [], C: r.C || [], A: r.A || [] },
    rosa: squadra?.rosa || [],
    formazione: formazioneDi(squadra),
    pagina: {
      stileTitolo: squadra?.pagina?.stileTitolo === 'contorno' ? 'contorno' : 'pieno',
      nascosti: squadra?.pagina?.nascosti || [],
      ordine: ordineRitagli(squadra?.pagina?.ordine)
    }
  };
}

// Colori proposti come punto di partenza: si può sempre scegliere quello che si vuole.
export const COLORI_PROPOSTI = [
  '#241b1e', '#ffffff', '#b5525f', '#c8102e', '#e4002b', '#f4c300', '#ff7900',
  '#0a8f3c', '#0068a8', '#1b3f8b', '#6cace4', '#5b2c83', '#8b0000', '#7a4a2b'
];

// Sfondo della fascia di copertina quando non c'è una foto: i colori della
// squadra a bande oblique, o l'inchiostro del tema se non ne ha scelti.
export function sfondoColori(colori) {
  const c = (colori || []).filter(Boolean);
  if (c.length === 0) return 'var(--ink)';
  if (c.length === 1) return c[0];
  return `repeating-linear-gradient(135deg, ${c[0]} 0 34px, ${c[1]} 34px 68px)`;
}

// Le immagini Cloudinary si possono chiedere già rimpicciolite, cambiando solo
// l'indirizzo: in griglia bastano pochi KB invece dell'originale da megabyte.
// Gli indirizzi che non sono di Cloudinary tornano tali e quali.
export function miniatura(url, larghezza = 600) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com/') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${larghezza}/`);
}


// --- Formazione ideale --------------------------------------------------------

export const RUOLI_CAMPO = ['P', 'D', 'C', 'A'];

// La formazione com'è salvata (o vuota). Sempre con tutti e quattro i reparti,
// così l'editor e il campo non devono controllare ogni campo mancante.
export function formazioneDi(squadra) {
  const f = squadra?.formazione || {};
  const t = f.titolari || {};
  return {
    modulo: f.modulo || '',
    titolari: { P: t.P || [], D: t.D || [], C: t.C || [], A: t.A || [] }
  };
}

// La formazione pronta da disegnare, oppure null. Conta solo se il modulo è del
// regolamento, ogni reparto ha il numero giusto di titolari e tutti sono ancora
// in rosa nel loro ruolo: un calciatore tolto dalla rosa non deve restare in
// campo. È lo stesso controllo del server (formazioneDa), così pagina e salvataggio
// non possono dare risposte diverse.
export function formazioneSchierata(squadra) {
  const { modulo, titolari } = formazioneDi(squadra);
  const reparti = repartiModulo(modulo);
  if (!reparti) return null;
  const rosa = squadra?.rosaRuoli || {};
  const righe = [];
  for (const ruolo of RUOLI_CAMPO) {
    const nomi = titolari[ruolo];
    const inRosa = new Set(rosa[ruolo] || []);
    if (nomi.length !== reparti[ruolo] || new Set(nomi).size !== nomi.length || nomi.some((n) => !inRosa.has(n))) return null;
    righe.push({ ruolo, nomi });
  }
  return { modulo, righe };
}

// Dove stanno i giocatori sul mezzo campo, in percentuale (x da sinistra, y
// dall'alto; la porta è in basso, l'attacco verso la linea di metà campo).
// Numerati da 1 a 11 per reparto, dalla porta in su: nei dati non ci sono i numeri
// di maglia veri. Con 5 in fila i nomi si toccherebbero: a righe alterne la
// posizione scala un po', come nei campi dei giornali.
const Y_RIGA = { P: 89, D: 65, C: 41, A: 16 };
export function posizioniCampo(righe) {
  let numero = 0;
  return righe.flatMap(({ ruolo, nomi }) => {
    const n = nomi.length;
    const passo = n > 1 ? Math.min(30, 76 / (n - 1)) : 0;
    return nomi.map((nome, i) => ({
      numero: (numero += 1),
      nome,
      ruolo,
      x: 50 + (i - (n - 1) / 2) * passo,
      y: Y_RIGA[ruolo] + (n >= 5 && i % 2 === 1 ? -6 : 0),
      fitto: n >= 4
    }));
  });
}

// Bianco o nero, a seconda di quale si legge meglio sopra `colore` (#rrggbb).
export function testoSu(colore) {
  const m = /^#([0-9a-f]{6})$/i.exec(colore || '');
  if (!m) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#000000' : '#ffffff';
}
