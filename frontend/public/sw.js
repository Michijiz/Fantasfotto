// Service worker della Gazzetta.
//
// Strategie, in ordine di specificità:
//   /api/*              → solo rete (mai in cache: sono dati autenticati). Offline → 503 JSON pulito.
//   /assets/* (hashati) → cache-first: il nome cambia a ogni build, quindi il contenuto è immutabile.
//   navigazioni (HTML)  → rete con timeout, poi cache, poi shell '/'. Così su una connessione
//                         che si pianta l'app si apre comunque invece di restare bianca.
//   altro same-origin   → stale-while-revalidate (icone, avatar, loghi, font self-hosted).
//   cross-origin        → non intercettato (Cloudinary & co. li gestisce il browser).
//
// Il numero di versione serve solo a buttare via le cache vecchie. Gli asset hashati
// vivono in una cache a parte con un tetto di voci, così le build vecchie non si
// accumulano all'infinito nel dispositivo.

const VERSIONE = 'v14';
const CACHE_SHELL = `gazzetta-shell-${VERSIONE}`;
const CACHE_ASSET = `gazzetta-asset-${VERSIONE}`;
const CACHE_RUNTIME = `gazzetta-runtime-${VERSIONE}`;
const CACHE_ATTUALI = [CACHE_SHELL, CACHE_ASSET, CACHE_RUNTIME];

const SHELL = ['/', '/manifest.json', '/icons/gs-192.png'];
const TIMEOUT_NAVIGAZIONE_MS = 4000;
const MAX_VOCI_RUNTIME = 80;
const MAX_VOCI_ASSET = 40;

// Precache: la shell e gli asset hashati che l'index.html referenzia. Senza questo,
// al primo avvio la pagina viene caricata PRIMA che il worker abbia il controllo, i suoi
// script non passano dal fetch handler e restano fuori cache: aprire l'app offline
// subito dopo l'installazione darebbe una pagina vuota.
async function precache() {
  const shell = await caches.open(CACHE_SHELL);
  await shell.addAll(SHELL);

  const risposta = await shell.match('/');
  if (!risposta) return;
  const html = await risposta.clone().text();
  const asset = [...new Set(html.match(/\/assets\/[^"'\s)]+/g) || [])];
  if (!asset.length) return;

  const cacheAsset = await caches.open(CACHE_ASSET);
  // allSettled: un asset che non si scarica non deve far fallire l'installazione.
  await Promise.allSettled(asset.map((u) => cacheAsset.add(u)));

  // I font sono referenziati dal CSS, non dall'HTML: si leggono dai fogli di stile appena
  // salvati. Solo woff2 (tutti i browser che installano PWA lo supportano).
  const fogli = asset.filter((u) => u.endsWith('.css'));
  const font = new Set();
  for (const foglio of fogli) {
    const r = await cacheAsset.match(foglio);
    if (!r) continue;
    const css = await r.text();
    for (const m of css.matchAll(/url\((\/assets\/[^)"']+\.woff2)\)/g)) font.add(m[1]);
  }
  await Promise.allSettled([...font].map((u) => cacheAsset.add(u)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => !CACHE_ATTUALI.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Una risposta è "cacheabile" solo se è ok e, per script e fogli di stile, NON è HTML.
// Vercel riscrive ogni percorso mancante su /index.html con status 200: dopo un deploy,
// la richiesta di un asset hashato vecchio tornerebbe HTML e, messa in cache, avvelenerebbe
// l'app anche offline ("Failed to fetch dynamically imported module").
function cacheabile(richiesta, risposta) {
  if (!risposta || !risposta.ok || risposta.type === 'opaque') return false;
  const tipo = risposta.headers.get('content-type') || '';
  const attesoNonHtml = ['script', 'style', 'font', 'image'].includes(richiesta.destination);
  return !(attesoNonHtml && tipo.includes('text/html'));
}

async function mettiInCache(nomeCache, richiesta, risposta, massimo) {
  try {
    const cache = await caches.open(nomeCache);
    await cache.put(richiesta, risposta);
    if (massimo) {
      const chiavi = await cache.keys();
      // Le chiavi arrivano in ordine di inserimento: si butta il più vecchio.
      for (let i = 0; i < chiavi.length - massimo; i++) await cache.delete(chiavi[i]);
    }
  } catch {
    // cache piena o richiesta non memorizzabile: pazienza
  }
}

const rispostaOffline = (testo) =>
  new Response(testo, { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

function conTimeout(promessa, ms) {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => rifiuta(new Error('timeout')), ms);
    promessa.then(
      (v) => { clearTimeout(t); risolvi(v); },
      (e) => { clearTimeout(t); rifiuta(e); }
    );
  });
}

// Navigazione: rete con timeout → cache della stessa pagina → shell.
async function gestisciNavigazione(richiesta) {
  const daRete = fetch(richiesta);
  try {
    const res = await conTimeout(daRete, TIMEOUT_NAVIGAZIONE_MS);
    if (res.ok) mettiInCache(CACHE_SHELL, '/', res.clone());
    return res;
  } catch {
    // La rete lenta può comunque rispondere dopo: la cache si aggiorna per la prossima volta.
    daRete.then((res) => { if (res.ok) mettiInCache(CACHE_SHELL, '/', res.clone()); }).catch(() => {});
    const shell = await caches.match('/');
    return shell || rispostaOffline('Sei offline e l\'app non è ancora stata salvata sul dispositivo');
  }
}

// Asset hashato: cache-first.
async function gestisciAssetHashato(richiesta) {
  const inCache = await caches.match(richiesta);
  if (inCache) return inCache;
  try {
    const res = await fetch(richiesta);
    if (cacheabile(richiesta, res)) mettiInCache(CACHE_ASSET, richiesta, res.clone(), MAX_VOCI_ASSET);
    return res;
  } catch {
    return rispostaOffline('Contenuto non disponibile offline');
  }
}

// Resto dello stesso dominio: risponde subito dalla cache e intanto aggiorna.
async function gestisciStaleWhileRevalidate(richiesta) {
  const inCache = await caches.match(richiesta);
  const daRete = fetch(richiesta)
    .then((res) => {
      if (cacheabile(richiesta, res)) mettiInCache(CACHE_RUNTIME, richiesta, res.clone(), MAX_VOCI_RUNTIME);
      return res;
    })
    .catch(() => null);
  if (inCache) return inCache;
  return (await daRete) || rispostaOffline('Contenuto non disponibile offline');
}

self.addEventListener('fetch', (event) => {
  const richiesta = event.request;
  const url = new URL(richiesta.url);

  // Solo http/https (le chrome-extension:// iniettate dalle estensioni facevano fallire
  // cache.put e rendevano `undefined` l'intera risposta) e solo GET.
  if (!url.protocol.startsWith('http') || richiesta.method !== 'GET') return;

  // API: mai in cache. Vale per qualsiasi origine, perché il backend può stare su un altro dominio.
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

  // Tutto il resto cross-origin (Cloudinary, ecc.) lo gestisce il browser.
  if (url.origin !== self.location.origin) return;

  if (richiesta.mode === 'navigate') {
    event.respondWith(gestisciNavigazione(richiesta));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(gestisciAssetHashato(richiesta));
    return;
  }

  event.respondWith(gestisciStaleWhileRevalidate(richiesta));
});
