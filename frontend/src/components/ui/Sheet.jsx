import { createPortal } from 'react-dom';

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
          <button className="chiudi-sheet" onClick={onChiudi}>✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );

  // Al primo render sul server o prima che la shell esista il nodo può mancare:
  // in quel caso si rende in linea, come faceva prima.
  const ancora = typeof document === 'undefined' ? null : document.getElementById('appScreen');
  return ancora ? createPortal(contenuto, ancora) : contenuto;
}
