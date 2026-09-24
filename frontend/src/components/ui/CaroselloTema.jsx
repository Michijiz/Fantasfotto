import { TEMI, sfondoTema } from '../../temi';
import Carosello from './Carosello';

// La squadra tifata, a carosello. Il tema si applica mentre si scorre, e sotto
// c'è l'anteprima di carta, inchiostro e accento di quella squadra.
export default function CaroselloTema({ valore, onSceglie }) {
  const indice = Math.max(0, TEMI.findIndex((t) => t.id === valore));
  const scelto = TEMI[indice];
  return (
    <>
      <Carosello
        etichetta="Squadra che tifi"
        elementi={TEMI}
        indice={indice}
        onCambia={(i) => onSceglie(TEMI[i].id)}
        centro={(t) => <span className="disco-tema grande" style={{ background: sfondoTema(t.colori) }} />}
        lato={(t) => <span className="disco-tema piccolo" style={{ background: sfondoTema(t.colori) }} />}
        nome={(t) => t.nome}
        nota={`${indice + 1} di ${TEMI.length} · scorri per le altre`}
      />
      <div
        className="anteprima-tema"
        style={{ background: scelto.vars['--paper'], color: scelto.vars['--ink'] }}
        aria-hidden="true"
      >
        <span className="testi">
          <span className="etichetta">Anteprima</span>
          <span className="testata">La Gazzetta</span>
        </span>
        <span className="bottone" style={{ background: scelto.vars['--stamp-red'] }}>Bottone</span>
      </div>
    </>
  );
}
