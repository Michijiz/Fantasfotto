import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PencilSimple, BookOpen, CaretRight, CaretLeft, Key } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useDati } from '../context/DataContext';
import { useTema } from '../context/TemaContext';
import { api } from '../api/client';
import Avatar from '../components/ui/Avatar';
import Stemma from '../components/ui/Stemma';
import Sheet from '../components/ui/Sheet';
import CaroselloTema from '../components/ui/CaroselloTema';
import CambiaPin from '../components/ui/CambiaPin';
import NomeLega from '../components/ui/NomeLega';
import ComponiProfilo from '../components/ui/ComponiProfilo';
import { etichettaRuolo, puoRedigere, puoCancellare } from '../ruoli';
import { avatarUtente } from '../avatar';
import { coloreSfondo, profiloDi } from '../profilo';
import { sfondoTema, temaPerId } from '../temi';
import { magliaSquadra } from '../loghi';
import { formattaFantapunti } from '../utils/regolamento';
import { idDi, formaRecente, menzioni, rosaPerRuolo } from '../utils/lega';
import '../styles/profilo.css';

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

// /profilo è il tuo, /profilo/:id quello di un altro allenatore (sola lettura).
// La pagina è la stessa: così il ritaglio ha lo stesso aspetto per tutti.
export default function Profilo() {
  const { id } = useParams();
  const { utente } = useAuth();

  if (id && String(id) === String(utente.id)) return <Navigate to="/profilo" replace />;
  if (id) return <ProfiloAltrui key={id} id={id} />;
  return <PaginaProfilo persona={utente} mio />;
}

// Carica il profilo di un altro utente e lo passa alla pagina in modalità ospite.
function ProfiloAltrui({ id }) {
  const navigate = useNavigate();
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let vivo = true;
    api.get(`/api/utenti/${id}`)
      .then((r) => { if (vivo) setDati(r); })
      .catch((err) => { if (vivo) setErrore(err.message || 'Profilo non trovato'); });
    return () => { vivo = false; };
  }, [id]);

  if (errore) {
    return (
      <div className="profilo">
        <section className="ritaglio">
          <p className="ritaglio-vuoto">{errore}</p>
          <button type="button" className="bottone-contorno" onClick={() => navigate(-1)}>Torna indietro</button>
        </section>
      </div>
    );
  }

  if (!dati) {
    return (
      <div className="profilo">
        <section className="ritaglio"><div className="skeleton-line w-60" /></section>
      </div>
    );
  }

  return <PaginaProfilo persona={dati.utente} schedineOspite={dati.schedine} />;
}

