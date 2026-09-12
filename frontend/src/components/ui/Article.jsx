import Stemma from './Stemma';

const DATA_FMT = { day: 'numeric', month: 'long', year: 'numeric' };

// Rende un'Edizione come articolo di giornale. In modalità "teaser" (Home) mostra
// solo il primo paragrafo con un link "continua a leggere".
//
// L'impaginazione segue l'ordine di un pezzo vero: testatina (numero di giornata +
// data), occhiello, titolo, firma, foto, corpo, e in fondo il tabellino con i
// verdetti della redazione. Il timbro della giornata sta dentro la testatina e non
// sopra l'angolo della card: fuori posizione finiva sotto l'intestazione e
// sbordava dal riquadro.
export default function Article({ edizione, teaser = false, onContinua }) {
  if (!edizione) return <div className="empty">Nessuna edizione ancora pubblicata.</div>;

  const paragrafi = teaser ? edizione.corpo.slice(0, 1) : edizione.corpo;
  const data = edizione.createdAt
    ? new Date(edizione.createdAt).toLocaleDateString('it-IT', DATA_FMT)
    : null;

  const { vincitore, ultimo, fenomeno, bidone, reDeiGufi } = edizione.stats || {};
  const gufi = reDeiGufi || [];

  const voci = [
    vincitore && { chiave: 'vincitore', etichetta: 'Vincitore', squadre: [vincitore], extra: edizione.stats.puntiVincitore },
    ultimo && { chiave: 'ultimo', etichetta: 'Ultimo', squadre: [ultimo], extra: edizione.stats.puntiUltimo },
    fenomeno && { chiave: 'fenomeno', etichetta: 'Fenomeno', squadre: [fenomeno] },
    bidone && { chiave: 'bidone', etichetta: 'Bidone', squadre: [bidone] },
    { chiave: 'gufi', etichetta: 'Re dei Gufi', squadre: gufi, vuoto: 'Nessuno', largo: true }
  ].filter(Boolean);

  return (
    <div className={`article${teaser ? ' teaser' : ''}`}>
      <div className="testatina">
        <span className="timbro-giornata">Giornata {edizione.giornataNumero}</span>
        {data && <span className="data-edizione">{data}</span>}
      </div>

      <div className="occhiello">{edizione.occhiello}</div>
      <h3>{edizione.titolo}</h3>
      <div className="byline">A cura di <b>{edizione.direttore}</b></div>

      {edizione.immagineUrl && !teaser && (
        <figure className="article-img">
          <img src={edizione.immagineUrl} alt={edizione.titolo} />
        </figure>
      )}

      <div className="corpo">
        {paragrafi.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {teaser ? (
        <button className="continua" onClick={onContinua}>Continua a leggere →</button>
      ) : (
        <div className="tabellino">
          <div className="tabellino-titolo">Il verdetto della redazione</div>
          <div className="tabellino-griglia">
            {voci.map((v) => (
              <div className={`voce${v.largo ? ' largo' : ''}`} key={v.chiave}>
                <span className="etichetta">{v.etichetta}</span>
                {v.squadre.length === 0 ? (
                  <span className="valore vuoto">{v.vuoto}</span>
                ) : (
                  <span className="valore">
                    {v.squadre.map((s) => (
                      <span className="squadra" key={s._id}>
                        <Stemma src={s.stemma} size={16} />
                        <span className="nome">{s.nome}</span>
                      </span>
                    ))}
                    {v.extra != null && <span className="punti">{v.extra}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
