import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilSimple, BookOpen, CaretRight } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useDati } from '../context/DataContext';
import { useTema } from '../context/TemaContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import Avatar from '../components/ui/Avatar';
import Stemma from '../components/ui/Stemma';
import Sheet from '../components/ui/Sheet';
import SelettoreTema from '../components/ui/SelettoreTema';
import ComponiProfilo from '../components/ui/ComponiProfilo';
import { etichettaRuolo, puoRedigere } from '../ruoli';
import { avatarUtente } from '../avatar';
import { coloreSfondo, profiloDi } from '../profilo';
import { sfondoTema } from '../temi';
import { magliaSquadra } from '../loghi';
import { formattaFantapunti } from '../utils/regolamento';
import '../styles/profilo.css';

const idDi = (v) => (v && typeof v === 'object' ? v._id : v);

// Ultimi cinque risultati della squadra, dal più vecchio al più recente: V/N/P
// dai gol, come in classifica. Contano solo gli scontri con il risultato.
function formaRecente(giornate, squadraId) {
  const esiti = [];
  for (const g of giornate) {
    for (const a of g.accoppiamenti || []) {
      const casa = idDi(a.squadraCasa) === squadraId;
      const trasferta = idDi(a.squadraTrasferta) === squadraId;
      if ((!casa && !trasferta) || a.golCasa == null || a.golTrasferta == null) continue;
      const fatti = casa ? a.golCasa : a.golTrasferta;
      const subiti = casa ? a.golTrasferta : a.golCasa;
      esiti.push({ numero: g.numero, esito: fatti > subiti ? 'V' : fatti < subiti ? 'P' : 'N' });
    }
  }
  return esiti.slice(-5);
}

// Le menzioni della squadra: titoli di stagione dall'albo d'oro e premi di
// giornata dalle edizioni. Fenomeno e bidone si saltano quando coincidono con
// vincitore e ultimo (è il ripiego dell'edizione: sarebbe la stessa voce due volte).
function menzioni(albo, edizioni, squadraId) {
  const voci = [];
  for (const a of albo) {
    if (idDi(a.squadra) === squadraId) voci.push({ chiave: `albo-${a._id}`, testo: `Campione · ${a.stagione}`, oro: true });
  }
  for (const e of edizioni) {
    const s = e.stats || {};
    const g = `G${e.giornataNumero}`;
    const nostra = (v) => idDi(v) === squadraId;
    if (nostra(s.vincitore)) voci.push({ chiave: `v-${e._id}`, testo: `Top score · ${g}` });
    if (nostra(s.fenomeno) && idDi(s.fenomeno) !== idDi(s.vincitore)) voci.push({ chiave: `f-${e._id}`, testo: `Fenomeno · ${g}` });
    if (nostra(s.ultimo)) voci.push({ chiave: `u-${e._id}`, testo: `Cucchiaio di legno · ${g}` });
    if (nostra(s.bidone) && idDi(s.bidone) !== idDi(s.ultimo)) voci.push({ chiave: `b-${e._id}`, testo: `Bidone · ${g}` });
    if ((s.reDeiGufi || []).some(nostra)) voci.push({ chiave: `r-${e._id}`, testo: `Re dei Gufi · ${g}` });
  }
  return voci;
}

// Il titolo è in Anton a tutta larghezza: la parola più lunga decide la misura,
// così un nome lungo va a capo tra le parole e non a metà.
function classeTitolo(testo) {
  const parolaPiuLunga = Math.max(...String(testo).split(/\s+/).map((w) => w.length));
  if (parolaPiuLunga > 14) return ' lunghissimo';
  if (parolaPiuLunga > 10) return ' lungo';
  return '';
}

const bozzaDa = (utente) => ({
  nomeVisualizzato: utente.nomeVisualizzato || '',
  avatar: avatarUtente(utente),
  profilo: profiloDi(utente)
});

function Occhiello({ children }) {
  return (
    <div className="ritaglio-occhiello">
      <span>{children}</span>
      <span className="filo" />
    </div>
  );
}

