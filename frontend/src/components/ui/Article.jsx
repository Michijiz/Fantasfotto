// Rende un'Edizione come articolo di giornale. In modalità "teaser" (Home) mostra
// solo il primo paragrafo con un link "continua a leggere".
export default function Article({ edizione, teaser = false, onContinua }) {
  if (!edizione) return <div className="empty">Nessuna edizione ancora pubblicata.</div>;

  const paragrafi = teaser ? edizione.corpo.slice(0, 1) : edizione.corpo;

  return (
    <div className={`article${teaser ? ' teaser' : ''}`}>
      <span className="stamp">Giornata {edizione.giornataNumero}</span>
      <div className="occhiello">{edizione.occhiello}</div>
      <h3>{edizione.titolo}</h3>
      <div className="byline">A cura di {edizione.direttore}</div>

      {edizione.immagineUrl && !teaser && (
        <div className="article-img">
          <img src={edizione.immagineUrl} alt={edizione.titolo} />
        </div>
      )}

      {paragrafi.map((p, i) => <p key={i}>{p}</p>)}

      {teaser ? (
        <button className="continua" onClick={onContinua}>Continua a leggere →</button>
      ) : (
        <div className="stat-strip">
          {edizione.stats?.vincitore && (
            <div className="stat">Vincitore<b>{edizione.stats.vincitore.nome} — {edizione.stats.puntiVincitore ?? '—'}</b></div>
          )}
          {edizione.stats?.ultimo && (
            <div className="stat">Ultimo<b>{edizione.stats.ultimo.nome} — {edizione.stats.puntiUltimo ?? '—'}</b></div>
          )}
          {edizione.stats?.fenomeno && (
            <div className="stat">Fenomeno<b>{edizione.stats.fenomeno.nome}</b></div>
          )}
          {edizione.stats?.bidone && (
            <div className="stat">Bidone<b>{edizione.stats.bidone.nome}</b></div>
          )}
        </div>
      )}
    </div>
  );
}
