import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Article from '../components/ui/Article';
import Sheet from '../components/ui/Sheet';
import EdizioneForm from '../components/ui/EdizioneForm';
import BottoneElimina from '../components/ui/BottoneElimina';
import { puoRedigere, puoCancellare } from '../ruoli';

export default function Ultima() {
  const { utente } = useOutletContext();
  const { ultimaEdizione, edizioni, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const [selezionataId, setSelezionataId] = useState(null);
  const [mostraArchivio, setMostraArchivio] = useState(false);
  const [inModifica, setInModifica] = useState(false);

  const sonoRedazione = puoRedigere(utente);
  const possoCancellare = puoCancellare(utente);

  // L'edizione mostrata si ricava dalla lista aggiornata, non da uno snapshot preso
  // al momento del click: dopo una correzione si vede subito il testo nuovo.
  const edizioneMostrata = edizioni.find((e) => e._id === selezionataId) || ultimaEdizione;

  const elimina = async () => {
    try {
      await api.delete(`/api/edizioni/${edizioneMostrata._id}`);
      setSelezionataId(null);
      await ricaricaTutto();
      mostraToast('Edizione eliminata.');
    } catch (err) {
      mostraToast(err.message);
    }
  };

  return (
    <>
      <div className="card">
        <Article edizione={edizioneMostrata} />

        {sonoRedazione && edizioneMostrata && (
          <div className="azioni-admin">
            <button className="ghost" onClick={() => setInModifica(true)}>Modifica</button>
            {possoCancellare && (
              <BottoneElimina
                onConferma={elimina}
                etichetta="Elimina"
                conferma="Tocca di nuovo per eliminare"
              />
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">
          Archivio
          <button className="vedi-tutto" onClick={() => setMostraArchivio((v) => !v)}>
            {mostraArchivio ? 'Nascondi' : 'Sfoglia tutte'}
          </button>
        </h2>
        {mostraArchivio && (
          edizioni.length === 0
            ? <div className="empty">Nessuna edizione archiviata.</div>
            : edizioni.map((ed) => (
              <button
                key={ed._id}
                className={`archivio-item${ed._id === edizioneMostrata?._id ? ' corrente' : ''}`}
                onClick={() => setSelezionataId(ed._id)}
              >
                <div className="g">Giornata {ed.giornataNumero}</div>
                <h4>{ed.titolo}</h4>
              </button>
            ))
        )}
      </div>

      <Sheet
        aperto={inModifica}
        onChiudi={() => setInModifica(false)}
        titolo="Correggi l'edizione"
        sottotitolo={edizioneMostrata ? `Giornata ${edizioneMostrata.giornataNumero}` : ''}
        grande
      >
        {inModifica && edizioneMostrata && (
          <EdizioneForm edizione={edizioneMostrata} onFatto={() => setInModifica(false)} />
        )}
      </Sheet>
    </>
  );
}
