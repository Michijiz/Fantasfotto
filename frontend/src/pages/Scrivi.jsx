import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import BarraFormato from '../components/ui/BarraFormato';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Article from '../components/ui/Article';
import ImageUpload from '../components/ui/ImageUpload';
import Stemma from '../components/ui/Stemma';
import { giornataDaStampare, haPunteggi, idDi, scontriGiocabili } from '../utils/lega';
import { formattaFantapunti } from '../utils/regolamento';
import {
  commentoScontro, formattaVoto, pagellaAuto, spuntiGiornata, squadreConPunti, titoliSuggeriti
} from '../utils/spunti';
import { puoRedigere } from '../ruoli';
import '../styles/gazzetta.css';

const MAX_COMMENTO = 280;
const MAX_BATTUTA = 140;
const CHIAVE_BOZZA = 'gazzetta_bozza_edizione';

const vuoto = { giornataNumero: '', direttore: '', occhiello: '', titolo: '', corpo: '', immagineUrl: '', didascalia: '' };

// Un commento si lega alla coppia casa-trasferta dello scontro, non al suo id: il
// calendario può essere risalvato senza che i commenti perdano il loro scontro.
const chiaveScontro = (a) => `${idDi(a.squadraCasa)}>${idDi(a.squadraTrasferta)}`;

// Righe già salvate nell'edizione, nella forma dello stato del modulo. `auto` dice
// se la riga è ancora quella del generatore (e quindi "Aggiorna dai dati" può
// rigenerarla) o è stata scritta o ritoccata da una persona.
function vociDa(ed) {
  const per = {};
  for (const c of ed?.commenti || []) per[chiaveScontro(c)] = { testo: c.testo, auto: c.auto === true, v: 0 };
  return per;
}

function pagDa(ed) {
  const per = {};
  for (const p of ed?.pagelle || []) per[idDi(p.squadra)] = { voto: p.voto, battuta: p.battuta || '', auto: p.auto === true, v: 0 };
  return per;
}

function daEdizione(ed, firma) {
  if (!ed) return { ...vuoto, direttore: firma };
  return {
    giornataNumero: String(ed.giornataNumero ?? ''),
    direttore: ed.direttore || '',
    occhiello: ed.occhiello || '',
    titolo: ed.titolo || '',
    corpo: (ed.corpo || []).join('\n\n'),
    immagineUrl: ed.immagineUrl || '',
    didascalia: ed.didascalia || ''
  };
}

// --- bozza -------------------------------------------------------------------
//
// Il pezzo si scrive a lungo e dal telefono: una chiamata, un cambio di app o un
// tocco sbagliato sul tasto indietro non devono costare tutto. La bozza vive nel
// browser (localStorage), una sola per volta, e solo per le edizioni nuove: una
// correzione parte sempre dal testo già stampato. Ogni accesso è protetto, perché
// nelle finestre private lo storage può mancare o lanciare.

function leggiBozza(utenteId) {
  try {
    const bozza = JSON.parse(localStorage.getItem(CHIAVE_BOZZA) || 'null');
    // La bozza di un altro utente sullo stesso telefono non è mia.
    if (!bozza || bozza.utenteId !== utenteId || !bozza.campi) return null;
    // Le prime bozze salvavano i commenti come semplici testi.
    const voci = bozza.voci || Object.fromEntries(
      Object.entries(bozza.commenti || {}).map(([k, testo]) => [k, { testo, auto: false, v: 0 }])
    );
    return { ...bozza, voci, pag: bozza.pag || {}, conPagelle: bozza.conPagelle !== false };
  } catch {
    return null;
  }
}

function salvaBozza(bozza) {
  try { localStorage.setItem(CHIAVE_BOZZA, JSON.stringify(bozza)); } catch { /* storage non disponibile */ }
}

function scartaBozza() {
  try { localStorage.removeItem(CHIAVE_BOZZA); } catch { /* storage non disponibile */ }
}

