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

// L'iscrizione è in tre passi, così nessuna schermata è un muro di campi:
//   1 · Ingresso      il codice invito (verificato subito, prima di far compilare altro)
//   2 · Generalità    username, nome, PIN (con conferma), squadra e mestiere
//   3 · Personalizza  tema e avatar, facoltativi: si possono cambiare dopo
const PASSI = ['Ingresso', 'Generalità', 'Personalizza'];

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

function Progresso({ passo }) {
  return (
    <ol className="passi" aria-label={`Passo ${passo} di ${PASSI.length}`}>
      {PASSI.map((nome, i) => {
        const n = i + 1;
        const stato = n < passo ? 'fatto' : n === passo ? 'attuale' : '';
        return (
          <li key={nome} className={stato} aria-current={n === passo ? 'step' : undefined}>
            <span className="barra" aria-hidden="true" />
            <span className="nome">{n}. {nome}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Dove riportare chi riceve un errore dal server al momento dell'iscrizione: se è
// sbagliato il codice si torna al primo passo, se è colpa dei dati (username già
// preso, PIN, squadra, codice redazione) al secondo. Rete e errori del server
// lasciano dove si è: non c'è niente da correggere.
function passoDelloErrore(err, passoCorrente) {
  if (err.status === 403 && /invito/i.test(err.message)) return 1;
  if ([400, 403, 409].includes(err.status)) return 2;
  return passoCorrente;
}

function etichettaSquadra(s) {
  const n = s.allenatoriCount || 0;
  if (n === 0) return `${s.nome} · libera`;
  return `${s.nome} · già con ${n} ${n === 1 ? 'allenatore' : 'allenatori'}`;
}

export default function Login() {
  const { utente, sessioneScaduta, login, registrati } = useAuth();
  const { temaId, cambiaTema } = useTema();
  const mostraToast = useToast();
  const [tab, setTab] = useState('login');
  const [passo, setPasso] = useState(1);
  const [squadre, setSquadre] = useState([]);
  const [caricandoSquadre, setCaricandoSquadre] = useState(true);
  const [erroreSquadre, setErroreSquadre] = useState(false);
  const [tentativoSquadre, setTentativoSquadre] = useState(0);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regNome, setRegNome] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPin2, setRegPin2] = useState('');
  const [mostraPin, setMostraPin] = useState(false);
  const [regSquadra, setRegSquadra] = useState('');
  const [regCodice, setRegCodice] = useState('');
  const [regRuolo, setRegRuolo] = useState('giocatore');
  const [regCodiceRedazione, setRegCodiceRedazione] = useState('');
  // Vuoto finché non si tocca il carosello degli avatar: fino ad allora segue la
  // squadra tifata, così chi cambia tema si ritrova anche l'avatar coerente.
  const [regAvatar, setRegAvatar] = useState('');

  // Una richiesta fallita non è "nessuna squadra in lega": si distingue, e si può
  // riprovare (il server serverless a freddo può rispondere male la prima volta).
  useEffect(() => {
    let attivo = true;
    api.get('/api/squadre')
      .then(({ squadre }) => { if (attivo) setSquadre(squadre); })
      .catch(() => { if (attivo) setErroreSquadre(true); })
      .finally(() => { if (attivo) setCaricandoSquadre(false); });
    return () => { attivo = false; };
  }, [tentativoSquadre]);

  const riprovaSquadre = () => {
    setErroreSquadre(false);
    setCaricandoSquadre(true);
    setTentativoSquadre((t) => t + 1);
  };

  // Cambiando passo si riparte dall'alto: il modulo è più corto dello schermo
  // solo al primo passo, e restare a metà pagina disorienta.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('.auth-screen')?.scrollTo?.(0, 0);
  }, [passo, tab]);

  if (utente) return <Navigate to="/" replace />;

  const cambiaTab = (nuovo) => {
    if (nuovo === tab) return;
    setErrore('');
    setTab(nuovo);
  };

  const vaiAlPasso = (n) => {
    setErrore('');
    setPasso(n);
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

  // Passo 1: il codice si controlla subito, prima di far compilare il resto.
  const submitIngresso = async (e) => {
    e.preventDefault();
    setErrore('');
    const codice = regCodice.trim();
    if (!codice) {
      setErrore('Serve il codice invito: chiedilo al direttore');
      return;
    }
    setCaricando(true);
    try {
      await api.post('/api/auth/verifica-invito', { codiceInvito: codice });
      vaiAlPasso(2);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricando(false);
    }
  };

  // Passo 2: tutti i controlli che si possono fare senza il server, con il
  // messaggio che dice cosa correggere (non un generico "manca qualcosa").
  const submitGeneralita = (e) => {
    e.preventDefault();
    setErrore('');
    if (!/^\S{3,20}$/.test(regUsername)) {
      setErrore('Username: da 3 a 20 caratteri, senza spazi');
      return;
    }
    if (!regNome.trim()) {
      setErrore('Come ti chiamiamo? Serve un nome da mostrare');
      return;
    }
    if (!/^\d{4,6}$/.test(regPin)) {
      setErrore('Il PIN va da 4 a 6 cifre, solo numeri');
      return;
    }
    if (regPin !== regPin2) {
      setErrore('I due PIN non coincidono: riscrivili con calma');
      return;
    }
    if (!regSquadra) {
      setErrore('Scegli la tua squadra: la lega è fatta di squadre');
      return;
    }
    vaiAlPasso(3);
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
      const dove = passoDelloErrore(err, 3);
      setPasso(dove);
      setErrore(err.message);
      setCaricando(false);
    }
  };

  const squadraScelta = squadre.find((s) => s._id === regSquadra);
  const occupate = squadraScelta?.allenatoriCount || 0;

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
            {errore && <div className="errore-msg" role="alert">{errore}</div>}
            <p className="nota-accesso">PIN dimenticato? Chiedilo al direttore, con umiltà.</p>
          </section>
          <p className="colophon">La Gazzetta dello Sfottò — ogni riferimento a fatti o allenatori reali è puramente voluto.</p>
        </form>
      ) : (
        <>
          <Progresso passo={passo} />

          {passo === 1 && (
            <form key="passo-1" className="ritagli tab-content" onSubmit={submitIngresso} noValidate>
              <section className="ritaglio">
                <Occhiello>Il lasciapassare</Occhiello>
                <h1 className="ritaglio-titolo">Hai il codice invito?</h1>
                <p className="nota-accesso">
                  La Gazzetta è riservata agli abbonati della lega. Il codice te lo dà il direttore:
                  senza, la redazione resta chiusa.
                </p>
                <Campo id="r-invito" etichetta="Codice invito della lega">
                  <input id="r-invito" type="text" autoCapitalize="characters" autoComplete="off" value={regCodice} onChange={(e) => setRegCodice(e.target.value)} placeholder="chiedilo al direttore" />
                </Campo>
                <button className="bottone-grande" type="submit" disabled={caricando}>
                  {caricando ? 'Controllo…' : 'Avanti'}
                </button>
                {errore && <div className="errore-msg" role="alert">{errore}</div>}
              </section>
              <p className="colophon">Ci vogliono due minuti. Tre passi, poi si gioca.</p>
            </form>
          )}

          {passo === 2 && (
            <form key="passo-2" className="ritagli tab-content" onSubmit={submitGeneralita} noValidate>
              <section className="ritaglio">
                <Occhiello>Le generalità</Occhiello>
                <Campo id="r-username" etichetta="Username" nota="minuscole, senza spazi">
                  <input
                    id="r-username" type="text" autoComplete="username" autoCapitalize="none" maxLength={20}
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="scegline uno"
                  />
                </Campo>
                <Campo id="r-nome" etichetta="Nome da mostrare" nota="lo vedono tutti">
                  <input id="r-nome" type="text" className="campo-anton" maxLength={30} value={regNome} onChange={(e) => setRegNome(e.target.value)} placeholder="es. Michelangelo" />
                </Campo>
                <Campo id="r-pin" etichetta="PIN" nota="4-6 cifre">
                  <input id="r-pin" type={mostraPin ? 'text' : 'password'} inputMode="numeric" autoComplete="new-password" maxLength={6} value={regPin} onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))} placeholder="il tuo PIN segreto" />
                </Campo>
                <Campo id="r-pin2" etichetta="Ripeti il PIN">
                  <input id="r-pin2" type={mostraPin ? 'text' : 'password'} inputMode="numeric" autoComplete="new-password" maxLength={6} value={regPin2} onChange={(e) => setRegPin2(e.target.value.replace(/\D/g, ''))} placeholder="ancora una volta" />
                </Campo>
                <button type="button" className="bottone-link" onClick={() => setMostraPin((v) => !v)}>
                  {mostraPin ? 'Nascondi il PIN' : 'Mostra il PIN'}
                </button>
              </section>

              <section className="ritaglio">
                <Occhiello>La squadra</Occhiello>
                {caricandoSquadre ? (
                  <div className="skeleton-line w-60" />
                ) : erroreSquadre ? (
                  <>
                    <p className="ritaglio-vuoto" role="alert">
                      Non riesco a caricare le squadre: il server è lento o la connessione è saltata.
                    </p>
                    <button type="button" className="bottone-contorno" onClick={riprovaSquadre}>
                      Riprova
                    </button>
                  </>
                ) : squadre.length === 0 ? (
                  <p className="ritaglio-vuoto">Nessuna squadra in lega: avvisa l&apos;amministratore.</p>
                ) : (
                  <>
                    <div className="scelta-squadra">
                      {squadraScelta
                        ? <Stemma src={squadraScelta.stemma} nome={squadraScelta.nome} size={44} />
                        : <span className="stemma-vuoto" aria-hidden="true" />}
                      <select aria-label="La tua squadra" value={regSquadra} onChange={(e) => setRegSquadra(e.target.value)}>
                        <option value="">Scegli la tua squadra</option>
                        {squadre.map((s) => <option key={s._id} value={s._id}>{etichettaSquadra(s)}</option>)}
                      </select>
                    </div>
                    {squadraScelta && (
                      <p className="campo-nota">
                        {occupate === 0
                          ? 'Libera: la panchina è tutta tua.'
                          : `Ha già ${occupate === 1 ? 'un allenatore' : `${occupate} allenatori`}: se è la squadra giusta, vi dividerete la panchina.`}
                      </p>
                    )}
                    <p className="campo-nota">Attenzione: la squadra non si cambia dopo l&apos;iscrizione.</p>
                  </>
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
                <div className="passo-azioni">
                  <button type="button" className="bottone-contorno" onClick={() => vaiAlPasso(1)}>Indietro</button>
                  <button className="bottone-grande" type="submit" disabled={caricandoSquadre || erroreSquadre}>Avanti</button>
                </div>
                {errore && <div className="errore-msg" role="alert">{errore}</div>}
              </section>
            </form>
          )}

          {passo === 3 && (
            <form key="passo-3" className="ritagli tab-content" onSubmit={submitRegistrati} noValidate>
              <section className="ritaglio">
                <Occhiello>La fede</Occhiello>
                <h1 className="ritaglio-titolo medio">La squadra che tifi davvero</h1>
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
                <p className="campo-nota centro">Niente di tutto questo è definitivo: lo cambi dal profilo.</p>
                <div className="passo-azioni">
                  <button type="button" className="bottone-contorno" onClick={() => vaiAlPasso(2)} disabled={caricando}>Indietro</button>
                  <button className="bottone-grande" type="submit" disabled={caricando}>
                    {caricando ? 'Ti stampiamo la tessera…' : 'Iscriviti'}
                  </button>
                </div>
                {errore && <div className="errore-msg" role="alert">{errore}</div>}
              </section>
              <p className="colophon">La Gazzetta dello Sfottò — ogni riferimento a fatti o allenatori reali è puramente voluto.</p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
