import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import Masthead from '../components/ui/Masthead';
import Stemma from '../components/ui/Stemma';
import CaroselloTema from '../components/ui/CaroselloTema';
import CaroselloAvatar from '../components/ui/CaroselloAvatar';
import { RUOLI_ISCRIZIONE } from '../ruoli';
import { avatarDefault } from '../avatar';
import '../styles/accesso.css';

function Occhiello({ children }) {
  return (
    <div className="ritaglio-occhiello">
      <span>{children}</span>
      <span className="filo" />
    </div>
  );
}

function Campo({ id, etichetta, nota, children }) {
  return (
    <div className="campo">
      <label htmlFor={id} className="campo-etichetta">
        <span>{etichetta}</span>
        {nota && <span className="campo-nota-dx">{nota}</span>}
      </label>
      {children}
    </div>
  );
}

export default function Login() {
  const { utente, sessioneScaduta, login, registrati } = useAuth();
  const { temaId, cambiaTema } = useTema();
  const mostraToast = useToast();
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
  // Vuoto finché non si tocca il carosello degli avatar: fino ad allora segue la
  // squadra tifata, così chi cambia tema si ritrova anche l'avatar coerente.
  const [regAvatar, setRegAvatar] = useState('');

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
    if (!loginUsername.trim() || !loginPin.trim()) {
      setErrore('Servono username e PIN: la redazione non apre agli sconosciuti');
      return;
    }
    setCaricando(true);
    try {
      const entrato = await login(loginUsername, loginPin);
      mostraToast(`Bentornato, ${entrato.nomeVisualizzato}!`);
    } catch (err) {
      setErrore(err.message);
      setCaricando(false);
    }
  };

  const submitRegistrati = async (e) => {
    e.preventDefault();
    setErrore('');
    setCaricando(true);
    try {
      const nuovo = await registrati({
        username: regUsername,
        nomeVisualizzato: regNome,
        pin: regPin,
        squadraId: regSquadra,
        codiceInvito: regCodice,
        tema: temaId,
        avatar: regAvatar || avatarDefault(temaId),
        ruolo: regRuolo,
        codiceRedazione: regRuolo === 'redattore' ? regCodiceRedazione : undefined
      });
      mostraToast(`Benvenuto in redazione, ${nuovo.nomeVisualizzato}!`);
    } catch (err) {
      setErrore(err.message);
      setCaricando(false);
    }
  };

  const squadraScelta = squadre.find((s) => s._id === regSquadra);

  return (
    <div className="auth-screen accesso">
      <Masthead
        className="masthead-auth"
        sub={
          <>
            <span>Tessera: gratis</span>
            <span>Dignità: non rimborsabile</span>
          </>
        }
      />

      <div className="auth-toggle tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'login'} className={`tab${tab === 'login' ? ' active' : ''}`} onClick={() => cambiaTab('login')}>Accedi</button>
        <button type="button" role="tab" aria-selected={tab === 'registrati'} className={`tab${tab === 'registrati' ? ' active' : ''}`} onClick={() => cambiaTab('registrati')}>Iscriviti</button>
      </div>

      {tab === 'login' ? (
        <form key="login" className="ritagli tab-content" onSubmit={submitLogin} noValidate>
          {sessioneScaduta && <div className="avviso-accesso">La tua tessera è scaduta: rientra</div>}
          <section className="ritaglio">
            <Occhiello>Entra in redazione</Occhiello>
            <h1 className="ritaglio-titolo">Bentornato in redazione</h1>
            <Campo id="l-username" etichetta="Username">
              <input id="l-username" type="text" autoComplete="username" autoCapitalize="none" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="il tuo username" />
            </Campo>
            <Campo id="l-pin" etichetta="PIN">
              <input id="l-pin" type="password" inputMode="numeric" autoComplete="current-password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="4-6 cifre" />
            </Campo>
            <button className="bottone-grande" type="submit" disabled={caricando}>
              {caricando ? 'Apro la redazione…' : 'Entra in redazione'}
            </button>
            {errore && <div className="errore-msg">{errore}</div>}
            <p className="nota-accesso">PIN dimenticato? Chiedilo al direttore, con umiltà.</p>
          </section>
          <p className="colophon">La Gazzetta dello Sfottò — ogni riferimento a fatti o allenatori reali è puramente voluto.</p>
        </form>
      ) : (
        <form key="registrati" className="ritagli tab-content" onSubmit={submitRegistrati} noValidate>
          <section className="ritaglio">
            <Occhiello>Le generalità</Occhiello>
            <Campo id="r-username" etichetta="Username" nota="minuscole, senza spazi">
              <input id="r-username" type="text" autoComplete="username" autoCapitalize="none" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="scegline uno" />
            </Campo>
            <Campo id="r-nome" etichetta="Nome da mostrare">
              <input id="r-nome" type="text" className="campo-anton" value={regNome} onChange={(e) => setRegNome(e.target.value)} placeholder="es. Michelangelo" />
            </Campo>
            <Campo id="r-pin" etichetta="PIN" nota="4-6 cifre">
              <input id="r-pin" type="password" inputMode="numeric" autoComplete="new-password" value={regPin} onChange={(e) => setRegPin(e.target.value)} placeholder="il tuo PIN segreto" />
            </Campo>
          </section>

          <section className="ritaglio">
            <Occhiello>La squadra</Occhiello>
            {caricandoSquadre ? (
              <div className="skeleton-line w-60" />
            ) : squadre.length === 0 ? (
              <p className="ritaglio-vuoto">Nessuna squadra in lega: avvisa l&apos;amministratore.</p>
            ) : (
              <div className="scelta-squadra">
                {squadraScelta
                  ? <Stemma src={squadraScelta.stemma} nome={squadraScelta.nome} size={44} />
                  : <span className="stemma-vuoto" aria-hidden="true" />}
                <select aria-label="La tua squadra" value={regSquadra} onChange={(e) => setRegSquadra(e.target.value)}>
                  <option value="">Scegli la tua squadra</option>
                  {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
                </select>
              </div>
            )}
          </section>

          <section className="ritaglio">
            <Occhiello>Il mestiere</Occhiello>
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
              <Campo id="r-codice-redazione" etichetta="Codice della redazione" nota="solo se la lega ne ha impostato uno">
                <input id="r-codice-redazione" type="text" value={regCodiceRedazione} onChange={(e) => setRegCodiceRedazione(e.target.value)} placeholder="facoltativo" />
              </Campo>
            )}
          </section>

          <section className="ritaglio">
            <Occhiello>La fede</Occhiello>
            <CaroselloTema valore={temaId} onSceglie={cambiaTema} />
            <p className="campo-nota centro">Colora tutta la tua Gazzetta. Si cambia quando vuoi.</p>
          </section>

          <section className="ritaglio">
            <Occhiello>La faccia</Occhiello>
            <CaroselloAvatar
              valore={regAvatar || avatarDefault(temaId)}
              onSceglie={setRegAvatar}
              toccato={Boolean(regAvatar)}
            />
          </section>

          <section className="ritaglio">
            <Occhiello>Il lasciapassare</Occhiello>
            <Campo id="r-invito" etichetta="Codice invito della lega">
              <input id="r-invito" type="text" value={regCodice} onChange={(e) => setRegCodice(e.target.value)} placeholder="chiedilo al direttore" />
            </Campo>
            <button className="bottone-grande" type="submit" disabled={caricando || caricandoSquadre}>
              {caricando ? 'Ti stampiamo la tessera…' : 'Iscriviti'}
            </button>
            {errore && <div className="errore-msg">{errore}</div>}
          </section>
          <p className="colophon">La Gazzetta dello Sfottò — ogni riferimento a fatti o allenatori reali è puramente voluto.</p>
        </form>
      )}
    </div>
  );
}
