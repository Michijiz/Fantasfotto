import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import Sheet from '../components/ui/Sheet';
import Stemma from '../components/ui/Stemma';
import BannerAttivita from '../components/ui/BannerAttivita';
import '../styles/home.css';

const idDi = (v) => (v && typeof v === 'object' ? v._id : v);
const formattaQuota = (n) => Number(n).toFixed(2).replace('.', ',');

// "fischio d'inizio tra 2g 14h" prima, "in campo" durante, "fischio finale" a
// giornata conclusa. Senza data impostata non si mostra niente.
function statoTempo(giornata) {
  if (!giornata) return null;
  if (giornata.conclusa) return 'fischio finale';
  if (!giornata.data) return null;
  const diffMs = new Date(giornata.data).getTime() - Date.now();
  if (diffMs <= 0) return 'in campo';
  const giorni = Math.floor(diffMs / 86400000);
  const ore = Math.floor((diffMs % 86400000) / 3600000);
  return `fischio d'inizio tra ${giorni}g ${ore}h`;
}

// Lo stato della schedina in parole semplici, e il bottone che le corrisponde.
function statoSchedina({ miaSchedina, chiusa }) {
  if (miaSchedina) {
    if (miaSchedina.esito === 'vinta') return { testo: 'Vinta', bottone: 'Conta i danni' };
    if (miaSchedina.esito === 'persa') return { testo: 'Persa', bottone: 'Conta i danni' };
    if (chiusa) return { testo: 'In attesa dei risultati', bottone: 'Conta i danni' };
    return { testo: `Consegnata, quota ${formattaQuota(miaSchedina.quotaTotale)}`, bottone: 'Rigufa' };
  }
  if (chiusa) return { testo: 'Non giocata', bottone: 'Conta i danni' };
  return { testo: 'Da giocare', bottone: 'Gufa ora' };
}

