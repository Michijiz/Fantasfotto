import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import { formattaFantapunti } from '../utils/regolamento';
import '../styles/regolamento.css';

export default function Lega() {
  const { utente } = useOutletContext();
  const { tabellone, giornate } = useDati();
  const [tab, setTab] = useState('classifica');
  const navigate = useNavigate();
  const miaSquadraId = typeof utente.squadra === 'object' ? utente.squadra?._id : utente.squadra;

  const scontriGiocati = tabellone.reduce((tot, s) => tot + (s.giocate || 0), 0);
  const ciSonoFantapunti = tabellone.some((s) => (s.puntiTotali || 0) > 0);

  const apriRegolamento = (sezione) => navigate('/regolamento', { state: { sezione } });

  return (
    <>
      <div className="tabs" style={{ marginBottom: 14 }}>
        <div className={`tab${tab === 'classifica' ? ' active' : ''}`} onClick={() => setTab('classifica')}>Classifica</div>
        <div className={`tab${tab === 'calendario' ? ' active' : ''}`} onClick={() => setTab('calendario')}>Calendario</div>
      </div>

      {tab === 'classifica' ? (
        <div className="card">
          <h2 className="section-title">
            Classifica
            <button className="vedi-tutto" onClick={() => apriRegolamento('classifica')}>Come si calcola</button>
          </h2>

          {tabellone.length === 0 ? (
            <div className="empty">Nessuna squadra iscritta alla lega.</div>
          ) : (
            <>
              <table className="classifica classifica-lega">
                <thead>
                  <tr>
                    <th className="c-pos" />
                    <th>Squadra</th>
                    <th className="c-num" title="Vinte">V</th>
                    <th className="c-num" title="Pareggiate">N</th>
                    <th className="c-num" title="Perse">P</th>
                    <th className="c-gol" title="Gol fatti e subiti">Gol</th>
                    <th className="c-pt" title="Punti-lega">Pt</th>
                    <th className="c-fp" title="Fantapunti totali">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {tabellone.map((s, i) => (
                    <tr key={s._id} className={s._id === miaSquadraId ? 'mia' : ''}>
                      <td className="pos">{i + 1}</td>
                      <td className="nome-sq">
                        <Stemma src={s.stemma} size={15} className="stemma-mini" />
                        <span>{s.nome}</span>
                      </td>
                      <td className="num">{s.vinte ?? 0}</td>
                      <td className="num">{s.pareggiate ?? 0}</td>
                      <td className="num">{s.perse ?? 0}</td>
                      <td className="gol">{s.golFatti ?? 0}:{s.golSubiti ?? 0}</td>
                      <td className="pt">{s.punti ?? 0}</td>
                      <td className="fp">{formattaFantapunti(s.puntiTotali ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {scontriGiocati === 0 && (
                <div className="empty" style={{ marginTop: 14 }}>
                  {ciSonoFantapunti
                    ? 'Nessuno scontro diretto concluso: per ora la classifica è ordinata sui fantapunti totali.'
                    : 'Nessuna giornata conclusa: la classifica si riempie alla prima edizione con i punteggi.'}
                </div>
              )}

              <p className="legenda-classifica">
                Pt sono i punti-lega (vittoria 3, pareggio 1, sconfitta 0), Gol sono fatti e subiti,
                Tot è la somma dei fantapunti.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 className="section-title">
            Calendario
            <button className="vedi-tutto" onClick={() => apriRegolamento('gol')}>Da punti a gol</button>
          </h2>
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
                  const haRisultato = a.golCasa != null && a.golTrasferta != null;
                  const vinceCasa = haRisultato && a.golCasa > a.golTrasferta;
                  const vinceTrasferta = haRisultato && a.golTrasferta > a.golCasa;
                  return (
                    <div className="match-row" key={a._id}>
                      <div className={`sq casa${vinceCasa ? ' vince' : ''}`}>
                        <span className="nome">{a.squadraCasa?.nome}</span>
                        <Stemma src={a.squadraCasa?.stemma} size={20} className="stemma-mini" />
                      </div>
                      {haRisultato ? (
                        <span className="risultato">
                          <span className="gol">{a.golCasa} - {a.golTrasferta}</span>
                          <span className="fp">
                            {formattaFantapunti(a.fantapuntiCasa)} / {formattaFantapunti(a.fantapuntiTrasferta)}
                          </span>
                        </span>
                      ) : (
                        <span className="vs-mini">VS</span>
                      )}
                      <div className={`sq trasferta${vinceTrasferta ? ' vince' : ''}`}>
                        <Stemma src={a.squadraTrasferta?.stemma} size={20} className="stemma-mini" />
                        <span className="nome">{a.squadraTrasferta?.nome}</span>
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
