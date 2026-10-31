import { useState } from 'react';
import { ShareNetwork } from '@phosphor-icons/react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Article from '../components/ui/Article';
import Reazioni from '../components/ui/Reazioni';
import BottoneElimina from '../components/ui/BottoneElimina';
import { puoRedigere, puoCancellare } from '../ruoli';
import { condividiEdizione } from '../condividi';
import '../styles/gazzetta.css';

export default function Ultima() {
  const { utente } = useOutletContext();
  const { ultimaEdizione, edizioni, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Dal Profilo o dall'archivio si arriva qui con l'edizione da aprire.
  const [selezionataId, setSelezionataId] = useState(() => location.state?.edizioneId || null);

  const sonoRedazione = puoRedigere(utente);
  const possoCancellare = puoCancellare(utente);

  // L'edizione mostrata si ricava dalla lista aggiornata, non da uno snapshot:
  // dopo una correzione si vede subito il testo nuovo.
  const mostrata = edizioni.find((e) => e._id === selezionataId) || ultimaEdizione;

  const [condividendo, setCondividendo] = useState(false);
  const condividi = async () => {
    if (condividendo) return;
    setCondividendo(true);
    try {
      const esito = await condividiEdizione(mostrata);
      if (esito === 'scaricata') mostraToast('Immagine scaricata: mandala al gruppo.');
    } catch (err) {
      mostraToast(err.message || 'Non sono riuscito a creare l\'immagine');
    } finally {
      setCondividendo(false);
    }
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
          <button type="button" className="bottone-link" onClick={() => navigate('/archivio')}>Tutto l&apos;archivio →</button>
        </div>
      </div>

      <Article edizione={mostrata} />

      <Reazioni edizioneId={mostrata._id} />

      <button type="button" className="bottone-contorno" onClick={condividi} disabled={condividendo}>
        <ShareNetwork size={18} weight="bold" /> {condividendo ? 'Preparo l\'immagine…' : 'Condividi'}
      </button>

      {sonoRedazione && (
        <div className="azioni-redazione">
          <button type="button" className="bottone-contorno" onClick={() => navigate(`/gazzetta/scrivi/${mostrata._id}`)}>Modifica</button>
          {possoCancellare && (
            <BottoneElimina onConferma={elimina} etichetta="Elimina" conferma="Tocca di nuovo per eliminare" />
          )}
        </div>
      )}
    </div>
  );
}
