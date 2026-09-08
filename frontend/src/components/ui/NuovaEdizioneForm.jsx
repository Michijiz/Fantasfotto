import { useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import ImageUpload from './ImageUpload';

const campoIniziale = {
  giornataNumero: '', direttore: '', occhiello: '', titolo: '', corpo: '', immagineUrl: '',
  vincitore: '', puntiVincitore: '', ultimo: '', puntiUltimo: '', fenomeno: '', bidone: ''
};

export default function NuovaEdizioneForm({ onFatto }) {
  const { squadre, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const [campi, setCampi] = useState(campoIniziale);
  const [punteggi, setPunteggi] = useState({});
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);

  const set = (chiave) => (e) => setCampi((c) => ({ ...c, [chiave]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrore('');

    const corpo = campi.corpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!campi.giornataNumero || !campi.direttore || !campi.occhiello || !campi.titolo || corpo.length === 0) {
      setErrore('Compila i campi obbligatori (numero, direttore, occhiello, titolo, testo).');
      return;
    }

    const punteggiSquadre = Object.entries(punteggi)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([squadra, punti]) => ({ squadra, punti: Number(punti) }));

    setInviando(true);
    try {
      await api.post('/api/edizioni', {
        giornataNumero: Number(campi.giornataNumero),
        direttore: campi.direttore,
        occhiello: campi.occhiello,
        titolo: campi.titolo,
        corpo,
        immagineUrl: campi.immagineUrl || undefined,
        vincitore: campi.vincitore || undefined,
        puntiVincitore: campi.puntiVincitore ? Number(campi.puntiVincitore) : undefined,
        ultimo: campi.ultimo || undefined,
        puntiUltimo: campi.puntiUltimo ? Number(campi.puntiUltimo) : undefined,
        fenomeno: campi.fenomeno || undefined,
        bidone: campi.bidone || undefined,
        punteggiSquadre
      });
      await ricaricaTutto();
      mostraToast('Edizione mandata in stampa!');
      setCampi(campoIniziale);
      setPunteggi({});
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setInviando(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>Numero giornata</label>
      <input type="number" value={campi.giornataNumero} onChange={set('giornataNumero')} placeholder="es. 8" />

      <label>Direttore di turno</label>
      <input type="text" value={campi.direttore} onChange={set('direttore')} placeholder="Chi scrive stavolta?" />

      <div className="row2">
        <div>
          <label>Vincitore giornata</label>
          <select value={campi.vincitore} onChange={set('vincitore')}>
            <option value="">Seleziona...</option>
            {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Punti vincitore</label>
          <input type="number" value={campi.puntiVincitore} onChange={set('puntiVincitore')} placeholder="es. 78" />
        </div>
      </div>

      <div className="row2">
        <div>
          <label>Ultimo classificato</label>
          <select value={campi.ultimo} onChange={set('ultimo')}>
            <option value="">Seleziona...</option>
            {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Punti ultimo</label>
          <input type="number" value={campi.puntiUltimo} onChange={set('puntiUltimo')} placeholder="es. 41" />
        </div>
      </div>

      <div className="row2">
        <div>
          <label>Fenomeno (opzionale)</label>
          <select value={campi.fenomeno} onChange={set('fenomeno')}>
            <option value="">— automatico (il vincitore) —</option>
            {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Bidone (opzionale)</label>
          <select value={campi.bidone} onChange={set('bidone')}>
            <option value="">— automatico (l'ultimo) —</option>
            {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 20 }}>Testo dell'articolo</h2>
      <label>Occhiello</label>
      <input type="text" value={campi.occhiello} onChange={set('occhiello')} placeholder="completa la frase..." />
      <label>Titolo</label>
      <input type="text" value={campi.titolo} onChange={set('titolo')} placeholder="es. Sono i re di questa giornata!" />
      <label>Corpo (un paragrafo per riga vuota tra i blocchi)</label>
      <textarea rows={8} value={campi.corpo} onChange={set('corpo')} placeholder={'Primo paragrafo...\n\nSecondo paragrafo...'} />

      <ImageUpload
        label="Foto dell'edizione (opzionale, grande in prima pagina)"
        value={campi.immagineUrl}
        onChange={(url) => setCampi((c) => ({ ...c, immagineUrl: url }))}
      />

      <label style={{ marginTop: 20 }}>Punteggi delle squadre (opzionale, alimenta il Tabellone)</label>
      <div className="punteggi-grid">
        {squadre.map((s) => (
          <div className="punteggio-item" key={s._id}>
            <label>{s.nome}</label>
            <input
              type="number"
              value={punteggi[s._id] ?? ''}
              onChange={(e) => setPunteggi((p) => ({ ...p, [s._id]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <button className="primary" type="submit" disabled={inviando}>Manda in stampa</button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
