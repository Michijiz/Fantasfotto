import { useState } from 'react';
import { logoSquadra, inizialiSquadra } from '../../loghi';

// `Squadra.stemma` nasce come campo "emoji o url immagine": nei record più vecchi
// può esserci un'emoji, un'iniziale o una stringa vuota. Dandola in pasto a un
// <img> il browser non mostra niente — non un ripiego, proprio niente — ed è il
// motivo per cui le squadre restavano senza stemma anche dopo aver aggiunto i
// loghi. Qui si accetta solo ciò che è davvero l'indirizzo di un'immagine.
const INDIRIZZO_IMMAGINE = /^(https?:\/\/|\/|data:image\/|blob:)/i;
const indirizzoValido = (v) => typeof v === 'string' && INDIRIZZO_IMMAGINE.test(v.trim());

// Lo stemma di una squadra, in tre gradi di ripiego:
//
//  1. l'immagine caricata dall'allenatore dal Profilo (`src`) — ha sempre la
//     precedenza, è la sua squadra;
//  2. il logo di redazione in `public/loghi/`, cercato dal nome (vedi src/loghi.js);
//  3. un monogramma con le iniziali, per chi un logo non ce l'ha (Dunder Mifflin).
//
// Il vecchio ripiego era l'emoji 🛡️: uguale per tutti, quindi in classifica le
// squadre senza stemma erano indistinguibili l'una dall'altra.
export default function Stemma({ src, nome = '', size = 28, className = '' }) {
  // Un indirizzo che il browser non riesce a caricare (immagine cancellata da
  // Cloudinary, file rinominato) non deve lasciare un buco: si segna come rotto
  // e si passa al ripiego successivo. L'elenco evita il rimpallo tra i due.
  const [rotte, setRotte] = useState([]);

  const candidate = [
    indirizzoValido(src) ? src.trim() : '',
    logoSquadra(nome)
  ].filter(Boolean);

  const immagine = candidate.find((u) => !rotte.includes(u)) || '';

  if (immagine) {
    return (
      <img
        src={immagine}
        alt=""
        decoding="async"
        onError={() => setRotte((precedenti) => (precedenti.includes(immagine) ? precedenti : [...precedenti, immagine]))}
        className={className}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1px solid var(--ink-soft)', display: 'inline-block', verticalAlign: 'middle',
          background: 'var(--paper-input)', flexShrink: 0
        }}
      />
    );
  }

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%',
        border: '1px solid var(--ink-soft)', background: 'var(--paper-dark)',
        color: 'var(--ink)', display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', verticalAlign: 'middle', flexShrink: 0,
        fontFamily: "'Oswald',sans-serif", fontWeight: 600, lineHeight: 1,
        // Due lettere dentro un cerchio: sotto il 42% del diametro non si leggono,
        // sopra toccano il bordo.
        fontSize: Math.max(9, Math.round(size * 0.42)),
        letterSpacing: '-0.02em'
      }}
    >
      {inizialiSquadra(nome)}
    </span>
  );
}
