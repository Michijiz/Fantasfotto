import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { CaretLeft, CaretRight, PencilSimple, Trophy } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import Avatar from '../components/ui/Avatar';
import Sheet from '../components/ui/Sheet';
import ComponiSquadra from '../components/ui/ComponiSquadra';
import AlbumSquadra from '../components/ui/AlbumSquadra';
import { avatarUtente } from '../avatar';
import { magliaSquadra } from '../loghi';
import { puoCancellare } from '../ruoli';
import { formattaFantapunti } from '../utils/regolamento';
import { idDi, formaRecente, derbyPersonale, menzioni, rosaPerRuolo } from '../utils/lega';
import { bozzaSquadra, ordineRitagli, sfondoColori, miniatura } from '../squadra';
import '../styles/squadre.css';
import '../styles/gazzetta.css';
import '../styles/albo.css';

function tempoAl(g) {
  if (!g?.data) return null;
  const diff = new Date(g.data).getTime() - Date.now();
  if (diff <= 0) return 'in campo';
  return `fischio d'inizio tra ${Math.floor(diff / 86400000)}g ${Math.floor((diff % 86400000) / 3600000)}h`;
}

function Occhiello({ children }) {
  return <div className="ritaglio-occhiello"><span>{children}</span><span className="filo" /></div>;
}

// Il nome è in Anton a tutta larghezza: la parola più lunga decide la misura,
// così un nome lungo va a capo tra le parole e non a metà.
function classeNome(testo) {
  const parolaPiuLunga = Math.max(...String(testo).split(/\s+/).map((w) => w.length));
  if (parolaPiuLunga > 12) return ' lunghissimo';
  if (parolaPiuLunga > 9) return ' lungo';
  return '';
}

// Cosa mostra la pagina mentre "Componi la squadra" è aperto: la squadra
// pubblicata con sopra la bozza, così si vede cambiare a ogni tocco.
function conBozza(squadra, bozza) {
  if (!bozza) return squadra;
  return {
    ...squadra,
    ...bozza,
    fondataNel: /^\d{4}$/.test(bozza.fondataNel.trim()) ? Number(bozza.fondataNel) : null
  };
}

