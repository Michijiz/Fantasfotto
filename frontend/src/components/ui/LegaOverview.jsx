import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDati } from '../../context/DataContext';
import Stemma from './Stemma';
import Sheet from './Sheet';
import GiornataForm from './GiornataForm';
import { formattaFantapunti } from '../../utils/regolamento';
import { puoRedigere } from '../../ruoli';
import '../../styles/regolamento.css';

// Classifica + calendario della lega, con lo stesso contenuto che prima stava
// nella pagina Lega. Ora si apre dalla Dashboard toccando la propria squadra,
// così la pagina Lega può mostrare l'albo d'oro senza perdere questa vista.
export default function LegaOverview({ utente }) {
  const { tabellone, giornate } = useDati();
  const [tab, setTab] = useState('classifica');
  const [giornataDaModificare, setGiornataDaModificare] = useState(null);
  const navigate = useNavigate();
  const miaSquadraId = typeof utente.squadra === 'object' ? utente.squadra?._id : utente.squadra;
  const sonoRedazione = puoRedigere(utente);

  const scontriGiocati = tabellone.reduce((tot, s) => tot + (s.giocate || 0), 0);
  const ciSonoFantapunti = tabellone.some((s) => (s.puntiTotali || 0) > 0);

  const apriRegolamento = (sezione) => navigate('/regolamento', { state: { sezione } });

  // Numero proposto quando si crea un calendario da zero: la prima giornata libera.
  const prossimoNumero = giornate.length ? Math.max(...giornate.map((g) => g.numero)) + 1 : 1;

  return (
    <>
      <div className="tabs" role="tablist" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={tab === 'classifica'} className={`tab${tab === 'classifica' ? ' active' : ''}`} onClick={() => setTab('classifica')}>Classifica</button>
        <button type="button" role="tab" aria-selected={tab === 'calendario'} className={`tab${tab === 'calendario' ? ' active' : ''}`} onClick={() => setTab('calendario')}>Calendario</button>
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
              {/* Riga per riga invece che tabella: i nomi delle squadre sono lunghi e
                  con sei colonne numeriche finivano schiacciati o fuori dal bordo.
                  Qui il nome ha tutta la larghezza e i numeri stanno sotto. */}
              <div className="classifica-lista">
                <div className="classifica-intestazione">
                  <span>Squadra</span>
                  <span>Pt</span>
                </div>

                {tabellone.map((s, i) => (
                  <div key={s._id} className={`riga-classifica${s._id === miaSquadraId ? ' mia' : ''}`}>
                    <span className="posto">{i + 1}</span>
                    <Stemma src={s.stemma} nome={s.nome} size={26} className="stemma-riga" />
                    <div className="dati">
                      <div className="nome">{s.nome}</div>
                      <div className="meta">
                        <span><b>{s.vinte ?? 0}</b>V</span>
                        <span><b>{s.pareggiate ?? 0}</b>N</span>
                        <span><b>{s.perse ?? 0}</b>P</span>
                        <span className="gol">{s.golFatti ?? 0}:{s.golSubiti ?? 0}</span>
                        <span className="fp">{formattaFantapunti(s.puntiTotali ?? 0)} fp</span>
                      </div>
                    </div>
                    <span className="punti-lega">{s.punti ?? 0}</span>
                  </div>
                ))}
              </div>

              {scontriGiocati === 0 && (
                <div className="empty" style={{ marginTop: 14 }}>
                  {ciSonoFantapunti
                    ? 'Ci sono i fantapunti ma nessuno scontro in calendario: i punti-lega restano a zero finché non si impostano gli scontri della giornata.'
                    : 'Nessuna giornata conclusa: la classifica si riempie dalla tab Calendario, inserendo scontri e punteggi di una giornata.'}
                </div>
              )}

              <p className="legenda-classifica">
                Pt sono i punti-lega (vittoria 3, pareggio 1, sconfitta 0), V/N/P vinte, pareggiate
                e perse, poi i gol fatti e subiti e la somma dei fantapunti.
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

          {sonoRedazione && (
            <button
              className="ghost blocco"
              onClick={() => setGiornataDaModificare({ numero: prossimoNumero })}
            >
              + Nuova giornata: scontri e punteggi
            </button>
          )}

          {giornate.length === 0 ? (
            <div className="empty">Nessuna giornata caricata ancora.</div>
          ) : (
            giornate.map((g) => (
              <div key={g._id} style={{ marginBottom: 18 }}>
                <div className="giornata-testa">
                  <span>
                    Giornata {g.numero}{g.serieANumero ? ` · ${g.serieANumero}ª Serie A` : ''}
                    {g.conclusa ? ' · conclusa' : ''}
                  </span>
                  {sonoRedazione && (
                    <button className="link" onClick={() => setGiornataDaModificare(g)}>
                      Modifica
                    </button>
                  )}
                </div>

                {g.accoppiamenti.length === 0 ? (
                  <div className="empty" style={{ padding: '14px 10px' }}>
                    Scontri non ancora impostati: i punti-lega di questa giornata non sono assegnati. Tocca Modifica per inserirli.
                  </div>
                ) : g.accoppiamenti.map((a) => {
                  const haRisultato = a.golCasa != null && a.golTrasferta != null;
                  const vinceCasa = haRisultato && a.golCasa > a.golTrasferta;
                  const vinceTrasferta = haRisultato && a.golTrasferta > a.golCasa;
                  return (
                    <div className="match-row" key={a._id}>
                      <div className={`sq casa${vinceCasa ? ' vince' : ''}`}>
                        <span className="nome">{a.squadraCasa?.nome}</span>
                        <Stemma src={a.squadraCasa?.stemma} nome={a.squadraCasa?.nome} size={20} className="stemma-mini" />
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
                        <Stemma src={a.squadraTrasferta?.stemma} nome={a.squadraTrasferta?.nome} size={20} className="stemma-mini" />
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

      <Sheet
        aperto={Boolean(giornataDaModificare)}
        onChiudi={() => setGiornataDaModificare(null)}
        titolo="Giornata"
        sottotitolo="Scontri e punteggi fantacalcio"
        grande
      >
        {giornataDaModificare && (
          <GiornataForm
            giornata={giornataDaModificare}
            onFatto={() => setGiornataDaModificare(null)}
          />
        )}
      </Sheet>
    </>
  );
}
