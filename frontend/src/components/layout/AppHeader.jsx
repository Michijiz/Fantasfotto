import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDati } from '../../context/DataContext';

export default function AppHeader({ scrollRef }) {
  const { utente, logout } = useAuth();
  const { ultimaEdizione } = useDati();
  const [compatto, setCompatto] = useState(false);
  const ultimoScroll = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setCompatto(el.scrollTop > 28);
      ultimoScroll.current = el.scrollTop;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  return (
    <div className={`app-header${compatto ? ' compatto' : ''}`}>
      <div className="top-bar">
        <span>{utente ? `Ciao, ${utente.nomeVisualizzato}` : ''}</span>
        <button onClick={logout}>Esci</button>
      </div>
      <div className="masthead">
        <div className="kicker">Organo ufficiale (non richiesto) della Lega</div>
        <h1>La Gazzetta dello Sfottò</h1>
        <div className="sub">
          <span>{ultimaEdizione ? `Giornata ${ultimaEdizione.giornataNumero}` : 'Nessuna edizione ancora'}</span>
          <span>Prezzo: la vostra dignità</span>
        </div>
      </div>
    </div>
  );
}
