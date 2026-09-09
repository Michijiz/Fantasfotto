import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, impostaToken, tokenCorrente } from '../api/client';

const AuthContext = createContext(null);

// Tempo minimo (ms) in cui lo splash resta a schermo, anche se il controllo
// del token è istantaneo (utente non loggato: non c'è nulla da verificare col
// server, quindi senza questo minimo lo splash sparirebbe prima di finire
// l'animazione).
const SPLASH_DURATA_MINIMA = 1400;

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    const inizio = Date.now();

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

      setTimeout(() => {
        setUtente(utenteTrovato);
        setCaricamento(false);
      }, attesa);
    };

    carica();
  }, []);

  const login = useCallback(async (username, pin) => {
    const { token, utente } = await api.post('/api/auth/login', { username, pin });
    impostaToken(token);
    setUtente(utente);
  }, []);

  const registrati = useCallback(async (dati) => {
    const { token, utente } = await api.post('/api/auth/registrati', dati);
    impostaToken(token);
    setUtente(utente);
  }, []);

  const logout = useCallback(() => {
    impostaToken(null);
    setUtente(null);
  }, []);

  return (
    <AuthContext.Provider value={{ utente, setUtente, caricamento, login, registrati, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>');
  return ctx;
}
