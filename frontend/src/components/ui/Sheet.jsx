// Pannello che sale dal basso (bottom sheet), usato per "tutti gli scontri della
// giornata" e per il form "Nuova edizione". Porta 1:1 il markup .sheet/.sheet-overlay
// del vecchio style.css.
export default function Sheet({ aperto, onChiudi, titolo, sottotitolo, grande = false, children }) {
  return (
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
}
