import { AVATAR, urlAvatar } from '../../avatar';
import Carosello from './Carosello';

// L'avatar, a carosello. `toccato` dice se l'ha scelto l'utente o se sta ancora
// seguendo la squadra tifata: cambia solo la riga sotto il nome.
export default function CaroselloAvatar({ valore, onSceglie, toccato = true }) {
  const indice = Math.max(0, AVATAR.findIndex((a) => a.id === valore));
  const tondo = (a, misura) => (
    <span className={`tondo-avatar ${misura}`}>
      <img src={urlAvatar(a.id)} alt="" decoding="async" />
    </span>
  );
  return (
    <Carosello
      etichetta="Avatar"
      elementi={AVATAR}
      indice={indice}
      onCambia={(i) => onSceglie(AVATAR[i].id)}
      centro={(a) => tondo(a, 'grande')}
      lato={(a) => tondo(a, 'piccolo')}
      nome={(a) => a.nome}
      nota={`${indice + 1} di ${AVATAR.length} · ${toccato ? 'scelto da te' : 'segue la squadra che tifi'}`}
    />
  );
}
