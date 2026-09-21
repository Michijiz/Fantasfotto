import { useEffect, useRef, useState } from 'react';

// Eliminazione a due tocchi invece di un confirm() di sistema: in PWA standalone
// il dialogo nativo è brutto e su iOS a volte non compare proprio. Il primo tocco
// arma il bottone, il secondo esegue; dopo qualche secondo si disarma da solo, così
// un tocco distratto non lascia un bottone carico in attesa.
export default function BottoneElimina({
  onConferma,
  etichetta = 'Elimina',
  conferma = 'Tocca di nuovo per eliminare',
  className = 'link pericolo'
}) {
  const [armato, setArmato] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const timer = useRef(null);
  const vivo = useRef(true);

  // `vivo` va rimesso a true a ogni montaggio, non solo alla prima volta: sotto
  // StrictMode (e a ogni rimontaggio del sottoalbero) React monta, smonta e
  // rimonta. Con la sola cleanup il flag restava false per sempre e il bottone,
  // dopo un'eliminazione, rimaneva bloccato su "Elimino..." e disabilitato.
  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; clearTimeout(timer.current); };
  }, []);

  const click = async () => {
    if (inCorso) return;

    if (!armato) {
      setArmato(true);
      timer.current = setTimeout(() => vivo.current && setArmato(false), 4000);
      return;
    }

    clearTimeout(timer.current);
    setInCorso(true);
    try {
      await onConferma();
    } finally {
      if (vivo.current) { setInCorso(false); setArmato(false); }
    }
  };

  return (
    <button
      type="button"
      className={`${className}${armato ? ' armato' : ''}`}
      onClick={click}
      disabled={inCorso}
    >
      {inCorso ? 'Elimino...' : armato ? conferma : etichetta}
    </button>
  );
}
