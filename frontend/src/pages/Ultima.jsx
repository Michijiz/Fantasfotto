import { useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Article from '../components/ui/Article';
import Sheet from '../components/ui/Sheet';
import EdizioneForm from '../components/ui/EdizioneForm';
import BottoneElimina from '../components/ui/BottoneElimina';
import { puoRedigere, puoCancellare } from '../ruoli';
import '../styles/gazzetta.css';

export default function Ultima() {
  const { utente } = useOutletContext();
  const { ultimaEdizione, edizioni, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Dal Profilo o dall'archivio si arriva qui con l'edizione da aprire.
  const [selezionataId, setSelezionataId] = useState(() => location.state?.edizioneId || null);
  const [inModifica, setInModifica] = useState(false);

  const sonoRedazione = puoRedigere(utente);
  const possoCancellare = puoCancellare(utente);

  // L'edizione mostrata si ricava dalla lista aggiornata, non da uno snapshot:
  // dopo una correzione si vede subito il testo nuovo.
  const mostrata = edizioni.find((e) => e._id === selezionataId) || ultimaEdizione;

  // Edizioni in ordine di giornata: la precedente e la successiva di quella aperta.
  const ordinate = [...edizioni].sort((a, b) => a.giornataNumero - b.giornataNumero);
  const posizione = mostrata ? ordinate.findIndex((e) => e._id === mostrata._id) : -1;
  const precedente = posizione > 0 ? ordinate[posizione - 1] : null;
  const successiva = posizione >= 0 && posizione < ordinate.length - 1 ? ordinate[posizione + 1] : null;

  const apri = (e) => {
    setSelezionataId(e._id);
    document.querySelector('.contenuto')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const elimina = async () => {
    try {
      await api.delete(`/api/edizioni/${mostrata._id}`);
      setSelezionataId(null);
      await ricaricaTutto();
      mostraToast('Edizione eliminata.');
    } catch (err) {
      mostraToast(err.message);
    }
  };

  if (!mostrata) {
    return (
      <div className="ritagli">
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">La rotativa è ferma</h2>
          <p className="ritaglio-vuoto">Nessuna edizione in edicola: il direttore di turno sta cercando l&apos;ispirazione.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="ritagli gazzetta">
      <div className="edicola">
        <div className="edicola-testa">
          <span className="titolo">Le edizioni</span>
          <button type="button" className="bottone-link" onClick={() => navigate('/archivio')}>Tutto l&apos;archivio →</button>
        </div>
        <div className="edicola-fila">
          {[...ordinate].reverse().slice(0, 10).map((e) => (
            <button
              key={e._id}
              type="button"
              className={`copertina${e._id === mostrata._id ? ' scelta' : ''}`}
              onClick={() => apri(e)}
              aria-current={e._id === mostrata._id ? 'true' : undefined}
            >
              <span className="num">G{e.giornataNumero}</span>
              <span className="titolo">{e.titolo}</span>
            </button>
          ))}
        </div>
      </div>

      <Article edizione={mostrata} />

      {sonoRedazione && (
        <div className="azioni-redazione">
          <button type="button" className="bottone-contorno" onClick={() => setInModifica(true)}>Modifica</button>
          {possoCancellare && (
            <BottoneElimina onConferma={elimina} etichetta="Elimina" conferma="Tocca di nuovo per eliminare" />
          )}
        </div>
      )}

      <div className="sfoglia">
        <button type="button" className="bottone-contorno" disabled={!precedente} onClick={() => precedente && apri(precedente)}>
          {precedente ? `← G${precedente.giornataNumero}` : 'Prima edizione'}
        </button>
        <button type="button" className="bottone-contorno" disabled={!successiva} onClick={() => successiva && apri(successiva)}>
          {successiva ? `G${successiva.giornataNumero} →` : `G${mostrata.giornataNumero + 1} · in stampa`}
        </button>
      </div>

      <Sheet
        aperto={inModifica}
        onChiudi={() => setInModifica(false)}
        titolo="Correggi le bozze"
        sottotitolo={`Giornata ${mostrata.giornataNumero}`}
        grande
      >
        {inModifica && <EdizioneForm edizione={mostrata} onFatto={() => setInModifica(false)} />}
      </Sheet>
    </div>
  );
}
