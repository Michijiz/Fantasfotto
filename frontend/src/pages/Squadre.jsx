import { useNavigate, useOutletContext } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import { idDi, nomiAllenatori } from '../utils/lega';
import '../styles/squadre.css';

// Le squadre della lega, a righe: tutte in una schermata. Toccandone una si apre
// il suo interno.
export default function Squadre() {
  const { utente } = useOutletContext();
  const { squadre } = useDati();
  const navigate = useNavigate();
  const mia = idDi(utente.squadra);

  return (
    <div className="ritagli squadre">
      <div className="testatina">
        <span>Le squadre della lega</span>
        <span>{squadre.length} iscritte</span>
      </div>
      {squadre.length === 0 ? (
        <section className="ritaglio"><p className="ritaglio-vuoto">Lega deserta: l&apos;amministratore deve ancora aprire le iscrizioni.</p></section>
      ) : (
        <section className="ritaglio squadre-lista">
          {squadre.map((s) => {
            const allenatori = nomiAllenatori(s.allenatori);
            return (
              <button key={s._id} type="button" className="squadra-voce" onClick={() => navigate(`/squadre/${s._id}`)}>
                <Stemma src={s.stemma} nome={s.nome} size={48} />
                <span className="testi">
                  <span className="nome">{s.nome}</span>
                  {allenatori && <span className="dettaglio">di {allenatori}</span>}
                </span>
                {s._id === mia && <span className="la-tua">la tua</span>}
                <CaretRight size={20} />
              </button>
            );
          })}
        </section>
      )}
      <button type="button" className="bottone-contorno" onClick={() => navigate('/allenatori')}>
        Gli allenatori
      </button>
    </div>
  );
}
