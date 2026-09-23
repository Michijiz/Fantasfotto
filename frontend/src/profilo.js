// Le scelte della pagina Profilo che l'utente può fare da "Componi la tua pagina".
// Il server salva solo gli id (vedi authController.aggiornaProfilo).

// Sfondo della foto nel ritaglio d'apertura. 'tema' segue la carta della squadra
// tifata; gli altri sono tinte neutre che stanno bene con qualunque tema.
export const SFONDI = [
  { id: 'tema', nome: 'Come il tema', colore: 'var(--paper-dark)' },
  { id: 'carta', nome: 'Carta di giornale', colore: '#ece0c8' },
  { id: 'cielo', nome: 'Cielo', colore: '#d3dde8' },
  { id: 'erba', nome: 'Erba', colore: '#d3e3cc' },
  { id: 'lavagna', nome: 'Lavagna', colore: '#cdc5ca' },
  { id: 'inchiostro', nome: 'Inchiostro', colore: 'var(--ink)' }
];

export const coloreSfondo = (id) => (SFONDI.find((s) => s.id === id) || SFONDI[0]).colore;

// I ritagli che si possono spegnere. Squadra e impostazioni restano sempre: senza
// la squadra la pagina non direbbe più di chi è.
export const RITAGLI = [
  { id: 'numeri', nome: 'I numeri' },
  { id: 'forma', nome: 'La forma' },
  { id: 'cuore', nome: 'Il cuore' },
  { id: 'archivio', nome: "Dall'archivio", soloRedazione: true },
  { id: 'albo', nome: "Nell'albo" }
];

export const PROFILO_VUOTO = {
  occhiello: '',
  sottotitolo: '',
  motto: '',
  didascalia: '',
  sfondo: 'tema',
  stileTitolo: 'pieno',
  nascosti: []
};

export const profiloDi = (utente) => ({ ...PROFILO_VUOTO, ...(utente?.profilo || {}) });
