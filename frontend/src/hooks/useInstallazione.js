import { useEffect, useState } from 'react';

// Installazione dell'app sulla home. Chrome/Android manda `beforeinstallprompt`:
// lo teniamo da parte (una volta, a livello di modulo) così lo possono usare sia
// il banner sia la voce del Menù. Su iPhone l'evento non esiste: si mostrano le
// istruzioni per "Aggiungi alla schermata Home".
let eventoSalvato = null;
const ascoltatori = new Set();
const avvisa = () => { for (const f of ascoltatori) f(eventoSalvato); };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoSalvato = e;
    avvisa();
  });
  window.addEventListener('appinstalled', () => { eventoSalvato = null; avvisa(); });
}

const giaInstallata = () => typeof window !== 'undefined' && (
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
);
const suIPhone = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function useInstallazione() {
  const [evento, setEvento] = useState(eventoSalvato);
  useEffect(() => {
    ascoltatori.add(setEvento);
    return () => { ascoltatori.delete(setEvento); };
  }, []);

  const installata = giaInstallata();
  const iPhone = suIPhone();
  return {
    // La voce compare solo se c'è davvero qualcosa da fare.
    disponibile: !installata && (Boolean(evento) || iPhone),
    iPhone: iPhone && !evento,
    installa: async () => {
      if (!evento) return false;
      evento.prompt();
      await evento.userChoice;
      eventoSalvato = null;
      avvisa();
      return true;
    },
    evento
  };
}
