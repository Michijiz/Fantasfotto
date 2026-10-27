// Le frasi del diario della lega. Il server salva solo tipo e dati (vedi
// backend/src/services/attivita.js): le parole le decide l'app, così si possono
// ritoccare senza toccare il database. La frase segue il nome di chi l'ha fatto:
// "Tizio" + "ha giocato la schedina della G5".
//
// Il diario ha solo due tipi (backend/src/models/Attivita.js): schedine e verdetti.

export function fraseAttivita(a) {
  const d = a.dati || {};
  switch (a.tipo) {
    case 'schedina':
      return `ha giocato la schedina della G${d.giornata}`;
    case 'voti':
      return `ha emesso i suoi verdetti sulla G${d.giornata}`;
    default:
      return 'ha fatto qualcosa di misterioso';
  }
}

// "adesso", "5 min fa", "3 h fa", "ieri", "4 giorni fa", poi la data.
export function tempoFa(data) {
  const t = new Date(data).getTime();
  if (!t) return '';
  const secondi = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secondi < 60) return 'adesso';
  const minuti = Math.round(secondi / 60);
  if (minuti < 60) return `${minuti} min fa`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  const giorni = Math.round(ore / 24);
  if (giorni === 1) return 'ieri';
  if (giorni < 7) return `${giorni} giorni fa`;
  return new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}
