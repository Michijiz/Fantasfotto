import { useState } from 'react';
import '../../styles/avatar.css';
import { urlAvatar, nomeAvatar } from '../../avatar';

// Iniziali del nome, per quando l'immagine non si carica: "Michelangelo C." → "MC".
function iniziali(nome) {
  const parti = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (parti.length === 0) return '?';
  if (parti.length === 1) return parti[0].slice(0, 2).toUpperCase();
  return (parti[0][0] + parti[1][0]).toUpperCase();
}

// L'avatar di un allenatore. Le illustrazioni hanno lo sfondo trasparente: il
// cerchio prende la carta del tema (o lo sfondo passato), così seguono i colori
// della Gazzetta. `tondo={false}` lo lascia libero, per il ritaglio del Profilo.
export default function Avatar({ id, nome = '', size = 40, tondo = true, sfondo, className = '' }) {
  const [rotto, setRotto] = useState(null);
  const stile = {
    width: size, height: size, flexShrink: 0,
    borderRadius: tondo ? '50%' : 0,
    background: tondo ? (sfondo || 'var(--paper-dark)') : 'transparent',
    boxShadow: tondo ? 'var(--ombra-bassa)' : 'none'
  };

  if (!id || rotto === id) {
    return (
      <span
        className={`avatar avatar-iniziali ${className}`}
        aria-hidden="true"
        style={{ ...stile, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      >
        {iniziali(nome)}
      </span>
    );
  }

  return (
    <img
      className={`avatar ${className}`}
      src={urlAvatar(id)}
      alt={nome ? `Avatar di ${nome}` : nomeAvatar(id)}
      decoding="async"
      onError={() => setRotto(id)}
      style={{ ...stile, objectFit: tondo ? 'cover' : 'contain', objectPosition: 'center bottom' }}
    />
  );
}
