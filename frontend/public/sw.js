const CACHE_NAME = 'gazzetta-shell-v6';
const ASSET_DA_CACHARE = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_DA_CACHARE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomi) =>
      Promise.all(nomi.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Network-first per tutto (shell React con asset con hash, non prevedibili in build):
// prova la rete, aggiorna la cache, e ripiega sulla cache solo se offline.
// Le chiamate /api restituiscono un errore JSON pulito invece di fallire silenziosamente.
self.addEventListener('fetch', (event) => {
  const richiesta = event.request;
  const url = new URL(richiesta.url);

  // Solo http/https e solo GET finiscono in cache: la Cache API rifiuta gli altri
  // schemi (le chrome-extension:// iniettate dalle estensioni del browser facevano
  // fallire cache.put, e da lì l'intera risposta diventava undefined →
  // "Failed to convert value to 'Response'" nella console).
  if (!url.protocol.startsWith('http')) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(richiesta).catch(() =>
        new Response(JSON.stringify({ errore: 'Sei offline, riprova quando torni in rete' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(richiesta)
      .then((res) => {
        if (richiesta.method === 'GET' && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(richiesta, clone))
            .catch(() => {}); // cache piena o richiesta non memorizzabile: pazienza
        }
        return res;
      })
      // Offline: se in cache non c'è nulla bisogna comunque restituire una
      // Response valida, altrimenti il fetch event fallisce con un errore di rete.
      .catch(async () => {
        const inCache = await caches.match(richiesta);
        if (inCache) return inCache;
        if (richiesta.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return new Response('Contenuto non disponibile offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
