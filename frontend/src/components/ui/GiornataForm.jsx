import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { fantapuntiInGol } from '../../utils/regolamento';
import BottoneElimina from './BottoneElimina';
import { useAuth } from '../../context/AuthContext';
import { puoCancellare } from '../../ruoli';

const idDi = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

let contatoreRighe = 0;
const rigaId = () => `riga-${++contatoreRighe}`;
const rigaVuota = () => ({ id: rigaId(), casa: '', trasferta: '' });

// Tutto quello che riguarda una giornata sta qui: chi gioca contro chi e quanti
// fantapunti ha fatto ognuno. Un posto solo per scrivere i numeri e un posto solo
// per correggerli — prima i punteggi si inserivano pubblicando l'edizione e non
// c'era modo di rimetterci mano.
export default function GiornataForm({ giornata, onFatto }) {
  const { squadre, ricaricaTutto } = useDati();
  const { utente } = useAuth();
  const mostraToast = useToast();
  const inviandoRef = useRef(false);
  // Se chi compila tocca la spunta "conclusa" decide lui: smettiamo di spuntarla noi.
  const spuntaToccata = useRef(false);

  const [numero, setNumero] = useState(String(giornata?.numero ?? ''));
  const [serieANumero, setSerieANumero] = useState(String(giornata?.serieANumero ?? ''));
  const [data, setData] = useState(
    giornata?.data ? new Date(giornata.data).toISOString().slice(0, 16) : ''
  );
  const [conclusa, setConclusa] = useState(Boolean(giornata?.conclusa));
  // Ogni riga porta un id suo: usare l'indice come chiave React faceva sì che,
  // togliendo la riga in mezzo, le chiavi scalassero e React riciclasse i nodi —
  // con il fuoco e la tendina aperta che saltavano sulla riga sbagliata.
  const [scontri, setScontri] = useState(() => {
    const esistenti = (giornata?.accoppiamenti || []).map((a) => ({
      id: rigaId(),
      casa: idDi(a.squadraCasa),
      trasferta: idDi(a.squadraTrasferta)
    }));
    return esistenti.length ? esistenti : [rigaVuota()];
  });
  const [punteggi, setPunteggi] = useState(() => {
    const iniziali = {};
    for (const p of giornata?.punteggi || []) iniziali[idDi(p.squadra)] = String(p.punti);
    return iniziali;
  });
  const [errore, setErrore] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Una giornata nuova parte con tante righe quante sono le partite possibili, ma
  // l'elenco squadre può non essere ancora arrivato quando il foglio si apre: si
  // completa qui, e solo finché nessuno ha toccato le righe.
  const righeAutomatiche = useRef(!giornata?.accoppiamenti?.length);
  useEffect(() => {
    if (!righeAutomatiche.current || squadre.length < 4) return;
    const quante = Math.floor(squadre.length / 2);
    setScontri((righe) => {
      const vuote = righe.every((r) => !r.casa && !r.trasferta);
      if (!vuote || righe.length >= quante) return righe;
      return [...righe, ...Array.from({ length: quante - righe.length }, rigaVuota)];
    });
  }, [squadre.length]);

  // Si contano solo le righe complete, cioè quelle che verrebbero davvero inviate:
  // una riga lasciata a metà (squadra di casa scelta, avversaria ancora vuota)
  // faceva scattare l'errore "una squadra compare in due scontri" su un doppione
  // che non sarebbe mai partito.
  const impegnate = useMemo(() => {
    const conteggio = {};
    for (const s of scontri) {
      if (!s.casa || !s.trasferta) continue;
      for (const id of [s.casa, s.trasferta]) conteggio[id] = (conteggio[id] || 0) + 1;
    }
    return conteggio;
  }, [scontri]);

  const doppioni = Object.entries(impegnate).filter(([, n]) => n > 1).map(([id]) => id);
  const quantiPunteggi = Object.values(punteggi).filter((v) => v !== '' && v != null).length;

  const aggiornaScontro = (i, lato) => (e) => {
    const valore = e.target.value;
    righeAutomatiche.current = false;
    setScontri((s) => s.map((riga, j) => (j === i ? { ...riga, [lato]: valore } : riga)));
  };

  const aggiornaPunteggio = (id) => (e) => {
    const valore = e.target.value;
    setPunteggi((p) => ({ ...p, [id]: valore }));
    // Chi scrive i punteggi quasi sempre sta chiudendo la giornata: la spunta si
    // mette da sola, altrimenti si inseriscono i numeri e la classifica non si muove
    // senza che sia chiaro perché.
    if (!spuntaToccata.current && valore !== '') setConclusa(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (inviandoRef.current) return;
    setErrore('');

    const n = Number(numero);
    if (!n) { setErrore('Serve il numero della giornata'); return; }

    const pieni = scontri.filter((s) => s.casa && s.trasferta);
    if (pieni.some((s) => s.casa === s.trasferta)) {
      setErrore('Una squadra non può giocare contro se stessa (nemmeno se se lo merita)');
      return;
    }
    if (doppioni.length) {
      setErrore('Una squadra compare in due scontri della stessa giornata');
      return;
    }

    const fuoriScala = Object.entries(punteggi)
      .filter(([, v]) => v !== '' && v != null)
      .find(([, v]) => Number.isNaN(Number(v)) || Number(v) < 0 || Number(v) > 200);
    if (fuoriScala) {
      setErrore('C\'è un punteggio fuori scala (0-200): controlla la digitazione.');
      return;
    }

    inviandoRef.current = true;
    setSalvando(true);
    try {
      await api.put(`/api/giornate/numero/${n}`, {
        serieANumero: serieANumero ? Number(serieANumero) : undefined,
        data: data || undefined,
        conclusa,
        accoppiamenti: pieni.map((s) => ({ squadraCasa: s.casa, squadraTrasferta: s.trasferta })),
        punteggi: Object.entries(punteggi)
          .filter(([, v]) => v !== '' && v != null)
          .map(([squadra, v]) => ({ squadra, punti: Number(v) }))
      });
      await ricaricaTutto();
      mostraToast('Giornata salvata: classifica aggiornata.');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
      inviandoRef.current = false;
    }
  };

  const elimina = async () => {
    try {
      await api.delete(`/api/giornate/${giornata._id}`);
      await ricaricaTutto();
      mostraToast('Giornata eliminata.');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    }
  };

  const opzioni = (selezionata) => (
    <>
      <option value="">Scegli…</option>
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
          <input type="number" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="es. 10" />
        </div>
        <div>
          <label>Giornata di Serie A <span className="facoltativo">facoltativo</span></label>
          <input type="number" value={serieANumero} onChange={(e) => setSerieANumero(e.target.value)} placeholder="es. 12" />
        </div>
      </div>

      <label>Fischio d'inizio <span className="facoltativo">facoltativo</span></label>
      <input
        type="datetime-local"
        className="campo-data"
        value={data}
        onChange={(e) => setData(e.target.value)}
      />
      <p className="nota-form">Se lo imposti, schedine e votazioni si chiudono da sole a quell&apos;ora.</p>

      <h2 className="section-title" style={{ marginTop: 18 }}>Scontri</h2>
      {scontri.map((s, i) => (
        <div className="scontro-riga" key={s.id}>
          <select value={s.casa} onChange={aggiornaScontro(i, 'casa')}>{opzioni(s.casa)}</select>
          <span className="vs-mini">VS</span>
          <select value={s.trasferta} onChange={aggiornaScontro(i, 'trasferta')}>{opzioni(s.trasferta)}</select>
          <button
            type="button"
            className="togli"
            onClick={() => { righeAutomatiche.current = false; setScontri((v) => v.filter((r) => r.id !== s.id)); }}
            title="Togli lo scontro"
            aria-label="Togli lo scontro"
          ><X size={16} /></button>
        </div>
      ))}
      <button type="button" className="bottone-contorno" onClick={() => { righeAutomatiche.current = false; setScontri((s) => [...s, rigaVuota()]); }}>
        + Aggiungi scontro
      </button>

      <h2 className="section-title" style={{ marginTop: 22 }}>Punteggi fantacalcio</h2>
      <p className="nota-form" style={{ marginTop: 0, marginBottom: 8 }}>
        Lascia vuoto chi non ha ancora il punteggio. Accanto compaiono i gol che ne
        escono, così un numero digitato male si vede subito.
      </p>
      <div className="punteggi-lista">
        {squadre.map((s) => {
          const valore = punteggi[s._id] ?? '';
          const gol = valore === '' ? null : fantapuntiInGol(valore);
          return (
            <div className="punteggio-riga" key={s._id}>
              <label htmlFor={`pt-${s._id}`}>{s.nome}</label>
              <input
                id={`pt-${s._id}`}
                type="number"
                step="0.5"
                inputMode="decimal"
                value={valore}
                onChange={aggiornaPunteggio(s._id)}
                placeholder="—"
              />
              <span className="gol-calcolati">{gol == null ? '' : `${gol} gol`}</span>
            </div>
          );
        })}
      </div>

      <label className="spunta">
        <input
          type="checkbox"
          checked={conclusa}
          onChange={(e) => { spuntaToccata.current = true; setConclusa(e.target.checked); }}
        />
        Giornata conclusa: i punteggi sono definitivi
      </label>
      {quantiPunteggi > 0 && !conclusa && (
        <p className="avviso-form">
          Hai inserito dei punteggi ma la giornata non è segnata come conclusa: la classifica
          non si muoverà.
        </p>
      )}

      <button className="bottone-grande" type="submit" disabled={salvando}>{salvando ? 'Aggiorno la classifica…' : 'Salva la giornata'}</button>
      {errore && <div className="errore-msg">{errore}</div>}

      {giornata?._id && puoCancellare(utente) && (
        <div className="zona-pericolo">
          <BottoneElimina
            onConferma={elimina}
            etichetta="Elimina questa giornata"
            conferma="Tocca di nuovo: sparisce con le sue schedine"
          />
        </div>
      )}
    </form>
  );
}
