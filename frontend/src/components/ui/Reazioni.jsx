import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import '../../styles/reazioni.css';

// Quattro timbri sotto l'edizione: tocca per metterne uno, tocca di nuovo per
// toglierlo. Se il server non risponde la riga sparisce, non rompe la pagina.
export default function Reazioni({ edizioneId }) {
  const [dati, setDati] = useState(null);

  const carica = useCallback(async () => {
    try {
      setDati(await api.get(`/api/edizioni/${edizioneId}/reazioni`));
    } catch {
      setDati(null);
    }
  }, [edizioneId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDati(null);
    carica();
  }, [carica]);

  const alterna = async (emoji) => {
    try {
      setDati(await api.post(`/api/edizioni/${edizioneId}/reazioni`, { emoji }));
    } catch {
      carica();
    }
  };

  if (!dati) return null;
  return (
    <div className="reazioni" role="group" aria-label="Reazioni all'edizione">
      {dati.emoji.map((e) => (
        <button
          key={e}
          type="button"
          className={`reazione${dati.mie.includes(e) ? ' mia' : ''}`}
          aria-pressed={dati.mie.includes(e)}
          onClick={() => alterna(e)}
        >
          <span className="emoji" aria-hidden="true">{e}</span>
          <b>{dati.conteggi[e] || 0}</b>
        </button>
      ))}
    </div>
  );
}
