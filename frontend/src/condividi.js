import { formattaVoto } from './utils/spunti';

// "Condividi" un'edizione come immagine verticale pronta per il gruppo della lega.
// Si disegna su un canvas (nessuna libreria): carta, testata, titolo, attacco del
// pezzo e le tre migliori pagelle. I colori sono quelli del tema in uso.

const LARGHEZZA = 1080;
const ALTEZZA = 1350;
const MARGINE = 72;

// Toglie la sintassi di formattazione del pezzo (**grassetto**, __sottolineato__,
// ~~barrato~~, *corsivo*, escape) lasciando il testo.
export function testoPulito(testo) {
  return String(testo ?? '')
    .replace(/\\([*_~\\>#-])/g, '$1')
    .replace(/(\*\*|__|~~|\*)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/^[>#-]+\s*/, '')
    .trim();
}

// Spezza `testo` in righe che stanno in `larghezza`, con al massimo `max` righe:
// se non basta, l'ultima finisce con i puntini.
export function righeDa(ctx, testo, larghezza, max) {
  const parole = String(testo).split(/\s+/).filter(Boolean);
  const righe = [];
  let corrente = '';
  for (const p of parole) {
    const prova = corrente ? `${corrente} ${p}` : p;
    if (ctx.measureText(prova).width <= larghezza || !corrente) corrente = prova;
    else { righe.push(corrente); corrente = p; }
  }
  if (corrente) righe.push(corrente);
  if (righe.length <= max) return righe;
  const tagliate = righe.slice(0, max);
  let ultima = tagliate[max - 1];
  while (ultima.length > 1 && ctx.measureText(`${ultima}…`).width > larghezza) ultima = ultima.slice(0, -1);
  tagliate[max - 1] = `${ultima.trimEnd()}…`;
  return tagliate;
}

const variabile = (nome, ripiego) => (
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || ripiego
);

async function caricaFont() {
  if (!document.fonts?.load) return;
  await Promise.allSettled([
    document.fonts.load('96px Anton'),
    document.fonts.load('32px Oswald'),
    document.fonts.load('34px "Libre Baskerville"')
  ]);
}

export async function disegnaCartolina(edizione) {
  await caricaFont();
  const carta = variabile('--paper', '#f1cdda');
  const chiara = variabile('--paper-input', '#fff8fa');
  const inchiostro = variabile('--ink', '#000000');
  const rosso = variabile('--stamp-red', '#b5525f');
  const oro = variabile('--gold', '#73561d');

  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext('2d');
  const larghezzaUtile = LARGHEZZA - MARGINE * 2;

  ctx.fillStyle = carta;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  ctx.fillStyle = chiara;
  ctx.fillRect(36, 36, LARGHEZZA - 72, ALTEZZA - 72);

  // Testata
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = inchiostro;
  // La testata si rimpicciolisce finché sta nella pagina, con qualunque font.
  let corpoTestata = 72;
  ctx.font = `${corpoTestata}px Anton, sans-serif`;
  while (corpoTestata > 40 && ctx.measureText('LA GAZZETTA DELLO SFOTTÒ').width > larghezzaUtile) {
    corpoTestata -= 2;
    ctx.font = `${corpoTestata}px Anton, sans-serif`;
  }
  ctx.fillText('LA GAZZETTA DELLO SFOTTÒ', LARGHEZZA / 2, 150);
  ctx.fillStyle = rosso;
  ctx.fillRect(MARGINE, 178, larghezzaUtile, 4);
  ctx.fillStyle = inchiostro;
  ctx.font = '30px Oswald, sans-serif';
  ctx.fillText(`GIORNATA ${edizione.giornataNumero}  ·  DI ${String(edizione.direttore || '').toUpperCase()}`, LARGHEZZA / 2, 228);

  // Occhiello e titolo
  ctx.textAlign = 'left';
  let y = 320;
  ctx.fillStyle = rosso;
  ctx.font = '34px Oswald, sans-serif';
  ctx.fillText(String(edizione.occhiello || '').toUpperCase(), MARGINE, y);
  y += 30;

  ctx.fillStyle = inchiostro;
  ctx.font = '104px Anton, sans-serif';
  for (const riga of righeDa(ctx, String(edizione.titolo || '').toUpperCase(), larghezzaUtile, 4)) {
    y += 112;
    ctx.fillText(riga, MARGINE, y);
  }
  y += 56;

  // Attacco del pezzo
  const primo = (edizione.corpo || []).map(testoPulito).find(Boolean) || '';
  ctx.fillStyle = inchiostro;
  ctx.font = '36px "Libre Baskerville", serif';
  // L'attacco prende lo spazio che resta sopra le pagelle (o sopra il piede).
  const pagelle = [...(edizione.pagelle || [])].sort((a, b) => b.voto - a.voto).slice(0, 3);
  const finePezzo = pagelle.length ? ALTEZZA - 430 : ALTEZZA - 160;
  const righeLibere = Math.max(2, Math.min(6, Math.floor((finePezzo - y) / 52)));
  const attacco = righeDa(ctx, primo, larghezzaUtile, righeLibere);
  for (const riga of attacco) {
    y += 52;
    ctx.fillText(riga, MARGINE, y);
  }

  // Le pagelle migliori, se ci sono
  if (pagelle.length) {
    const base = ALTEZZA - 330;
    ctx.fillStyle = oro;
    ctx.font = '30px Oswald, sans-serif';
    ctx.fillText('LE PAGELLE', MARGINE, base - 20);
    ctx.fillStyle = inchiostro;
    pagelle.forEach((p, i) => {
      const yr = base + 40 + i * 58;
      ctx.font = '48px Anton, sans-serif';
      ctx.fillText(formattaVoto(p.voto), MARGINE, yr);
      ctx.font = '40px Anton, sans-serif';
      ctx.fillText(String(p.squadra?.nome || '').toUpperCase(), MARGINE + 130, yr);
    });
  }

  // Piede
  ctx.fillStyle = rosso;
  ctx.fillRect(MARGINE, ALTEZZA - 100, larghezzaUtile, 3);
  ctx.textAlign = 'center';
  ctx.fillStyle = inchiostro;
  ctx.font = '26px Oswald, sans-serif';
  ctx.fillText('ORGANO UFFICIALE (NON RICHIESTO) DELLA FANTABILE', LARGHEZZA / 2, ALTEZZA - 58);

  return canvas;
}

const comeBlob = (canvas) => new Promise((ok, no) => {
  canvas.toBlob((b) => (b ? ok(b) : no(new Error('Immagine non generata'))), 'image/png');
});

// Apre il foglio di condivisione del telefono; dove non c'è (computer) scarica il PNG.
// Ritorna 'condivisa' | 'scaricata' | 'annullata'.
export async function condividiEdizione(edizione) {
  const blob = await comeBlob(await disegnaCartolina(edizione));
  const nome = `gazzetta-g${edizione.giornataNumero}.png`;
  const file = new File([blob], nome, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: edizione.titolo });
      return 'condivisa';
    } catch (err) {
      if (err?.name === 'AbortError') return 'annullata';
      // Altro errore: si ripiega sul download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'scaricata';
}
