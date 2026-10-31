import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { useDati } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Stemma from './Stemma';
import { Scontro } from './Scontro';
import { Corpo, Inline } from './Formattato';
import { estremiGiornata, idDi, scontriGiocabili } from '../../utils/lega';
import { formattaFantapunti } from '../../utils/regolamento';
import { formattaVoto, squadreConPunti } from '../../utils/spunti';

function Premio({ etichetta, squadre, punti, vuoto, largo }) {
  return (
    <div className={`premio${largo ? ' largo' : ''}`}>
      <span className="etichetta">{etichetta}</span>
      {squadre.length === 0 ? (
        <span className="vuoto">{vuoto}</span>
      ) : (
        <span className="squadre">
          {squadre.map((s) => (
            <span className="squadra" key={s._id}>
              <Stemma src={s.stemma} nome={s.nome} size={34} />
              <span className="nome">{s.nome}</span>
            </span>
          ))}
        </span>
      )}
      {punti != null && <span className="punti">{formattaFantapunti(punti)}</span>}
    </div>
  );
}

const chiaveScontro = (casa, trasferta) => `${idDi(casa)}>${idDi(trasferta)}`;

// Uno scontro con le sue due righe di commento. Il tuo si riconosce dal bordo
// rosso, senza etichette.
function Partita({ scontro, testo, mia }) {
  return (
    <div className={`partita${mia ? ' mia' : ''}`}>
      <Scontro scontro={scontro} impilato />
      <p className="partita-testo"><Inline testo={testo} /></p>
    </div>
  );
}

// Quante partite commentate si leggono prima di "Mostra le altre": l'edizione deve
// restare leggera, e chi vuole il resto lo apre.
const PARTITE_VISIBILI = 4;

// Le pagelle: un voto e una battuta per ogni squadra, dal voto più alto al più
// basso (a parità, dai fantapunti). La prima riga è il miglior punteggio, l'ultima
// il peggiore. Prendono il posto dei due riquadri dei premi, che dicevano lo stesso.
function Pagelle({ pagelle, giornata, miaSquadra }) {
  const punti = new Map(squadreConPunti(giornata).map(({ squadra, fp }) => [idDi(squadra), fp]));
  const righe = pagelle
    .filter((p) => p.squadra)
    .map((p) => ({ ...p, id: idDi(p.squadra), fp: punti.get(idDi(p.squadra)) }))
    .sort((x, y) => y.voto - x.voto || (y.fp ?? 0) - (x.fp ?? 0));

  return (
    <div className="pagelle">
      <div className="ritaglio-occhiello"><span>Le pagelle</span><span className="filo" /></div>
      {righe.map((p, i) => {
        const tag = righe.length > 1 && i === 0 ? 'Miglior punteggio' : righe.length > 1 && i === righe.length - 1 ? 'Peggior punteggio' : '';
        return (
          <div className={`pagella${p.id === miaSquadra ? ' mia' : ''}`} key={p.id}>
            <span className="voto">{formattaVoto(p.voto)}</span>
            <span className="chi">
              <Stemma src={p.squadra.stemma} nome={p.squadra.nome} size={30} />
              <span className="nome">{p.squadra.nome}</span>
              {p.fp != null && <span className="punti">{formattaFantapunti(p.fp)}</span>}
            </span>
            {tag && <span className="tag">{tag}</span>}
            {p.battuta && <span className="battuta">{p.battuta}</span>}
          </div>
        );
      })}
    </div>
  );
}

