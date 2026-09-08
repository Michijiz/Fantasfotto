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

async function richiesta(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
  });

  const testo = await res.text();
  const dati = testo ? JSON.parse(testo) : {};

  if (!res.ok) {
    throw new Error(dati.errore || `Errore ${res.status}`);
  }
  return dati;
}

export const api = {
  get: (path) => richiesta(path),
  post: (path, body) => richiesta(path, { method: 'POST', body }),
  patch: (path, body) => richiesta(path, { method: 'PATCH', body }),
  upload: (path, formData) => richiesta(path, { method: 'POST', body: formData, isFormData: true })
};
