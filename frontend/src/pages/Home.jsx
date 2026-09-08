import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Article from '../components/ui/Article';
import Sheet from '../components/ui/Sheet';

const ETICHETTE = { fenomeno: 'Fenomeno', bidone: 'Bidone', culo: 'Il più culo', sfigato: 'Il più sfigato' };

export default function Home() {
  const { ultimaEdizione, prossimaGiornata, tabellone, squadre, risultatiVoti } = useDati();
  const [sheetAperta, setSheetAperta] = useState(false);
  const navigate = useNavigate();

  const primoAccoppiamento = prossimaGiornata?.accoppiamenti?.[0];
  const squadraPerId = Object.fromEntries(squadre.map((s) => [s._id, s]));
  const inTesta = Object.entries(risultatiVoti.conteggi || {})
    .map(([cat, conteggi]) => {
      const top = Object.entries(conteggi).sort((a, b) => b[1] - a[1])[0];
      if (!top) return null;
      const squadra = squadraPerId[top[0]];
      return squadra ? { cat, squadra, count: top[1] } : null;
    })
    .filter(Boolean);

  return (
    <>
      <div className="card teaser">
        <Article edizione={ultimaEdizione} teaser onContinua={() => navigate('/ultima')} />
      </div>

      {primoAccoppiamento && (
        <div className="card calendario-preview" onClick={() => setSheetAperta(true)} role="button" tabIndex={0}>
          <h2 className="section-title">
            Prossima Giornata
            <span className="vedi-tutto">Vedi tutti gli scontri →</span>
          </h2>
          <div className="derby">
            <div className="squadra">
              <span className="stemma">{primoAccoppiamento.squadraCasa.stemma || '🛡️'}</span>
              <div className="nome-squadra">{primoAccoppiamento.squadraCasa.nome}</div>
            </div>
            <div className="vs">VS</div>
            <div className="squadra">
              <span className="stemma">{primoAccoppiamento.squadraTrasferta.stemma || '🛡️'}</span>
              <div className="nome-squadra">{primoAccoppiamento.squadraTrasferta.nome}</div>
            </div>
          </div>
          <div className="derby-meta">Giornata {prossimaGiornata.numero}{prossimaGiornata.accoppiamenti.length > 1 ? ` · +${prossimaGiornata.accoppiamenti.length - 1} altri scontri` : ''}</div>
        </div>
      )}

      {tabellone.length > 0 && (
        <div className="card">
          <h2 className="section-title">
            Il Tabellone
            <button className="vedi-tutto" onClick={() => navigate('/squadre')}>Squadre</button>
          </h2>
          <table className="classifica">
            <thead><tr><th></th><th>Squadra</th><th style={{ textAlign: 'right' }}>Punti</th></tr></thead>
            <tbody>
              {tabellone.map((s, i) => (
                <tr key={s._id}>
                  <td className="pos">{i + 1}</td>
                  <td className="nome-sq"><span className="stemma-mini">{s.stemma || '🛡️'}</span> {s.nome}</td>
                  <td className="punti">{s.punti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inTesta.length > 0 && (
        <div className="card">
          <h2 className="section-title">
            Ultimi Verdetti
            <button className="vedi-tutto" onClick={() => navigate('/verdetti')}>Verdetti</button>
          </h2>
          <div className="verdetti-ticker">
            {inTesta.map(({ cat, squadra, count }) => (
              <div className="flash" key={cat}>
                <div className="flash-cat">{ETICHETTE[cat] || cat}</div>
                <div className="flash-nome">{squadra.stemma || '🛡️'} {squadra.nome} ({count})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prossimaGiornata && (
        <Sheet
          aperto={sheetAperta}
          onChiudi={() => setSheetAperta(false)}
          titolo={`Giornata ${prossimaGiornata.numero}`}
          sottotitolo="Tutti gli scontri"
        >
          {prossimaGiornata.accoppiamenti.map((a) => (
            <div className="match-row" key={a._id}>
              <div className="sq casa">
                <span>{a.squadraCasa.nome}</span>
                <span className="stemma-mini">{a.squadraCasa.stemma || '🛡️'}</span>
              </div>
              <span className="vs-mini">VS</span>
              <div className="sq trasferta">
                <span className="stemma-mini">{a.squadraTrasferta.stemma || '🛡️'}</span>
                <span>{a.squadraTrasferta.nome}</span>
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}
