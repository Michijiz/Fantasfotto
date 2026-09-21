import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { applicaTema, temaSalvato, temaPerId } from '../temi';

// Il tema colore dell'app. Vive in tre posti, in quest'ordine di autorità:
//   1. l'utente sul server (segue l'account su qualunque dispositivo)
//   2. localStorage (serve ad applicare il tema giusto prima del primo paint,
//      quando /api/auth/me non ha ancora risposto: senza, l'app lampeggerebbe
//      rosanera a ogni avvio)
//   3. il default 'palermo'
const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const { utente, setUtente } = useAuth();
  const [temaId, setTemaId] = useState(() => temaSalvato());
  const ultimoSalvato = useRef(null);

  // Quando l'utente arriva (login o sessione ripristinata) comanda il suo tema.
  useEffect(() => {
    if (!utente?.tema || utente.tema === temaId) return;
    setTemaId(utente.tema);
    applicaTema(utente.tema);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente?.tema]);

  // TemaProvider sta sopra le rotte e non si smonta al logout: senza azzerare il
  // ref, chi accede dopo su quello stesso telefono e sceglie lo stesso tema del
  // precedente non lo salva mai sul proprio profilo.
  useEffect(() => { ultimoSalvato.current = null; }, [utente?.id]);

  const cambiaTema = useCallback(async (id) => {
    const tema = temaPerId(id);
    setTemaId(tema.id);
    applicaTema(tema.id);

    // Da sloggati (schermata di registrazione) il tema resta solo locale: al
    // momento dell'iscrizione viene inviato insieme agli altri campi.
    if (!utente || ultimoSalvato.current === tema.id) return;
    ultimoSalvato.current = tema.id;
    try {
      const { utente: aggiornato } = await api.patch('/api/auth/tema', { tema: tema.id });
      setUtente(aggiornato);
    } catch {
      // Il tema resta applicato lo stesso: la prossima apertura lo rilegge da
      // localStorage, e il salvataggio si ritenta al prossimo cambio.
      ultimoSalvato.current = null;
    }
  }, [utente, setUtente]);

  return (
    <TemaContext.Provider value={{ temaId, tema: temaPerId(temaId), cambiaTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema va usato dentro <TemaProvider>');
  return ctx;
}
