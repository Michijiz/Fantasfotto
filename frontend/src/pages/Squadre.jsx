import { useState } from 'react';
import { useDati } from '../context/DataContext';

export default function Squadre() {
  const { squadre } = useDati();
  const [selezionata, setSelezionata] = useState(null);

  if (selezionata) {
    return (
      <div className="card">
        <button className="link" onClick={() => setSelezionata(null)}>← Tutte le squadre</button>
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <span style={{ fontSize: 48 }}>{selezionata.stemma || '🛡️'}</span>
          <div className="profilo-nome">{selezionata.nome}</div>
        </div>
        {selezionata.foto && <div className="article-img"><img src={selezionata.foto} alt={selezionata.nome} /></div>}
        {selezionata.bio && <p>{selezionata.bio}</p>}
        {selezionata.rosa?.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: 16 }}>Rosa</h2>
            <div className="players">
              {selezionata.rosa.map((n) => <span className="chip" key={n}>{n}</span>)}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">Le Squadre della Lega</h2>
      {squadre.length === 0
        ? <div className="empty">Nessuna squadra ancora.</div>
        : squadre.map((s) => (
          <button className="squadra-riga" key={s._id} onClick={() => setSelezionata(s)}>
            <span className="stemma">{s.stemma || '🛡️'}</span>
            <div className="info">
              <b>{s.nome}</b>
              <span>{s.rosa?.length || 0} giocatori in rosa</span>
            </div>
          </button>
        ))}
    </div>
  );
}
