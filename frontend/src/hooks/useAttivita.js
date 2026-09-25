import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

// Le ultime attività della lega (GET /api/attivita). Si rinfrescano da sole ogni
// minuto, ma solo con l'app in primo piano: in background non serve tenere il
// telefono sveglio per un banner.
const OGNI_MS = 60 * 1000;

export default function useAttivita(limite = 20) {
  const [attivita, setAttivita] = useState(null);

  const carica = useCallback(async () => {
    try {
      const { attivita: righe } = await api.get(`/api/attivita?limite=${limite}`);
      setAttivita(righe || []);
    } catch {
      // Il diario è un contorno: se non risponde si tiene quello che c'era.
      setAttivita((prima) => prima || []);
    }
  }, [limite]);

  useEffect(() => {
    // Lo stato si scrive dopo la risposta del server, non durante l'effetto.
    // oxlint-disable-next-line react/set-state-in-effect
    carica();
    const timer = setInterval(() => { if (!document.hidden) carica(); }, OGNI_MS);
    const suVisibile = () => { if (!document.hidden) carica(); };
    document.addEventListener('visibilitychange', suVisibile);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', suVisibile); };
  }, [carica]);

  return { attivita, ricarica: carica };
}