export default function Profilo() {
  const { utente, logout } = useAuth();
  const { squadre, tabellone, giornate, edizioni, albo, ricaricaSquadre } = useDati();
  const { temaId, tema, cambiaTema } = useTema();
  const mostraToast = useToast();
  const navigate = useNavigate();

  const [componi, setComponi] = useState(false);
  const [bozza, setBozza] = useState(null);
  const [temaAperto, setTemaAperto] = useState(false);
  const [rosaAperta, setRosaAperta] = useState(false);
  const [schedine, setSchedine] = useState(null);

  useEffect(() => {
    api.get('/api/schedine/mie').then(setSchedine).catch(() => setSchedine(null));
  }, []);

  const squadraId = idDi(utente.squadra);
  const miaSquadra = squadre.find((s) => s._id === squadraId);
  const redazione = puoRedigere(utente);

  // Mentre lo sheet è aperto la pagina mostra la bozza: si vede il ritaglio
  // cambiare a ogni tocco. Chiudendo senza salvare torna quello pubblicato.
  const vista = bozza || bozzaDa(utente);
  const p = vista.profilo;
  const mostra = (id) => !p.nascosti.includes(id);

  const posizione = tabellone.findIndex((s) => s._id === squadraId);
  const riga = posizione >= 0 ? tabellone[posizione] : null;
  const forma = useMemo(() => formaRecente(giornate, squadraId), [giornate, squadraId]);
  const albi = useMemo(() => menzioni(albo, edizioni, squadraId), [albo, edizioni, squadraId]);
  const firmate = useMemo(
    () => edizioni.filter((e) => idDi(e.createdBy) === utente.id).slice(0, 5),
    [edizioni, utente.id]
  );

  const titolo = vista.nomeVisualizzato.trim() || utente.nomeVisualizzato;
  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const maglia = miaSquadra?.maglia || magliaSquadra(miaSquadra?.nome);

  const apriComponi = () => { setBozza(bozzaDa(utente)); setComponi(true); };
  const chiudiComponi = () => { setComponi(false); setBozza(null); };

  return (
    <div className="profilo">
      <div className="profilo-testatina">
        <span>Edizione personale</span>
        <span>{oggi}</span>
      </div>

      {/* Il ritaglio d'apertura: foto, timbro del ruolo e i testi dell'utente. */}
      <article className="ritaglio ritaglio-apertura">
        <div className="profilo-foto" style={{ background: coloreSfondo(p.sfondo) }}>
          <Avatar id={vista.avatar} nome={vista.nomeVisualizzato} size={250} tondo={false} className="profilo-avatar" />
          <span className="profilo-timbro">{etichettaRuolo(utente)}</span>
          <button type="button" className="profilo-matita" onClick={apriComponi} aria-label="Componi la tua pagina">
            <PencilSimple size={20} />
          </button>
        </div>
        {p.didascalia.trim() && <div className="profilo-didascalia">{p.didascalia}</div>}
        <div className="profilo-testi">
          {p.occhiello.trim() && <div className="profilo-occhiello">{p.occhiello}</div>}
          <h1 className={`profilo-titolo${classeTitolo(titolo)}${p.stileTitolo === 'contorno' ? ' contorno' : ''}`}>
            {titolo}
          </h1>
          {p.sottotitolo.trim() && <div className="profilo-sottotitolo">{p.sottotitolo}</div>}
          {p.motto.trim() && <p className="profilo-motto">{p.motto}</p>}
        </div>
      </article>

      {mostra('numeri') && (
        <section className="ritaglio">
          <Occhiello>I numeri</Occhiello>
          <div className="numeri-griglia">
            <div className="numero">
              <b>{riga ? `${posizione + 1}ª` : '—'}</b>
              <span>In classifica</span>
            </div>
            <div className="numero">
              <b>{riga ? riga.punti ?? 0 : '—'}</b>
              <span>Punti lega</span>
            </div>
            <div className="numero">
              <b>{riga ? formattaFantapunti(riga.puntiTotali ?? 0) : '—'}</b>
              <span>Fantapunti</span>
            </div>
            <div className="numero">
              <b>{schedine ? `${schedine.vinte}/${schedine.giocate}` : '—'}</b>
              <span>Schedine vinte</span>
            </div>
          </div>
        </section>
      )}

      {mostra('forma') && (
        <section className="ritaglio">
          <Occhiello>La forma</Occhiello>
          {forma.length === 0 ? (
            <div className="ritaglio-vuoto">Ancora nessuno scontro giocato.</div>
          ) : (
            <div className="forma-riga">
              {forma.map((f) => (
                <div className="forma-voce" key={f.numero}>
                  <span className={`bollino esito-${f.esito}`}>{f.esito}</span>
                  <span className="g">G{f.numero}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="ritaglio">
        <Occhiello>La squadra</Occhiello>
        {!miaSquadra ? (
          <div className="skeleton-line w-60" />
        ) : (
          <>
            <div className="squadra-testa">
              <Stemma src={miaSquadra.stemma} nome={miaSquadra.nome} size={88} />
              <div className="squadra-testi">
                <div className="squadra-nome-grande">{miaSquadra.nome}</div>
                {maglia && <img className="squadra-maglia" src={maglia} alt="Maglia" />}
              </div>
            </div>
            <div className="squadra-rosa-riga">
              <span>Rosa</span>
              <b>{miaSquadra.rosa?.length ? `${miaSquadra.rosa.length} giocatori` : 'da compilare'}</b>
            </div>
            <button type="button" className="bottone-contorno" onClick={() => setRosaAperta(true)}>
              La rosa e la scheda
            </button>
          </>
        )}
      </section>

      {mostra('cuore') && (
        <section className="ritaglio">
          <Occhiello>Il cuore</Occhiello>
          <div className="cuore-testa">
            <span className="cuore-disco" style={{ background: sfondoTema(tema.colori) }} />
            <span className="cuore-nome">{tema.nome}</span>
          </div>
          <button type="button" className="bottone-contorno" onClick={() => setTemaAperto(true)}>
            Cambia squadra
          </button>
        </section>
      )}

      {redazione && mostra('archivio') && (
        <section className="ritaglio">
          <Occhiello>Dall&apos;archivio</Occhiello>
          {firmate.length === 0 ? (
            <div className="ritaglio-vuoto">Nessuna edizione firmata finora.</div>
          ) : (
            <div className="archivio-lista">
              {firmate.map((e) => (
                <button
                  key={e._id}
                  type="button"
                  className="archivio-voce"
                  onClick={() => navigate('/gazzetta', { state: { edizioneId: e._id } })}
                >
                  <span className="tag">G{e.giornataNumero}</span>
                  <span className="titolo">{e.titolo}</span>
                  <CaretRight size={20} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {mostra('albo') && (
        <section className="ritaglio">
          <Occhiello>Nell&apos;albo</Occhiello>
          {albi.length === 0 ? (
            <div className="ritaglio-vuoto">Ancora nessuna menzione. C&apos;è tempo.</div>
          ) : (
            <div className="albo-chips">
              {albi.map((a) => (
                <span key={a.chiave} className={`albo-chip${a.oro ? ' oro' : ''}`}>{a.testo}</span>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="ritaglio ritaglio-impostazioni">
        <button type="button" className="impostazione" onClick={apriComponi}>
          <PencilSimple size={22} />
          <span>Componi la tua pagina</span>
          <CaretRight size={20} />
        </button>
        <button type="button" className="impostazione" onClick={() => navigate('/regolamento')}>
          <BookOpen size={22} />
          <span>Regolamento e FAQ</span>
          <CaretRight size={20} />
        </button>
        <button type="button" className="bottone-contorno" onClick={logout}>Esci</button>
      </section>

      <p className="profilo-colophon">
        La Gazzetta dello Sfottò — ogni riferimento a fatti o allenatori reali è puramente voluto.
      </p>

      <Sheet aperto={componi} onChiudi={chiudiComponi} titolo="Componi la tua pagina" grande>
        {componi && bozza && (
          <ComponiProfilo bozza={bozza} onCambia={setBozza} onFatto={chiudiComponi} />
        )}
      </Sheet>

      <Sheet aperto={temaAperto} onChiudi={() => setTemaAperto(false)} titolo="Il cuore" sottotitolo={`Ora: ${tema.nome}`} grande>
        <p className="tema-nota">
          La squadra che tifi ridipinge tutta la Gazzetta. Resta salvata sul tuo profilo.
        </p>
        <SelettoreTema valore={temaId} onSceglie={cambiaTema} />
      </Sheet>

      <Sheet aperto={rosaAperta} onChiudi={() => setRosaAperta(false)} titolo={miaSquadra?.nome || 'La squadra'} sottotitolo="Rosa e scheda" grande>
        {rosaAperta && miaSquadra && (
          <SchedaSquadra squadra={miaSquadra} onSalvata={async () => {
            await ricaricaSquadre();
            mostraToast('Squadra aggiornata!');
            setRosaAperta(false);
          }} />
        )}
      </Sheet>
    </div>
  );
}

// Rosa e scheda della squadra: si legge e, toccando "Modifica", si corregge.
// Stemma e maglia non si caricano più da qui: arrivano dai loghi di redazione.
function SchedaSquadra({ squadra, onSalvata }) {
  const [modifica, setModifica] = useState(false);
  const [nome, setNome] = useState(squadra.nome || '');
  const [bio, setBio] = useState(squadra.bio || '');
  const [rosa, setRosa] = useState((squadra.rosa || []).join(', '));
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');

  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    setSalvando(true);
    try {
      await api.patch('/api/squadre/mia', { nome, bio, rosa });
      await onSalvata();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!modifica) {
    return (
      <div className="scheda-squadra">
        {squadra.bio ? <p className="scheda-bio">{squadra.bio}</p> : <div className="ritaglio-vuoto">Nessuna storia ancora scritta.</div>}
        {squadra.rosa?.length > 0 ? (
          <div className="players">
            {squadra.rosa.map((n) => <span className="chip" key={n}>{n}</span>)}
          </div>
        ) : (
          <div className="ritaglio-vuoto">La rosa è ancora vuota.</div>
        )}
        <button type="button" className="bottone-contorno" onClick={() => setModifica(true)}>Modifica</button>
      </div>
    );
  }

  return (
    <form onSubmit={salva}>
      <label>Nome della squadra</label>
      <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Come si chiama" />
      <label>Bio / storia della squadra</label>
      <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Racconta la storia della tua squadra..." />
      <label>Rosa (nomi separati da virgola)</label>
      <input type="text" value={rosa} onChange={(e) => setRosa(e.target.value)} placeholder="Giocatore 1, Giocatore 2, ..." />
      <button className="primary" type="submit" disabled={salvando}>Salva squadra</button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
