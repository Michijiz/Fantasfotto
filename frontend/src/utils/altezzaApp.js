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

function misura() {
  inCoda = false;
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
