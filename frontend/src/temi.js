// GENERATO da scripts/genera-temi.mjs — non modificare a mano i valori:
// sono calcolati dai colori sociali delle squadre e verificati sui contrasti
// minimi (accento su bianco, decorativo su carta, inchiostro su carta).
//
// Ogni tema ridipinge solo i colori: carta chiara tinta dell'identità della
// squadra, inchiostro scuro, accento per gli elementi funzionali (bottoni, FAB,
// stato attivo) e decorativo per le etichette. Font e impaginazione restano
// quelli della Gazzetta.

export const TEMA_DEFAULT = 'palermo';

export const TEMI = [
  {
    id: 'palermo',
    nome: 'Palermo',
    colori: ['#F5A9C4', '#000000'],
    vars: {
      '--paper': '#f1cdda',
      '--paper-dark': '#e7bccc',
      '--paper-input': '#fff8fa',
      '--ink': '#000000',
      '--ink-soft': '#4a3a3f',
      '--rule': '#050505',
      '--stamp-red': '#b5525f',
      '--gold': '#73561d',
      '--nav-testo': '#f1cdda',
      '--gold-chiaro': '#c09031'
    }
  },
  {
    id: 'atalanta',
    nome: 'Atalanta',
    colori: ['#000000', '#1E71B8'],
    vars: {
      '--paper': '#e4ebf2',
      '--paper-dark': '#cedce9',
      '--paper-input': '#f6f9fc',
      '--ink': '#121212',
      '--ink-soft': '#5e5e5e',
      '--rule': '#080808',
      '--stamp-red': '#1e71b8',
      '--gold': '#0e4e86',
      '--gold-chiaro': '#54a6ed',
      '--nav-testo': '#d9e4ec'
    }
  },
  {
    id: 'bologna',
    nome: 'Bologna',
    colori: ['#A21C26', '#1A2F48'],
    vars: {
      '--paper': '#f1dfe1',
      '--paper-dark': '#e8c9cb',
      '--paper-input': '#fcf5f6',
      '--ink': '#0a111a',
      '--ink-soft': '#465d77',
      '--rule': '#04070b',
      '--stamp-red': '#a21c26',
      '--gold': '#1a2f48',
      '--gold-chiaro': '#7da3d0',
      '--nav-testo': '#ecd5d7'
    }
  },
  {
    id: 'cagliari',
    nome: 'Cagliari',
    colori: ['#A6192E', '#002350'],
    vars: {
      '--paper': '#e4eaf1',
      '--paper-dark': '#d0dae7',
      '--paper-input': '#f6f8fb',
      '--ink': '#0a111a',
      '--ink-soft': '#485e7a',
      '--rule': '#04070b',
      '--stamp-red': '#a6192e',
      '--gold': '#002350',
      '--gold-chiaro': '#559fff',
      '--nav-testo': '#dbe2eb'
    }
  },
  {
    id: 'como',
    nome: 'Como',
    colori: ['#003DA5', '#FFFFFF'],
    vars: {
      '--paper': '#eceff4',
      '--paper-dark': '#d8dee9',
      '--paper-input': '#f6f8fb',
      '--ink': '#0a101a',
      '--ink-soft': '#485c7a',
      '--rule': '#04070b',
      '--stamp-red': '#003da5',
      '--gold': '#2c67c9',
      '--gold-chiaro': '#759ee1',
      '--nav-testo': '#dfe4ec'
    }
  },
  {
    id: 'fiorentina',
    nome: 'Fiorentina',
    colori: ['#482E92', '#FFFFFF'],
    vars: {
      '--paper': '#ebe8f3',
      '--paper-dark': '#d9d3e9',
      '--paper-input': '#f7f6fb',
      '--ink': '#0e0a1a',
      '--ink-soft': '#55487a',
      '--rule': '#06040b',
      '--stamp-red': '#482e92',
      '--gold': '#6b4fbf',
      '--gold-chiaro': '#a492d7',
      '--nav-testo': '#e2deed'
    }
  },
  {
    id: 'frosinone',
    nome: 'Frosinone',
    colori: ['#FFD700', '#0055A4'],
    vars: {
      '--paper': '#f4f0dc',
      '--paper-dark': '#eee7c4',
      '--paper-input': '#fdfbf5',
      '--ink': '#0a101a',
      '--ink-soft': '#485c7a',
      '--rule': '#04070b',
      '--stamp-red': '#0055a4',
      '--gold': '#7a6700',
      '--gold-chiaro': '#bc9f00',
      '--nav-testo': '#f0ebd0'
    }
  },
  {
    id: 'genoa',
    nome: 'Genoa',
    colori: ['#A51E36', '#0D1E3F'],
    vars: {
      '--paper': '#e1e4ea',
      '--paper-dark': '#ced4de',
      '--paper-input': '#f7f8fa',
      '--ink': '#0a0f1a',
      '--ink-soft': '#48597a',
      '--rule': '#04060b',
      '--stamp-red': '#a51e36',
      '--gold': '#0d1e3f',
      '--gold-chiaro': '#7c9fe4',
      '--nav-testo': '#d9dce3'
    }
  },
  {
    id: 'inter',
    nome: 'Inter',
    colori: ['#010E80', '#000000'],
    vars: {
      '--paper': '#e8e9f2',
      '--paper-dark': '#d4d6e8',
      '--paper-input': '#f6f7fb',
      '--ink': '#121212',
      '--ink-soft': '#5e5e5e',
      '--rule': '#080808',
      '--stamp-red': '#010e80',
      '--gold': '#3a49b5',
      '--gold-chiaro': '#929bdc',
      '--nav-testo': '#dee0ed'
    }
  },
  {
    id: 'juventus',
    nome: 'Juventus',
    colori: ['#FFFFFF', '#000000'],
    vars: {
      '--paper': '#eeeff1',
      '--paper-dark': '#dddfe4',
      '--paper-input': '#f7f8fa',
      '--ink': '#121212',
      '--ink-soft': '#616161',
      '--rule': '#080808',
      '--stamp-red': '#000000',
      '--gold': '#5e6572',
      '--gold-chiaro': '#9aa0ac',
      '--nav-testo': '#e3e5e8'
    }
  },
  {
    id: 'lazio',
    nome: 'Lazio',
    colori: ['#87D8F7', '#FFFFFF'],
    vars: {
      '--paper': '#eff7fa',
      '--paper-dark': '#d7ecf4',
      '--paper-input': '#f5fafd',
      '--ink': '#0a151a',
      '--ink-soft': '#486b7a',
      '--rule': '#04090b',
      '--stamp-red': '#237a9e',
      '--gold': '#2e5f7a',
      '--gold-chiaro': '#6ea8c8',
      '--nav-testo': '#d8ebf3'
    }
  },
  {
    id: 'lecce',
    nome: 'Lecce',
    colori: ['#FFE500', '#D71920'],
    vars: {
      '--paper': '#f6f4df',
      '--paper-dark': '#f0ecc6',
      '--paper-input': '#fdfcf5',
      '--ink': '#1a0f0a',
      '--ink-soft': '#7a5948',
      '--rule': '#0b0604',
      '--stamp-red': '#d71920',
      '--gold': '#7a6e00',
      '--gold-chiaro': '#b2a100',
      '--nav-testo': '#f3efd3'
    }
  },
  {
    id: 'milan',
    nome: 'Milan',
    colori: ['#FB090B', '#000000'],
    vars: {
      '--paper': '#f3e2e3',
      '--paper-dark': '#ebcccc',
      '--paper-input': '#fcf5f5',
      '--ink': '#121212',
      '--ink-soft': '#5c5c5c',
      '--rule': '#080808',
      '--stamp-red': '#e70406',
      '--gold': '#8a0709',
      '--gold-chiaro': '#f8797b',
      '--nav-testo': '#eed8d8'
    }
  },
  {
    id: 'monza',
    nome: 'Monza',
    colori: ['#FFFFFF', '#E30613'],
    vars: {
      '--paper': '#f4f1f1',
      '--paper-dark': '#e7dfdf',
      '--paper-input': '#faf7f7',
      '--ink': '#190b0c',
      '--ink-soft': '#7a484c',
      '--rule': '#0b0505',
      '--stamp-red': '#e30613',
      '--gold': '#8e3038',
      '--gold-chiaro': '#d78a90',
      '--nav-testo': '#e9e2e3'
    }
  },
  {
    id: 'napoli',
    nome: 'Napoli',
    colori: ['#12A0D7', '#FFFFFF'],
    vars: {
      '--paper': '#daeef6',
      '--paper-dark': '#c0e4f2',
      '--paper-input': '#f5fafd',
      '--ink': '#0a151a',
      '--ink-soft': '#446574',
      '--rule': '#04090b',
      '--stamp-red': '#0e7da8',
      '--gold': '#00395c',
      '--gold-chiaro': '#1aa8ff',
      '--nav-testo': '#cde9f3'
    }
  },
  {
    id: 'parma',
    nome: 'Parma',
    colori: ['#FFD200', '#1B3A6B'],
    vars: {
      '--paper': '#f5f3ea',
      '--paper-dark': '#ece8d5',
      '--paper-input': '#fcfbf6',
      '--ink': '#0a101a',
      '--ink-soft': '#485b7a',
      '--rule': '#04070b',
      '--stamp-red': '#1b3a6b',
      '--gold': '#806900',
      '--gold-chiaro': '#bd9b00',
      '--nav-testo': '#eeebdd'
    }
  },
  {
    id: 'roma',
    nome: 'Roma',
    colori: ['#8E1F2F', '#F0BC42'],
    vars: {
      '--paper': '#f0e5e7',
      '--paper-dark': '#e6d0d3',
      '--paper-input': '#fbf6f7',
      '--ink': '#1a0a0c',
      '--ink-soft': '#7a4850',
      '--rule': '#0b0405',
      '--stamp-red': '#8e1f2f',
      '--gold': '#84600a',
      '--gold-chiaro': '#cb940f',
      '--nav-testo': '#ebdbdd'
    }
  },
  {
    id: 'sassuolo',
    nome: 'Sassuolo',
    colori: ['#000000', '#00A752'],
    vars: {
      '--paper': '#e8f3ed',
      '--paper-dark': '#d3e9de',
      '--paper-input': '#f6fbf9',
      '--ink': '#121212',
      '--ink-soft': '#616161',
      '--rule': '#080808',
      '--stamp-red': '#008340',
      '--gold': '#006b36',
      '--gold-chiaro': '#00b85d',
      '--nav-testo': '#deede5'
    }
  },
  {
    id: 'torino',
    nome: 'Torino',
    colori: ['#8A1E03', '#FFFFFF'],
    vars: {
      '--paper': '#f3eae8',
      '--paper-dark': '#e9d7d3',
      '--paper-input': '#fbf7f6',
      '--ink': '#1a0e0a',
      '--ink-soft': '#7a5548',
      '--rule': '#0b0604',
      '--stamp-red': '#8a1e03',
      '--gold': '#97583e',
      '--gold-chiaro': '#c9937c',
      '--nav-testo': '#ede1de'
    }
  },
  {
    id: 'udinese',
    nome: 'Udinese',
    colori: ['#FFFFFF', '#000000'],
    vars: {
      '--paper': '#f0eeea',
      '--paper-dark': '#e5dfd7',
      '--paper-input': '#fbf9f7',
      '--ink': '#1a130a',
      '--ink-soft': '#705e42',
      '--rule': '#0b0804',
      '--stamp-red': '#2b2b2b',
      '--gold': '#776750',
      '--gold-chiaro': '#af9f88',
      '--nav-testo': '#eae6e1'
    }
  },
  {
    id: 'venezia',
    nome: 'Venezia',
    colori: ['#F26522', '#000000', '#00843D'],
    vars: {
      '--paper': '#f5eae6',
      '--paper-dark': '#edd9cf',
      '--paper-input': '#fcf7f5',
      '--ink': '#121212',
      '--ink-soft': '#616161',
      '--rule': '#080808',
      '--stamp-red': '#cb490c',
      '--gold': '#007a38',
      '--gold-chiaro': '#00b754',
      '--nav-testo': '#f0e2db'
    }
  }
];

