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
  });
});

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
  const codiceInvito = document.getElementById('regCodice').value.trim();
  const erroreEl = document.getElementById('regErrore');
  erroreEl.textContent = '';

  if (!username || !nomeVisualizzato || !pin || !codiceInvito) {
    erroreEl.textContent = 'Compila tutti i campi';
    return;
  }

  try {
    const dati = await api('/auth/registrati', { method: 'POST', body: JSON.stringify({ username, nomeVisualizzato, pin, codiceInvito }) });
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
    document.getElementById('edizioneCorrente').textContent = `Giornata ${e.giornata?.numero ?? '?'}`;
    container.innerHTML = renderArticolo(e);
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderArticolo(e) {
  const nomeSquadra = (s) => s?.stemma ? `${s.stemma} ${s.nome}` : (s?.nome || '—');
  return `
    <div class="article">
      <div class="occhiello">${e.occhiello}</div>
      <h3>${e.titolo}</h3>
      <div class="byline">Giornata ${e.giornata?.numero ?? '?'} — a cura di ${e.direttore}</div>
      ${e.corpo.map(p => `<p>${p}</p>`).join('')}
      <div class="stat-strip">
        <div class="stat">Vincitore<b>${nomeSquadra(e.stats.vincitore)}</b></div>
        <div class="stat">Ultimo<b>${nomeSquadra(e.stats.ultimo)}</b></div>
        <div class="stat">Fenomeno<b>${nomeSquadra(e.stats.fenomeno)}</b></div>
        <div class="stat">Bidone<b>${nomeSquadra(e.stats.bidone)}</b></div>
      </div>
    </div>
  `;
}

// ============ NUOVA EDIZIONE ============
async function preparaTabNuova() {
  const autorizzato = stato.utente?.ruolo === 'admin';
  document.getElementById('nuovaNonAutorizzato').style.display = autorizzato ? 'none' : 'block';
  document.getElementById('nuovaFormWrap').style.display = autorizzato ? 'block' : 'none';
  if (!autorizzato) return;

  document.getElementById('direttore').value = stato.utente.nomeVisualizzato;

  const selectGiornata = document.getElementById('nuovaGiornata');
  const infoGiornata = document.getElementById('nuovaGiornataInfo');
  selectGiornata.innerHTML = '<option value="">Caricamento...</option>';

  try {
    const [giornate, edizioni] = await Promise.all([api('/giornate'), api('/edizioni')]);
    const giornatePubblicate = new Set(edizioni.map(e => e.giornata?._id));
    const disponibili = giornate.filter(g => g.conclusa && !giornatePubblicate.has(g._id));

    stato.giornateDisponibili = disponibili;

    if (!disponibili.length) {
      selectGiornata.innerHTML = '<option value="">Nessuna giornata pronta da pubblicare</option>';
      infoGiornata.textContent = 'Serve una giornata conclusa (punteggi inseriti) senza edizione già pubblicata.';
      document.getElementById('nuovaFenomeno').innerHTML = '';
      document.getElementById('nuovaBidone').innerHTML = '';
      return;
    }

    selectGiornata.innerHTML = disponibili.map(g => `<option value="${g._id}">Giornata ${g.numero}</option>`).join('');
    selectGiornata.onchange = () => aggiornaSelezioneGiornata(selectGiornata.value);
    aggiornaSelezioneGiornata(selectGiornata.value);
  } catch (err) {
    selectGiornata.innerHTML = '<option value="">Errore nel caricamento</option>';
    infoGiornata.textContent = err.message;
  }
}

function aggiornaSelezioneGiornata(giornataId) {
  const giornata = (stato.giornateDisponibili || []).find(g => g._id === giornataId);
  const infoGiornata = document.getElementById('nuovaGiornataInfo');
  const selectFenomeno = document.getElementById('nuovaFenomeno');
  const selectBidone = document.getElementById('nuovaBidone');
  if (!giornata) {
    infoGiornata.textContent = '';
    selectFenomeno.innerHTML = '';
    selectBidone.innerHTML = '';
    return;
  }

  const squadreInGiornata = [];
  giornata.accoppiamenti.forEach(a => {
    squadreInGiornata.push({ id: a.squadraCasa._id, nome: a.squadraCasa.nome, punti: a.punteggioCasa });
    squadreInGiornata.push({ id: a.squadraTrasferta._id, nome: a.squadraTrasferta.nome, punti: a.punteggioTrasferta });
  });
  squadreInGiornata.sort((x, y) => (y.punti ?? -Infinity) - (x.punti ?? -Infinity));

  infoGiornata.innerHTML = squadreInGiornata.map(s => `${s.nome}: <b>${s.punti ?? '—'}</b>`).join(' · ');

  const opzioni = squadreInGiornata.map(s => `<option value="${s.id}">${s.nome} (${s.punti ?? '—'} pt)</option>`).join('');
  selectFenomeno.innerHTML = opzioni;
  selectBidone.innerHTML = opzioni;
}

async function pubblicaEdizione() {
  const erroreEl = document.getElementById('nuovaErrore');
  erroreEl.textContent = '';

  const corpo = {
    giornataId: document.getElementById('nuovaGiornata').value,
    direttore: document.getElementById('direttore').value.trim(),
    fenomeno: document.getElementById('nuovaFenomeno').value,
    bidone: document.getElementById('nuovaBidone').value
  };

  if (!corpo.giornataId) {
    erroreEl.textContent = 'Seleziona una giornata da pubblicare';
    return;
  }

  try {
    await api('/edizioni', { method: 'POST', body: JSON.stringify(corpo) });
    mostraToast('Edizione mandata in stampa!');
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

    const [squadre, votiInfo] = await Promise.all([
      api('/squadre'),
      api(`/voti/edizione/${stato.ultimaEdizione._id}`)
    ]);

    container.innerHTML = `
      <h2 class="section-title">Verdetti della Giornata ${stato.ultimaEdizione.giornata?.numero ?? '?'}</h2>
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
          const n = conteggi[s._id] || 0;
          const attivo = mioVoto === s._id;
          return `<button class="voto-btn ${attivo ? 'mio-voto' : ''}" onclick="vota('${cat.key}','${s._id}')">
            ${s.stemma || ''} ${s.nome} <span class="count">${n}</span>
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
          ? cat.top.map((v, i) => `<div>${i + 1}. ${v.squadra ? `${v.squadra.stemma || ''} ${v.squadra.nome}` : 'Squadra rimossa'} — ${v.voti} voti</div>`).join('')
          : '<div>Ancora nessun voto</div>'}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

// ============ SQUADRE ============
async function caricaSquadre() {
  const container = document.getElementById('squadreContainer');
  const wrapNuova = document.getElementById('nuovaSquadraWrap');
  const isAdmin = stato.utente?.ruolo === 'admin';
  wrapNuova.style.display = isAdmin ? 'block' : 'none';

  try {
    const squadre = await api('/squadre');

    if (!squadre.length) {
      container.innerHTML = '<div class="empty">Nessuna squadra registrata ancora.</div>';
    } else {
      container.innerHTML = squadre.map(renderSquadraCard).join('');
    }

    if (isAdmin) await popolaSelectProprietario();
  } catch (err) {
    container.innerHTML = `<div class="empty">${err.message}</div>`;
  }
}

function renderSquadraCard(s) {
  const membri = (s.membri || []).map(m => m.nomeVisualizzato).join(', ');
  return `
    <div class="squadra-card">
      <div class="stemma">${s.stemma || '🛡️'}</div>
      <div class="info">
        <h4>${s.coloreKit ? `<span class="kit-dot" style="background:${s.coloreKit}"></span>` : ''}${s.nome}</h4>
        <div class="proprietario">Proprietario: ${s.proprietario?.nomeVisualizzato || '—'}${membri ? ` · Con: ${membri}` : ''}</div>
      </div>
    </div>
  `;
}

async function popolaSelectProprietario() {
  const select = document.getElementById('squadraProprietario');
  try {
    const giocatori = await api('/auth/giocatori');
    select.innerHTML = giocatori.map(g => `<option value="${g._id}">${g.nomeVisualizzato}</option>`).join('');
  } catch (err) {
    select.innerHTML = '';
  }
}

async function creaSquadra() {
  const erroreEl = document.getElementById('squadraErrore');
  erroreEl.textContent = '';

  const corpo = {
    nome: document.getElementById('squadraNome').value.trim(),
    stemma: document.getElementById('squadraStemma').value.trim(),
    coloreKit: document.getElementById('squadraColore').value.trim(),
    proprietario: document.getElementById('squadraProprietario').value
  };

  if (!corpo.nome || !corpo.proprietario) {
    erroreEl.textContent = 'Nome e proprietario sono obbligatori';
    return;
  }

  try {
    await api('/squadre', { method: 'POST', body: JSON.stringify(corpo) });
    mostraToast('Squadra registrata!');
    ['squadraNome', 'squadraStemma', 'squadraColore'].forEach(id => document.getElementById(id).value = '');
    caricaSquadre();
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
        <div class="g">Giornata ${e.giornata?.numero ?? '?'}</div>
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
