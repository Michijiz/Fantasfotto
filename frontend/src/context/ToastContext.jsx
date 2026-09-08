import { createContext, useContext, useState, useCallback, useRef } from 'react';

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

  return (
    <ToastContext.Provider value={mostraToast}>
      {children}
      <div className={`toast${visibile ? ' show' : ''}`}>{messaggio}</div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast va usato dentro <ToastProvider>');
  return ctx;
}
