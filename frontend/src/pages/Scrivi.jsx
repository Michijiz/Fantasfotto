import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Article from '../components/ui/Article';
import ImageUpload from '../components/ui/ImageUpload';
import { giornataDaStampare, haPunteggi, idDi, scontriGiocabili } from '../utils/lega';
import { formattaFantapunti } from '../utils/regolamento';
import { puoRedigere } from '../ruoli';
import '../styles/gazzetta.css';

const MAX_COMMENTO = 280;
const CHIAVE_BOZZA = 'gazzetta_bozza_edizione';

const vuoto = { giornataNumero: '', direttore: '', occhiello: '', titolo: '', corpo: '', immagineUrl: '', didascalia: '' };

// Un commento si lega alla coppia casa-trasferta dello scontro, non al suo id: il
// calendario può essere risalvato senza che i commenti perdano il loro scontro.
const chiaveScontro = (a) => `${idDi(a.squadraCasa)}>${idDi(a.squadraTrasferta)}`;

function commentiDa(ed) {
  const per = {};
  for (const c of ed?.commenti || []) per[chiaveScontro(c)] = c.testo;
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
    return bozza && bozza.utenteId === utenteId && bozza.campi ? bozza : null;
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

// Solo giornata e firma non bastano a fare una bozza: partono da sole.
const bozzaVuota = (campi, commenti) => !campi.occhiello.trim() && !campi.titolo.trim() && !campi.corpo.trim()
  && !campi.immagineUrl && !campi.didascalia.trim() && !Object.values(commenti).some((t) => t.trim());

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

// "Si va in stampa": la pagina di scrittura, per scrivere una nuova edizione o
// correggerne una uscita. Il tabellino non si compila a mano: miglior e peggior
// punteggio li calcola la Gazzetta dai fantapunti della giornata, il Re dei Gufi
// arriva dalle schedine. La firma è libera (pseudonimi ammessi).
function Editor({ edizione }) {
  const { utente } = useAuth();
  const { giornate, edizioni, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const modifica = Boolean(edizione?._id);
  const firma = utente?.nomeVisualizzato || '';

  const [iniziale] = useState(() => {
    if (modifica) return { campi: daEdizione(edizione, firma), commenti: commentiDa(edizione), ripresa: null };
    const richiesta = params.get('giornata') || '';
    const bozza = leggiBozza(utente?.id);
    // Se si arriva da "Scrivila" su una giornata precisa, la bozza di un'altra
    // giornata non si riprende (resta lì finché non la si sovrascrive).
    if (bozza && (!richiesta || String(bozza.campi.giornataNumero) === richiesta)) {
      return { campi: { ...vuoto, ...bozza.campi }, commenti: bozza.commenti || {}, ripresa: bozza.salvataIl || Date.now() };
    }
    return { campi: { ...vuoto, direttore: firma, giornataNumero: richiesta }, commenti: {}, ripresa: null };
  });

  const [campi, setCampi] = useState(iniziale.campi);
  const [commenti, setCommenti] = useState(iniziale.commenti);
  const [ripresa, setRipresa] = useState(iniziale.ripresa);
  const [anteprima, setAnteprima] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const inviandoRef = useRef(false);
  const pubblicata = useRef(false);
  const numeroToccato = useRef(Boolean(iniziale.campi.giornataNumero));

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
  const ultimo = useRef({ campi, commenti });
  ultimo.current = { campi, commenti };

  const scrivi = () => {
    if (modifica || pubblicata.current) return;
    const { campi: c, commenti: cm } = ultimo.current;
    if (bozzaVuota(c, cm)) scartaBozza();
    else salvaBozza({ utenteId: utente?.id, campi: c, commenti: cm, salvataIl: Date.now() });
  };

  useEffect(() => {
    const t = setTimeout(scrivi, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campi, commenti]);

  useEffect(() => scrivi, []); // eslint-disable-line react-hooks/exhaustive-deps

  const numero = Number(campi.giornataNumero);
  const numeroValido = Number.isInteger(numero) && numero >= 1 && numero <= 99;
  const giornata = numeroValido ? giornate.find((g) => g.numero === numero) : null;
  const esistente = numeroValido
    ? edizioni.find((e) => e.giornataNumero === numero && e._id !== edizione?._id)
    : null;
  const scontri = scontriGiocabili(giornata);
  const corpo = useMemo(() => campi.corpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [campi.corpo]);

  // Solo gli scontri della giornata scelta e solo quelli con del testo: se hai
  // cambiato numero di giornata, i commenti scritti per l'altra non partono.
  const commentiDaInviare = scontri
    .map((a) => ({
      squadraCasa: idDi(a.squadraCasa),
      squadraTrasferta: idDi(a.squadraTrasferta),
      testo: (commenti[chiaveScontro(a)] || '').trim()
    }))
    .filter((c) => c.testo);

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
      commenti: commentiDaInviare
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

  const scartaRipresa = () => {
    scartaBozza();
    const proposta = giornataDaStampare(giornate, edizioni);
    setCampi({ ...vuoto, direttore: firma, giornataNumero: proposta ? String(proposta) : '' });
    setCommenti({});
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
    stats: edizione?.stats
  };

  const stato = errore
    ? { testo: errore, errore: true }
    : caricandoFoto ? { testo: 'Sto caricando la foto…' }
      : esistente ? { testo: `La G${numero} è già in edicola` }
        : mancanti.length ? { testo: `Mancano: ${mancanti.join(', ')}` }
          : { testo: modifica ? 'Pronta da correggere' : 'Pronta per la stampa' };

  return (
    <div className="ritagli scrivi">
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

          <label htmlFor="s-occhiello">Occhiello</label>
          <input id="s-occhiello" type="text" value={campi.occhiello} onChange={set('occhiello')} placeholder="Es. Il caso" />

          <label htmlFor="s-titolo">Titolo</label>
          <input id="s-titolo" type="text" value={campi.titolo} onChange={set('titolo')} placeholder="Es. Sono i re di questa giornata!" />

          <label htmlFor="s-pezzo">Il pezzo</label>
          <textarea
            id="s-pezzo"
            rows={10}
            value={campi.corpo}
            onChange={set('corpo')}
            placeholder="Scrivi qui. Lascia una riga vuota tra un paragrafo e l'altro."
          />

          {numeroValido && (
            <fieldset className="partita-per-partita">
              <legend>
                Partita per partita <span className="facoltativo">facoltativo</span>
              </legend>
              {scontri.length === 0 ? (
                <p className="nota-form">Appena il calendario della G{numero} è pronto, qui compaiono gli scontri e puoi scrivere due righe su ognuno.</p>
              ) : (
                <>
                  <p className="nota-form">
                    Due righe per scontro, solo dove hai qualcosa da dire.
                    {scontriCommentati > 0 && ` Finora ${scontriCommentati} su ${scontri.length}.`}
                  </p>
                  {scontri.map((a, i) => {
                    const chiave = chiaveScontro(a);
                    const testo = commenti[chiave] || '';
                    const gol = a.golCasa != null && a.golTrasferta != null ? ` (${a.golCasa}–${a.golTrasferta})` : '';
                    return (
                      <div className="partita-campo" key={a._id || chiave}>
                        <label htmlFor={`s-partita-${i}`}>
                          {a.squadraCasa.nome} – {a.squadraTrasferta.nome}{gol}
                          {a.fantapuntiCasa != null && a.fantapuntiTrasferta != null && (
                            <span className="facoltativo"> · {formattaFantapunti(a.fantapuntiCasa)} a {formattaFantapunti(a.fantapuntiTrasferta)}</span>
                          )}
                        </label>
                        <textarea
                          id={`s-partita-${i}`}
                          rows={2}
                          maxLength={MAX_COMMENTO}
                          value={testo}
                          onChange={(ev) => setCommenti((c) => ({ ...c, [chiave]: ev.target.value }))}
                          placeholder="Es. Un derby da tregua armata: pareggio che non fa male a nessuno"
                        />
                        <span className="conta">{testo.length}/{MAX_COMMENTO}</span>
                      </div>
                    );
                  })}
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