export const temaPerId = (id) => TEMI.find((t) => t.id === id) || TEMI.find((t) => t.id === TEMA_DEFAULT);

// Campione visivo della squadra: i colori sociali veri (non quelli ricalcolati
// per il contrasto), divisi come una maglia — due metà, o tre fasce per il
// Venezia che di colori ne ha tre.
export function sfondoTema(colori) {
  if (colori.length >= 3) {
    return `linear-gradient(135deg, ${colori[0]} 0 33.3%, ${colori[1]} 33.3% 66.6%, ${colori[2]} 66.6% 100%)`;
  }
  return `linear-gradient(135deg, ${colori[0]} 0 50%, ${colori[1] || colori[0]} 50% 100%)`;
}

const CHIAVE_LOCALE = 'gazzetta_tema';
const CHIAVE_CARTA = 'gazzetta_tema_carta';

// Applica il tema ridefinendo le variabili CSS su :root. Chiamata al boot (dal
// tema salvato in locale, prima del primo paint) e a ogni cambio.
export function applicaTema(id) {
  const tema = temaPerId(id);
  const root = document.documentElement;
  for (const [chiave, valore] of Object.entries(tema.vars)) {
    root.style.setProperty(chiave, valore);
  }
  // Colori sociali veri (non ricalcolati per il contrasto): usati per la
  // testata a due tinte, es. Juventus "La Gazzetta" bianco / "dello Sfottò" nero.
  root.style.setProperty('--testata-1', tema.colori[0]);
  root.style.setProperty('--testata-2', tema.colori[1] || tema.colori[0]);
  root.dataset.tema = tema.id;

  // Barra di sistema di iOS/Android in tinta con la nav dell'app.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema.vars['--ink']);

  try {
    localStorage.setItem(CHIAVE_LOCALE, tema.id);
    // Serve allo script in index.html per dipingere il fondo giusto prima ancora
    // che il bundle sia stato scaricato: senza, ogni avvio lampeggia di rosa.
    localStorage.setItem(CHIAVE_CARTA, tema.vars['--paper']);
  } catch {
    // Safari in navigazione privata: il tema resta applicato per questa sessione.
  }
  return tema;
}

export function temaSalvato() {
  try {
    return localStorage.getItem(CHIAVE_LOCALE) || TEMA_DEFAULT;
  } catch {
    return TEMA_DEFAULT;
  }
}
