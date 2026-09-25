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
  { id: 'album', nome: "L'album" },
  { id: 'albo', nome: "Nell'albo" }
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