function Lato({ squadra, info }) {
  return (
    <div className="home-lato">
      <Stemma src={squadra?.stemma} nome={squadra?.nome} size={72} />
      <span className="nome">{squadra?.nome}</span>
      {info && <span className="dettaglio">{info}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { utente } = useOutletContext();
  const {
    ultimaEdizione, prossimaGiornata, tabellone, risultatiVoti, categorieVoto, schedina
  } = useDati();
  const [scontriAperti, setScontriAperti] = useState(false);
  const navigate = useNavigate();

  const miaSquadraId = idDi(utente.squadra);

  // Una squadra cancellata lascia il riferimento a null: si scartano quegli scontri
  // invece di far cadere la pagina.
  const accoppiamenti = (prossimaGiornata?.accoppiamenti || []).filter((a) => a.squadraCasa && a.squadraTrasferta);
  const mioMatch = accoppiamenti.find(
    (a) => idDi(a.squadraCasa) === miaSquadraId || idDi(a.squadraTrasferta) === miaSquadraId
  );
  const riposo = accoppiamenti.length > 0 && !mioMatch;
  const tempo = statoTempo(prossimaGiornata);

  const infoClassifica = (squadra) => {
    const i = tabellone.findIndex((s) => s._id === idDi(squadra));
    return i >= 0 ? `${i + 1}ª · ${tabellone[i].punti ?? 0} pt` : null;
  };

  const banco = schedina.giornata && (schedina.giornata.accoppiamenti?.length > 0);
  const stato = statoSchedina(schedina);
  const scontriBanco = schedina.giornata?.accoppiamenti?.length || 0;
  const pronosticiFatti = schedina.miaSchedina?.pronostici?.length || 0;

  const categorie = categorieVoto.length;
  const votate = Object.keys(risultatiVoti.mioVoto || {}).length;
  const mancano = Math.max(0, categorie - votate);

  const attacco = ultimaEdizione?.corpo?.[0] || '';

  return (
    <div className="ritagli home">
      {/* 0 · Cosa succede in lega: una notizia alla volta dal diario */}
      <BannerAttivita />

      {/* 1 · Cosa si gioca adesso */}
      {!prossimaGiornata ? (
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Il calendario è ancora in bozza</h2>
          <p className="ritaglio-vuoto">Appena il direttore di turno imposta gli scontri, li trovi qui.</p>
        </section>
      ) : (
        <section className="ritaglio">
          <div className="ritaglio-testa">
            <h2 className="ritaglio-titolo medio">Giornata {prossimaGiornata.numero}</h2>
            {tempo && <span className="chip-tempo">{tempo}</span>}
          </div>

          {mioMatch ? (
            <div className="home-match">
              <Lato squadra={mioMatch.squadraCasa} info={infoClassifica(mioMatch.squadraCasa)} />
              <span className="vs">VS</span>
              <Lato squadra={mioMatch.squadraTrasferta} info={infoClassifica(mioMatch.squadraTrasferta)} />
            </div>
          ) : riposo ? (
            <p className="ritaglio-vuoto">Questa giornata riposi. Goditi lo spettacolo degli altri.</p>
          ) : (
            <p className="ritaglio-vuoto">Scontri non ancora impostati: ci pensa il direttore di turno.</p>
          )}

          {banco && (
            <>
              <div className="home-schedina">
                <div className="ritaglio-testa">
                  <span className="occhiello-oro">La tua schedina</span>
                  <span className="dettaglio">{stato.testo}</span>
                </div>
                <div className="slot-riga" aria-hidden="true">
                  {Array.from({ length: scontriBanco }, (_, i) => (
                    <span key={i} className={i < pronosticiFatti ? 'pieno' : ''} />
                  ))}
                </div>
              </div>
              <button type="button" className="bottone-grande" onClick={() => navigate('/gioca')}>
                {stato.bottone}
              </button>
            </>
          )}

          {accoppiamenti.length > 0 && (
            <button type="button" className="bottone-link" onClick={() => setScontriAperti(true)}>
              Tutti gli scontri della giornata →
            </button>
          )}
        </section>
      )}

      {/* 2 · Cosa ti manca: solo se c'è un'edizione da giudicare */}
      {ultimaEdizione && categorie > 0 && (
        <button type="button" className="riga-azione" onClick={() => navigate('/gioca', { state: { tab: 'verdetti' } })}>
          <span className="testi">
            <span className="occhiello-oro">Verdetti · G{ultimaEdizione.giornataNumero} · fino al fischio d&apos;inizio</span>
            <span className="ritaglio-titolo medio">
              {mancano === 0 ? 'Hai votato tutto: vedi i risultati' : mancano === 1 ? 'Ti manca 1 voto' : `Ti mancano ${mancano} voti`}
            </span>
            <span className="barra-avanzamento">
              <span className="binario"><span className="riempito" style={{ width: `${Math.round((100 * votate) / categorie)}%` }} /></span>
              <b>{votate}/{categorie}</b>
            </span>
          </span>
          <span className="freccia"><ArrowRight size={24} weight="bold" /></span>
        </button>
      )}

      {/* 3 · Cosa si legge */}
      {!ultimaEdizione ? (
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">La rotativa è ferma</h2>
          <p className="ritaglio-vuoto">Nessuna edizione in edicola: il direttore di turno sta cercando l&apos;ispirazione.</p>
        </section>
      ) : (
        <section className="ritaglio home-prima">
          <div className={`home-foto${ultimaEdizione.immagineUrl ? '' : ' vuota'}`}>
            {ultimaEdizione.immagineUrl && <img src={ultimaEdizione.immagineUrl} alt="" />}
            <span className="timbro">Prima pagina · G{ultimaEdizione.giornataNumero}</span>
          </div>
          <h2 className="ritaglio-titolo">{ultimaEdizione.titolo}</h2>
          {attacco && <p className="home-attacco">{attacco}</p>}
          <button type="button" className="bottone-contorno" onClick={() => navigate('/gazzetta')}>
            Leggi la Gazzetta
          </button>
        </section>
      )}

      {prossimaGiornata && (
        <Sheet
          aperto={scontriAperti}
          onChiudi={() => setScontriAperti(false)}
          titolo={`Giornata ${prossimaGiornata.numero}`}
          sottotitolo="Tutti gli scontri"
        >
          {accoppiamenti.map((a) => (
            <div className="match-row" key={a._id}>
              <div className="sq casa">
                <span>{a.squadraCasa.nome}</span>
                <Stemma src={a.squadraCasa.stemma} nome={a.squadraCasa.nome} size={20} className="stemma-mini" />
              </div>
              <span className="vs-mini">VS</span>
              <div className="sq trasferta">
                <Stemma src={a.squadraTrasferta.stemma} nome={a.squadraTrasferta.nome} size={20} className="stemma-mini" />
                <span>{a.squadraTrasferta.nome}</span>
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </div>
  );
}
