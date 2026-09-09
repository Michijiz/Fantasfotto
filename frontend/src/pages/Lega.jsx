import { useOutletContext } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';

// Fusione di Classifica + Calendario (vedi spec). Per ora mostra solo la
// classifica coi dati che il backend già calcola (punti fantacalcistici);
// V/N/P per punti-lega e il calendario completo della stagione restano da
// costruire (serve il campo esito per squadra su Giornata — non ancora nel
// modello). Meglio mostrare quello che c'è davvero che inventare dati.
export default function Lega() {
  const { utente } = useOutletContext();
  const { tabellone } = useDati();
  const miaSquadraId = typeof utente.squadra === 'object' ? utente.squadra?._id : utente.squadra;

  return (
    <div className="card">
      <h2 className="section-title">Classifica</h2>
      {tabellone.length === 0 ? (
        <div className="empty">Nessuna giornata conclusa ancora.</div>
      ) : (
        <table className="classifica">
          <colgroup>
            <col style={{ width: 32 }} />
            <col />
            <col style={{ width: 56 }} />
          </colgroup>
          <thead><tr><th></th><th>Squadra</th><th style={{ textAlign: 'right' }}>Punti</th></tr></thead>
          <tbody>
            {tabellone.map((s, i) => (
              <tr key={s._id} className={s._id === miaSquadraId ? 'mia' : ''}>
                <td className="pos">{i + 1}</td>
                <td className="nome-sq"><Stemma src={s.stemma} size={15} className="stemma-mini" /><span>{s.nome}</span></td>
                <td className="punti">{s.punti}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="empty" style={{ marginTop: 14 }}>
        Il calendario completo della stagione e i punti-lega (V/N/P) arrivano qui appena pronti.
      </div>
    </div>
  );
}
