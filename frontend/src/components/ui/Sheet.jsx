import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

// Pannello che sale dal basso (bottom sheet): scontri della giornata, "Si va in
// stampa", "Componi la tua pagina", la scheda squadra e gli altri moduli.
//
// Lo sheet si monta nel <body>, non dentro l'app. Prima viveva in #appScreen, che
// è alto --app-h e ritaglia tutto ai bordi: con la tastiera aperta, a seconda di
// come iOS ridimensiona la finestra, il foglio finiva tagliato sotto la testata e
// sotto si vedeva il fondo della pagina. Ora è position:fixed e si aggancia
// all'area davvero visibile (--vv-basso, --vv-h: vedi utils/altezzaApp.js), che
// nessun contenitore può ritagliare. Il <body> esiste già al primo render, quindi
// non c'è più l'ancora da cercare dopo il paint: il contenuto nasce subito nel
// posto giusto e non si rimonta (i campi non perdono quello che c'è scritto).
export default function Sheet({ aperto, onChiudi, titolo, sottotitolo, grande = false, children }) {
  const corpoRef = useRef(null);

  // Quando si tocca un campo, il foglio si alza sopra la tastiera e si accorcia:
  // il campo può finire fuori vista. Si fa scorrere solo il corpo del foglio (non
  // la pagina) finché il campo non è in alto, con un po' d'aria sopra.
  const suFocus = (e) => {
    const campo = e.target;
    if (!campo.matches?.('input, textarea, select')) return;
    setTimeout(() => {
      const corpo = corpoRef.current;
      if (!corpo) return;
      const r = campo.getBoundingClientRect();
      const b = corpo.getBoundingClientRect();
      if (r.top < b.top + 8 || r.bottom > b.bottom - 8) {
        corpo.scrollTo({ top: corpo.scrollTop + (r.top - b.top) - 48, behavior: 'smooth' });
      }
    }, 320);
  };

  // Chiudendo il foglio con la tastiera ancora su, il campo resterebbe attivo
  // fuori schermo e la tastiera non scenderebbe: si toglie il fuoco.
  useEffect(() => {
    if (aperto) return;
    const attivo = document.activeElement;
    if (attivo && corpoRef.current?.contains(attivo)) attivo.blur();
  }, [aperto]);

  return createPortal(
    <>
      <div className={`sheet-overlay${aperto ? ' aperto' : ''}`} onClick={onChiudi} />
      <div
        className={`sheet${grande ? ' grande' : ''}${aperto ? ' aperto' : ''}`}
        aria-hidden={!aperto}
        role="dialog"
        aria-label={typeof titolo === 'string' ? titolo : undefined}
      >
        <div className="maniglia" />
        <div className="sheet-header">
          <div>
            <h3>{titolo}</h3>
            {sottotitolo && <span className="sotto">{sottotitolo}</span>}
          </div>
          <button type="button" className="chiudi-sheet" onClick={onChiudi} aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body" ref={corpoRef} onFocus={suFocus}>{children}</div>
      </div>
    </>,
    document.body
  );
}
