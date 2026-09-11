// Copia lato client delle costanti di backend/src/utils/regolamento.js.
// Serve solo per mostrare le regole (pagina Regolamento, calcolatrice gol):
// classifica e risultati ufficiali li calcola sempre il backend.
// Se cambiano le regole, aggiornare entrambi i file.

export const SOGLIA_PRIMO_GOL = 66;
export const AMPIEZZA_FASCIA = 4;
export const PUNTI_VITTORIA = 3;
export const PUNTI_PAREGGIO = 1;
export const PUNTI_SCONFITTA = 0;

const EPS = 1e-9;

export function fantapuntiInGol(fantapunti) {
  if (fantapunti === '' || fantapunti == null) return null;
  const fp = Number(fantapunti);
  if (Number.isNaN(fp)) return null;
  if (fp + EPS < SOGLIA_PRIMO_GOL) return 0;
  return Math.floor((fp - SOGLIA_PRIMO_GOL + EPS) / AMPIEZZA_FASCIA) + 1;
}

// Prime N fasce: [{ da: 66, a: 69.5, gol: 1 }, ...]
export function fasceGol(quante = 6) {
  return Array.from({ length: quante }, (_, i) => ({
    da: SOGLIA_PRIMO_GOL + AMPIEZZA_FASCIA * i,
    a: SOGLIA_PRIMO_GOL + AMPIEZZA_FASCIA * (i + 1) - 0.5,
    gol: i + 1
  }));
}

// 72.5 → "72,5" · 1234 → "1.234"
export function formattaFantapunti(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('it-IT', { maximumFractionDigits: 1 });
}
