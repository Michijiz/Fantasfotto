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
let ultimaVisibile = -1;
let ultimoBasso = -1;

// La tastiera di iPhone non accorcia la finestra: si appoggia sopra e iOS fa
// scorrere la pagina verso l'alto per mostrare il campo. Qui si misurano dal
// viewport visuale:
//   --tastiera  quanto spazio copre la tastiera (serve solo a `.con-tastiera`)
//   --vv-top    di quanto iOS ha fatto scorrere la pagina (si compensa, così
//               l'app resta ferma dov'è invece di scivolare via)
//   --vv-h      l'altezza dell'area davvero visibile
//   --vv-basso  la distanza tra il fondo dell'area visibile e il fondo della
//               finestra: è lì che i fogli (Sheet) appoggiano il loro fondo.
//
// Perché i fogli non usano più --tastiera: prima vivevano dentro #appScreen, alto
// --app-h e ritagliato ai bordi, e si alzavano di --tastiera. Ma a seconda della
// versione di iOS la tastiera accorcia oppure no la finestra (e quindi --app-h):
// quando la accorciava, il foglio veniva alzato due volte e #appScreen lo tagliava
// sotto la testata — restava la maniglia col titolo e sotto una fascia vuota del
// fondo della pagina. Ora i fogli sono position:fixed direttamente nel <body> e si
// agganciano all'area visibile misurata qui, che è giusta in entrambi i casi.
function misuraTastiera() {
  const vv = window.visualViewport;
  if (!vv) return;
  // Con lo zoom a due dita il viewport visuale si rimpicciolisce senza tastiera.
  const zoom = Math.abs((vv.scale || 1) - 1) > 0.01;
  const altezzaFinestra = window.innerHeight;
  const visibile = zoom ? altezzaFinestra : Math.round(vv.height);
  const spostamento = zoom ? 0 : Math.max(0, Math.round(vv.offsetTop));
  const tastiera = zoom ? 0 : Math.max(0, Math.round(altezzaFinestra - vv.height));
  const basso = zoom ? 0 : Math.max(0, Math.round(altezzaFinestra - vv.offsetTop - vv.height));

  const radice = document.documentElement.style;
  if (tastiera !== ultimaTastiera) {
    ultimaTastiera = tastiera;
    radice.setProperty('--tastiera', `${tastiera}px`);
  }
  if (spostamento !== ultimoSpostamento) {
    ultimoSpostamento = spostamento;
    radice.setProperty('--vv-top', `${spostamento}px`);
  }
  if (visibile !== ultimaVisibile) {
    ultimaVisibile = visibile;
    radice.setProperty('--vv-h', `${visibile}px`);
  }
  if (basso !== ultimoBasso) {
    ultimoBasso = basso;
    radice.setProperty('--vv-basso', `${basso}px`);
  }

  // "Tastiera aperta" si decide da un campo attivo più un'area visibile
  // accorciata, non dalla sola differenza di altezze: se iOS accorcia anche la
  // finestra quella differenza resta zero a tastiera aperta.
  const attivo = document.activeElement;
  const suCampo = Boolean(attivo?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select, [contenteditable="true"]'));
  const accorciata = zoom ? false : (tastiera > 80 || (suCampo && visibile < screen.height * 0.72));
  document.documentElement.classList.toggle('con-tastiera', accorciata);
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
  // Entrando e uscendo da un campo la tastiera sale e scende: si rimisura anche
  // lì, perché su qualche iOS il resize del viewport arriva in ritardo.
  document.addEventListener('focusin', programmaMisura);
  document.addEventListener('focusout', () => setTimeout(programmaMisura, 60));
}
