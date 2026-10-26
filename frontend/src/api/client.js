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

// Errori che passano da soli riprovando: rete che cade, timeout, funzione
// serverless ancora a freddo (502/503/504). Un 400 o un 401 invece non cambiano.
const STATI_TRANSITORI = new Set([502, 503, 504]);

const attendi = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function unaRichiesta(path, { method, body, isFormData, timeoutMs }) {
  const avevaToken = Boolean(token);
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  // Senza un limite, una connessione mobile che si pianta a metà lasciava il
  // bottone su "Sviluppo il rullino…" per sempre.
  const controllo = timeoutMs ? new AbortController() : null;
  const scatto = controllo ? setTimeout(() => controllo.abort(), timeoutMs) : null;

  let res;
  let testo;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: controllo?.signal
    });
    testo = await res.text();
  } catch (err) {
    const scaduto = err?.name === 'AbortError';
    throw Object.assign(
      new Error(scaduto ? 'La connessione è troppo lenta, riprova' : 'Connessione assente, riprova'),
      { transitorio: true }
    );
  } finally {
    if (scatto) clearTimeout(scatto);
  }

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
    throw Object.assign(new Error(dati.errore || messaggioPerStato(res.status)), {
      status: res.status,
      transitorio: STATI_TRANSITORI.has(res.status)
    });
  }
  return dati;
}

// `tentativi` > 1 solo per richieste che si possono ripetere senza danni: un
// caricamento di foto sì (al massimo resta un file in più su Cloudinary), un
// "manda in stampa" no.
async function richiesta(path, { method = 'GET', body, isFormData = false, timeoutMs = 0, tentativi = 1 } = {}) {
  for (let n = 1; ; n++) {
    try {
      return await unaRichiesta(path, { method, body, isFormData, timeoutMs });
    } catch (err) {
      if (!err.transitorio || n >= tentativi) throw err;
      await attendi(800 * n);
    }
  }
}

export const api = {
  get: (path) => richiesta(path),
  post: (path, body) => richiesta(path, { method: 'POST', body }),
  put: (path, body) => richiesta(path, { method: 'PUT', body }),
  patch: (path, body) => richiesta(path, { method: 'PATCH', body }),
  delete: (path) => richiesta(path, { method: 'DELETE' }),
  // Foto: fino a 3 tentativi, 60 secondi l'uno (il primo può partire a freddo).
  upload: (path, formData) => richiesta(path, {
    method: 'POST', body: formData, isFormData: true, timeoutMs: 60000, tentativi: 3
  })
};
