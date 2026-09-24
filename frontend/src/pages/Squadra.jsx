import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Stemma from '../components/ui/Stemma';
import Avatar from '../components/ui/Avatar';
import Sheet from '../components/ui/Sheet';
import SchedaSquadra from '../components/ui/SchedaSquadra';
import { avatarUtente } from '../avatar';
import { magliaSquadra } from '../loghi';
import { formattaFantapunti } from '../utils/regolamento';
import { idDi, formaRecente, derbyPersonale, menzioni, nomiAllenatori, rosaPerRuolo } from '../utils/lega';
import '../styles/squadre.css';
import '../styles/gazzetta.css';

function tempoAl(g) {
  if (!g?.data) return null;
  const diff = new Date(g.data).getTime() - Date.now();
  if (diff <= 0) return 'in campo';
  return `fischio d'inizio tra ${Math.floor(diff / 86400000)}g ${Math.floor((diff % 86400000) / 3600000)}h`;
}

function Occhiello({ children }) {
  return <div className="ritaglio-occhiello"><span>{children}</span><span className="filo" /></div>;
}

// L'interno di una squadra: fascia con stemma, allenatori, numeri, il derby
// personale con la tua squadra, forma, storia, rosa per ruolo e menzioni.
export default function Squadra() {
  const { id } = useParams();
  const { utente } = useOutletContext();
  const { squadre, tabellone, giornate, edizioni, albo, ricaricaSquadre } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const [scheda, setScheda] = useState(false);

  const squadra = squadre.find((s) => s._id === id);
  const mia = idDi(utente.squadra);
  const eMia = id === mia;

  const forma = useMemo(() => formaRecente(giornate, id), [giornate, id]);
  const derby = useMemo(() => derbyPersonale(giornate, mia, id), [giornate, mia, id]);
  const albi = useMemo(() => menzioni(albo, edizioni, giornate, id), [albo, edizioni, giornate, id]);

  if (!squadra) {
    return (
      <div className="ritagli">
        <section className="ritaglio"><div className="skeleton-line w-60" /></section>
      </div>
    );
  }

  const posizione = tabellone.findIndex((s) => s._id === id);
  const riga = posizione >= 0 ? tabellone[posizione] : null;
  const maglia = squadra.maglia || magliaSquadra(squadra.nome);
  const { gruppi, totale } = rosaPerRuolo(squadra);
  const allenatori = squadra.allenatori || [];

  return (
    <div className="ritagli squadra-interno">
      <header className="testa-sotto">
        <button type="button" className="indietro" onClick={() => navigate('/squadre')} aria-label="Torna alle squadre">
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="testi">
          <span className="sopra">Squadre</span>
          <h1 className="titolo">{squadra.nome}</h1>
        </div>
      </header>

      <section className="ritaglio squadra-copertina">
        <div className="fascia">
          {squadra.fondataNel && <span className="fondata">Fondata nel {squadra.fondataNel}</span>}
          {maglia && <img className="maglia" src={maglia} alt="Maglia" />}
        </div>
        <div className="stemma-grande"><Stemma src={squadra.stemma} nome={squadra.nome} size={112} /></div>
        <h2 className="nome">{squadra.nome}</h2>
        {allenatori.length > 0 && (
          <div className="allenatori">
            <span className="volti">
              {allenatori.slice(0, 3).map((a) => (
                <Avatar key={a.id} id={avatarUtente(a)} nome={a.nomeVisualizzato} size={40} />
              ))}
            </span>
            <span className="chi">Allenata da <b>{nomiAllenatori(allenatori)}</b></span>
          </div>
        )}
        <div className="numeri-tre">
          <div><b>{riga ? `${posizione + 1}ª` : '—'}</b><span className="dettaglio">posto</span></div>
          <div><b>{riga ? riga.punti ?? 0 : '—'}</b><span className="dettaglio">punti</span></div>
          <div><b>{riga ? formattaFantapunti(riga.puntiTotali ?? 0) : '—'}</b><span className="dettaglio">fantapunti</span></div>
        </div>
      </section>

      {!eMia && mia && (
        <section className="ritaglio">
          <Occhiello>Il derby personale</Occhiello>
          {derby.giocati === 0 ? (
            <p className="ritaglio-vuoto">Mai affrontati: il derby è ancora tutto da scrivere.</p>
          ) : (
            <div className="derby">
              <div className="lato">
                <Stemma src={squadre.find((s) => s._id === mia)?.stemma} nome={squadre.find((s) => s._id === mia)?.nome} size={52} />
                <span className="dettaglio">Tu</span>
              </div>
              <div className="conto">
                <div><b>{derby.vinte}</b><span className="dettaglio">vinte</span></div>
                <div><b>{derby.pari}</b><span className="dettaglio">pari</span></div>
                <div><b>{derby.perse}</b><span className="dettaglio">perse</span></div>
              </div>
              <div className="lato">
                <Stemma src={squadra.stemma} nome={squadra.nome} size={52} />
                <span className="dettaglio">Loro</span>
              </div>
            </div>
          )}
          {derby.prossimo && (
            <div className="derby-prossimo">
              <span className="dettaglio">Prossimo derby · G{derby.prossimo.numero}</span>
              {tempoAl(derby.prossimo) && <b>{tempoAl(derby.prossimo)}</b>}
            </div>
          )}
        </section>
      )}

      <section className="ritaglio">
        <Occhiello>La forma</Occhiello>
        {forma.length === 0 ? (
          <p className="ritaglio-vuoto">Ancora nessuno scontro giocato.</p>
        ) : (
          <div className="forma-riga">
            {forma.map((f) => (
              <div className="forma-voce" key={f.numero}>
                <span className={`bollino esito-${f.esito}`}>{f.esito}</span>
                <span className="dettaglio">G{f.numero}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ritaglio">
        <Occhiello>La storia</Occhiello>
        {squadra.bio?.trim()
          ? <p className="storia">{squadra.bio}</p>
          : <p className="ritaglio-vuoto">Una squadra senza storia. Per ora.</p>}
      </section>

      <section className="ritaglio">
        <Occhiello>{totale ? `La rosa · ${totale}` : 'La rosa'}</Occhiello>
        {gruppi.length === 0 ? (
          <p className="ritaglio-vuoto">Rosa ancora da comunicare alla stampa.</p>
        ) : gruppi.map((g) => (
          <div className="ruolo" key={g.id}>
            <div className="ruolo-testa">
              <span className="sigla">{g.id}</span>
              <span className="nome">{g.nome}</span>
              <span className="dettaglio">{g.nomi.length}</span>
            </div>
            <div className="giocatori">
              {g.nomi.map((n) => <span key={n} className="giocatore">{n}</span>)}
            </div>
          </div>
        ))}
      </section>

      <section className="ritaglio">
        <Occhiello>Nell&apos;albo</Occhiello>
        {albi.length === 0 ? (
          <p className="ritaglio-vuoto">Ancora nessuna menzione. C&apos;è tempo.</p>
        ) : (
          <div className="albo-chips">
            {albi.map((a) => <span key={a.chiave} className={`albo-chip${a.oro ? ' oro' : ''}`}>{a.testo}</span>)}
          </div>
        )}
      </section>

      {eMia && (
        <button type="button" className="bottone-contorno" onClick={() => setScheda(true)}>Modifica la scheda</button>
      )}

      <Sheet aperto={scheda} onChiudi={() => setScheda(false)} titolo="La scheda della squadra" grande>
        {scheda && (
          <SchedaSquadra
            squadra={squadra}
            onSalvata={async () => {
              await ricaricaSquadre();
              mostraToast('Scheda aggiornata');
              setScheda(false);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
