// ============ CONFIG ============
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://fantasfotto.vercel.app/api';

// ============ STATO ============
let stato = {
  token: localStorage.getItem('gazzetta_token') || null,
  utente: JSON.parse(localStorage.getItem('gazzetta_utente') || 'null'),
  tabAttiva: 'ultima',
  ultimaEdizione: null,
  categorie: []
};

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

// ============ AUTH ============
document.querySelectorAll('[data-auth]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('[data-auth]').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const modo = el.dataset.auth;
    document.getElementById('loginForm').style.display = modo === 'login' ? 'block' : 'none';
    document.getElementById('registratiForm').style.display = modo === 'registrati' ? 'block' : 'none';
    if (modo === 'registrati') caricaSquadreDisponibili();
  });
});

async function caricaSquadreDisponibili() {
  const sel = document.getElementById('regSquadra');
  try {
    const squadre = await api('/squadre');
    if (!squadre.length) {
      sel.innerHTML = '<option value="">Nessuna squadra disponibile, contatta il direttore</option>';
      return;
    }
    sel.innerHTML = squadre.map(s => `<option value="${s._id}">${s.stemma || ''} ${s.nome}</option>`).join('');
  } catch (e) {
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

  if (!username || !nomeVisualizzato || !pin || !codiceInvito) {
    erroreEl.textContent = 'Compila tutti i campi';
    return;
  }
  if (!squadraId) {
    erroreEl.textContent = 'Seleziona una squadra';
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
}

// ============ TABS ============
document.querySelectorAll('.tabs [data-tab]').forEach(el => {
  el.addEventListener('click', () => cambiaTab(el.dataset.tab));
});

function cambiaTab(nome) {
  stato.tabAttiva = nome;
  document.querySelectorAll('.tabs [data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === nome));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(`tab-${nome}`).style.display = 'block';

  if (nome === 'ultima') caricaUltimaEdizione();
  if (nome === 'nuova') preparaTabNuova();
  if (nome === 'verdetti') caricaVerdetti();
  if (nome === 'albo') caricaAlbo();
  if (nome === 'squadre') caricaSquadre();
  if (nome === 'archivio') caricaArchivio();
  if (nome === 'profilo') caricaProfilo();
}

// ============ ULTIMA EDIZIONE ============
async function caricaUltimaEdizione() {
  const container = document.getElementById('ultimaContainer');
  try {
    const e = await api('/edizioni/ultima');
    stato.ultimaEdizione = e;
    if (!e) {
      container.innerHTML = '<div class="empty">Nessuna edizione ancora. Il direttore deve darsi da fare.</div>';
      document.getElementById('edizioneCorrente').textContent = 'Nessuna edizione ancora';
      return;
    }
    document.getElementById('edizioneCorrente').textContent = `Giornata ${e.giornata}`;
    container.innerHTML = renderArticolo(e);
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderArticolo(e) {
  return `
    <div class="article">
      <div class="occhiello">${e.occhiello}</div>
      <h3>${e.titolo}</h3>
      <div class="byline">Giornata ${e.giornata} — a cura di ${e.direttore}</div>
      ${e.corpo.map(p => `<p>${p}</p>`).join('')}
      <div class="stat-strip">
        <div class="stat">Vincitore<b>${e.stats.vincitore}</b></div>
        <div class="stat">Ultimo<b>${e.stats.ultimo}</b></div>
        <div class="stat">Fenomeno<b>${e.stats.fenomeno}</b></div>
        <div class="stat">Bidone<b>${e.stats.bidone}</b></div>
      </div>
    </div>
  `;
}

// ============ NUOVA EDIZIONE ============
function preparaTabNuova() {
  const autorizzato = stato.utente?.ruolo === 'admin';
  document.getElementById('nuovaNonAutorizzato').style.display = autorizzato ? 'none' : 'block';
  document.getElementById('nuovaFormWrap').style.display = autorizzato ? 'block' : 'none';
  if (autorizzato) document.getElementById('direttore').value = stato.utente.nomeVisualizzato;
}

async function pubblicaEdizione() {
  const erroreEl = document.getElementById('nuovaErrore');
  erroreEl.textContent = '';

  const corpo = {
    direttore: document.getElementById('direttore').value.trim(),
    vincitore: document.getElementById('vincitore').value.trim(),
    puntiVincitore: document.getElementById('puntiVincitore').value.trim(),
    ultimo: document.getElementById('ultimo').value.trim(),
    puntiUltimo: document.getElementById('puntiUltimo').value.trim(),
    fenomeno: document.getElementById('fenomeno').value.trim(),
    bidone: document.getElementById('bidone').value.trim()
  };

  if (!corpo.vincitore || !corpo.ultimo) {
    erroreEl.textContent = 'Servono almeno vincitore e ultimo classificato';
    return;
  }

  try {
    await api('/edizioni', { method: 'POST', body: JSON.stringify(corpo) });
    mostraToast('Edizione mandata in stampa!');
    ['vincitore', 'puntiVincitore', 'ultimo', 'puntiUltimo', 'fenomeno', 'bidone'].forEach(id => document.getElementById(id).value = '');
    cambiaTab('ultima');
  } catch (err) {
    erroreEl.textContent = err.message;
  }
}

// ============ VERDETTI / MINI-GIOCHI DI VOTO ============
async function caricaVerdetti() {
  const container = document.getElementById('verdettiContainer');
  try {
    if (!stato.ultimaEdizione) stato.ultimaEdizione = await api('/edizioni/ultima');
    if (!stato.ultimaEdizione) {
      container.innerHTML = '<div class="empty">Nessuna edizione da votare ancora.</div>';
      return;
    }
    if (!stato.categorie.length) stato.categorie = await api('/voti/categorie');

    const [giocatori, votiInfo] = await Promise.all([
      api('/auth/giocatori'),
      api(`/voti/edizione/${stato.ultimaEdizione._id}`)
    ]);

    container.innerHTML = `
      <h2 class="section-title">Verdetti della Giornata ${stato.ultimaEdizione.giornata}</h2>
      ${stato.categorie.map(cat => renderCategoriaVoto(cat, giocatori, votiInfo)).join('')}
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderCategoriaVoto(cat, giocatori, votiInfo) {
  const conteggi = votiInfo.conteggi[cat.key] || {};
  const mioVoto = votiInfo.mieiVoti[cat.key];

  return `
    <div class="verdetto">
      <h4>${cat.label}</h4>
      <div class="voti-list">
        ${giocatori.map(g => {
          const n = conteggi[g.nomeVisualizzato] || 0;
          const attivo = mioVoto === g.nomeVisualizzato;
          return `<button class="voto-btn ${attivo ? 'mio-voto' : ''}" onclick="vota('${cat.key}','${g.nomeVisualizzato.replace(/'/g, "\\'")}')">
            ${g.nomeVisualizzato} <span class="count">${n}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;
}

async function vota(categoria, votato) {
  try {
    await api('/voti', {
      method: 'POST',
      body: JSON.stringify({ edizioneId: stato.ultimaEdizione._id, categoria, votato })
    });
    mostraToast(`Voto registrato: ${votato}`);
    caricaVerdetti();
  } catch (err) {
    mostraToast(err.message);
  }
}

// ============ ALBO D'ORO ============
async function caricaAlbo() {
  const container = document.getElementById('alboContainer');
  try {
    const albo = await api('/voti/albo');
    container.innerHTML = albo.map(cat => `
      <div class="albo-cat">
        <h5>${cat.label}</h5>
        ${cat.top.length
          ? cat.top.map(([nome, n], i) => `<div>${i + 1}. ${nome} — ${n} voti</div>`).join('')
          : '<div>Ancora nessun voto</div>'}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

// ============ SQUADRE ============
function renderStemma(stemma, dimensione = 18) {
  if (!stemma) return '⚽';
  if (stemma.startsWith('http')) {
    return `<img src="${stemma}" alt="" style="width:${dimensione}px;height:${dimensione}px;object-fit:cover;vertical-align:middle;border-radius:2px;">`;
  }
  return stemma; // emoji o testo libero
}

async function caricaSquadre() {
  const container = document.getElementById('squadreContainer');
  try {
    const squadre = await api('/squadre');
    if (!squadre.length) {
      container.innerHTML = '<div class="empty">Nessuna squadra registrata ancora.</div>';
      return;
    }
    container.innerHTML = `
      <h2 class="section-title">Le Squadre della Lega</h2>
      <div class="players">
        ${squadre.map(s => `<span class="chip" style="cursor:pointer" onclick="apriSquadra('${s._id}')">${renderStemma(s.stemma, 22)} ${s.nome}</span>`).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

async function apriSquadra(id) {
  const container = document.getElementById('squadreContainer');
  try {
    const { squadra, allenatori, premi } = await api(`/squadre/${id}`);
    if (!stato.categorie.length) stato.categorie = await api('/voti/categorie');
    const labelCategoria = key => (stato.categorie.find(c => c.key === key) || {}).label || key;

    container.innerHTML = `
      <button class="ghost" onclick="caricaSquadre()">← Torna alle squadre</button>
      <div class="article" style="margin-top:14px">
        <div class="squadra-header">
          ${squadra.stemma ? `<img src="${squadra.stemma}" alt="" class="stemma-grande">` : ''}
          <div>
            <div class="occhiello">Scheda squadra</div>
            <h3>${squadra.nome}</h3>
          </div>
        </div>
        <div class="byline">Allenatori: ${allenatori.map(a => a.nomeVisualizzato).join(', ') || 'nessuno'}</div>
        ${squadra.bio ? `<p>${squadra.bio}</p>` : '<p><i>Nessuna storia raccontata ancora.</i></p>'}
        ${squadra.foto ? `<img src="${squadra.foto}" alt="Foto squadra" class="foto-squadra">` : ''}
        ${squadra.maglia ? `<img src="${squadra.maglia}" alt="maglia" style="max-width:160px;display:block;margin:10px 0">` : ''}
        ${squadra.rosa && squadra.rosa.length ? `
          <h4 style="font-family:'Oswald',sans-serif;font-size:12px;text-transform:uppercase;margin-top:14px">Rosa</h4>
          <div class="players">${squadra.rosa.map(n => `<span class="chip">${n}</span>`).join('')}</div>
        ` : ''}
        <h4 style="font-family:'Oswald',sans-serif;font-size:12px;text-transform:uppercase;margin-top:14px">Premi vinti</h4>
        ${premi.length ? `
          <div class="players">${premi.map(p => `<span class="chip admin">${labelCategoria(p.categoria)} — G${p.giornata}</span>`).join('')}</div>
        ` : '<div class="empty">Ancora nessun premio vinto.</div>'}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

// ============ UPLOAD IMMAGINI (stemma / foto / maglia) ============
function mostraPreview(previewId, url) {
  const img = document.getElementById(previewId);
  if (url) {
    img.src = url;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
}

async function caricaImmagine(fileInputId, hiddenInputId, previewId) {
  const fileInput = document.getElementById(fileInputId);
  const file = fileInput.files[0];
  if (!file) return;

  // Anteprima istantanea locale, mentre l'upload è in corso
  const anteprimaLocale = URL.createObjectURL(file);
  mostraPreview(previewId, anteprimaLocale);

  const formData = new FormData();
  formData.append('immagine', file);

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${stato.token}` },
      body: formData
    });
    const dati = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dati.errore || 'Errore nel caricamento');

    document.getElementById(hiddenInputId).value = dati.url;
    mostraPreview(previewId, dati.url);
    mostraToast('Immagine caricata');
  } catch (err) {
    mostraToast(err.message);
    fileInput.value = '';
  }
}

document.getElementById('stemmaFile').addEventListener('change', () => caricaImmagine('stemmaFile', 'squadraStemma', 'stemmaPreview'));
document.getElementById('fotoFile').addEventListener('change', () => caricaImmagine('fotoFile', 'squadraFoto', 'fotoPreview'));
document.getElementById('magliaFile').addEventListener('change', () => caricaImmagine('magliaFile', 'squadraMaglia', 'magliaPreview'));

// ============ LA MIA SQUADRA (dal profilo) ============
async function caricaMiaSquadra() {
  const view = document.getElementById('miaSquadraView');
  const form = document.getElementById('miaSquadraForm');
  if (!stato.utente.squadra) {
    view.innerHTML = '<div class="empty">Nessuna squadra assegnata.</div>';
    form.style.display = 'none';
    return;
  }
  try {
    const { squadra } = await api(`/squadre/${stato.utente.squadra}`);
    view.innerHTML = `<div>Squadra: <b>${squadra.nome}</b></div>`;
    document.getElementById('squadraStemma').value = squadra.stemma || '';
    document.getElementById('squadraFoto').value = squadra.foto || '';
    document.getElementById('squadraMaglia').value = squadra.maglia || '';
    document.getElementById('squadraBio').value = squadra.bio || '';
    document.getElementById('squadraRosa').value = (squadra.rosa || []).join(', ');
    mostraPreview('stemmaPreview', squadra.stemma);
    mostraPreview('fotoPreview', squadra.foto);
    mostraPreview('magliaPreview', squadra.maglia);
    form.style.display = 'block';
  } catch (err) {
    view.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

async function salvaMiaSquadra() {
  const erroreEl = document.getElementById('squadraErrore');
  erroreEl.textContent = '';
  try {
    await api(`/squadre/${stato.utente.squadra}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stemma: document.getElementById('squadraStemma').value.trim(),
        foto: document.getElementById('squadraFoto').value.trim(),
        maglia: document.getElementById('squadraMaglia').value.trim(),
        bio: document.getElementById('squadraBio').value.trim(),
        rosa: document.getElementById('squadraRosa').value.split(',').map(s => s.trim()).filter(Boolean)
      })
    });
    mostraToast('Squadra aggiornata!');
    caricaMiaSquadra();
  } catch (err) {
    erroreEl.textContent = err.message;
  }
}

// ============ ARCHIVIO ============
async function caricaArchivio() {
  const container = document.getElementById('archivioContainer');
  try {
    const edizioni = await api('/edizioni');
    if (!edizioni.length) {
      container.innerHTML = '<div class="empty">L\'archivio è ancora vuoto. Pubblicate la prima edizione!</div>';
      return;
    }
    container.innerHTML = edizioni.map(e => `
      <div class="archivio-item" onclick="apriEdizioneArchivio('${e._id}')">
        <div class="g">Giornata ${e.giornata}</div>
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
    document.getElementById('archivioContainer').innerHTML =
      `<button class="ghost" onclick="caricaArchivio()">← Torna all'archivio</button>` + renderArticolo(e);
  } catch (err) {
    mostraToast(err.message);
  }
}

// ============ PROFILO ============
async function caricaProfilo() {
  const p = document.getElementById('profiloContainer');
  p.innerHTML = `
    <div>Nome: <b>${stato.utente.nomeVisualizzato}</b></div>
    <div>Username: <b>${stato.utente.username}</b></div>
    <div>Ruolo: <span class="profilo-badge">${stato.utente.ruolo === 'admin' ? 'Direttore' : 'Giocatore'}</span></div>
  `;

  try {
    const giocatori = await api('/auth/giocatori');
    document.getElementById('playersList').innerHTML = giocatori.map(g =>
      `<span class="chip ${g.ruolo === 'admin' ? 'admin' : ''}">${g.nomeVisualizzato}</span>`
    ).join('');
  } catch (err) {
    mostraToast(err.message);
  }

  caricaMiaSquadra();
}

// ============ AVVIO APP ============
function avviaApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('ciaoUtente').textContent = `Bentornato, ${stato.utente.nomeVisualizzato}`;
  cambiaTab('ultima');
}

// Al caricamento: se c'è una sessione salvata, entra direttamente
if (stato.token && stato.utente) {
  avviaApp();
} else {
  document.getElementById('authScreen').style.display = 'block';
}

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
