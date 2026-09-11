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

// Quando la risposta non è il nostro JSON (pagina d'errore di Vercel, timeout,
// body troppo grande) serve comunque un messaggio comprensibile.
function messaggioPerStato(status) {
  if (status === 413) return 'File troppo grande';
  if (status === 429) return 'Troppe richieste, riprova tra poco';
  if (status === 502 || status === 503 || status === 504) return 'Il server non risponde, riprova tra poco';
  return `Errore ${status}`;
}

async function richiesta(path, { method = 'GET', body, isFormData = false } = {}) {
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
    throw new Error(dati.errore || messaggioPerStato(res.status));
  }
  return dati;
}

export const api = {
  get: (path) => richiesta(path),
  post: (path, body) => richiesta(path, { method: 'POST', body }),
  patch: (path, body) => richiesta(path, { method: 'PATCH', body }),
  upload: (path, formData) => richiesta(path, { method: 'POST', body: formData, isFormData: true })
};
