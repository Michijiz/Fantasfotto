import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Login() {
  const { utente, login, registrati } = useAuth();
  const [tab, setTab] = useState('login');
  const [squadre, setSquadre] = useState([]);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regNome, setRegNome] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regSquadra, setRegSquadra] = useState('');
  const [regCodice, setRegCodice] = useState('');

  useEffect(() => {
    api.get('/api/squadre').then(({ squadre }) => setSquadre(squadre)).catch(() => {});
  }, []);

  if (utente) return <Navigate to="/" replace />;

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
        codiceInvito: regCodice
      });
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="masthead" style={{ padding: '0 0 12px', borderBottom: '5px solid var(--rule)', marginBottom: 20 }}>
        <div className="kicker">Organo ufficiale (non richiesto) della Lega</div>
        <h1>La Gazzetta dello Sfottò</h1>
      </div>

      <div className="auth-toggle tabs">
        <div className={`tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Accedi</div>
        <div className={`tab${tab === 'registrati' ? ' active' : ''}`} onClick={() => setTab('registrati')}>Iscriviti alla Lega</div>
      </div>

      {tab === 'login' ? (
        <form className="card" onSubmit={submitLogin}>
          <label>Username</label>
          <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="il tuo username" />
          <label>PIN</label>
          <input type="password" inputMode="numeric" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="4-6 cifre" />
          <button className="primary" type="submit" disabled={caricando}>Entra in redazione</button>
          {errore && <div className="errore-msg">{errore}</div>}
        </form>
      ) : (
        <form className="card" onSubmit={submitRegistrati}>
          <label>Username</label>
          <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="scegline uno" />
          <label>Nome da mostrare</label>
          <input type="text" value={regNome} onChange={(e) => setRegNome(e.target.value)} placeholder="es. Michelangelo" />
          <label>PIN (4-6 cifre)</label>
          <input type="password" inputMode="numeric" value={regPin} onChange={(e) => setRegPin(e.target.value)} placeholder="il tuo PIN segreto" />
          <label>Squadra</label>
          <select value={regSquadra} onChange={(e) => setRegSquadra(e.target.value)}>
            <option value="">{squadre.length ? 'Seleziona...' : 'Caricamento squadre...'}</option>
            {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
          <label>Codice invito della Lega</label>
          <input type="text" value={regCodice} onChange={(e) => setRegCodice(e.target.value)} placeholder="chiedilo al direttore" />
          <button className="primary" type="submit" disabled={caricando}>Iscriviti</button>
          {errore && <div className="errore-msg">{errore}</div>}
        </form>
      )}
    </div>
  );
}