// Solo giornata, firma e righe automatiche non bastano a fare una bozza: partono
// da sole, e se restano tali non c'è nulla da salvare.
const bozzaVuota = (campi, voci, pag) => !campi.occhiello.trim() && !campi.titolo.trim() && !campi.corpo.trim()
  && !campi.immagineUrl && !campi.didascalia.trim()
  && !Object.values(voci).some((o) => !o.auto) && !Object.values(pag).some((o) => !o.auto);

const oraDi = (ms) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// Cosa dice il modulo sulla giornata scelta, sotto il campo del numero.
function notaGiornata(numero, giornata, esistente) {
  if (esistente) return { avviso: true, testo: `La G${numero} ha già la sua edizione: correggi quella invece di stamparne un'altra.` };
  if (!giornata) return { avviso: true, testo: `Il calendario della G${numero} non c'è ancora: senza scontri non puoi commentare le partite.` };
  const scontri = scontriGiocabili(giornata).length;
  if (!haPunteggi(giornata)) {
    return { avviso: true, testo: `I punteggi della G${numero} non ci sono ancora: il tabellino resterà vuoto finché non li inserisci.` };
  }
  if (!giornata.conclusa) {
    return { avviso: true, testo: `La G${numero} non è ancora conclusa: il Re dei Gufi si decide a giornata chiusa.` };
  }
  return { avviso: false, testo: `G${numero} · ${scontri} ${scontri === 1 ? 'scontro' : 'scontri'}, punteggi inseriti.` };
}

// Il "tuo / automatico" sotto un campo precompilato, con il suo tasto.
function PiedeAuto({ auto, haTesto, onAltra, onTorna, conta }) {
  return (
    <div className="campo-piede">
      <span className={`etichetta-auto${auto ? ' auto' : ''}`}>{auto ? 'automatico' : 'tuo'}</span>
      {auto
        ? haTesto && <button type="button" className="bottone-link" onClick={onAltra}>Altra versione</button>
        : <button type="button" className="bottone-link" onClick={onTorna}>{haTesto ? 'Torna automatico' : 'Genera in automatico'}</button>}
      <span className="conta">{conta}</span>
    </div>
  );
}

const limitaVoto = (v) => Math.min(10, Math.max(0, Math.round(v * 2) / 2));

