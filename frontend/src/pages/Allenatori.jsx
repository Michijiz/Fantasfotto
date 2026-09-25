import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import Avatar from '../components/ui/Avatar';
import Stemma from '../components/ui/Stemma';
import useAttivita from '../hooks/useAttivita';
import { avatarUtente } from '../avatar';
import { fraseAttivita, tempoFa } from '../utils/attivita';
import '../styles/gazzetta.css';
import '../styles/allenatori.css';

function Occhiello({ children }) {
  return <div className="ritaglio-occhiello"><span>{children}</span><span className="filo" /></div>;
}

// Gli allenatori della lega, uno per riga (tocco → il suo profilo), e sotto il
// diario completo "Dal ritiro": chi ha fatto cosa, dal più recente.
export default function Allenatori() {
  const { utente } = useOutletContext();
  const { squadre, tabellone } = useDati();
  const { attivita } = useAttivita(40);
  const navigate = useNavigate();

  const vaiAlProfilo = (id) => navigate(String(id) === String(utente.id) ? '/profilo' : `/profilo/${id}`);

  // In ordine di classifica della squadra, poi per nome: in cima chi comanda.
  const allenatori = useMemo(() => {
    const posto = (sid) => {
      const i = tabellone.findIndex((s) => s._id === sid);
      return i >= 0 ? i : 999;
    };
    return squadre
      .flatMap((s) => (s.allenatori || []).map((a) => ({ ...a, squadra: s, posto: posto(s._id) })))
      .sort((a, b) => a.posto - b.posto || a.nomeVisualizzato.localeCompare(b.nomeVisualizzato, 'it'));
  }, [squadre, tabellone]);

  return (
    <div className="ritagli allenatori-pagina">
      <header className="testa-sotto">
        <button type="button" className="indietro" onClick={() => navigate(-1)} aria-label="Indietro">
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="testi">
          <span className="sopra">La lega</span>
          <h1 className="titolo">Gli allenatori</h1>
        </div>
      </header>

      <section className="ritaglio">
        <Occhiello>{allenatori.length ? `In panchina · ${allenatori.length}` : 'In panchina'}</Occhiello>
        {allenatori.length === 0 ? (
          <div className="skeleton-line w-60" />
        ) : (
          <div className="allenatori-lista">
            {allenatori.map((a) => (
              <button key={a.id} type="button" className="allenatore-voce" onClick={() => vaiAlProfilo(a.id)}>
                <Avatar id={avatarUtente(a)} nome={a.nomeVisualizzato} size={56} />
                <span className="testi">
                  <span className="nome">
                    {a.nomeVisualizzato}
                    {String(a.id) === String(utente.id) && <span className="sei-tu">Tu</span>}
                  </span>
                  <span className="squadra">
                    <Stemma src={a.squadra.stemma} nome={a.squadra.nome} size={22} />
                    <span>{a.squadra.nome}</span>
                    {a.posto < 999 && <span className="dettaglio">· {a.posto + 1}ª</span>}
                  </span>
                </span>
                <CaretRight size={20} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="ritaglio">
        <Occhiello>Dal ritiro</Occhiello>
        {attivita === null ? (
          <div className="skeleton-line w-60" />
        ) : attivita.length === 0 ? (
          <p className="ritaglio-vuoto">Tutto tace. Troppo tace.</p>
        ) : (
          <ol className="diario">
            {attivita.map((a) => (
              <li key={a.id}>
                <button type="button" className="diario-voce" onClick={() => vaiAlProfilo(a.autore.id)}>
                  <Avatar id={avatarUtente(a.autore)} nome={a.autore.nomeVisualizzato} size={40} />
                  <span className="testo">
                    <span><b>{a.autore.nomeVisualizzato}</b> {fraseAttivita(a)}</span>
                    <span className="dettaglio">{tempoFa(a.quando)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
