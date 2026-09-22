import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

// Pannello che sale dal basso (bottom sheet), usato per "tutti gli scontri della
// giornata", per il form "Nuova edizione" e per gli scontri di giornata dell'admin.
//
// Lo sheet si monta SEMPRE dentro #appScreen, non dove viene scritto nel JSX.
// Motivo: .sheet è position:absolute e si ancora al primo antenato posizionato.
// Dentro una pagina finisce dentro .contenuto, che è a sua volta absolute ed è il
// contenitore di scroll: lì "bottom:0" vuol dire fondo del contenuto scorribile,
// non fondo dello schermo, e lo sheet chiuso si impilava in coda alla pagina
// invece di restare fuori campo. Gli sheet di AppShell funzionavano solo perché
// erano già figli diretti di #appScreen.
export default function Sheet({ aperto, onChiudi, titolo, sottotitolo, grande = false, children }) {
  // L'ancora si cerca DOPO il primo paint, non durante il render: al primo giro
  // #appScreen non è ancora nel DOM, quindi risolverla in render dava null e il
  // contenuto nasceva in linea per poi spostarsi nel portale al render successivo
  // — cioè si smontava e si rimontava, perdendo lo stato dei campi che contiene.
  const [ancora, setAncora] = useState(null);
  // Lo stato scritto dentro l'effetto è proprio il punto: il nodo del portale
  // esiste solo dopo il primo commit, quindi prima non c'è niente da leggere.
  // oxlint-disable-next-line react/set-state-in-effect
  useLayoutEffect(() => { setAncora(document.getElementById('appScreen')); }, []);

  const contenuto = (
    <>
      <div className={`sheet-overlay${aperto ? ' aperto' : ''}`} onClick={onChiudi} />
      <div className={`sheet${grande ? ' grande' : ''}${aperto ? ' aperto' : ''}`}>
        <div className="maniglia" />
        <div className="sheet-header">
          <div>
            <h3>{titolo}</h3>
            {sottotitolo && <span className="sotto">{sottotitolo}</span>}
          </div>
          <button className="chiudi-sheet" onClick={onChiudi} aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );

  // Finché l'ancora non c'è non si rende niente: un frame senza lo sheet chiuso
  // non si vede, mentre montarlo nel posto sbagliato sì.
  return ancora ? createPortal(contenuto, ancora) : null;
}