// Un'edizione impaginata come pezzo di giornale. In ordine di lettura: foto,
// titolo e pezzo, le partite commentate (le prime quattro),
// poi le pagelle — o, nelle edizioni uscite prima che esistessero, il tabellino dei
// premi — e il tasto per giudicare la giornata.
export default function Article({ edizione }) {
  const { giornate, ultimaEdizione, risultatiVoti } = useDati();
  const { utente } = useAuth();
  const navigate = useNavigate();
  const [tutte, setTutte] = useState(false);
  if (!edizione) return null;

  const { migliore, peggiore } = estremiGiornata(giornate, edizione.giornataNumero);
  const gufi = edizione.stats?.reDeiGufi || [];
  // Il Re dei Gufi si decide a giornata conclusa: finché è aperta, "nessuno" non è
  // una notizia ma solo una cosa che non si sa ancora.
  const giornata = giornate.find((g) => g.numero === edizione.giornataNumero);
  const miaSquadra = idDi(utente?.squadra);

  // Le due righe sugli scontri, legate alla coppia di squadre: uno scontro uscito
  // dal calendario non compare più. Il tuo va per primo.
  const testiPerScontro = new Map((edizione.commenti || [])
    .map((c) => [chiaveScontro(c.squadraCasa, c.squadraTrasferta), c.testo]));
  const partite = scontriGiocabili(giornata)
    .map((a) => ({ a, testo: testiPerScontro.get(chiaveScontro(a.squadraCasa, a.squadraTrasferta)) }))
    .filter((p) => p.testo)
    .map((p) => ({ ...p, mia: Boolean(miaSquadra) && [idDi(p.a.squadraCasa), idDi(p.a.squadraTrasferta)].includes(miaSquadra) }))
    .sort((x, y) => Number(y.mia) - Number(x.mia));
  const mostrate = tutte ? partite : partite.slice(0, PARTITE_VISIBILI);

  const pagelle = edizione.pagelle || [];
  const vuotoGufi = giornata && !giornata.conclusa
    ? 'Si decide a giornata conclusa'
    : 'Nessuno: tutti gufi a vuoto';

  // "12 su 18 hanno già votato": i conteggi che il contesto ha sono quelli
  // dell'ultima edizione, per le altre non si sa.
  const votoAperto = ultimaEdizione?._id === edizione._id && risultatiVoti.utentiTotali > 0;

  return (
    <article className="ritaglio articolo">
      <div className={`articolo-foto${edizione.immagineUrl ? '' : ' vuota'}`}>
        {edizione.immagineUrl && <img src={edizione.immagineUrl} alt="" />}
      </div>
      {edizione.didascalia && <div className="articolo-didascalia">{edizione.didascalia}</div>}

      <div className="ritaglio-occhiello"><span>{edizione.occhiello}</span><span className="filo" /></div>
      <h1 className="articolo-titolo">{edizione.titolo}</h1>
      <div className="articolo-firma">di <b>{edizione.direttore}</b> · direttore di turno</div>

      <div className="articolo-corpo">
        <Corpo paragrafi={edizione.corpo} />
      </div>

      {partite.length > 0 && (
        <section className="partite">
          <div className="ritaglio-occhiello"><span>Partita per partita</span><span className="filo" /></div>
          {mostrate.map(({ a, testo, mia }) => (
            <Partita
              key={a._id || chiaveScontro(a.squadraCasa, a.squadraTrasferta)}
              scontro={a}
              testo={testo}
              mia={mia}
            />
          ))}
          {partite.length > PARTITE_VISIBILI && (
            <button type="button" className="bottone-link" onClick={() => setTutte((v) => !v)}>
              {tutte ? 'Mostra meno' : `Mostra le altre partite (${partite.length - PARTITE_VISIBILI})`}
            </button>
          )}
        </section>
      )}

      <div className="tabellino">
        {pagelle.length > 0 ? (
          <>
            <Pagelle pagelle={pagelle} giornata={giornata} miaSquadra={miaSquadra} />
            <Premio etichetta="Re dei Gufi · schedina" squadre={gufi} vuoto={vuotoGufi} largo />
          </>
        ) : (
          <>
            <div className="ritaglio-occhiello"><span>Il tabellino</span><span className="filo" /></div>
            <div className="tabellino-premi">
              <Premio etichetta="Miglior punteggio" squadre={migliore ? [migliore.squadra] : []} punti={migliore?.fp} vuoto="Punteggi in arrivo" />
              <Premio etichetta="Peggior punteggio" squadre={peggiore ? [peggiore.squadra] : []} punti={peggiore?.fp} vuoto="Punteggi in arrivo" />
              <Premio etichetta="Re dei Gufi · schedina" squadre={gufi} vuoto={vuotoGufi} largo />
            </div>
          </>
        )}
        <button type="button" className="tabellino-verdetti" onClick={() => navigate('/gioca', { state: { tab: 'verdetti' } })}>
          <span className="testi">
            <span className="sopra">Verdetti</span>
            <span className="sotto">Giudica la giornata</span>
            {votoAperto && (
              <span className="votanti">{risultatiVoti.votantiCompleti} su {risultatiVoti.utentiTotali} hanno già votato</span>
            )}
          </span>
          <CaretRight size={22} weight="bold" />
        </button>
      </div>
    </article>
  );
}
