import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';

export default function Lega() {
  const { utente } = useOutletContext();
  const { tabellone, giornate } = useDati();
  const [tab, setTab] = useState('classifica');
  const miaSquadraId = typeof utente.squadra === 'object' ? utente.squadra?._id : utente.squadra;

  return (
    <>
      <div className="tabs" style={{ marginBottom: 14 }}>
        <div className={`tab${tab === 'classifica' ? ' active' : ''}`} onClick={() => setTab('classifica')}>Classifica</div>
        <div className={`tab${tab === 'calendario' ? ' active' : ''}`} onClick={() => setTab('calendario')}>Calendario</div>
      </div>

      {tab === 'classifica' ? (
        <div className="card">
          <h2 className="section-title">Classifica</h2>
          {tabellone.length === 0 ? (
            <div className="empty">Nessuna giornata conclusa ancora.</div>
          ) : (
            <table className="classifica">
              <thead><tr><th></th><th>Squadra</th><th style={{ textAlign: 'right' }}>Punti</th></tr></thead>
              <tbody>
                {tabellone.map((s, i) => (
                  <tr key={s._id} className={s._id === miaSquadraId ? 'mia' : ''}>
                    <td className="pos">{i + 1}</td>
                    <td className="nome-sq"><Stemma src={s.stemma} size={15} className="stemma-mini" /> {s.nome}</td>
                    <td className="punti">{s.punti}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="empty" style={{ marginTop: 14 }}>
            I punti-lega (V/N/P) arrivano qui appena pronti.
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="section-title">Calendario</h2>
          {giornate.length === 0 ? (
            <div className="empty">Nessuna giornata caricata ancora.</div>
          ) : (
            giornate.map((g) => (
              <div key={g._id} style={{ marginBottom: 18 }}>
                <div className="derby-meta" style={{ textAlign: 'left', marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                  Giornata {g.numero}{g.serieANumero ? ` · ${g.serieANumero}ª Serie A` : ''}
                  {g.conclusa ? ' · conclusa' : ''}
                </div>
                {g.accoppiamenti.map((a) => {
                  const haRisultato = a.punteggioCasa != null && a.punteggioTrasferta != null;
                  return (
                    <div className="match-row" key={a._id}>
                      <div className="sq casa">
                        <span>{a.squadraCasa?.nome}</span>
                        <Stemma src={a.squadraCasa?.stemma} size={20} className="stemma-mini" />
                      </div>
                      {haRisultato ? (
                        <span className="punteggio">{a.punteggioCasa} - {a.punteggioTrasferta}</span>
                      ) : (
                        <span className="vs-mini">VS</span>
                      )}
                      <div className="sq trasferta">
                        <Stemma src={a.squadraTrasferta?.stemma} size={20} className="stemma-mini" />
                        <span>{a.squadraTrasferta?.nome}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
