import Stemma from './Stemma';
import { useAuth } from '../../context/AuthContext';
import { conRisultato, idDi, scontriGiocabili } from '../../utils/lega';
import { formattaFantapunti } from '../../utils/regolamento';
import '../../styles/giornata.css';

// Un solo modo di mostrare uno scontro: Calendario, Dashboard, Archivio e articolo
// ne avevano ognuno una copia diversa. Casa a sinistra, trasferta a destra; a
// partita giocata il risultato (con i fantapunti sotto) e il vincitore sottolineato.
export function Scontro({ scontro, mia = false }) {
  const { squadraCasa: casa, squadraTrasferta: trasferta } = scontro;
  const giocato = conRisultato(scontro);

  return (
    <div className={`scontro${mia ? ' mia' : ''}`}>
      <span className={`lato casa${giocato && scontro.golCasa > scontro.golTrasferta ? ' vince' : ''}`}>
        <span className="nome">{casa.nome}</span>
        <Stemma src={casa.stemma} nome={casa.nome} size={30} />
      </span>
      {giocato ? (
        <span className="risultato">
          <b>{scontro.golCasa} – {scontro.golTrasferta}</b>
          {scontro.fantapuntiCasa != null && scontro.fantapuntiTrasferta != null && (
            <span className="dettaglio">
              {formattaFantapunti(scontro.fantapuntiCasa)} / {formattaFantapunti(scontro.fantapuntiTrasferta)}
            </span>
          )}
        </span>
      ) : <span className="vs">VS</span>}
      <span className={`lato trasferta${giocato && scontro.golTrasferta > scontro.golCasa ? ' vince' : ''}`}>
        <Stemma src={trasferta.stemma} nome={trasferta.nome} size={30} />
        <span className="nome">{trasferta.nome}</span>
      </span>
    </div>
  );
}

// Tutti gli scontri di una giornata, con il tuo evidenziato.
export default function Scontri({ giornata, vuoto = 'Scontri non ancora impostati: ci pensa il direttore di turno.' }) {
  const { utente } = useAuth();
  const miaSquadra = idDi(utente?.squadra);
  const scontri = scontriGiocabili(giornata);

  if (scontri.length === 0) return <p className="ritaglio-vuoto">{vuoto}</p>;

  return (
    <div className="scontri">
      {scontri.map((a) => (
        <Scontro
          key={a._id || `${idDi(a.squadraCasa)}>${idDi(a.squadraTrasferta)}`}
          scontro={a}
          mia={Boolean(miaSquadra) && [idDi(a.squadraCasa), idDi(a.squadraTrasferta)].includes(miaSquadra)}
        />
      ))}
    </div>
  );
}
