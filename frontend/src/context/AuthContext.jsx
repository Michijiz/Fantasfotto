import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, impostaToken, tokenCorrente } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    const carica = async () => {
      if (!tokenCorrente()) {
        setCaricamento(false);
        return;
      }
      try {
        const { utente } = await api.get('/api/auth/me');
        setUtente(utente);
      } catch {
        impostaToken(null);
      } finally {
        setCaricamento(false);
      }
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
