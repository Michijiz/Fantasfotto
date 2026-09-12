import { useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

const idDi = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

// Una Giornata con i suoi scontri è l'unica cosa che manca per far arrivare i
// punti-lega in classifica: i fantapunti vengono già registrati quando si manda
// in stampa l'edizione, ma senza sapere chi ha giocato contro chi non si può dire
// chi ha vinto. Questo form riempie quel buco.
export default function CalendarioForm({ giornata, onFatto }) {
  const { squadre, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const inviandoRef = useRef(false);

  const [numero, setNumero] = useState(String(giornata?.numero ?? ''));
  const [serieANumero, setSerieANumero] = useState(String(giornata?.serieANumero ?? ''));
  const [data, setData] = useState(
    giornata?.data ? new Date(giornata.data).toISOString().slice(0, 16) : ''
  );
  const [scontri, setScontri] = useState(() => {
    const esistenti = (giornata?.accoppiamenti || []).map((a) => ({
      casa: idDi(a.squadraCasa),
      trasferta: idDi(a.squadraTrasferta)
    }));
    if (esistenti.length) return esistenti;
    // Tante righe quante sono le partite di un turno completo.
    const quante = Math.max(1, Math.floor((squadre.length || 2) / 2));
    return Array.from({ length: quante }, () => ({ casa: '', trasferta: '' }));
  });
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);

  // Quali squadre sono già impegnate: si mostrano lo stesso nei menu, ma segnate,
  // così l'errore si vede prima di salvare invece che dopo.
  const impegnate = useMemo(() => {
    const conteggio = {};
    for (const s of scontri) {
      for (const id of [s.casa, s.trasferta]) {
        if (id) conteggio[id] = (conteggio[id] || 0) + 1;
      }
    }
    return conteggio;
  }, [scontri]);

  const doppioni = Object.entries(impegnate).filter(([, n]) => n > 1).map(([id]) => id);

  const aggiorna = (i, lato) => (e) => {
    const valore = e.target.value;
    setScontri((s) => s.map((riga, j) => (j === i ? { ...riga, [lato]: valore } : riga)));
  };

  const aggiungiRiga = () => setScontri((s) => [...s, { casa: '', trasferta: '' }]);
  const togliRiga = (i) => setScontri((s) => s.filter((_, j) => j !== i));

  const submit = async (e) => {
    e.preventDefault();
    if (inviandoRef.current) return;
    setErrore('');

    const n = Number(numero);
    if (!n) { setErrore('Serve il numero della giornata.'); return; }

    const pieni = scontri.filter((s) => s.casa && s.trasferta);
    if (pieni.length === 0) { setErrore('Imposta almeno uno scontro.'); return; }
    if (pieni.some((s) => s.casa === s.trasferta)) {
      setErrore('Una squadra non può giocare contro se stessa.');
      return;
    }
    if (doppioni.length) {
      setErrore('Una squadra compare in due scontri della stessa giornata.');
      return;
    }

    inviandoRef.current = true;
    setInviando(true);
    try {
      await api.put(`/api/giornate/numero/${n}`, {
        serieANumero: serieANumero ? Number(serieANumero) : undefined,
        data: data || undefined,
        accoppiamenti: pieni.map((s) => ({ squadraCasa: s.casa, squadraTrasferta: s.trasferta }))
      });
      await ricaricaTutto();
      mostraToast('Calendario salvato: punti aggiornati.');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  const opzioni = (selezionata) => (
    <>
      <option value="">Seleziona...</option>
      {squadre.map((s) => (
        <option key={s._id} value={s._id}>
          {impegnate[s._id] && s._id !== selezionata ? `• ${s.nome}` : s.nome}
        </option>
      ))}
    </>
  );

  return (
    <form onSubmit={submit}>
      <div className="row2">
        <div>
          <label>Numero giornata</label>
          <input type="number" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="es. 8" />
        </div>
        <div>
          <label>Giornata di Serie A</label>
          <input type="number" value={serieANumero} onChange={(e) => setSerieANumero(e.target.value)} placeholder="facoltativo" />
        </div>
      </div>

      <label>Data e ora del primo fischio (facoltativa)</label>
      <input
        type="datetime-local"
        value={data}
        onChange={(e) => setData(e.target.value)}
        style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--ink-soft)', background: '#fff8fa' }}
      />
      <p className="nota-form">Se la imposti, le schedine si chiudono da sole a quell&apos;ora.</p>

      <h2 className="section-title" style={{ marginTop: 18 }}>Scontri</h2>
      {scontri.map((s, i) => (
        <div className="scontro-riga" key={i}>
          <select value={s.casa} onChange={aggiorna(i, 'casa')}>{opzioni(s.casa)}</select>
          <span className="vs-mini">VS</span>
          <select value={s.trasferta} onChange={aggiorna(i, 'trasferta')}>{opzioni(s.trasferta)}</select>
          <button type="button" className="togli" onClick={() => togliRiga(i)} title="Togli lo scontro">✕</button>
        </div>
      ))}

      <button type="button" className="ghost blocco" onClick={aggiungiRiga}>+ Aggiungi scontro</button>

      <button className="primary" type="submit" disabled={inviando}>Salva il calendario</button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
