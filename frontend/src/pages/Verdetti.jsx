import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

const ETICHETTE = { fenomeno: 'Fenomeno di giornata', bidone: 'Bidone di giornata', culo: 'Il più culo', sfigato: 'Il più sfigato' };

export default function Verdetti() {
  const { ultimaEdizione, squadre, risultatiVoti, ricaricaRisultatiVoti } = useDati();
  const [categorie, setCategorie] = useState([]);
  const mostraToast = useToast();

  useEffect(() => {
    api.get('/api/voti/categorie').then(({ categorie }) => setCategorie(categorie)).catch(() => {});
  }, []);

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

  return (
    <div className="card">
      <h2 className="section-title">Verdetti — Giornata {ultimaEdizione.giornataNumero}</h2>
      {categorie.map((cat) => (
        <div className="verdetto" key={cat}>
          <h4>{ETICHETTE[cat] || cat}</h4>
          <div className="voti-list">
            {squadre.map((s) => {
              const count = risultatiVoti.conteggi?.[cat]?.[s._id] || 0;
              const mioVoto = risultatiVoti.mioVoto?.[cat] === s._id;
              return (
                <button
                  key={s._id}
                  className={`voto-btn${mioVoto ? ' mio-voto' : ''}`}
                  onClick={() => vota(cat, s._id)}
                >
                  {s.stemma || '🛡️'} {s.nome}
                  <span className="count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
