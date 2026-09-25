import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PencilSimple } from '@phosphor-icons/react';
import BottoneElimina from './BottoneElimina';
import { miniatura } from '../../squadra';

// Visore a tutto schermo per le foto dell'album: si scorre col dito tra una foto
// e l'altra (scroll-snap, niente librerie), sotto la didascalia e chi l'ha
// caricata. Montato nel <body> come i fogli, così nessun contenitore lo ritaglia.
export default function Visore({
  foto, indice, onCambia, onChiudi, nomeAutore, puoModificare, puoTogliere, onDidascalia, onTogli
}) {
  const nastroRef = useRef(null);
  const [scrivendo, setScrivendo] = useState(false);
  const [testo, setTesto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');
  const attuale = foto[indice];

  // All'apertura si parte dalla foto toccata, senza animazione.
  useLayoutEffect(() => {
    const nastro = nastroRef.current;
    if (nastro) nastro.scrollLeft = indice * nastro.clientWidth;
    // Solo all'apertura: dopo è lo scorrimento a decidere l'indice.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const suTasto = (e) => { if (e.key === 'Escape') onChiudi(); };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [onChiudi]);

  // Cambiando foto si chiude la modifica della didascalia.
  useEffect(() => { setScrivendo(false); setErrore(''); }, [indice]);

  const suScorri = () => {
    const nastro = nastroRef.current;
    if (!nastro || !nastro.clientWidth) return;
    const nuovo = Math.round(nastro.scrollLeft / nastro.clientWidth);
    if (nuovo !== indice && nuovo >= 0 && nuovo < foto.length) onCambia(nuovo);
  };

  const salva = async () => {
    setSalvando(true);
    setErrore('');
    try {
      await onDidascalia(attuale, testo);
      setScrivendo(false);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!attuale) return null;
  const autore = nomeAutore(attuale.autore);
  const data = attuale.creataIl
    ? new Date(attuale.creataIl).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return createPortal(
    <div className="visore" role="dialog" aria-modal="true" aria-label="Foto dell'album">
      <div className="visore-testa">
        <span className="conto">{indice + 1} / {foto.length}</span>
        <button type="button" className="visore-chiudi" onClick={onChiudi} aria-label="Chiudi">
          <X size={22} weight="bold" />
        </button>
      </div>

      <div className="visore-nastro" ref={nastroRef} onScroll={suScorri}>
        {foto.map((f, i) => (
          <div className="visore-pagina" key={f._id}>
            {/* Solo la foto corrente e le vicine: le altre non si scaricano finché non servono. */}
            {Math.abs(i - indice) <= 1 && (
              <img src={miniatura(f.url, 1600)} alt={f.didascalia || ''} decoding="async" />
            )}
          </div>
        ))}
      </div>

      <div className="visore-piede">
        {scrivendo ? (
          <div className="visore-modifica">
            <input
              type="text"
              maxLength={100}
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="Scrivi una didascalia"
              aria-label="Didascalia"
              autoFocus
            />
            <div className="azioni">
              <button type="button" className="bottone-link" onClick={() => setScrivendo(false)}>Annulla</button>
              <button type="button" className="visore-salva" onClick={salva} disabled={salvando}>
                {salvando ? 'Salvo…' : 'Salva'}
              </button>
            </div>
            {errore && <div className="errore-msg">{errore}</div>}
          </div>
        ) : (
          <>
            {attuale.didascalia && <p className="visore-didascalia">{attuale.didascalia}</p>}
            {(autore || data) && (
              <p className="visore-firma">{[autore && `Scattata da ${autore}`, data].filter(Boolean).join(' · ')}</p>
            )}
            {(puoModificare || puoTogliere) && (
              <div className="visore-comandi">
                {puoModificare && (
                  <button type="button" className="visore-comando" onClick={() => { setTesto(attuale.didascalia || ''); setScrivendo(true); }}>
                    <PencilSimple size={18} /> {attuale.didascalia ? 'Didascalia' : 'Aggiungi didascalia'}
                  </button>
                )}
                {puoTogliere && (
                  <BottoneElimina
                    etichetta="Togli dall'album"
                    conferma="Tocca di nuovo per togliere"
                    className="visore-comando pericolo"
                    onConferma={async () => {
                      try {
                        await onTogli(attuale);
                        if (foto.length <= 1) onChiudi();
                      } catch (err) {
                        setErrore(err.message);
                      }
                    }}
                  />
                )}
              </div>
            )}
            {errore && <div className="errore-msg">{errore}</div>}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
