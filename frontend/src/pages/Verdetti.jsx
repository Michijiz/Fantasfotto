import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Stemma from '../components/ui/Stemma';

// Le categorie arrivano dal backend con etichetta e descrizione: qui non c'è più
// una copia locale da tenere allineata, aggiungerne una è una riga sola lì.
export default function Verdetti() {
  const { ultimaEdizione, squadre, risultatiVoti, categorieVoto, ricaricaRisultatiVoti } = useDati();
  const mostraToast = useToast();

  if (!ultimaEdizione) {
    return <div className="card"><div className="empty">Nessuna edizione da votare ancora.</div></div>;
  }

  const vota = async (categoria, squadraId) => {
    try {
      await api.post('/api/voti', { edizioneId: ultimaEdizione._id, categoria, squadraId });
      await ricaricaRisultatiVoti(ultimaEdizione._id);
      mostraToast('Voto registrato!');
    } catch (err) {
      mostraToast(err.message);
    }
  };

  // Chi è in testa in una categoria, per mostrarlo già nel titolo chiuso.
  const inTesta = (catId) => {
    const conteggi = risultatiVoti.conteggi?.[catId] || {};
    const top = Object.entries(conteggi).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const squadra = squadre.find((s) => s._id === top[0]);
    return squadra ? { squadra, count: top[1] } : null;
  };

  return (
    <div className="card">
      <h2 className="section-title">Verdetti — Giornata {ultimaEdizione.giornataNumero}</h2>
      <p className="nota-form" style={{ marginTop: 0 }}>
        Un voto per categoria: cambiarlo sovrascrive il precedente, non se ne aggiunge un altro.
      </p>

      {categorieVoto.length === 0 ? (
        <div className="empty">Categorie non disponibili.</div>
      ) : categorieVoto.map((cat, i) => {
        const testa = inTesta(cat.id);
        const mioVoto = risultatiVoti.mioVoto?.[cat.id];
        return (
          <details className="verdetto" key={cat.id} open={i === 0}>
            <summary>
              <span className="titolo">{cat.etichetta}</span>
              <span className="sommario">
                {testa
                  ? <><Stemma src={testa.squadra.stemma} size={15} /> {testa.squadra.nome} ({testa.count})</>
                  : 'nessun voto'}
              </span>
            </summary>
            {cat.descrizione && <p className="descrizione-cat">{cat.descrizione}</p>}
            <div className="voti-list">
              {squadre.map((s) => {
                const count = risultatiVoti.conteggi?.[cat.id]?.[s._id] || 0;
                return (
                  <button
                    key={s._id}
                    className={`voto-btn${mioVoto === s._id ? ' mio-voto' : ''}`}
                    onClick={() => vota(cat.id, s._id)}
                  >
                    <Stemma src={s.stemma} size={16} />
                    <span className="nome">{s.nome}</span>
                    <span className="count">{count}</span>
                  </button>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
