import { useEffect, useState } from 'react';

// "C'è una ristampa della Gazzetta": compare quando il service worker ha appena
// preso il controllo con una versione nuova dell'app. Aggiorna ricarica la pagina.
export default function RistampaBanner() {
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    // Al primo avvio il controller passa da nessuno al primo worker: non è una ristampa.
    let avevaController = Boolean(navigator.serviceWorker.controller);
    const suCambio = () => {
      if (avevaController) setVisibile(true);
      avevaController = true;
    };
    navigator.serviceWorker.addEventListener('controllerchange', suCambio);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', suCambio);
  }, []);

  if (!visibile) return null;
  return (
    <div className="ristampa" role="status">
      <span>C&apos;è una ristampa della Gazzetta</span>
      <button type="button" onClick={() => window.location.reload()}>Aggiorna</button>
    </div>
  );
}
