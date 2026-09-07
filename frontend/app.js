// ============ CONFIG ============
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://fantasfotto.vercel.app/api';

// ============ STATO ============
let stato = {
  token: localStorage.getItem('gazzetta_token') || null,
  utente: JSON.parse(localStorage.getItem('gazzetta_utente') || 'null'),
  tabAttiva: 'home',
  ultimaEdizione: null,
  categorie: [],
  squadre: null,
  prossimaGiornata: null
};

let deferredInstallPrompt = null;

// ============ HELPER SKELETON ============
function skeletonBlocco() {
  return `
    <div class="skeleton-wrap">
      <div class="skeleton-line w-40"></div>
      <div class="skeleton-line w-80"></div>
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-line w-80"></div>
    </div>
  `;
}

// ============ HELPER API ============
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (stato.token) headers.Authorization = `Bearer ${stato.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const dati = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    throw new Error(dati.errore || 'Errore di rete');
  }
  return dati;
}

function mostraToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// Lo stemma di una squadra può essere un'emoji o l'url di un'immagine caricata
function renderStemma(squadra) {
  if (!squadra) return '⚽';
  if (squadra.stemma && /^https?:\/\//.test(squadra.stemma)) {
    return `<img src="${squadra.stemma}" style="width:1em;height:1em;object-fit:cover;vertical-align:middle;border-radius:2px;">`;
  }
  return squadra.stemma || '⚽';
}

async function caricaSquadreCache() {
  if (!stato.squadre) stato.squadre = await api('/squadre');
  return stato.squadre;
}

// ============ CARICAMENTO IMMAGINI (Cloudinary via /api/upload) ============
async function caricaImmagine(file) {
  const formData = new FormData();
  formData.append('immagine', file);
  const headers = {};
  if (stato.token) headers.Authorization = `Bearer ${stato.token}`;
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: formData });
  const dati = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dati.errore || 'Errore nel caricamento immagine');
  return dati.url;
}

function collegaUploadPreview(fileInputId, hiddenInputId, previewId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const preview = document.getElementById(previewId);
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    try {
      const url = await caricaImmagine(file);
      document.getElementById(hiddenInputId).value = url;
      mostraToast('Immagine caricata');
    } catch (err) {
      mostraToast(err.message);
    }
  });
}

// ============ AUTH ============
document.querySelectorAll('[data-auth]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('[data-auth]').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const modo = el.dataset.auth;
    document.getElementById('loginForm').style.display = modo === 'login' ? 'block' : 'none';
    document.getElementById('registratiForm').style.display = modo === 'registrati' ? 'block' : 'none';
  });
});

async function caricaSquadreRegistrazione() {
  const sel = document.getElementById('regSquadra');
  try {
    const squadre = await api('/squadre');
    if (!squadre.length) { sel.innerHTML = '<option value="">Nessuna squadra disponibile</option>'; return; }
    sel.innerHTML = squadre.map(s => `<option value="${s._id}">${s.nome}</option>`).join('');
  } catch (err) {
    sel.innerHTML = '<option value="">Errore nel caricamento squadre</option>';
  }
}

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const pin = document.getElementById('loginPin').value.trim();
  const erroreEl = document.getElementById('loginErrore');
  erroreEl.textContent = '';

  if (!username || !pin) { erroreEl.textContent = 'Inserisci username e PIN'; return; }

  try {
    const dati = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, pin }) });
    salvaSessione(dati);
    avviaApp();
  } catch (e) {
    erroreEl.textContent = e.message;
  }
}

async function registrati() {
  const username = document.getElementById('regUsername').value.trim();
  const nomeVisualizzato = document.getElementById('regNome').value.trim();
  const pin = document.getElementById('regPin').value.trim();
  const squadraId = document.getElementById('regSquadra').value;
  const codiceInvito = document.getElementById('regCodice').value.trim();
  const erroreEl = document.getElementById('regErrore');
  erroreEl.textContent = '';

  if (!username || !nomeVisualizzato || !pin || !codiceInvito || !squadraId) {
    erroreEl.textContent = 'Compila tutti i campi, inclusa la squadra';
    return;
  }

  try {
    const dati = await api('/auth/registrati', { method: 'POST', body: JSON.stringify({ username, nomeVisualizzato, pin, codiceInvito, squadraId }) });
    salvaSessione(dati);
    avviaApp();
  } catch (e) {
    erroreEl.textContent = e.message;
  }
}

function salvaSessione(dati) {
  stato.token = dati.token;
  stato.utente = dati.utente;
  localStorage.setItem('gazzetta_token', dati.token);
  localStorage.setItem('gazzetta_utente', JSON.stringify(dati.utente));
}

function logout() {
  stato.token = null;
  stato.utente = null;
  localStorage.removeItem('gazzetta_token');
  localStorage.removeItem('gazzetta_utente');
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'block';
  caricaSquadreRegistrazione();
}

// ============ TABS (bottom nav) ============
function cambiaTab(nome) {
  stato.tabAttiva = nome;
  document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.toggle('attivo', b.dataset.tab === nome));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('attiva'));
  document.getElementById(`tab-${nome}`).classList.add('attiva');

  const scrollArea = document.getElementById('scrollArea');
  scrollArea.scrollTop = 0;
  document.getElementById('appHeader').classList.remove('compatto');

  if (nome === 'home') caricaHome();
  if (nome === 'ultima') caricaUltimaEdizione();
  if (nome === 'verdetti') caricaVerdetti();
  if (nome === 'squadre') caricaSquadreTab();
  if (nome === 'profilo') caricaProfilo();
}

// ============ HOME / PRIMA PAGINA ============
async function caricaHome() {
  caricaHomeTeaser();
  caricaHomeCalendario();
  caricaHomeClassifica();
  caricaHomeVerdetti();
}

async function caricaHomeTeaser() {
  const container = document.getElementById('homeTeaserContainer');
  container.innerHTML = skeletonBlocco();
  try {
    if (!stato.ultimaEdizione) stato.ultimaEdizione = await api('/edizioni/ultima');
    const e = stato.ultimaEdizione;
    if (!e) {
      container.innerHTML = '<div class="empty">Nessuna edizione ancora. Il direttore deve darsi da fare.</div>';
      document.getElementById('edizioneCorrente').textContent = 'Nessuna edizione ancora';
      return;
    }
    document.getElementById('edizioneCorrente').textContent = `Giornata ${e.giornataNumero ?? ''}`;
    container.innerHTML = renderTeaser(e);
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderTeaser(e) {
  const primoParagrafo = (e.corpo && e.corpo[0]) || '';
  return `
    <div class="stamp">N. ${e.giornataNumero ?? ''}</div>
    <div class="occhiello">${e.occhiello}</div>
    <h3>${e.titolo}</h3>
    ${e.immagineUrl ? `<div class="article-img"><img src="${e.immagineUrl}" alt=""></div>` : ''}
    <p>${primoParagrafo}</p>
    <span class="continua" onclick="cambiaTab('ultima')">Continua a leggere →</span>
  `;
}

async function caricaHomeCalendario() {
  const card = document.getElementById('homeCalendarioCard');
  try {
    const g = await api('/giornate/prossima');
    stato.prossimaGiornata = g;
    if (!g || !g.accoppiamenti || !g.accoppiamenti.length) { card.style.display = 'none'; return; }

    card.style.display = 'block';
    const mioMatch = g.accoppiamenti.find(a =>
      String(a.squadraCasa?._id) === String(stato.utente.squadra) ||
      String(a.squadraTrasferta?._id) === String(stato.utente.squadra)
    ) || g.accoppiamenti[0];

    document.getElementById('homeDerby').innerHTML = `
      <div class="squadra"><span class="stemma">${renderStemma(mioMatch.squadraCasa)}</span><div class="nome-squadra">${mioMatch.squadraCasa?.nome ?? '?'}</div></div>
      <div class="vs">VS</div>
      <div class="squadra"><span class="stemma">${renderStemma(mioMatch.squadraTrasferta)}</span><div class="nome-squadra">${mioMatch.squadraTrasferta?.nome ?? '?'}</div></div>
    `;
    const dataTxt = g.data ? new Date(g.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Data da definire';
    document.getElementById('homeDerbyMeta').textContent = `Giornata ${g.numero} — ${dataTxt} · ${g.accoppiamenti.length} scontri in programma`;
  } catch (err) {
    card.style.display = 'none';
  }
}

function apriSheetGiornata() {
  const g = stato.prossimaGiornata;
  if (!g) return;
  document.getElementById('sheetGiornataTitolo').textContent = `Giornata ${g.numero}`;
  document.getElementById('sheetGiornataSotto').textContent = g.data
    ? new Date(g.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Data da definire';
  document.getElementById('sheetGiornataBody').innerHTML = g.accoppiamenti.map(a => `
    <div class="match-row">
      <div class="sq casa"><span>${a.squadraCasa?.nome ?? '?'}</span><span class="stemma-mini">${renderStemma(a.squadraCasa)}</span></div>
      <span class="vs-mini">VS</span>
      <div class="sq trasferta"><span class="stemma-mini">${renderStemma(a.squadraTrasferta)}</span><span>${a.squadraTrasferta?.nome ?? '?'}</span></div>
    </div>
  `).join('');
  document.getElementById('sheetGiornataOverlay').classList.add('aperto');
  document.getElementById('sheetGiornata').classList.add('aperto');
}
function chiudiSheetGiornata() {
  document.getElementById('sheetGiornataOverlay').classList.remove('aperto');
  document.getElementById('sheetGiornata').classList.remove('aperto');
}

async function caricaHomeClassifica() {
  const card = document.getElementById('homeClassificaCard');
  try {
    const classifica = await api('/giornate/classifica');
    if (!classifica.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    document.getElementById('homeClassificaBody').innerHTML = classifica.map((r, i) => `
      <tr class="${stato.utente.squadra && String(r.squadra._id) === String(stato.utente.squadra) ? 'mia' : ''}">
        <td class="pos">${i + 1}</td>
        <td class="nome-sq"><span class="stemma-mini">${renderStemma(r.squadra)}</span>${r.squadra.nome}</td>
        <td class="punti">${r.punti}</td>
      </tr>
    `).join('');
  } catch (err) {
    card.style.display = 'none';
  }
}

async function caricaHomeVerdetti() {
  const card = document.getElementById('homeVerdettiCard');
  try {
    if (!stato.ultimaEdizione) stato.ultimaEdizione = await api('/edizioni/ultima');
    const e = stato.ultimaEdizione;
    if (!e) { card.style.display = 'none'; return; }
    if (!stato.categorie.length) stato.categorie = await api('/voti/categorie');

    const [squadre, votiInfo] = await Promise.all([caricaSquadreCache(), api(`/voti/edizione/${e._id}`)]);
    const mappaSquadre = new Map(squadre.map(s => [String(s._id), s]));

    const flashes = [];
    stato.categorie.forEach(cat => {
      const conteggi = votiInfo.conteggi[cat.key] || {};
      const entries = Object.entries(conteggi).sort((a, b) => b[1] - a[1]);
      if (!entries.length) return;
      const [idSquadra] = entries[0];
      const sq = mappaSquadre.get(idSquadra);
      flashes.push({ label: cat.label.replace(/^\S+\s/, ''), nome: sq?.nome || '?' });
    });

    if (!flashes.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    document.getElementById('homeVerdettiTicker').innerHTML = flashes.map(f => `
      <div class="flash"><div class="flash-cat">${f.label}</div><div class="flash-nome">${f.nome}</div></div>
    `).join('');
  } catch (err) {
    card.style.display = 'none';
  }
}

// ============ ULTIMA EDIZIONE / ARCHIVIO (tab "Ultima") ============
async function caricaUltimaEdizione() {
  const container = document.getElementById('ultimaContainer');
  container.innerHTML = skeletonBlocco();
  try {
    const e = await api('/edizioni/ultima');
    stato.ultimaEdizione = e;
    if (!e) {
      container.innerHTML = '<div class="empty">Nessuna edizione ancora. Il direttore deve darsi da fare.</div>';
      document.getElementById('edizioneCorrente').textContent = 'Nessuna edizione ancora';
      return;
    }
    document.getElementById('edizioneCorrente').textContent = `Giornata ${e.giornataNumero ?? ''}`;
    container.innerHTML = renderArticolo(e);
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderArticolo(e) {
  return `
    <div class="article">
      <div class="stamp">N. ${e.giornataNumero ?? ''}</div>
      <div class="occhiello">${e.occhiello}</div>
      <h3>${e.titolo}</h3>
      <div class="byline">Giornata ${e.giornataNumero ?? ''} — a cura di ${e.direttore}</div>
      ${e.immagineUrl ? `<div class="article-img"><img src="${e.immagineUrl}" alt="${e.titolo}"><div class="didascalia">${e.occhiello}</div></div>` : ''}
      ${e.corpo.map(p => `<p>${p}</p>`).join('')}
      <div class="stat-strip">
        <div class="stat">Vincitore<b>${e.stats?.vincitore?.nome ?? '—'}</b></div>
        <div class="stat">Ultimo<b>${e.stats?.ultimo?.nome ?? '—'}</b></div>
        <div class="stat">Fenomeno<b>${e.stats?.fenomeno?.nome ?? '—'}</b></div>
        <div class="stat">Bidone<b>${e.stats?.bidone?.nome ?? '—'}</b></div>
      </div>
      <button class="ghost" style="margin-top:16px;" onclick="mostraArchivio()">📚 Vedi tutte le edizioni</button>
    </div>
  `;
}

async function mostraArchivio() {
  const container = document.getElementById('ultimaContainer');
  container.innerHTML = skeletonBlocco();
  try {
    const edizioni = await api('/edizioni');
    if (!edizioni.length) {
      container.innerHTML = `<button class="ghost" style="margin-bottom:14px;" onclick="caricaUltimaEdizione()">← Torna all'ultima</button><div class="empty">L'archivio è ancora vuoto.</div>`;
      return;
    }
    container.innerHTML = `<button class="ghost" style="margin-bottom:14px;" onclick="caricaUltimaEdizione()">← Torna all'ultima</button>` +
      edizioni.map(e => `
        <div class="archivio-item" onclick="apriEdizioneArchivio('${e._id}')">
          <div class="g">Giornata ${e.giornataNumero ?? ''}</div>
          <h4>${e.titolo}</h4>
        </div>
      `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

async function apriEdizioneArchivio(id) {
  try {
    const e = await api(`/edizioni/${id}`);
    document.getElementById('ultimaContainer').innerHTML =
      `<button class="ghost" style="margin-bottom:14px;" onclick="mostraArchivio()">← Torna all'archivio</button>` + renderArticolo(e);
  } catch (err) {
    mostraToast(err.message);
  }
}

// ============ VERDETTI / MINI-GIOCHI DI VOTO (per squadra) ============
async function caricaVerdetti() {
  const container = document.getElementById('verdettiContainer');
  container.innerHTML = skeletonBlocco();
  try {
    if (!stato.ultimaEdizione) stato.ultimaEdizione = await api('/edizioni/ultima');
    if (!stato.ultimaEdizione) {
      container.innerHTML = '<div class="empty">Nessuna edizione da votare ancora.</div>';
      return;
    }
    if (!stato.categorie.length) stato.categorie = await api('/voti/categorie');

    const [squadre, votiInfo] = await Promise.all([
      caricaSquadreCache(),
      api(`/voti/edizione/${stato.ultimaEdizione._id}`)
    ]);

    container.innerHTML = `
      <h2 class="section-title">Verdetti della Giornata ${stato.ultimaEdizione.giornataNumero ?? ''}</h2>
      ${stato.categorie.map(cat => renderCategoriaVoto(cat, squadre, votiInfo)).join('')}
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderCategoriaVoto(cat, squadre, votiInfo) {
  const conteggi = votiInfo.conteggi[cat.key] || {};
  const mioVoto = votiInfo.mieiVoti[cat.key];

  return `
    <div class="verdetto">
      <h4>${cat.label}</h4>
      <div class="voti-list">
        ${squadre.map(s => {
          const n = conteggi[String(s._id)] || 0;
          const attivo = mioVoto === String(s._id);
          return `<button class="voto-btn ${attivo ? 'mio-voto' : ''}" onclick="vota('${cat.key}','${s._id}')">
            ${s.nome} <span class="count">${n}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;
}

async function vota(categoria, squadraId) {
  try {
    await api('/voti', {
      method: 'POST',
      body: JSON.stringify({ edizioneId: stato.ultimaEdizione._id, categoria, votato: squadraId })
    });
    mostraToast('Voto registrato');
    caricaVerdetti();
  } catch (err) {
    mostraToast(err.message);
  }
}

// ============ SQUADRE + ALBO D'ORO ============
async function caricaSquadreTab() {
  const container = document.getElementById('squadreContainer');
  container.innerHTML = skeletonBlocco();
  try {
    const squadre = await caricaSquadreCache();
    if (!squadre.length) {
      container.innerHTML = '<div class="empty">Nessuna squadra censita.</div>';
    } else {
      container.innerHTML = squadre.map(s => `
        <div class="squadra-riga">
          <span class="stemma">${renderStemma(s)}</span>
          <div class="info"><b>${s.nome}</b><span>${(s.rosa || []).length} giocatori in rosa</span></div>
        </div>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
  caricaAlbo();
}

async function caricaAlbo() {
  const container = document.getElementById('alboContainer');
  container.innerHTML = skeletonBlocco();
  try {
    const albo = await api('/voti/albo');
    container.innerHTML = albo.map(cat => `
      <div class="albo-cat">
        <h5>${cat.label}</h5>
        ${cat.top.length
          ? cat.top.map((t, i) => `<div>${i + 1}. ${t.squadra?.nome ?? '?'} — ${t.voti} voti</div>`).join('')
          : '<div>Ancora nessun voto</div>'}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

// ============ PROFILO ============
async function caricaProfilo() {
  const p = document.getElementById('profiloContainer');
  p.innerHTML = `
    <div class="profilo-nome">${stato.utente.nomeVisualizzato}</div>
    <div class="profilo-badge">${stato.utente.ruolo === 'admin' ? 'Direttore' : 'Giocatore'}</div>
    <p>Username: <b>${stato.utente.username}</b></p>
  `;

  try {
    const giocatori = await api('/auth/giocatori');
    document.getElementById('playersList').innerHTML = giocatori.map(g =>
      `<span class="chip ${g.ruolo === 'admin' ? 'admin' : ''}">${g.nomeVisualizzato}</span>`
    ).join('');
  } catch (err) {
    mostraToast(err.message);
  }

  if (!stato.utente.squadra) return;
  try {
    const { squadra, allenatori } = await api(`/squadre/${stato.utente.squadra}`);
    document.getElementById('miaSquadraView').innerHTML = `
      <div class="squadra-riga" style="border:none;padding:0 0 10px;">
        <span class="stemma">${renderStemma(squadra)}</span>
        <div class="info"><b>${squadra.nome}</b><span>${allenatori.map(a => a.nomeVisualizzato).join(', ')}</span></div>
      </div>
      ${squadra.bio ? `<p>${squadra.bio}</p>` : ''}
    `;
    document.getElementById('miaSquadraForm').style.display = 'block';
    document.getElementById('squadraBio').value = squadra.bio || '';
    document.getElementById('squadraRosa').value = (squadra.rosa || []).join(', ');
    document.getElementById('squadraStemma').value = squadra.stemma || '';
    document.getElementById('squadraFoto').value = squadra.foto || '';
    document.getElementById('squadraMaglia').value = squadra.maglia || '';
    if (squadra.foto) { document.getElementById('fotoPreview').src = squadra.foto; document.getElementById('fotoPreview').style.display = 'block'; }
    if (squadra.maglia) { document.getElementById('magliaPreview').src = squadra.maglia; document.getElementById('magliaPreview').style.display = 'block'; }
  } catch (err) {
    // la squadra non si carica: non blocca il resto del profilo
  }
}

async function salvaMiaSquadra() {
  const erroreEl = document.getElementById('squadraErrore');
  erroreEl.textContent = '';
  try {
    const corpo = {
      stemma: document.getElementById('squadraStemma').value,
      foto: document.getElementById('squadraFoto').value,
      maglia: document.getElementById('squadraMaglia').value,
      bio: document.getElementById('squadraBio').value,
      rosa: document.getElementById('squadraRosa').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    await api(`/squadre/${stato.utente.squadra}`, { method: 'PATCH', body: JSON.stringify(corpo) });
    mostraToast('Squadra aggiornata');
    caricaProfilo();
  } catch (err) {
    erroreEl.textContent = err.message;
  }
}

// ============ NUOVA EDIZIONE (FAB, solo admin) ============
// Semplificato: l'edizione non dipende più da una Giornata nel DB. È solo un articolo
// mandato in stampa - numero giornata scritto a mano, vincitore/ultimo obbligatori,
// fenomeno/bidone opzionali (di default coincidono con vincitore/ultimo).
function apriSheetNuova() {
  document.getElementById('direttore').value = stato.utente.nomeVisualizzato;
  popolaSelettoriSquadre();
  document.getElementById('sheetNuovaOverlay').classList.add('aperto');
  document.getElementById('sheetNuova').classList.add('aperto');
}
function chiudiSheetNuova() {
  document.getElementById('sheetNuovaOverlay').classList.remove('aperto');
  document.getElementById('sheetNuova').classList.remove('aperto');
}

async function popolaSelettoriSquadre() {
  const squadre = await caricaSquadreCache();
  const opzioni = squadre.map(s => `<option value="${s._id}">${s.nome}</option>`).join('');
  document.getElementById('vincitore').innerHTML = '<option value="">Seleziona...</option>' + opzioni;
  document.getElementById('ultimo').innerHTML = '<option value="">Seleziona...</option>' + opzioni;
  document.getElementById('fenomeno').innerHTML = '<option value="">— automatico (il vincitore) —</option>' + opzioni;
  document.getElementById('bidone').innerHTML = '<option value="">— automatico (l\'ultimo) —</option>' + opzioni;
}

async function pubblicaEdizione() {
  const erroreEl = document.getElementById('nuovaErrore');
  erroreEl.textContent = '';

  const giornataNumero = document.getElementById('giornataNumero').value.trim();
  const vincitore = document.getElementById('vincitore').value;
  const ultimo = document.getElementById('ultimo').value;

  if (!giornataNumero || !vincitore || !ultimo) {
    erroreEl.textContent = 'Numero giornata, vincitore e ultimo classificato sono obbligatori';
    return;
  }

  const corpo = {
    giornataNumero: Number(giornataNumero),
    direttore: document.getElementById('direttore').value.trim(),
    vincitore,
    puntiVincitore: document.getElementById('puntiVincitore').value || undefined,
    ultimo,
    puntiUltimo: document.getElementById('puntiUltimo').value || undefined,
    fenomeno: document.getElementById('fenomeno').value || undefined,
    bidone: document.getElementById('bidone').value || undefined,
    immagineUrl: document.getElementById('nuovaImmagineUrl').value || undefined
  };

  try {
    await api('/edizioni', { method: 'POST', body: JSON.stringify(corpo) });
    mostraToast('Edizione mandata in stampa!');
    chiudiSheetNuova();
    ['giornataNumero', 'puntiVincitore', 'puntiUltimo'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('nuovaImgPreview').style.display = 'none';
    document.getElementById('nuovaImmagineUrl').value = '';
    stato.ultimaEdizione = null;
    cambiaTab('ultima');
  } catch (err) {
    erroreEl.textContent = err.message;
  }
}

// ============ INSTALLAZIONE PWA ============
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (stato.utente) mostraInstallBannerSeOpportuno();
});

function mostraInstallBannerSeOpportuno() {
  const giaInstallata = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const chiuso = localStorage.getItem('gazzetta_install_dismesso');
  if (deferredInstallPrompt && !giaInstallata && !chiuso) {
    document.getElementById('installBanner').style.display = 'flex';
  }
}
function chiudiInstallBanner() {
  document.getElementById('installBanner').style.display = 'none';
  localStorage.setItem('gazzetta_install_dismesso', '1');
}
async function installaApp() {
  if (!deferredInstallPrompt) { chiudiInstallBanner(); return; }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  chiudiInstallBanner();
}

// ============ HEADER CHE SI COMPATTA ALLO SCROLL ============
document.getElementById('scrollArea').addEventListener('scroll', () => {
  const scrollArea = document.getElementById('scrollArea');
  document.getElementById('appHeader').classList.toggle('compatto', scrollArea.scrollTop > 40);
});

// ============ UPLOAD IMMAGINI: collegamento file input -> preview -> Cloudinary ============
collegaUploadPreview('stemmaFile', 'squadraStemma', 'stemmaPreview');
collegaUploadPreview('fotoFile', 'squadraFoto', 'fotoPreview');
collegaUploadPreview('magliaFile', 'squadraMaglia', 'magliaPreview');
collegaUploadPreview('nuovaImgFile', 'nuovaImmagineUrl', 'nuovaImgPreview');

// ============ AVVIO APP ============
function avviaApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'flex';
  document.getElementById('ciaoUtente').textContent = `Bentornato, ${stato.utente.nomeVisualizzato}`;
  document.getElementById('fabNuova').style.display = stato.utente.ruolo === 'admin' ? 'flex' : 'none';
  mostraInstallBannerSeOpportuno();
  cambiaTab('home');
}

// Al caricamento: se c'è una sessione salvata, entra direttamente
if (stato.token && stato.utente) {
  avviaApp();
} else {
  document.getElementById('authScreen').style.display = 'block';
  caricaSquadreRegistrazione();
}

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}