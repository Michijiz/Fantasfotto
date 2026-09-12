import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Article from '../components/ui/Article';
import Sheet from '../components/ui/Sheet';
import Stemma from '../components/ui/Stemma';

// Calcola "Xg Xh" tra ora e la data della prossima giornata. Torna null se la
// giornata non ha ancora una data (l'admin non l'ha impostata) o è già passata.
function formattaCountdown(data) {
  if (!data) return null;
  const diffMs = new Date(data).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const giorni = Math.floor(diffMs / 86400000);
  const ore = Math.floor((diffMs % 86400000) / 3600000);
  return `${giorni}g ${ore}h`;
}

export default function Dashboard() {
  const { utente } = useOutletContext();
  const {
    ultimaEdizione, prossimaGiornata, tabellone, squadre, risultatiVoti, categorieVoto, schedina
  } = useDati();
  const [sheetAperta, setSheetAperta] = useState(false);
  const navigate = useNavigate();

  // utente.squadra a volte è un id (dopo login), a volte l'oggetto squadra
  // popolato {_id, nome, stemma} (dopo /auth/me) — normalizziamo qui, una volta sola.
  const miaSquadraId = typeof utente.squadra === 'object' ? utente.squadra?._id : utente.squadra;

  const miaSquadra = squadre.find((s) => s._id === miaSquadraId);
  const posizione = tabellone.findIndex((s) => s._id === miaSquadraId);
  const miePunti = tabellone.find((s) => s._id === miaSquadraId)?.punti;

  const accoppiamenti = prossimaGiornata?.accoppiamenti || [];
  const mioMatch = accoppiamenti.find(
    (a) => a.squadraCasa._id === miaSquadraId || a.squadraTrasferta._id === miaSquadraId
  ) || accoppiamenti[0];
  const countdown = formattaCountdown(prossimaGiornata?.data);

  const squadraPerId = Object.fromEntries(squadre.map((s) => [s._id, s]));
  const etichettaCat = (id) => categorieVoto.find((c) => c.id === id)?.breve || id;
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
      {miaSquadra && (
        <div className="card">
          <div className="squadra-card-riga">
            <Stemma src={miaSquadra.stemma} size={46} className="stemma" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="squadra-nome">{miaSquadra.nome}</div>
              <div className="squadra-owner">{utente.nomeVisualizzato}</div>
            </div>
          </div>

          <div className="stat-strip">
            <div className="stat">Posizione<b>{posizione >= 0 ? `${posizione + 1}ª` : '—'}</b></div>
            <div className="stat">Punti<b>{miePunti ?? '—'}</b></div>
            <div className="stat">Giornata<b>{ultimaEdizione?.giornataNumero ?? '—'}</b></div>
            <div className="stat">Squadre<b>{tabellone.length || squadre.length}</b></div>
          </div>

          {mioMatch && (
            <div className="match-preview" onClick={() => setSheetAperta(true)} role="button" tabIndex={0}>
              <div className="sq">
                <Stemma src={mioMatch.squadraCasa.stemma} size={30} className="stemma" />
                <span>{mioMatch.squadraCasa.nome}</span>
              </div>
              <div className="match-mid">
                {countdown && <span className="countdown">{countdown}</span>}
                <span className="vs">VS</span>
              </div>
              <div className="sq">
                <Stemma src={mioMatch.squadraTrasferta.stemma} size={30} className="stemma" />
                <span>{mioMatch.squadraTrasferta.nome}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {schedina.giornata && !schedina.chiusa && (schedina.giornata.accoppiamenti?.length > 0) && (
        <button className="card schedina-invito" onClick={() => navigate('/gioca')}>
          <div className="invito-testo">
            <div className="invito-occhiello">Schedina · Giornata {schedina.giornata.numero}</div>
            <b>{schedina.miaSchedina ? 'Schedina consegnata' : 'Non hai ancora gufato'}</b>
            <span>
              {schedina.miaSchedina
                ? `Quota ${Number(schedina.miaSchedina.quotaTotale).toFixed(2).replace('.', ',')} · chi azzecca tutto è Re dei Gufi`
                : `${schedina.giornata.accoppiamenti.length} scontri da pronosticare`}
            </span>
          </div>
          <span className="freccia">→</span>
        </button>
      )}

      <div className="card teaser">
        <Article edizione={ultimaEdizione} teaser onContinua={() => navigate('/gazzetta')} />
      </div>

      {inTesta.length > 0 && (
        <div className="card">
          <h2 className="section-title">
            Ultimi Verdetti
            <button className="vedi-tutto" onClick={() => navigate('/gioca')}>Verdetti</button>
          </h2>
          <div className="verdetti-ticker">
            {inTesta.map(({ cat, squadra, count }) => (
              <div className="flash" key={cat}>
                <div className="flash-cat">{etichettaCat(cat)}</div>
                <div className="flash-nome"><Stemma src={squadra.stemma} size={15} /> {squadra.nome} ({count})</div>
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
                <Stemma src={a.squadraCasa.stemma} size={20} className="stemma-mini" />
              </div>
              <span className="vs-mini">VS</span>
              <div className="sq trasferta">
                <Stemma src={a.squadraTrasferta.stemma} size={20} className="stemma-mini" />
                <span>{a.squadraTrasferta.nome}</span>
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}
