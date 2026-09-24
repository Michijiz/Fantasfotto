import { useNavigate } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import '../styles/gioca.css';
import '../styles/gazzetta.css';

// Come ha votato la lega: un grafico a barre per categoria. Il backend manda i
// conteggi solo a chi ha votato tutto o a votazioni chiuse; qui ci si limita a
// non mostrare niente se non sono arrivati.
export default function Risultati() {
  const { ultimaEdizione, squadre, risultatiVoti, categorieVoto } = useDati();
  const navigate = useNavigate();
  const indietro = () => navigate('/gioca', { state: { tab: 'verdetti' } });
  const { conteggi, mioVoto = {}, votantiCompleti = 0, utentiTotali = 0 } = risultatiVoti;

  const testa = (
    <header className="testa-sotto">
      <button type="button" className="indietro" onClick={indietro} aria-label="Torna ai verdetti">
        <CaretLeft size={22} weight="bold" />
      </button>
      <div className="testi">
        <span className="sopra">Verdetti · Giornata {ultimaEdizione?.giornataNumero}</span>
        <h1 className="titolo">Come ha votato la lega</h1>
      </div>
    </header>
  );

  if (!ultimaEdizione) {
    return <div className="ritagli">{testa}<section className="ritaglio"><p className="ritaglio-vuoto">Il tribunale è chiuso: niente edizione, niente processo.</p></section></div>;
  }
  if (!conteggi) {
    return (
      <div className="ritagli">
        {testa}
        <section className="ritaglio">
          <p className="ritaglio-vuoto">Si sblocca quando hai votato tutte le categorie.</p>
          <button type="button" className="bottone-grande" onClick={indietro}>Vai a votare</button>
        </section>
      </div>
    );
  }

  const perId = Object.fromEntries(squadre.map((s) => [s._id, s]));
  const apertura = votantiCompleti >= utentiTotali
    ? `${votantiCompleti} allenatori hanno emesso le loro sentenze.`
    : `${votantiCompleti} su ${utentiTotali} allenatori hanno emesso le loro sentenze.`;

  return (
    <div className="ritagli risultati">
      {testa}
      <section className="ritaglio"><p className="apertura">{apertura}</p></section>

      {categorieVoto.map((cat) => {
        const voci = Object.entries(conteggi[cat.id] || {}).sort((a, b) => b[1] - a[1]);
        const tot = voci.reduce((t, [, v]) => t + v, 0);
        const top = voci[0]?.[1] || 0;
        return (
          <section className="ritaglio grafico" key={cat.id}>
            <div className="ritaglio-testa">
              <h2 className="ritaglio-titolo medio">{cat.etichetta}</h2>
              <span className="dettaglio">{tot} {tot === 1 ? 'voto' : 'voti'}</span>
            </div>
            <p className="descrizione">{cat.descrizione}</p>
            {voci.length === 0 ? (
              <p className="ritaglio-vuoto">Nessuna sentenza: la giuria è ancora al bar.</p>
            ) : voci.map(([id, v]) => {
              const s = perId[id];
              const mio = mioVoto[cat.id] === id;
              const primo = v === top;
              return (
                <div className="barra-voto" key={id}>
                  <div className="chi">
                    <Stemma src={s?.stemma} nome={s?.nome} size={30} />
                    <span className="nome">{s?.nome || 'Squadra sparita'}</span>
                    {mio && <span className="mio">il tuo voto</span>}
                  </div>
                  <div className="riga">
                    <span className="binario">
                      <span className={`pieno${mio ? ' mio' : primo ? ' primo' : ''}`} style={{ width: `${Math.max(8, Math.round((100 * v) / top))}%` }}>
                        {v}
                      </span>
                    </span>
                    <span className="pct">{Math.round((100 * v) / tot)}%</span>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
