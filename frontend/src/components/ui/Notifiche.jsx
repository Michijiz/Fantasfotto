import { useEffect, useState } from 'react';
import { Bell, BellSlash } from '@phosphor-icons/react';
import { useToast } from '../../context/ToastContext';
import { attivaNotifiche, disattivaNotifiche, statoNotifiche } from '../../push';

// La riga "Notifiche" delle impostazioni del Profilo. Si nasconde dove non
// servono: browser senza Push API o notifiche spente sul server.
export default function Notifiche() {
  const mostraToast = useToast();
  const [stato, setStato] = useState(null);
  const [lavoro, setLavoro] = useState(false);

  useEffect(() => {
    let vivo = true;
    statoNotifiche().then((s) => { if (vivo) setStato(s); }).catch(() => { if (vivo) setStato('non-supportato'); });
    return () => { vivo = false; };
  }, []);

  if (!stato || stato === 'non-supportato' || stato === 'spente-dal-server') return null;

  const attive = stato === 'attive';
  const alterna = async () => {
    if (lavoro) return;
    setLavoro(true);
    try {
      if (attive) await disattivaNotifiche();
      else await attivaNotifiche();
      setStato(await statoNotifiche());
    } catch (err) {
      mostraToast(err.message);
    } finally {
      setLavoro(false);
    }
  };

  return (
    <button type="button" className="impostazione" onClick={alterna} disabled={lavoro || stato === 'negate'}>
      {attive ? <Bell size={22} weight="fill" /> : <BellSlash size={22} />}
      <span>
        {stato === 'negate' ? 'Notifiche bloccate dal browser' : attive ? 'Notifiche attive: tocca per spegnere' : 'Attiva le notifiche'}
      </span>
    </button>
  );
}
