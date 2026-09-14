import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import ImageUpload from './ImageUpload';

const campoIniziale = {
  giornataNumero: '', direttore: '', occhiello: '', titolo: '', corpo: '', immagineUrl: '',
  vincitore: '', puntiVincitore: '', ultimo: '', puntiUltimo: '', fenomeno: '', bidone: ''
};

const idDi = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

// Da un'edizione salvata ai campi del form (il corpo è un array di paragrafi, nel
// form è un testo con righe vuote in mezzo).
function daEdizione(ed) {
  if (!ed) return campoIniziale;
  return {
    giornataNumero: String(ed.giornataNumero ?? ''),
    direttore: ed.direttore || '',
    occhiello: ed.occhiello || '',
    titolo: ed.titolo || '',
    corpo: (ed.corpo || []).join('\n\n'),
    immagineUrl: ed.immagineUrl || '',
    vincitore: idDi(ed.stats?.vincitore),
    puntiVincitore: ed.stats?.puntiVincitore == null ? '' : String(ed.stats.puntiVincitore),
    ultimo: idDi(ed.stats?.ultimo),
    puntiUltimo: ed.stats?.puntiUltimo == null ? '' : String(ed.stats.puntiUltimo),
    fenomeno: idDi(ed.stats?.fenomeno),
    bidone: idDi(ed.stats?.bidone)
  };
}

// Serve sia a scrivere un'edizione nuova sia a correggerne una già in stampa:
// passa `edizione` per la modifica. I fantapunti NON stanno più qui — si inseriscono
// sulla giornata, dalla tab Lega → Calendario.
export default function EdizioneForm({ edizione = null, onFatto }) {
  const { squadre, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const [campi, setCampi] = useState(() => daEdizione(edizione));
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);
  const inviandoRef = useRef(false); // guardia sincrona: lo state da solo non basta a bloccare un doppio click molto ravvicinato

  const modifica = Boolean(edizione?._id);
  const set = (chiave) => (e) => setCampi((c) => ({ ...c, [chiave]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (inviandoRef.current) return;
    setErrore('');

    const corpo = campi.corpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!campi.giornataNumero || !campi.direttore || !campi.occhiello || !campi.titolo || corpo.length === 0) {
      setErrore('Compila i campi obbligatori (numero, direttore, occhiello, titolo, testo).');
      return;
    }

    inviandoRef.current = true;
    setInviando(true);

    const corpoRichiesta = {
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
      bidone: campi.bidone || undefined
    };

    try {
      if (modifica) {
        await api.put(`/api/edizioni/${edizione._id}`, corpoRichiesta);
      } else {
        await api.post('/api/edizioni', corpoRichiesta);
      }
      await ricaricaTutto();
      mostraToast(modifica ? 'Edizione corretta!' : 'Edizione mandata in stampa!');
      if (!modifica) setCampi(campoIniziale);
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setInviando(false);
      inviandoRef.current = false;
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
          <input type="number" step="0.5" value={campi.puntiVincitore} onChange={set('puntiVincitore')} placeholder="es. 78" />
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
          <input type="number" step="0.5" value={campi.puntiUltimo} onChange={set('puntiUltimo')} placeholder="es. 41" />
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
            <option value="">— automatico (l&apos;ultimo) —</option>
            {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      <p className="nota-form">
        Il Re dei Gufi non si sceglie: lo calcola l&apos;app dalle schedine azzeccate di
        quella giornata.
      </p>

      <h2 className="section-title" style={{ marginTop: 20 }}>Testo dell&apos;articolo</h2>
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

      <button className="primary" type="submit" disabled={inviando}>
        {modifica ? 'Salva le correzioni' : 'Manda in stampa'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
