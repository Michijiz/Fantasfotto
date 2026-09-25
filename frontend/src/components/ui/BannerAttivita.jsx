import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import Avatar from './Avatar';
import useAttivita from '../../hooks/useAttivita';
import { avatarUtente } from '../../avatar';
import { fraseAttivita, tempoFa } from '../../utils/attivita';
import '../../styles/allenatori.css';

// Il banner "Dal ritiro" in Home: una notizia alla volta dal diario della lega,
// che cambia da sola ogni pochi secondi ("Tizio ha cambiato lo stemma…").
// Toccandolo si apre la pagina Allenatori con tutte le notizie.
const OGNI_MS = 5000;

export default function BannerAttivita() {
  const { attivita } = useAttivita(12);
  const [indice, setIndice] = useState(0);
  const navigate = useNavigate();
  const n = attivita?.length || 0;

  useEffect(() => {
    if (n < 2) return undefined;
    const timer = setInterval(() => setIndice((i) => (i + 1) % n), OGNI_MS);
    return () => clearInterval(timer);
  }, [n]);

  if (!n) return null;
  const a = attivita[indice % n];

  return (
    <button type="button" className="ritaglio banner-attivita" onClick={() => navigate('/allenatori')} aria-label="Tutte le notizie dal ritiro">
      <span className="banner-testa">
        <span className="occhiello-oro"><span className="banner-punto" aria-hidden="true" />Dal ritiro</span>
        <span className="dettaglio">Tutte <CaretRight size={14} weight="bold" /></span>
      </span>
      {/* key: a ogni notizia nuova l'elemento rinasce e rifà l'entrata. */}
      <span className="banner-notizia" key={a.id} aria-live="polite">
        <Avatar id={avatarUtente(a.autore)} nome={a.autore.nomeVisualizzato} size={44} />
        <span className="testo">
          <b>{a.autore.nomeVisualizzato}</b> {fraseAttivita(a)}
          <span className="quando"> · {tempoFa(a.quando)}</span>
        </span>
      </span>
      {n > 1 && (
        <span className="banner-puntini" aria-hidden="true">
          {attivita.map((x, i) => <span key={x.id} className={i === indice % n ? 'attivo' : ''} />)}
        </span>
      )}
    </button>
  );
}
