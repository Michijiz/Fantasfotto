import { useEffect, useRef, useState } from 'react';
import { useDati } from '../../context/DataContext';
import Masthead from '../ui/Masthead';

export default function AppHeader({ scrollRef, onApriMenu }) {
  const { ultimaEdizione } = useDati();
  const [compatto, setCompatto] = useState(false);
  const ultimoScroll = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setCompatto(el.scrollTop > 60);
      ultimoScroll.current = el.scrollTop;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  return (
    <div className={`app-header${compatto ? ' compatto' : ''}`}>
      <div className="top-row">
        <button className="hamburger" aria-label="Apri profilo" onClick={onApriMenu}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
      <Masthead
        sub={
          <>
            <span>{ultimaEdizione ? `Giornata ${ultimaEdizione.giornataNumero}` : 'Nessuna edizione ancora'}</span>
            <span>Prezzo: la vostra dignità</span>
          </>
        }
      />
    </div>
  );
}
