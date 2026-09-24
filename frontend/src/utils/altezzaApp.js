// L'altezza vera della finestra, misurata e messa in `--app-h`.
//
// Il CSS usava `100dvh` ovunque. `dvh` è già il viewport "dinamico", ma il
// browser lo aggiorna a scatti: mentre la barra degli indirizzi scorre via — e
// per un istante dopo — il valore calcolato e l'area davvero visibile non
// coincidono. Siccome `#appScreen` è alto esattamente `100dvh` e la bottom nav è
// appoggiata al suo fondo, in quegli istanti sotto la nav si vedeva una striscia
// del fondo della pagina: è lo "spazio bianco in fondo" che compare e sparisce.
//
// Misurare a mano toglie il disallineamento: `--app-h` viene riscritta a ogni
// resize e a ogni movimento del viewport visuale, e il CSS la usa con `100dvh`
// come ripiego per il primo paint e per i browser senza `visualViewport`.
//
// Nota sulla tastiera: si misura `window.innerHeight`, non
// `visualViewport.height`. Il secondo si accorcia quando si apre la tastiera, e
// l'app si schiaccerebbe a metà schermo ogni volta che si scrive in un campo.

let ultima = 0;
let inCoda = false;

let ultimaTastiera = -1;
let ultimoSpostamento = -1;

// La tastiera di iPhone non accorcia la finestra: si appoggia sopra e iOS fa
// scorrere la pagina verso l'alto per mostrare il campo. Il risultato era un
// foglio tagliato a metà e, sotto, una fascia piatta di sfondo. Qui si misurano
// due cose dal viewport visuale:
//   --tastiera  quanto spazio copre la tastiera (i fogli si alzano di tanto)
//   --vv-top    di quanto iOS ha fatto scorrere la pagina (si compensa, così
//               l'app resta ferma dov'è invece di scivolare via)
function misuraTastiera() {
  const vv = window.visualViewport;
  if (!vv) return;
  // Con lo zoom a due dita il viewport visuale si rimpicciolisce senza tastiera.
  const zoom = Math.abs((vv.scale || 1) - 1) > 0.01;
  const tastiera = zoom ? 0 : Math.max(0, Math.round(window.innerHeight - vv.height));
  const spostamento = zoom ? 0 : Math.max(0, Math.round(vv.offsetTop));
  const radice = document.documentElement.style;
  if (tastiera !== ultimaTastiera) {
    ultimaTastiera = tastiera;
    radice.setProperty('--tastiera', `${tastiera}px`);
    document.documentElement.classList.toggle('con-tastiera', tastiera > 80);
  }
  if (spostamento !== ultimoSpostamento) {
    ultimoSpostamento = spostamento;
    radice.setProperty('--vv-top', `${spostamento}px`);
  }
}

function misura() {
  inCoda = false;
  misuraTastiera();
  const altezza = Math.round(window.innerHeight);
  if (!altezza || altezza === ultima) return;
  ultima = altezza;
  document.documentElement.style.setProperty('--app-h', `${altezza}px`);
}

// Il `scroll` del viewport visuale scatta a ogni frame mentre si scorre, e
// leggere `window.innerHeight` lì dentro costringe il browser a ricalcolare il
// layout. Accodando a `requestAnimationFrame` la misura resta una per frame e
// arriva nel momento in cui il browser sta comunque per ridisegnare.
function programmaMisura() {
  if (inCoda) return;
  inCoda = true;
  requestAnimationFrame(misura);
}

export function seguiAltezzaApp() {
  misura();

  window.addEventListener('resize', programmaMisura);
  window.addEventListener('orientationchange', programmaMisura);
  // Su iOS il `resize` della finestra non scatta mentre la barra si ritrae:
  // scatta solo quello del viewport visuale.
  window.visualViewport?.addEventListener('resize', programmaMisura);
  window.visualViewport?.addEventListener('scroll', programmaMisura);
  // Al ritorno dallo sfondo la finestra può essere cambiata senza eventi.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) programmaMisura(); });
}
