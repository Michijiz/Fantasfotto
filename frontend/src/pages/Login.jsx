import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';
import { api } from '../api/client';
import Masthead from '../components/ui/Masthead';
import SelettoreTema from '../components/ui/SelettoreTema';
import { RUOLI_ISCRIZIONE } from '../ruoli';

export default function Login() {
  const { utente, login, registrati } = useAuth();
  const { temaId, cambiaTema } = useTema();
  const [tab, setTab] = useState('login');
  const [squadre, setSquadre] = useState([]);
  const [caricandoSquadre, setCaricandoSquadre] = useState(true);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regNome, setRegNome] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regSquadra, setRegSquadra] = useState('');
  const [regCodice, setRegCodice] = useState('');
  const [regRuolo, setRegRuolo] = useState('giocatore');
  const [regCodiceRedazione, setRegCodiceRedazione] = useState('');

  useEffect(() => {
    api.get('/api/squadre')
      .then(({ squadre }) => setSquadre(squadre))
      .catch(() => {})
      .finally(() => setCaricandoSquadre(false));
  }, []);

  if (utente) return <Navigate to="/" replace />;

  const cambiaTab = (nuovo) => {
    if (nuovo === tab) return;
    setErrore('');
    setTab(nuovo);
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setErrore('');
    setCaricando(true);
    try {
      await login(loginUsername, loginPin);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricando(false);
    }
  };

  const submitRegistrati = async (e) => {
    e.preventDefault();
    setErrore('');
    setCaricando(true);
    try {
      await registrati({
        username: regUsername,
        nomeVisualizzato: regNome,
        pin: regPin,
        squadraId: regSquadra,
        codiceInvito: regCodice,
        tema: temaId,
        ruolo: regRuolo,
        codiceRedazione: regRuolo === 'redattore' ? regCodiceRedazione : undefined
      });
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div className="auth-screen">
      <Masthead
        className="masthead-auth"
        sub={
          <>
            <span>Ingresso riservato agli abbonati</span>
            <span>Tessera: gratis. Dignità: non rimborsabile.</span>
          </>
        }
      />

      {/* Bottoni veri (non div): si raggiungono da tastiera e ricevono le regole
          di tocco comuni a tutti i comandi (global.css). */}
      <div className="auth-toggle tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'login'} className={`tab${tab === 'login' ? ' active' : ''}`} onClick={() => cambiaTab('login')}>Accedi</button>
        <button type="button" role="tab" aria-selected={tab === 'registrati'} className={`tab${tab === 'registrati' ? ' active' : ''}`} onClick={() => cambiaTab('registrati')}>Iscriviti alla Lega</button>
      </div>

      {tab === 'login' ? (
        <form key="login" className="card tab-content" onSubmit={submitLogin}>
          <label>Username</label>
          <input type="text" autoComplete="username" autoCapitalize="none" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="il tuo username" />
          <label>PIN</label>
          <input type="password" inputMode="numeric" autoComplete="current-password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="4-6 cifre" />
          <button className="primary" type="submit" disabled={caricando}>Entra in redazione</button>
          {errore && <div className="errore-msg">{errore}</div>}
        </form>
      ) : (
        <form key="registrati" className="card tab-content" onSubmit={submitRegistrati}>
          <label>Username</label>
          <input type="text" autoComplete="username" autoCapitalize="none" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="scegline uno" />
          <label>Nome da mostrare</label>
          <input type="text" value={regNome} onChange={(e) => setRegNome(e.target.value)} placeholder="es. Michelangelo" />
          <label>PIN (4-6 cifre)</label>
          <input type="password" inputMode="numeric" autoComplete="new-password" value={regPin} onChange={(e) => setRegPin(e.target.value)} placeholder="il tuo PIN segreto" />
          <label>Squadra</label>
          {caricandoSquadre ? (
            <div className="skeleton-line w-60" />
          ) : (
            <select value={regSquadra} onChange={(e) => setRegSquadra(e.target.value)} disabled={squadre.length === 0}>
              <option value="">{squadre.length ? 'Seleziona...' : 'Nessuna squadra disponibile'}</option>
              {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
            </select>
          )}
          {/* Il ruolo decide cosa si può fare in redazione: il giocatore legge,
              gioca la schedina e vota; il redattore in più compila la giornata e
              manda in stampa l'edizione. */}
          <label>Cosa vieni a fare</label>
          <div className="ruolo-scelta">
            {RUOLI_ISCRIZIONE.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`ruolo-carta${regRuolo === r.id ? ' scelto' : ''}`}
                onClick={() => setRegRuolo(r.id)}
                aria-pressed={regRuolo === r.id}
              >
                <span className="nome">{r.nome}</span>
                <span className="descrizione">{r.descrizione}</span>
              </button>
            ))}
          </div>
          {regRuolo === 'redattore' && (
            <>
              <label>Codice della redazione</label>
              <p className="tema-nota">Solo se la tua lega ne ha impostato uno. Altrimenti lascia vuoto.</p>
              <input
                type="text"
                value={regCodiceRedazione}
                onChange={(e) => setRegCodiceRedazione(e.target.value)}
                placeholder="facoltativo"
              />
            </>
          )}

          {/* La squadra di Serie A tifata decide i colori dell'app: la si sceglie
              qui e l'anteprima è immediata, il tema cambia mentre si tocca. */}
          <label>Per chi tifi in Serie A</label>
          <p className="tema-nota">Decide i colori della tua Gazzetta. Si cambia quando vuoi dal menù.</p>
          <SelettoreTema valore={temaId} onSceglie={cambiaTema} />

          <label>Codice invito della Lega</label>
          <input type="text" value={regCodice} onChange={(e) => setRegCodice(e.target.value)} placeholder="chiedilo al direttore" />
          <button className="primary" type="submit" disabled={caricando || caricandoSquadre}>Iscriviti</button>
          {errore && <div className="errore-msg">{errore}</div>}
        </form>
      )}
    </div>
  );
}
