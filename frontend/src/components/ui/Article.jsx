import { useNavigate } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { useDati } from '../../context/DataContext';
import Stemma from './Stemma';
import { estremiGiornata } from '../../utils/lega';
import { formattaFantapunti } from '../../utils/regolamento';

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

// Un'edizione impaginata come pezzo di giornale: foto col timbro della giornata,
// didascalia, occhiello, titolo, firma, testo e in fondo il tabellino.
// Il tabellino ha solo premi calcolati: miglior e peggior punteggio dai fantapunti
// della giornata, Re dei Gufi dalle schedine. Il resto lo giudica la lega nei verdetti.
export default function Article({ edizione }) {
  const { giornate } = useDati();
  const navigate = useNavigate();
  if (!edizione) return null;

  const { migliore, peggiore } = estremiGiornata(giornate, edizione.giornataNumero);
  const gufi = edizione.stats?.reDeiGufi || [];

  return (
    <article className="ritaglio articolo">
      <div className={`articolo-foto${edizione.immagineUrl ? '' : ' vuota'}`}>
        {edizione.immagineUrl && <img src={edizione.immagineUrl} alt="" />}
        <span className="timbro">Giornata {edizione.giornataNumero}</span>
      </div>
      {edizione.didascalia && <div className="articolo-didascalia">{edizione.didascalia}</div>}

      <div className="ritaglio-occhiello"><span>{edizione.occhiello}</span><span className="filo" /></div>
      <h1 className="articolo-titolo">{edizione.titolo}</h1>
      <div className="articolo-firma">di <b>{edizione.direttore}</b> · direttore di turno</div>

      <div className="articolo-corpo">
        {edizione.corpo.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      <div className="tabellino">
        <div className="ritaglio-occhiello"><span>Il tabellino</span><span className="filo" /></div>
        <div className="tabellino-premi">
          <Premio etichetta="Miglior punteggio" squadre={migliore ? [migliore.squadra] : []} punti={migliore?.fp} vuoto="Punteggi in arrivo" />
          <Premio etichetta="Peggior punteggio" squadre={peggiore ? [peggiore.squadra] : []} punti={peggiore?.fp} vuoto="Punteggi in arrivo" />
          <Premio etichetta="Re dei Gufi · schedina" squadre={gufi} vuoto="Nessuno: tutti gufi a vuoto" largo />
        </div>
        <button type="button" className="tabellino-verdetti" onClick={() => navigate('/gioca', { state: { tab: 'verdetti' } })}>
          <span className="testi">
            
            <span className="sotto">Vai ai verdetti</span>
          </span>
          <CaretRight size={22} weight="bold" />
        </button>
      </div>
    </article>
  );
}
