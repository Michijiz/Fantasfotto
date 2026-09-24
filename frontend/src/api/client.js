// Client HTTP minimale: aggiunge automaticamente il JWT e normalizza gli errori
// dell'API ({ errore: '...' }) in modo che i componenti possano fare solo try/catch.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let token = localStorage.getItem('gazzetta_token') || null;

export function impostaToken(nuovoToken) {
  token = nuovoToken;
  if (nuovoToken) localStorage.setItem('gazzetta_token', nuovoToken);
  else localStorage.removeItem('gazzetta_token');
}

export function tokenCorrente() {
  return token;
}

// Il token dura 90 giorni, ma può scadere o diventare non valido prima (cambio
// del segreto sul server). Senza questo, l'utente restava "dentro" con un token
// morto: lo splash passava, ogni chiamata rispondeva 401 e la Home si mostrava
// vuota, senza un modo di capire che bastava rifare l'accesso. Qui il token si
// butta e si avvisa AuthContext, che riporta alla schermata di accesso.
export const EVENTO_SESSIONE_SCADUTA = 'gazzetta:sessione-scaduta';

function sessioneScaduta() {
  impostaToken(null);
  window.dispatchEvent(new Event(EVENTO_SESSIONE_SCADUTA));
}

// Quando la risposta non è il nostro JSON (pagina d'errore di Vercel, timeout,
// body troppo grande) serve comunque un messaggio comprensibile.
function messaggioPerStato(status) {
  if (status === 413) return 'File troppo pesante per la nostra tipografia';
  if (status === 429) return 'Calma, la rotativa ha i suoi tempi: riprova tra poco';
  if (status === 502 || status === 503 || status === 504) return 'Il server non risponde, riprova tra poco';
  return 'Qualcosa si è inceppato in tipografia. Riprova tra poco';
}

async function richiesta(path, { method = 'GET', body, isFormData = false } = {}) {
  const avevaToken = Boolean(token);
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
    });
  } catch {
    throw new Error('Connessione assente, riprova');
  }

  const testo = await res.text();
  let dati = {};
  if (testo) {
    try {
      dati = JSON.parse(testo);
    } catch {
      dati = {};
    }
  }

  if (!res.ok) {
    // Solo se una sessione c'era davvero: il 401 del login sbagliato è un'altra
    // cosa e non deve far partire un "sei stato disconnesso".
    if (res.status === 401 && avevaToken) sessioneScaduta();
    throw new Error(dati.errore || messaggioPerStato(res.status));
  }
  return dati;
}

export const api = {
  get: (path) => richiesta(path),
  post: (path, body) => richiesta(path, { method: 'POST', body }),
  put: (path, body) => richiesta(path, { method: 'PUT', body }),
  patch: (path, body) => richiesta(path, { method: 'PATCH', body }),
  delete: (path) => richiesta(path, { method: 'DELETE' }),
  upload: (path, formData) => richiesta(path, { method: 'POST', body: formData, isFormData: true })
};