function PaginaProfilo({ persona, mio = false, schedineOspite = null }) {
  const { logout } = useAuth();
  const { squadre, tabellone, giornate, edizioni, albo } = useDati();
  const { temaId, tema: temaMio, cambiaTema } = useTema();
  const navigate = useNavigate();

  const [componi, setComponi] = useState(false);
  const [bozza, setBozza] = useState(null);
  const [temaAperto, setTemaAperto] = useState(false);
  const [pinAperto, setPinAperto] = useState(false);
  const [schedineMie, setSchedineMie] = useState(null);

  useEffect(() => {
    if (!mio) return;
    api.get('/api/schedine/mie').then(setSchedineMie).catch(() => setSchedineMie(null));
  }, [mio]);

  // Da qui in giù "utente" è la persona di cui si guarda la pagina: tu o un altro.
  const utente = persona;
  const schedine = mio ? schedineMie : schedineOspite;
  // Il cuore dell'ospite è la sua squadra tifata, non il tema con cui guardi tu.
  const tema = mio ? temaMio : temaPerId(persona.tema);

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
  const albi = useMemo(() => menzioni(albo, edizioni, giornate, squadraId), [albo, edizioni, giornate, squadraId]);
  const firmate = useMemo(
    () => edizioni.filter((e) => idDi(e.createdBy) === utente.id).slice(0, 5),
    [edizioni, utente.id]
  );

  const titolo = vista.nomeVisualizzato.trim() || utente.nomeVisualizzato;
  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const maglia = miaSquadra?.maglia || magliaSquadra(miaSquadra?.nome);

  // Sfondo "Come il tema": a casa d'altri è la carta della *sua* squadra.
  const sfondoFoto = !mio && p.sfondo === 'tema' ? (tema.vars?.['--paper-dark'] || coloreSfondo('tema')) : coloreSfondo(p.sfondo);

  const apriComponi = () => { setBozza(bozzaDa(utente)); setComponi(true); };
  const chiudiComponi = () => { setComponi(false); setBozza(null); };

  return (
    <div className="profilo">
      <div className="profilo-testatina">
        {mio ? (
          <span>Il personaggio</span>
        ) : (
          <button type="button" className="profilo-indietro" onClick={() => navigate(-1)}>
            <CaretLeft size={16} weight="bold" /> Indietro
          </button>
        )}
        <span>{oggi}</span>
      </div>

      {/* Il ritaglio d'apertura: foto, timbro del ruolo e i testi dell'utente. */}
      <article className="ritaglio ritaglio-apertura">
        <div className="profilo-foto" style={{ background: sfondoFoto }}>
          <Avatar id={vista.avatar} nome={vista.nomeVisualizzato} size={250} tondo={false} className="profilo-avatar" />
          <span className="profilo-timbro">{etichettaRuolo(utente)}</span>
          {mio && (
            <button type="button" className="profilo-matita" onClick={apriComponi} aria-label="Componi la tua pagina">
              <PencilSimple size={20} />
            </button>
          )}
        </div>
        {p.didascalia.trim() && <div className="profilo-didascalia">{p.didascalia}</div>}
        <div className="profilo-testi">
          {p.occhiello.trim() && <div className="profilo-occhiello">{p.occhiello}</div>}
          <h1 className={`profilo-titolo${classeTitolo(titolo)}${p.stileTitolo === 'contorno' ? ' contorno' : ''}`}>
            {titolo}
          </h1>
          {p.sottotitolo.trim() && <div className="profilo-sottotitolo">{p.sottotitolo}</div>}
          {p.motto.trim()
            ? <p className="profilo-motto">{p.motto}</p>
            : mio && <button type="button" className="profilo-invito" onClick={apriComponi}>Scrivi il tuo motto →</button>}
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
              <b>{rosaPerRuolo(miaSquadra).totale ? `${rosaPerRuolo(miaSquadra).totale} giocatori` : 'da compilare'}</b>
            </div>
            <button type="button" className="bottone-contorno" onClick={() => navigate(`/squadre/${miaSquadra._id}`)}>
              Vai alla squadra
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
          {mio && (
            <button type="button" className="bottone-contorno" onClick={() => setTemaAperto(true)}>
              Cambia squadra
            </button>
          )}
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

      {mio && (<>
      <section className="ritaglio ritaglio-impostazioni">
        <button type="button" className="impostazione" onClick={apriComponi}>
          <PencilSimple size={22} />
          <span>Componi la tua pagina</span>
          <CaretRight size={20} />
        </button>
        <button type="button" className="impostazione" onClick={() => setPinAperto(true)}>
          <Key size={22} />
          <span>Cambia PIN</span>
          <CaretRight size={20} />
        </button>
        <button type="button" className="impostazione" onClick={() => navigate('/regolamento')}>
          <BookOpen size={22} />
          <span>Regolamento e FAQ</span>
          <CaretRight size={20} />
        </button>
        <button type="button" className="bottone-contorno" onClick={logout}>Esci</button>
      </section>

      {puoCancellare(utente) && <NomeLega />}
      </>)}

      <p className="profilo-colophon">
        La Gazzetta dello Sfottò — ogni riferimento a fatti o allenatori reali è puramente voluto.
      </p>

      {mio && (<>
      <Sheet aperto={componi} onChiudi={chiudiComponi} titolo="Componi la tua pagina" grande>
        {componi && bozza && (
          <ComponiProfilo bozza={bozza} onCambia={setBozza} onFatto={chiudiComponi} />
        )}
      </Sheet>

      <Sheet aperto={temaAperto} onChiudi={() => setTemaAperto(false)} titolo="Il cuore" sottotitolo={`Ora: ${tema.nome}`}>
        <p className="tema-nota">La squadra che tifi ridipinge tutta la Gazzetta.</p>
        <CaroselloTema valore={temaId} onSceglie={cambiaTema} />
      </Sheet>

      <Sheet aperto={pinAperto} onChiudi={() => setPinAperto(false)} titolo="Cambia PIN">
        {pinAperto && <CambiaPin onFatto={() => setPinAperto(false)} />}
      </Sheet>
      </>)}

    </div>
  );
}
