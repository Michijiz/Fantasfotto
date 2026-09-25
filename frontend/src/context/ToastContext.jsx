import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [messaggio, setMessaggio] = useState('');
  const [visibile, setVisibile] = useState(false);
  const timerRef = useRef(null);

  const mostraToast = useCallback((testo) => {
    clearTimeout(timerRef.current);
    setMessaggio(testo);
    setVisibile(true);
    timerRef.current = setTimeout(() => setVisibile(false), 2400);
  }, []);

  // ToastProvider si smonta quando l'app torna allo splash (App.jsx): senza questo
  // il timer pendente chiamava setVisibile su un componente ormai morto.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <ToastContext.Provider value={mostraToast}>
      {children}
      {/* Nel <body>, come i fogli (Sheet): dentro #root finirebbe sotto un foglio
          aperto e gli errori di un modulo non si vedrebbero. */}
      {createPortal(<div className={`toast${visibile ? ' show' : ''}`} role="status">{messaggio}</div>, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast va usato dentro <ToastProvider>');
  return ctx;
}
