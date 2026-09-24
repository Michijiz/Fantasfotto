import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, impostaToken, tokenCorrente, EVENTO_SESSIONE_SCADUTA } from '../api/client';

const AuthContext = createContext(null);

// Tempo minimo (ms) in cui lo splash resta a schermo, anche se il controllo
// del token è istantaneo (utente non loggato: non c'è nulla da verificare col
// server, quindi senza questo minimo lo splash sparirebbe prima di finire
// l'animazione).
const SPLASH_DURATA_MINIMA = 1400;

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  // true quando il server ha buttato fuori una sessione che c'era: la schermata di
  // accesso lo dice ("La tua tessera è scaduta: rientra") invece di ripartire muta.
  const [sessioneScaduta, setSessioneScaduta] = useState(false);

  useEffect(() => {
    const inizio = Date.now();
    let annullato = false;
    let timer = null;

    const carica = async () => {
      let utenteTrovato = null;

      if (tokenCorrente()) {
        try {
          const { utente } = await api.get('/api/auth/me');
          utenteTrovato = utente;
        } catch {
          impostaToken(null);
        }
      }

      const trascorso = Date.now() - inizio;
      const attesa = Math.max(0, SPLASH_DURATA_MINIMA - trascorso);

      timer = setTimeout(() => {
        if (annullato) return;
        setUtente(utenteTrovato);
        setCaricamento(false);
      }, attesa);
    };

    carica();

    // Sotto StrictMode l'effetto gira due volte: senza cleanup restavano in piedi
    // due timer, entrambi pronti a scrivere lo stato.
    return () => { annullato = true; clearTimeout(timer); };
  }, []);

  const login = useCallback(async (username, pin) => {
    const { token, utente } = await api.post('/api/auth/login', { username, pin });
    impostaToken(token);
    setSessioneScaduta(false);
    setUtente(utente);
    return utente;
  }, []);

  const registrati = useCallback(async (dati) => {
    const { token, utente } = await api.post('/api/auth/registrati', dati);
    impostaToken(token);
    setSessioneScaduta(false);
    setUtente(utente);
    return utente;
  }, []);

  // Il client butta il token appena il server risponde 401 su una sessione che
  // c'era: qui si chiude il cerchio riportando l'app alla schermata di accesso.
  useEffect(() => {
    const scaduta = () => { setUtente(null); setSessioneScaduta(true); };
    window.addEventListener(EVENTO_SESSIONE_SCADUTA, scaduta);
    return () => window.removeEventListener(EVENTO_SESSIONE_SCADUTA, scaduta);
  }, []);

  const logout = useCallback(() => {
    impostaToken(null);
    setUtente(null);
  }, []);

  return (
    <AuthContext.Provider value={{ utente, setUtente, caricamento, sessioneScaduta, login, registrati, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>');
  return ctx;
}
