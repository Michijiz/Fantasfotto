import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import BottoneElimina from './BottoneElimina';
import ImageUpload from './ImageUpload';
import { useAuth } from '../../context/AuthContext';
import { puoCancellare } from '../../ruoli';

const idDi = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

// Una voce dell'albo d'oro: stagione + squadra vincitrice, con punti e note
// facoltativi. Serve sia a crearne una nuova sia a correggerne una esistente
// (passa `voce` per la modifica).
export default function AlboForm({ voce = null, onFatto }) {
  const { squadre, ricaricaTutto } = useDati();
  const { utente } = useAuth();
  const mostraToast = useToast();
  const inviandoRef = useRef(false);

  const [stagione, setStagione] = useState(voce?.stagione || '');
  const [squadra, setSquadra] = useState(idDi(voce?.squadra));
  const [punti, setPunti] = useState(voce?.punti == null ? '' : String(voce.punti));
  const [note, setNote] = useState(voce?.note || '');
  const [secondo, setSecondo] = useState(idDi(voce?.secondo));
  const [terzo, setTerzo] = useState(idDi(voce?.terzo));
  const [foto, setFoto] = useState(voce?.foto || '');
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);

  const modifica = Boolean(voce?._id);

  const submit = async (e) => {
    e.preventDefault();
    if (inviandoRef.current) return;
    setErrore('');

    if (!stagione.trim() || !squadra) {
      setErrore('Servono la stagione e la squadra campione');
      return;
    }
    const podio = [squadra, secondo, terzo].filter(Boolean);
    if (new Set(podio).size !== podio.length) {
      setErrore('Una squadra può stare sul podio una volta sola');
      return;
    }

    inviandoRef.current = true;
    setInviando(true);

    const corpo = {
      stagione: stagione.trim(),
      squadra,
      punti: punti === '' ? undefined : Number(punti),
      note: note.trim() || undefined,
      // Sempre inviati (anche vuoti): così si possono togliere.
      secondo: secondo || '',
      terzo: terzo || '',
      foto
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
        placeholder="es. 2025/26"
      />

      <label>Squadra campione</label>
      <select value={squadra} onChange={(e) => setSquadra(e.target.value)}>
        <option value="">Scegli…</option>
        {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
      </select>

      <label>Seconda classificata <span className="facoltativo">facoltativo</span></label>
      <select value={secondo} onChange={(e) => setSecondo(e.target.value)}>
        <option value="">Nessuna</option>
        {squadre.filter((s) => s._id !== squadra && s._id !== terzo).map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
      </select>

      <label>Terza classificata <span className="facoltativo">facoltativo</span></label>
      <select value={terzo} onChange={(e) => setTerzo(e.target.value)}>
        <option value="">Nessuna</option>
        {squadre.filter((s) => s._id !== squadra && s._id !== secondo).map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
      </select>

      <label>Punti <span className="facoltativo">facoltativo</span></label>
      <input
        type="number"
        step="0.5"
        value={punti}
        onChange={(e) => setPunti(e.target.value)}
        placeholder="es. 78"
      />

      <label>Note <span className="facoltativo">facoltativo</span></label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="es. imbattuti tutta la stagione"
        maxLength={200}
      />

      <label>Foto della stagione <span className="facoltativo">facoltativa · premiazione, squadra, trofeo</span></label>
      <ImageUpload value={foto} onChange={setFoto} cartella="albo" forma="larga" />

      <button className="bottone-grande" type="submit" disabled={inviando}>
        {modifica ? 'Salva le correzioni' : 'Aggiungi all\'albo'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}

      {modifica && puoCancellare(utente) && (
        <div className="zona-pericolo">
          <BottoneElimina onConferma={elimina} etichetta="Elimina questa voce" />
        </div>
      )}
    </form>
  );
}
