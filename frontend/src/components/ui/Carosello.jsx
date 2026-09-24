import { useRef } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import '../../styles/carosello.css';

// Selettore a carosello: l'elemento scelto al centro, i vicini sbiaditi ai lati,
// frecce e scorrimento col dito. Usato per il tema e per l'avatar (iscrizione e
// "Componi la tua pagina"). Si scorre in cerchio: dopo l'ultimo torna il primo.
//
//   elementi     l'elenco completo
//   indice       la posizione dell'elemento scelto
//   onCambia     riceve il nuovo indice
//   centro(el)   cosa disegnare al centro
//   lato(el)     cosa disegnare nei due vicini
//   nome(el)     etichetta per lettori di schermo e titolo sotto
//   nota         riga sotto il nome ("5 di 21 · scorri per le altre")
export default function Carosello({ elementi, indice, onCambia, centro, lato, nome, nota, etichetta }) {
  const n = elementi.length;
  const inizioX = useRef(null);
  const vai = (passo) => onCambia((indice + passo + n) % n);
  const prima = elementi[(indice - 1 + n) % n];
  const dopo = elementi[(indice + 1) % n];
  const attuale = elementi[indice];

  const suInizio = (e) => { inizioX.current = e.touches[0].clientX; };
  const suFine = (e) => {
    if (inizioX.current == null) return;
    const dx = e.changedTouches[0].clientX - inizioX.current;
    inizioX.current = null;
    if (Math.abs(dx) > 40) vai(dx < 0 ? 1 : -1);
  };
  const suTasto = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); vai(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); vai(1); }
  };

  return (
    <div className="carosello" role="group" aria-roledescription="carosello" aria-label={etichetta} onKeyDown={suTasto}>
      <div className="carosello-pista" onTouchStart={suInizio} onTouchEnd={suFine}>
        <button type="button" className="carosello-freccia" onClick={() => vai(-1)} aria-label="Precedente">
          <CaretLeft size={22} weight="bold" />
        </button>
        <button type="button" className="carosello-lato" onClick={() => vai(-1)} aria-label={nome(prima)} tabIndex={-1}>
          {lato(prima)}
        </button>
        <div className="carosello-centro" aria-live="polite">{centro(attuale)}</div>
        <button type="button" className="carosello-lato" onClick={() => vai(1)} aria-label={nome(dopo)} tabIndex={-1}>
          {lato(dopo)}
        </button>
        <button type="button" className="carosello-freccia" onClick={() => vai(1)} aria-label="Successivo">
          <CaretRight size={22} weight="bold" />
        </button>
      </div>
      <div className="carosello-nome">{nome(attuale)}</div>
      {nota && <div className="carosello-nota">{nota}</div>}
    </div>
  );
}
