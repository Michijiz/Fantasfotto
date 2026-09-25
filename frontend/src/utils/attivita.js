import { temaPerId } from '../temi';

// Le frasi del diario della lega. Il server salva solo tipo e dati (vedi
// backend/src/services/attivita.js): le parole le decide l'app, così si possono
// ritoccare senza toccare il database. La frase segue il nome di chi l'ha fatto:
// "Tizio" + "ha cambiato lo stemma di Real Cumbia".

const COSE_SQUADRA = {
  stemma: 'lo stemma',
  maglia: 'la maglia',
  foto: 'la foto di copertina',
  colori: 'i colori sociali',
  slogan: 'il coro',
  occhiello: "l'occhiello",
  storia: 'la storia',
  fondata: "l'anno di fondazione",
  rosa: 'la rosa',
  pagina: 'la pagina'
};

// "a", "a e b", "a, b e c"
function elenco(parole) {
  if (parole.length <= 1) return parole[0] || '';
  return `${parole.slice(0, -1).join(', ')} e ${parole[parole.length - 1]}`;
}

function fraseSquadra(dati, nomeSquadra) {
  const campi = dati.campi || [];
  const di = nomeSquadra ? ` di ${nomeSquadra}` : '';
  if (campi.includes('nome') && campi.length === 1) {
    return dati.vecchioNome
      ? `ha ribattezzato ${dati.vecchioNome}: ora è ${nomeSquadra}`
      : `ha ribattezzato la squadra ${nomeSquadra}`;
  }
  const cose = campi.filter((c) => c !== 'nome').map((c) => COSE_SQUADRA[c]).filter(Boolean);
  if (cose.length === 0) return `ha ritoccato la pagina${di}`;
  if (cose.length > 3) return `ha rifatto il look${di}`;
  return `ha cambiato ${elenco(cose)}${di}`;
}

export function fraseAttivita(a) {
  const d = a.dati || {};
  const squadra = a.squadra?.nome || d.nome || '';
  switch (a.tipo) {
    case 'iscrizione':
      return squadra ? `ha firmato per ${squadra}` : 'è arrivato in lega';
    case 'profilo': {
      const campi = d.campi || [];
      if (campi.includes('nome')) return `ora si fa chiamare «${d.nome || 'qualcos\'altro'}»`;
      if (campi.includes('avatar')) return 'ha cambiato faccia';
      return 'ha ritoccato il suo profilo';
    }
    case 'tema':
      return `ha cambiato squadra del cuore: ora tifa ${temaPerId(d.tema).nome}`;
    case 'squadra':
      return fraseSquadra(d, squadra);
    case 'album': {
      const n = d.quante || 1;
      return `ha incollato ${n === 1 ? 'una foto' : `${n} foto`} nell'album${squadra ? ` di ${squadra}` : ''}`;
    }
    case 'schedina':
      return d.rigiocata
        ? `ha rigufato la schedina della G${d.giornata}`
        : `ha giocato la schedina della G${d.giornata}`;
    case 'voti':
      return `ha emesso i suoi verdetti sulla G${d.giornata}`;
    case 'edizione':
      return d.titolo
        ? `ha mandato in stampa la G${d.giornata}: «${d.titolo}»`
        : `ha mandato in stampa la G${d.giornata}`;
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
