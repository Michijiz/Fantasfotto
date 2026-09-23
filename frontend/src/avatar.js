// Gli avatar della redazione: illustrazioni in public/avatars/<id>.png.
// Sul server si salva solo l'id (come per il tema), quindi per aggiungerne uno
// basta mettere il file nella cartella e una riga qui sotto.
//
// Le prime ventuno sono le squadre (Palermo in testa, come il tema di casa), poi
// gli animali "fuori campionato" per chi non vuole farsi riconoscere dal tifo.

export const AVATAR_SQUADRE = [
  { id: 'palermo', nome: 'Palermo' },
  { id: 'atalanta', nome: 'Atalanta' },
  { id: 'bologna', nome: 'Bologna' },
  { id: 'cagliari', nome: 'Cagliari' },
  { id: 'como', nome: 'Como' },
  { id: 'fiorentina', nome: 'Fiorentina' },
  { id: 'frosinone', nome: 'Frosinone' },
  { id: 'genoa', nome: 'Genoa' },
  { id: 'inter', nome: 'Inter' },
  { id: 'juventus', nome: 'Juventus' },
  { id: 'lazio', nome: 'Lazio' },
  { id: 'lecce', nome: 'Lecce' },
  { id: 'milan', nome: 'Milan' },
  { id: 'monza', nome: 'Monza' },
  { id: 'napoli', nome: 'Napoli' },
  { id: 'parma', nome: 'Parma' },
  { id: 'roma', nome: 'Roma' },
  { id: 'sassuolo', nome: 'Sassuolo' },
  { id: 'torino', nome: 'Torino' },
  { id: 'udinese', nome: 'Udinese' },
  { id: 'venezia', nome: 'Venezia' }
];

export const AVATAR_FUORI_CAMPIONATO = [
  { id: 'cammello', nome: 'Cammello' },
  { id: 'panda', nome: 'Panda' },
  { id: 'rinoceronte', nome: 'Rinoceronte' },
  { id: 'polpo', nome: 'Polpo' },
  { id: 'mucca', nome: 'Mucca' },
  { id: 'piccione', nome: 'Piccione' },
  { id: 'ippopotamo', nome: 'Ippopotamo' }
];

export const AVATAR = [...AVATAR_SQUADRE, ...AVATAR_FUORI_CAMPIONATO];

const esiste = (id) => AVATAR.some((a) => a.id === id);

export const urlAvatar = (id) => `/avatars/${id}.png`;

// Senza una scelta esplicita l'avatar è quello della squadra tifata: chi tifa
// Napoli si ritrova l'avatar del Napoli finché non ne sceglie un altro.
export const avatarDefault = (temaId) => (esiste(temaId) ? temaId : 'palermo');

// L'avatar da mostrare per un utente, anche per chi si è iscritto prima che gli
// avatar esistessero (campo vuoto) o ne ha uno che nel frattempo è stato tolto.
export const avatarUtente = (utente) => (
  esiste(utente?.avatar) ? utente.avatar : avatarDefault(utente?.tema)
);

export const nomeAvatar = (id) => AVATAR.find((a) => a.id === id)?.nome || '';