// "Si va in stampa": la pagina di scrittura, per scrivere una nuova edizione o
// correggerne una uscita. I blocchi della Gazzetta (due righe per scontro, pagelle)
// nascono già compilati dai punteggi e restano modificabili: ogni riga è
// "automatica" finché non la tocchi, poi diventa "tua". Alla stampa il testo si
// congela: ricalcolare un punteggio dopo non cambia quello che i lettori hanno già
// letto (in correzione c'è "Aggiorna dai dati" per rigenerare le righe automatiche).
// Il tabellino resta calcolato: il Re dei Gufi arriva dalle schedine. La firma è
// libera (pseudonimi ammessi).
function Editor({ edizione }) {
  const { utente } = useAuth();
  const { giornate, edizioni, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const modifica = Boolean(edizione?._id);
  const firma = utente?.nomeVisualizzato || '';

  const [iniziale] = useState(() => {
    if (modifica) {
      return {
        campi: daEdizione(edizione, firma), voci: vociDa(edizione), pag: pagDa(edizione),
        conPagelle: (edizione.pagelle || []).length > 0, ripresa: null
      };
    }
    const richiesta = params.get('giornata') || '';
    const bozza = leggiBozza(utente?.id);
    // Se si arriva da "Scrivila" su una giornata precisa, la bozza di un'altra
    // giornata non si riprende (resta lì finché non la si sovrascrive).
    if (bozza && (!richiesta || String(bozza.campi.giornataNumero) === richiesta)) {
      return {
        campi: { ...vuoto, ...bozza.campi }, voci: bozza.voci, pag: bozza.pag,
        conPagelle: bozza.conPagelle, ripresa: bozza.salvataIl || Date.now()
      };
    }
    return {
      campi: { ...vuoto, direttore: firma, giornataNumero: richiesta }, voci: {}, pag: {}, conPagelle: true, ripresa: null
    };
  });

  const [campi, setCampi] = useState(iniziale.campi);
  // Le righe che qualcuno ha toccato (o congelato). Una riga assente è "viva":
  // segue i dati e si genera da sola finché non la si tocca.
  const [voci, setVoci] = useState(iniziale.voci);
  const [pag, setPag] = useState(iniziale.pag);
  const [conPagelle, setConPagelle] = useState(iniziale.conPagelle);
  const [ripresa, setRipresa] = useState(iniziale.ripresa);
  const [anteprima, setAnteprima] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const inviandoRef = useRef(false);
  const pubblicata = useRef(false);
  const numeroToccato = useRef(Boolean(iniziale.campi.giornataNumero));
  const posizione = useRef(null);

  const set = (chiave) => (e) => setCampi((c) => ({ ...c, [chiave]: e.target.value }));

  // Il numero della giornata da raccontare lo propone la Gazzetta: la più recente
  // già giocata che non ha ancora l'edizione. I dati possono arrivare dopo il
  // primo disegno, quindi si compila appena ci sono — ma solo finché non si è
  // scritto un numero a mano.
  useEffect(() => {
    if (modifica || numeroToccato.current) return;
    const proposta = giornataDaStampare(giornate, edizioni);
    if (proposta) setCampi((c) => (c.giornataNumero ? c : { ...c, giornataNumero: String(proposta) }));
  }, [modifica, giornate, edizioni]);

  // Salvataggio automatico della bozza, un attimo dopo l'ultimo tasto. All'uscita
  // dalla pagina si salva subito quello che c'è, senza aspettare il timer.
  const ultimo = useRef({ campi, voci, pag, conPagelle });
  ultimo.current = { campi, voci, pag, conPagelle };

  const scrivi = () => {
    if (modifica || pubblicata.current) return;
    const { campi: c, voci: v, pag: p, conPagelle: cp } = ultimo.current;
    if (bozzaVuota(c, v, p)) scartaBozza();
    else salvaBozza({ utenteId: utente?.id, campi: c, voci: v, pag: p, conPagelle: cp, salvataIl: Date.now() });
  };

  useEffect(() => {
    const t = setTimeout(scrivi, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campi, voci, pag, conPagelle]);

  useEffect(() => scrivi, []); // eslint-disable-line react-hooks/exhaustive-deps

  const numero = Number(campi.giornataNumero);
  const numeroValido = Number.isInteger(numero) && numero >= 1 && numero <= 99;
  const giornata = numeroValido ? giornate.find((g) => g.numero === numero) : null;
  const esistente = numeroValido
    ? edizioni.find((e) => e.giornataNumero === numero && e._id !== edizione?._id)
    : null;
  const scontri = scontriGiocabili(giornata);
  const corpo = useMemo(() => campi.corpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [campi.corpo]);

  // --- righe per scontro -----------------------------------------------------
  // Nuova edizione: una riga mai toccata è viva e si compila da sola. In
  // correzione no: uno scontro lasciato senza commento resta senza, finché non lo
  // chiedi con "Genera in automatico".
  const vivo = !modifica;
  const commentiMostrati = scontri.map((a) => {
    const chiave = chiaveScontro(a);
    const o = voci[chiave];
    return {
      a, chiave, v: o?.v || 0,
      testo: o ? o.testo : (vivo ? commentoScontro(a, 0) : ''),
      auto: o ? o.auto : vivo
    };
  });
  const scriviCommento = (c, testo) => setVoci((x) => ({ ...x, [c.chiave]: { testo, auto: false, v: c.v } }));
  const altroCommento = (c) => setVoci((x) => ({ ...x, [c.chiave]: { testo: commentoScontro(c.a, c.v + 1), auto: true, v: c.v + 1 } }));
  const commentoAutomatico = (c) => setVoci((x) => ({ ...x, [c.chiave]: { testo: commentoScontro(c.a, 0), auto: true, v: 0 } }));

  // --- pagelle ---------------------------------------------------------------
  const pagelleMostrate = (giornata ? squadreConPunti(giornata) : []).map(({ squadra, fp }) => {
    const id = idDi(squadra);
    const o = pag[id];
    const generata = pagellaAuto(id, fp, numero, o?.v || 0);
    return {
      id, squadra, fp, v: o?.v || 0,
      voto: o ? o.voto : generata.voto,
      battuta: o ? o.battuta : generata.battuta,
      auto: o ? o.auto : true
    };
  });
  const pagelleAttive = conPagelle && pagelleMostrate.length > 0;
  const cambiaVoto = (p, passo) => setPag((x) => ({ ...x, [p.id]: { voto: limitaVoto(p.voto + passo), battuta: p.battuta, auto: false, v: p.v } }));
  const scriviBattuta = (p, battuta) => setPag((x) => ({ ...x, [p.id]: { voto: p.voto, battuta, auto: false, v: p.v } }));
  const altraBattuta = (p) => setPag((x) => ({ ...x, [p.id]: { ...pagellaAuto(p.id, p.fp, numero, p.v + 1), auto: true, v: p.v + 1 } }));
  const pagellaAutomatica = (p) => setPag((x) => { const resto = { ...x }; delete resto[p.id]; return resto; });

  // In correzione: rigenera dai punteggi di oggi tutte le righe ancora automatiche.
  // Quelle scritte o ritoccate a mano restano come sono.
  const haAutomatiche = modifica && (commentiMostrati.some((c) => c.auto && c.testo) || pagelleMostrate.some((p) => p.auto));
  const aggiornaDaiDati = () => {
    setVoci((x) => {
      const nuovo = { ...x };
      for (const c of commentiMostrati) if (c.auto && c.testo) nuovo[c.chiave] = { testo: commentoScontro(c.a, c.v), auto: true, v: c.v };
      return nuovo;
    });
    setPag((x) => {
      const nuovo = { ...x };
      for (const p of pagelleMostrate) if (p.auto) nuovo[p.id] = { ...pagellaAuto(p.id, p.fp, numero, p.v), auto: true, v: p.v };
      return nuovo;
    });
    mostraToast('Righe automatiche aggiornate ai punteggi di oggi');
  };

  // --- spunti ----------------------------------------------------------------
  const spunti = useMemo(() => (numeroValido ? spuntiGiornata(giornate, numero) : []), [giornate, numero, numeroValido]);
  // Uno scheletro dai fatti veri della giornata: titolo e pezzo coi primi spunti,
  // da riscrivere a modo proprio. Non tocca niente se c'è già del testo.
  const bozzaDaiDati = () => {
    setCampi((c) => ({
      ...c,
      titolo: c.titolo.trim() ? c.titolo : titoli[0] || '',
      corpo: c.corpo.trim() ? c.corpo : spunti.slice(0, 5).map((x) => x.testo).join('\n\n')
    }));
  };
  const titoli = useMemo(() => (numeroValido ? titoliSuggeriti(giornate, numero) : []), [giornate, numero, numeroValido]);

  // Inserisce la frase nel punto in cui eri nel pezzo (o in fondo), tra due righe vuote.
  const inserisci = (testo) => {
    const attuale = campi.corpo;
    const pos = Math.min(posizione.current ?? attuale.length, attuale.length);
    const prima = attuale.slice(0, pos);
    const dopo = attuale.slice(pos);
    const sepPrima = !prima || prima.endsWith('\n\n') ? '' : prima.endsWith('\n') ? '\n' : '\n\n';
    const sepDopo = !dopo || dopo.startsWith('\n\n') ? '' : dopo.startsWith('\n') ? '\n' : '\n\n';
    const inserto = sepPrima + testo + sepDopo;
    setCampi((c) => ({ ...c, corpo: prima + inserto + dopo }));
    posizione.current = pos + inserto.length;
    mostraToast('Inserito nel pezzo');
  };

  const commentiDaInviare = commentiMostrati
    .filter((c) => c.testo.trim())
    .map((c) => ({
      squadraCasa: idDi(c.a.squadraCasa),
      squadraTrasferta: idDi(c.a.squadraTrasferta),
      testo: c.testo.trim(),
      auto: c.auto
    }));
  const pagelleDaInviare = pagelleAttive
    ? pagelleMostrate.map((p) => ({ squadra: p.id, voto: p.voto, battuta: p.battuta.trim(), auto: p.auto }))
    : [];

  const mancanti = [];
  if (!numeroValido) mancanti.push('giornata');
  if (!campi.occhiello.trim()) mancanti.push('occhiello');
  if (!campi.titolo.trim()) mancanti.push('titolo');
  if (corpo.length === 0) mancanti.push('testo');
  if (!campi.direttore.trim()) mancanti.push('firma');

  const nota = numeroValido ? notaGiornata(numero, giornata, esistente) : null;
  const scontriCommentati = commentiDaInviare.length;

  const pubblica = async () => {
    if (inviandoRef.current || mancanti.length > 0 || esistente || caricandoFoto) return;
    inviandoRef.current = true;
    setInviando(true);
    setErrore('');

    const dati = {
      giornataNumero: numero,
      direttore: campi.direttore.trim(),
      occhiello: campi.occhiello.trim(),
      titolo: campi.titolo.trim(),
      corpo,
      immagineUrl: campi.immagineUrl || '',
      didascalia: campi.didascalia.trim(),
      commenti: commentiDaInviare,
      pagelle: pagelleDaInviare
    };

    try {
      const { edizione: uscita } = modifica
        ? await api.put(`/api/edizioni/${edizione._id}`, dati)
        : await api.post('/api/edizioni', dati);
      pubblicata.current = true;
      scartaBozza();
      await ricaricaTutto();
      mostraToast(modifica ? 'Edizione corretta!' : 'Edizione mandata in stampa!');
      // replace: tornando indietro non si riapre il modulo già spedito.
      navigate('/gazzetta', { replace: true, state: { edizioneId: uscita?._id || edizione?._id } });
    } catch (err) {
      setErrore(err.message);
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  // Scrivendo dal telefono la tastiera copre la metà bassa dello schermo: il
  // campo toccato si porta in cima all'area visibile (la testata si nasconde, vedi
  // gazzetta.css), così si vede quello che si scrive.
  const campoFormato = useRef(null);
  const [formatoAttivo, setFormatoAttivo] = useState('blocco');

  const alFuoco = (e) => {
    const campo = e.target;
    if (!campo.matches?.('input, textarea')) return;
    if (campo.dataset?.formato) { campoFormato.current = campo; setFormatoAttivo(campo.dataset.formato); }
    setTimeout(() => {
      const area = document.querySelector('.contenuto');
      if (!area || !area.contains(campo)) return;
      const dentro = campo.getBoundingClientRect().top - area.getBoundingClientRect().top;
      area.scrollTo({ top: area.scrollTop + dentro - 12, behavior: 'smooth' });
    }, 350);
  };

  const scartaRipresa = () => {
    scartaBozza();
    const proposta = giornataDaStampare(giornate, edizioni);
    setCampi({ ...vuoto, direttore: firma, giornataNumero: proposta ? String(proposta) : '' });
    setVoci({});
    setPag({});
    setConPagelle(true);
    setRipresa(null);
    numeroToccato.current = false;
  };

  // Indietro torna da dove si è venuti (Gazzetta, Archivio); aperta direttamente,
  // senza storia dietro, porta alla Gazzetta invece di uscire dall'app.
  const indietro = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/gazzetta', { replace: true }));

  // La stessa impaginazione che vedrà il lettore, con quello che c'è scritto ora.
  const bozzaArticolo = {
    _id: edizione?._id || 'bozza',
    giornataNumero: numeroValido ? numero : 0,
    direttore: campi.direttore.trim() || firma,
    occhiello: campi.occhiello.trim() || 'Occhiello',
    titolo: campi.titolo.trim() || 'Il titolo dell\'articolo',
    corpo: corpo.length ? corpo : ['Il testo comparirà qui.'],
    immagineUrl: campi.immagineUrl,
    didascalia: campi.didascalia.trim(),
    commenti: commentiDaInviare,
    pagelle: pagelleAttive
      ? pagelleMostrate.map((p) => ({ squadra: p.squadra, voto: p.voto, battuta: p.battuta.trim() }))
      : [],
    stats: edizione?.stats
  };

  const stato = errore
    ? { testo: errore, errore: true }
    : caricandoFoto ? { testo: 'Sto caricando la foto…' }
      : esistente ? { testo: `La G${numero} è già in edicola` }
        : mancanti.length ? { testo: `Mancano: ${mancanti.join(', ')}` }
          : { testo: modifica ? 'Pronta da correggere' : 'Pronta per la stampa' };

  return (
    <div className="ritagli scrivi" onFocus={alFuoco}>
      <header className="testa-sotto">
        <button type="button" className="indietro" onClick={indietro} aria-label="Indietro">
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="testi">
          <span className="sopra">{modifica ? 'Correggi le bozze' : 'Si va in stampa'}</span>
          <h1 className="titolo">{numeroValido ? `Giornata ${numero}` : 'Nuova edizione'}</h1>
        </div>
      </header>

      {ripresa && (
        <div className="scrivi-ripresa">
          <span>Bozza ripresa, salvata alle {oraDi(ripresa)}.</span>
          <button type="button" className="bottone-link" onClick={scartaRipresa}>Scarta</button>
        </div>
      )}

      <div className="tabs linguette" role="tablist">
        {[{ id: false, nome: 'Scrivi' }, { id: true, nome: 'Anteprima' }].map((t) => (
          <button
            key={t.nome}
            type="button"
            role="tab"
            aria-selected={anteprima === t.id}
            className={`tab${anteprima === t.id ? ' active' : ''}`}
            onClick={() => setAnteprima(t.id)}
          >
            {t.nome}
          </button>
        ))}
      </div>

      {anteprima ? (
        <Article edizione={bozzaArticolo} />
      ) : (
        <form className="ritaglio scrivi-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <label htmlFor="s-numero">Giornata</label>
          <input
            id="s-numero"
            type="number"
            inputMode="numeric"
            value={campi.giornataNumero}
            onChange={(e) => { numeroToccato.current = true; set('giornataNumero')(e); }}
            placeholder="es. 9"
          />
          {nota && (
            <p className={`nota-form${nota.avviso ? ' avviso' : ''}`}>
              {nota.testo}
              {esistente && (
                <>
                  {' '}
                  <button type="button" className="bottone-link" onClick={() => navigate(`/gazzetta/scrivi/${esistente._id}`)}>
                    Correggi quella
                  </button>
                </>
              )}
            </p>
          )}

          {haAutomatiche && (
            <button type="button" className="bottone-contorno" onClick={aggiornaDaiDati}>Aggiorna dai dati</button>
          )}

          {spunti.length > 0 && !campi.corpo.trim() && !campi.titolo.trim() && (
            <button type="button" className="bottone-contorno" onClick={bozzaDaiDati}>Parti da una bozza</button>
          )}

          <label htmlFor="s-occhiello">Occhiello</label>
          <input id="s-occhiello" type="text" value={campi.occhiello} onChange={set('occhiello')} placeholder="Es. Il caso" />

          <label htmlFor="s-titolo">Titolo</label>
          <input id="s-titolo" type="text" value={campi.titolo} onChange={set('titolo')} placeholder="Es. Sono i re di questa giornata!" />
          {titoli.length > 0 && !campi.titolo.trim() && (
            <div className="idee-titolo">
              <span className="nota-form">Idee:</span>
              {titoli.map((t) => (
                <button key={t} type="button" className="idea" onClick={() => setCampi((c) => ({ ...c, titolo: t }))}>{t}</button>
              ))}
            </div>
          )}

          <label htmlFor="s-pezzo">Il pezzo</label>
          <BarraFormato campoRef={campoFormato} tipo={formatoAttivo} />
          <textarea
            id="s-pezzo"
            data-formato="blocco"
            rows={10}
            value={campi.corpo}
            onChange={(e) => { posizione.current = e.target.selectionStart; set('corpo')(e); }}
            onSelect={(e) => { posizione.current = e.target.selectionStart; }}
            placeholder="Scrivi qui. Lascia una riga vuota tra un paragrafo e l'altro. Per il grassetto o il corsivo usa i tasti sopra."
          />

          {numeroValido && (
            <details className="scrivi-dettagli scrivi-spunti">
              <summary>Spunti della giornata{spunti.length > 0 ? ` · ${spunti.length}` : ''}</summary>
              {spunti.length === 0 ? (
                <p className="nota-form">Appena ci sono i punteggi della G{numero}, qui compaiono gli spunti: strisce, colpacci e distacchi.</p>
              ) : (
                <ul className="spunti">
                  {spunti.map((s) => (
                    <li key={s.id}>
                      <span className="etichetta">{s.etichetta}</span>
                      <span className="testo">{s.testo}</span>
                      <button type="button" className="bottone-link" onClick={() => inserisci(s.testo)}>Inserisci nel pezzo</button>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}

          {numeroValido && (
            <fieldset className="partita-per-partita">
              <legend>
                Partita per partita <span className="facoltativo">facoltativo</span>
              </legend>
              {scontri.length === 0 ? (
                <p className="nota-form">Appena il calendario della G{numero} è pronto, qui compaiono gli scontri con due righe già pronte su ognuno.</p>
              ) : (
                <>
                  <p className="nota-form">
                    Due righe per scontro, già pronte dai risultati: tienile, cambiale o svuotale.
                    {scontriCommentati > 0 && ` Finora ${scontriCommentati} su ${scontri.length}.`}
                  </p>
                  {commentiMostrati.map((c, i) => {
                    const { a } = c;
                    const gol = a.golCasa != null && a.golTrasferta != null ? ` (${a.golCasa}–${a.golTrasferta})` : '';
                    return (
                      <div className="partita-campo" key={a._id || c.chiave}>
                        <label htmlFor={`s-partita-${i}`}>
                          {a.squadraCasa.nome} – {a.squadraTrasferta.nome}{gol}
                          {a.fantapuntiCasa != null && a.fantapuntiTrasferta != null && (
                            <span className="facoltativo"> · {formattaFantapunti(a.fantapuntiCasa)} a {formattaFantapunti(a.fantapuntiTrasferta)}</span>
                          )}
                        </label>
                        <textarea
                          id={`s-partita-${i}`}
                          data-formato="riga"
                          rows={2}
                          maxLength={MAX_COMMENTO}
                          value={c.testo}
                          onChange={(ev) => scriviCommento(c, ev.target.value)}
                          placeholder="Es. Un derby da tregua armata: pareggio che non fa male a nessuno"
                        />
                        <PiedeAuto
                          auto={c.auto}
                          haTesto={Boolean(c.testo)}
                          onAltra={() => altroCommento(c)}
                          onTorna={() => commentoAutomatico(c)}
                          conta={`${c.testo.length}/${MAX_COMMENTO}`}
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </fieldset>
          )}

          {numeroValido && pagelleMostrate.length > 0 && (
            <fieldset className="partita-per-partita">
              <legend>
                Pagelle <span className="facoltativo">facoltativo</span>
              </legend>
              {!conPagelle ? (
                <>
                  <p className="nota-form">Un voto e una battuta per ogni squadra, dai punteggi della giornata. Al posto del tabellino dei premi.</p>
                  <button type="button" className="bottone-contorno" onClick={() => setConPagelle(true)}>Aggiungi le pagelle</button>
                </>
              ) : (
                <>
                  <p className="nota-form">
                    Voto dai fantapunti (sotto 60 è 4, mezzo voto ogni 4 punti) e una battuta. Si possono ritoccare entrambi.
                  </p>
                  {pagelleMostrate.map((p) => (
                    <div className="pagella-campo" key={p.id}>
                      <div className="pagella-testa">
                        <Stemma src={p.squadra.stemma} nome={p.squadra.nome} size={28} />
                        <span className="testi">
                          <span className="nome">{p.squadra.nome}</span>
                          <span className="dettaglio">{formattaFantapunti(p.fp)} fantapunti</span>
                        </span>
                        <span className="voto-stepper">
                          <button type="button" aria-label={`Abbassa il voto di ${p.squadra.nome}`} onClick={() => cambiaVoto(p, -0.5)}>−</button>
                          <b>{formattaVoto(p.voto)}</b>
                          <button type="button" aria-label={`Alza il voto di ${p.squadra.nome}`} onClick={() => cambiaVoto(p, 0.5)}>+</button>
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={MAX_BATTUTA}
                        value={p.battuta}
                        aria-label={`Battuta su ${p.squadra.nome}`}
                        onChange={(ev) => scriviBattuta(p, ev.target.value)}
                      />
                      <PiedeAuto
                        auto={p.auto}
                        haTesto
                        onAltra={() => altraBattuta(p)}
                        onTorna={() => pagellaAutomatica(p)}
                        conta={`${p.battuta.length}/${MAX_BATTUTA}`}
                      />
                    </div>
                  ))}
                  <button type="button" className="bottone-link" onClick={() => setConPagelle(false)}>Togli le pagelle</button>
                </>
              )}
            </fieldset>
          )}

          <details className="scrivi-dettagli" open={Boolean(campi.immagineUrl || campi.didascalia)}>
            <summary>Foto e firma</summary>
            <ImageUpload
              label="Foto (facoltativa)"
              value={campi.immagineUrl}
              cartella="edizioni"
              forma="larga"
              onChange={(url) => setCampi((c) => ({ ...c, immagineUrl: url }))}
              onOccupato={setCaricandoFoto}
            />
            <label htmlFor="s-didascalia">Didascalia <span className="facoltativo">facoltativa</span></label>
            <input id="s-didascalia" type="text" maxLength={140} value={campi.didascalia} onChange={set('didascalia')} placeholder="Es. Nella foto: la lavagna tattica" />
            <label htmlFor="s-firma">Firma</label>
            <input id="s-firma" type="text" value={campi.direttore} onChange={set('direttore')} placeholder="Il tuo nome o uno pseudonimo" />
          </details>
        </form>
      )}

      <div className="scrivi-barra">
        <span className={`stato${stato.errore ? ' errore' : ''}`} role={stato.errore ? 'alert' : 'status'}>{stato.testo}</span>
        <button
          type="button"
          className="bottone-grande"
          disabled={inviando || caricandoFoto || mancanti.length > 0 || Boolean(esistente)}
          onClick={pubblica}
        >
          {modifica
            ? (inviando ? 'Correggo le bozze…' : 'Salva le correzioni')
            : (inviando ? 'In stampa…' : 'Manda in stampa')}
        </button>
      </div>
    </div>
  );
}

export default function Scrivi() {
  const { utente } = useOutletContext();
  const { id } = useParams();
  const { edizioni } = useDati();
  const navigate = useNavigate();

  if (!puoRedigere(utente)) return <Navigate to="/gazzetta" replace />;

  const edizione = id ? edizioni.find((e) => e._id === id) : null;
  if (id && !edizione) {
    return (
      <div className="ritagli">
        <section className="ritaglio">
          <p className="ritaglio-vuoto">Cerco l&apos;edizione…</p>
          <button type="button" className="bottone-link" onClick={() => navigate('/gazzetta', { replace: true })}>Torna alla Gazzetta</button>
        </section>
      </div>
    );
  }

  // `key`: passando da "nuova" a una correzione (o tra due edizioni) il modulo
  // riparte da zero invece di portarsi dietro i campi dell'altro.
  return <Editor key={id || 'nuova'} edizione={edizione} />;
}
