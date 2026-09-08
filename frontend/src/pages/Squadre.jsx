import { useState } from 'react';
import { useDati } from '../context/DataContext';

export default function Squadre() {
  const { squadre } = useDati();
  const [selezionataId, setSelezionataId] = useState(null);

  // Deriviamo la squadra selezionata dalla lista aggiornata (non da uno snapshot),
  // così se torni da "modifica la mia squadra" in Profilo vedi subito le modifiche.
  const selezionata = squadre.find((s) => s._id === selezionataId);

  if (selezionata) {
    return (
      <div className="card">
        <button className="link" onClick={() => setSelezionataId(null)}>← Tutte le squadre</button>
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <span style={{ fontSize: 48 }}>{selezionata.stemma || '🛡️'}</span>
          <div className="profilo-nome">{selezionata.nome}</div>
        </div>
        {selezionata.foto && <div className="article-img"><img src={selezionata.foto} alt={selezionata.nome} /></div>}
        {selezionata.maglia && (
          <div style={{ textAlign: 'center', margin: '14px 0' }}>
            <img src={selezionata.maglia} alt="Maglia" style={{ maxWidth: 140, border: '1px solid var(--ink-soft)' }} />
          </div>
        )}
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
          <button className="squadra-riga" key={s._id} onClick={() => setSelezionataId(s._id)}>
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
