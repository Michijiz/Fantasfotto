import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import BottoneElimina from './BottoneElimina';

const idDi = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

// Una voce dell'albo d'oro: stagione + squadra vincitrice, con punti e note
// facoltativi. Serve sia a crearne una nuova sia a correggerne una esistente
// (passa `voce` per la modifica).
export default function AlboForm({ voce = null, onFatto }) {
  const { squadre, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const inviandoRef = useRef(false);

  const [stagione, setStagione] = useState(voce?.stagione || '');
  const [squadra, setSquadra] = useState(idDi(voce?.squadra));
  const [punti, setPunti] = useState(voce?.punti == null ? '' : String(voce.punti));
  const [note, setNote] = useState(voce?.note || '');
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);

  const modifica = Boolean(voce?._id);

  const submit = async (e) => {
    e.preventDefault();
    if (inviandoRef.current) return;
    setErrore('');

    if (!stagione.trim() || !squadra) {
      setErrore('Indica la stagione e la squadra vincitrice.');
      return;
    }

    inviandoRef.current = true;
    setInviando(true);

    const corpo = {
      stagione: stagione.trim(),
      squadra,
      punti: punti === '' ? undefined : Number(punti),
      note: note.trim() || undefined
    };

    try {
      if (modifica) {
        await api.put(`/api/albo/${voce._id}`, corpo);
      } else {
        await api.post('/api/albo', corpo);
      }
      await ricaricaTutto();
      mostraToast(modifica ? 'Voce corretta!' : 'Aggiunta all\'albo d\'oro!');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  const elimina = async () => {
    try {
      await api.delete(`/api/albo/${voce._id}`);
      await ricaricaTutto();
      mostraToast('Voce eliminata.');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>Stagione</label>
      <input
        type="text"
        value={stagione}
        onChange={(e) => setStagione(e.target.value)}
        placeholder="es. 2023/2024"
      />

      <label>Squadra vincitrice</label>
      <select value={squadra} onChange={(e) => setSquadra(e.target.value)}>
        <option value="">Seleziona...</option>
        {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
      </select>

      <label>Punti (facoltativo)</label>
      <input
        type="number"
        step="0.5"
        value={punti}
        onChange={(e) => setPunti(e.target.value)}
        placeholder="es. 78"
      />

      <label>Note (facoltativo)</label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="es. imbattuti tutta la stagione"
      />

      <button className="primary" type="submit" disabled={inviando}>
        {modifica ? 'Salva le correzioni' : 'Aggiungi all\'albo'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}

      {modifica && (
        <div className="zona-pericolo">
          <BottoneElimina onConferma={elimina} etichetta="Elimina questa voce" />
        </div>
      )}
    </form>
  );
}