// L'interno di una squadra: copertina (foto o colori, stemma, nome, allenatori,
// numeri) e poi i ritagli nell'ordine scelto dagli allenatori: derby personale
// con la tua squadra, forma, storia, rosa per ruolo, album e menzioni.
export default function Squadra() {
  const { id } = useParams();
  const { utente } = useOutletContext();
  const { squadre, tabellone, giornate, edizioni, albo, ricaricaSquadre } = useDati();
  const navigate = useNavigate();
  const [bozza, setBozza] = useState(null);

  const pubblicata = squadre.find((s) => s._id === id);
  const mia = idDi(utente.squadra);
  const eMia = id === mia;

  const forma = useMemo(() => formaRecente(giornate, id), [giornate, id]);
  const derby = useMemo(() => derbyPersonale(giornate, mia, id), [giornate, mia, id]);
  const albi = useMemo(() => menzioni(albo, edizioni, giornate, id), [albo, edizioni, giornate, id]);

  if (!pubblicata) {
    return (
      <div className="ritagli">
        <section className="ritaglio"><div className="skeleton-line w-60" /></section>
      </div>
    );
  }

  const squadra = conBozza(pubblicata, bozza);
  const componi = Boolean(bozza);
  const apriComponi = () => setBozza(bozzaSquadra(pubblicata));
  const chiudiComponi = () => setBozza(null);

  const posizione = tabellone.findIndex((s) => s._id === id);
  const riga = posizione >= 0 ? tabellone[posizione] : null;
  const maglia = squadra.maglia || magliaSquadra(squadra.nome);
  const { gruppi, totale } = rosaPerRuolo(squadra);
  const allenatori = pubblicata.allenatori || [];
  const nascosti = squadra.pagina?.nascosti || [];
  const ordine = ordineRitagli(squadra.pagina?.ordine).filter((r) => !nascosti.includes(r));
  const nome = squadra.nome.trim() || pubblicata.nome;
  const colori = (squadra.colori || []).filter(Boolean);
  const numeroFoto = pubblicata.album?.length || 0;
  const miaSquadra = squadre.find((s) => s._id === mia);

  // I colori della squadra come variabili: la fascia, il filo sotto la copertina
  // e i dettagli della pagina li riprendono. Senza colori valgono quelli del tema.
  const stileColori = colori.length
    ? { '--sq-1': colori[0], '--sq-2': colori[1] || colori[0] }
    : undefined;

  const ritagli = {
    derby: !eMia && mia && (
      <section className="ritaglio" key="derby">
        <Occhiello>Il derby personale</Occhiello>
        {derby.giocati === 0 ? (
          <p className="ritaglio-vuoto">Mai affrontati: il derby è ancora tutto da scrivere.</p>
        ) : (
          <div className="derby">
            <div className="lato">
              <Stemma src={miaSquadra?.stemma} nome={miaSquadra?.nome} size={52} />
              <span className="dettaglio">Tu</span>
            </div>
            <div className="conto">
              <div><b>{derby.vinte}</b><span className="dettaglio">vinte</span></div>
              <div><b>{derby.pari}</b><span className="dettaglio">pari</span></div>
              <div><b>{derby.perse}</b><span className="dettaglio">perse</span></div>
            </div>
            <div className="lato">
              <Stemma src={squadra.stemma} nome={nome} size={52} />
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
    ),

    forma: (
      <section className="ritaglio" key="forma">
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
    ),

    storia: (
      <section className="ritaglio" key="storia">
        <Occhiello>La storia</Occhiello>
        {squadra.bio?.trim()
          ? <p className="storia">{squadra.bio}</p>
          : <p className="ritaglio-vuoto">Una squadra senza storia. Per ora.</p>}
      </section>
    ),

    rosa: (
      <section className="ritaglio" key="rosa">
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
              {g.nomi.map((n, i) => <span key={`${n}-${i}`} className="giocatore">{n}</span>)}
            </div>
          </div>
        ))}
      </section>
    ),

    album: (
      <section className="ritaglio" key="album">
        <Occhiello>{numeroFoto ? `L'album · ${numeroFoto}` : "L'album"}</Occhiello>
        <AlbumSquadra
          squadra={pubblicata}
          puoModificare={eMia}
          puoTogliere={eMia || puoCancellare(utente)}
          onAggiornato={ricaricaSquadre}
        />
      </section>
    ),

    albo: (
      <section className="ritaglio" key="albo">
        <Occhiello>Nell&apos;albo</Occhiello>
        {albi.length === 0 ? (
          <p className="ritaglio-vuoto">Ancora nessuna menzione. C&apos;è tempo.</p>
        ) : (
          <div className="albo-chips">
            {albi.map((a) => (
              <span key={a.chiave} className={`albo-chip${a.oro ? ' oro' : ''}${a.coppa ? ` coppa-${a.coppa}` : ''}`}>
                {a.coppa && <Trophy size={18} weight="fill" />}{a.testo}
              </span>
            ))}
          </div>
        )}
      </section>
    )
  };

  return (
    <div className={`ritagli squadra-interno${colori.length ? ' con-colori' : ''}`} style={stileColori}>
      <header className="testa-sotto">
        <button type="button" className="indietro" onClick={() => navigate('/squadre')} aria-label="Torna alle squadre">
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="testi">
          <span className="sopra">Squadre</span>
          <h1 className="titolo">{nome}</h1>
        </div>
      </header>

      <section className="ritaglio squadra-copertina">
        <div
          className={`fascia${squadra.foto ? ' con-foto' : ''}`}
          style={squadra.foto ? undefined : { background: sfondoColori(colori) }}
        >
          {squadra.foto && <img className="copertina-foto" src={miniatura(squadra.foto, 1200)} alt="" decoding="async" />}
          {squadra.fondataNel && <span className="fondata">Fondata nel {squadra.fondataNel}</span>}
          {maglia && <img className="maglia" src={maglia} alt="Maglia" />}
          {eMia && (
            <button type="button" className="copertina-matita" onClick={apriComponi} aria-label="Componi la squadra">
              <PencilSimple size={20} />
            </button>
          )}
        </div>
        <div className="stemma-grande"><Stemma src={squadra.stemma} nome={nome} size={112} /></div>
        {squadra.occhiello?.trim() && <div className="squadra-occhiello">{squadra.occhiello}</div>}
        <h2 className={`nome${classeNome(nome)}${squadra.pagina?.stileTitolo === 'contorno' ? ' contorno' : ''}`}>{nome}</h2>
        {squadra.slogan?.trim() && <p className="squadra-slogan">{squadra.slogan}</p>}
        {colori.length > 0 && <span className="squadra-filo" aria-hidden="true" />}
        {/* Ogni allenatore porta al suo profilo: una pillola per ciascuno. */}
        {allenatori.length > 0 && (
          <div className="allenatori-elenco">
            <span className="dettaglio">Allenata da</span>
            {allenatori.map((a) => (
              <button
                key={a.id}
                type="button"
                className="allenatori allenatore-link"
                onClick={() => navigate(String(a.id) === String(utente.id) ? '/profilo' : `/profilo/${a.id}`)}
                aria-label={`Profilo di ${a.nomeVisualizzato}`}
              >
                <Avatar id={avatarUtente(a)} nome={a.nomeVisualizzato} size={40} />
                <span className="chi"><b>{a.nomeVisualizzato}</b></span>
                <CaretRight size={16} weight="bold" />
              </button>
            ))}
          </div>
        )}
        <div className="numeri-tre">
          <div><b>{riga ? `${posizione + 1}ª` : '—'}</b><span className="dettaglio">posto</span></div>
          <div><b>{riga ? riga.punti ?? 0 : '—'}</b><span className="dettaglio">punti</span></div>
          <div><b>{riga ? formattaFantapunti(riga.puntiTotali ?? 0) : '—'}</b><span className="dettaglio">fantapunti</span></div>
        </div>
      </section>

      {ordine.map((r) => ritagli[r] || null)}

      {eMia && (
        <button type="button" className="bottone-contorno" onClick={apriComponi}>Componi la squadra</button>
      )}

      <Sheet aperto={componi} onChiudi={chiudiComponi} titolo="Componi la squadra" grande>
        {componi && (
          <ComponiSquadra
            squadra={pubblicata}
            bozza={bozza}
            onCambia={setBozza}
            onFatto={async () => {
              await ricaricaSquadre();
              chiudiComponi();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
