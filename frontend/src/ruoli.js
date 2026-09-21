// Chi può fare cosa. Unico posto in cui si scrive `ruolo === '...'`: prima il
// controllo era sparso in cinque componenti e aggiungere un ruolo avrebbe voluto
// dire trovarli tutti.
//
// Gli stessi confini valgono lato server (backend/src/middleware/auth.js): qui si
// decide solo cosa *mostrare*, non cosa è permesso. Un bottone nascosto non è una
// protezione.

// Tabella interna: fuori da qui si usano RUOLI_ISCRIZIONE e le tre funzioni.
const RUOLI = {
  giocatore: {
    id: 'giocatore',
    nome: 'Giocatore',
    badge: 'Abbonato',
    descrizione: 'Leggi la Gazzetta, compili la schedina e voti i verdetti.'
  },
  redattore: {
    id: 'redattore',
    nome: 'Redattore',
    badge: 'Direttore di turno',
    descrizione: 'In più compili la giornata, mandi in stampa l\'edizione e tieni l\'albo d\'oro.'
  },
  admin: {
    id: 'admin',
    nome: 'Amministratore',
    badge: 'Amministratore',
    descrizione: 'Come il redattore, e può anche cancellare.'
  }
};

// I due ruoli che si possono scegliere iscrivendosi: l'amministratore si nomina
// a mano sul database, non lo si spunta da un modulo.
export const RUOLI_ISCRIZIONE = [RUOLI.giocatore, RUOLI.redattore];

const ruoloDi = (utente) => utente?.ruolo || 'giocatore';

// Compilare giornate, edizioni e albo d'oro.
export const puoRedigere = (utente) => ['redattore', 'admin'].includes(ruoloDi(utente));

// Cancellare: l'unica azione che non si annulla.
export const puoCancellare = (utente) => ruoloDi(utente) === 'admin';

export const etichettaRuolo = (utente) => (RUOLI[ruoloDi(utente)] || RUOLI.giocatore).badge;
