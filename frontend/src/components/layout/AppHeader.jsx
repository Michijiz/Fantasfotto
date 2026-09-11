import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDati } from '../../context/DataContext';
import Masthead from '../ui/Masthead';

// Soglie di compattazione: si chiude oltre 60px di scroll e si riapre solo sotto
// i 24px. La differenza evita che la testata lampeggi quando lo scroll si ferma
// vicino alla soglia (o nel rimbalzo elastico di iOS).
const SOGLIA_COMPATTA = 60;
const SOGLIA_RIAPRI = 24;

export default function AppHeader({ scrollRef, onApriMenu }) {
  const { ultimaEdizione } = useDati();
  const [compatto, setCompatto] = useState(false);
  const headerRef = useRef(null);
  const altezzaAperta = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.scrollTop;
      setCompatto((era) => (era ? top > SOGLIA_RIAPRI : top > SOGLIA_COMPATTA));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  // La testata sta sopra il contenuto: il contenuto deve lasciarle spazio in alto
  // pari alla sua altezza da aperta. Si misura solo a testata aperta e si accettano
  // solo aumenti (caricamento dei font), così l'animazione di apertura/chiusura non
  // muove mai il contenuto. Al cambio di dimensioni (rotazione) si rimisura.
  // La variabile va sul contenitore comune (.area-scroll) e .contenuto la eredita:
  // qui il ref dello scroll non è ancora collegato, perché .contenuto viene dopo.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const contenitore = header?.parentElement;
    if (!header || !contenitore) return;

    const misura = () => {
      if (header.classList.contains('compatto')) return;
      const altezza = header.offsetHeight;
      if (altezza <= altezzaAperta.current) return;
      altezzaAperta.current = altezza;
      contenitore.style.setProperty('--header-h', `${altezza}px`);
    };

    const onResize = () => {
      altezzaAperta.current = 0;
      misura();
    };

    misura();
    const osservatore = new ResizeObserver(misura);
    osservatore.observe(header);
    window.addEventListener('resize', onResize);
    return () => {
      osservatore.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div ref={headerRef} className={`app-header${compatto ? ' compatto' : ''}`}>
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
