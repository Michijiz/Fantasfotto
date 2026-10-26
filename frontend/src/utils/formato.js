// Formattazione leggera dei testi dell'edizione. Nel database resta testo semplice
// con una sintassi in stile Markdown (nessun HTML: niente da "ripulire" lato server):
//   **grassetto**  *corsivo*  __sottolineato__  ~~barrato~~
//   "## " sottotitolo, "> " citazione, "- " elenco (a inizio riga, solo nel pezzo)
//   \* per scrivere un asterisco vero.
// Un'edizione scritta prima di questa funzione non contiene marcatori: si legge uguale.

export const MARCATORI = { grassetto: '**', corsivo: '*', sottolineato: '__', barrato: '~~' };

// Il testo senza marcatori, per anteprime e riassunti (es. l'attacco in Dashboard).
export function senzaFormato(testo = '') {
  return String(testo)
    .replace(/^(## |> |- )/gm, '')
    .replace(/\*\*|__|~~/g, '')
    .replace(/(^|[^\\])\*/g, '$1')
    .replace(/\\([*_~\\>#-])/g, '$1');
}
