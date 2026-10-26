import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import ImageUpload from './ImageUpload';
import { idDi } from '../../utils/lega';
import { formattaFantapunti } from '../../utils/regolamento';

const vuoto = { giornataNumero: '', direttore: '', occhiello: '', titolo: '', corpo: '', immagineUrl: '', didascalia: '' };

const MAX_COMMENTO = 280;

// Un commento si lega alla coppia casa-trasferta dello scontro, non al suo id: il
// calendario può essere risalvato senza che i commenti perdano il loro scontro.
const chiaveScontro = (a) => `${idDi(a.squadraCasa)}>${idDi(a.squadraTrasferta)}`;

// I commenti già scritti, indicizzati per scontro, per riempire i campi.
function commentiDa(ed) {
  const per = {};
  for (const c of ed?.commenti || []) per[`${idDi(c.squadraCasa)}>${idDi(c.squadraTrasferta)}`] = c.testo;
  return per;
}

function daEdizione(ed, firma) {
  if (!ed) return { ...vuoto, direttore: firma };
  return {
    giornataNumero: String(ed.giornataNumero ?? ''),
    direttore: ed.direttore || '',
    occhiello: ed.occhiello || '',
    titolo: ed.titolo || '',
    corpo: (ed.corpo || []).join('\n\n'),
    immagineUrl: ed.immagineUrl || '',
    didascalia: ed.didascalia || ''
  };
}

// "Si va in stampa": il modulo dell'edizione. Il tabellino non si compila più a
// mano: miglior e peggior punteggio li calcola la Gazzetta dai punteggi della
// giornata, il Re dei Gufi arriva dalle schedine. La firma è libera (pseudonimi
// ammessi) e parte dal nome di chi scrive.
export default function EdizioneForm({ edizione = null, onFatto }) {
  const { utente } = useAuth();
  const { giornate, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const [campi, setCampi] = useState(() => daEdizione(edizione, utente?.nomeVisualizzato || ''));
  const [commenti, setCommenti] = useState(() => commentiDa(edizione));
  const [errore, setErrore] = useState('');
  const [inviando, setInviando] = useState(false);
  const inviandoRef = useRef(false);

  const modifica = Boolean(edizione?._id);
  const set = (chiave) => (e) => setCampi((c) => ({ ...c, [chiave]: e.target.value }));

  const numero = Number(campi.giornataNumero);
  const giornata = numero ? giornate.find((g) => g.numero === numero) : null;
  const senzaPunteggi = numero > 0 && !(giornata?.accoppiamenti || [])
    .some((a) => a.fantapuntiCasa != null || a.fantapuntiTrasferta != null);

  // Gli scontri della giornata scelta, dal calendario: un campo per ognuno.
  const scontri = giornata?.accoppiamenti || [];

  const submit = async (e) => {
    e.preventDefault();
    if (inviandoRef.current) return;
    setErrore('');

    const corpo = campi.corpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!campi.giornataNumero || !campi.direttore.trim() || !campi.occhiello.trim() || !campi.titolo.trim() || corpo.length === 0) {
      setErrore('Mancano dei pezzi: giornata, firma, occhiello, titolo e testo sono obbligatori');
      return;
    }

    inviandoRef.current = true;
    setInviando(true);
    const dati = {
      giornataNumero: numero,
      direttore: campi.direttore.trim(),
      occhiello: campi.occhiello.trim(),
      titolo: campi.titolo.trim(),
      corpo,
      immagineUrl: campi.immagineUrl || '',
      didascalia: campi.didascalia.trim(),
      // Solo gli scontri della giornata scelta e solo quelli con del testo: se hai
      // cambiato numero di giornata, i commenti scritti per l'altra non partono.
      commenti: scontri
        .map((a) => ({
          squadraCasa: idDi(a.squadraCasa),
          squadraTrasferta: idDi(a.squadraTrasferta),
          testo: (commenti[chiaveScontro(a)] || '').trim()
        }))
        .filter((c) => c.testo)
    };

    try {
      if (modifica) await api.put(`/api/edizioni/${edizione._id}`, dati);
      else await api.post('/api/edizioni', dati);
      await ricaricaTutto();
      mostraToast(modifica ? 'Edizione corretta!' : 'Edizione mandata in stampa!');
      if (!modifica) {
        setCampi(daEdizione(null, utente?.nomeVisualizzato || ''));
        setCommenti({});
      }
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="e-numero">Numero giornata</label>
      <input id="e-numero" type="number" inputMode="numeric" value={campi.giornataNumero} onChange={set('giornataNumero')} placeholder="es. 9" />

      <label htmlFor="e-firma">Firma</label>
      <input id="e-firma" type="text" value={campi.direttore} onChange={set('direttore')} placeholder="Il tuo nome o uno pseudonimo" />

      <label htmlFor="e-occhiello">Occhiello</label>
      <input id="e-occhiello" type="text" value={campi.occhiello} onChange={set('occhiello')} placeholder="Es. Il caso" />

      <label htmlFor="e-titolo">Titolo</label>
      <input id="e-titolo" type="text" value={campi.titolo} onChange={set('titolo')} placeholder="Es. Sono i re di questa giornata!" />

      <label htmlFor="e-pezzo">Il pezzo</label>
      <textarea id="e-pezzo" rows={9} value={campi.corpo} onChange={set('corpo')} placeholder="Scrivi qui. Lascia una riga vuota tra un paragrafo e l'altro." />

      {numero > 0 && (
        <fieldset className="partita-per-partita">
          <legend>Partita per partita <span className="facoltativo">facoltativo</span></legend>
          {scontri.length === 0 ? (
            <p className="nota-form">
              Il calendario della G{numero} non c&apos;è ancora: appena lo carichi, qui compaiono gli scontri e puoi scrivere due righe su ognuno.
            </p>
          ) : (
            <>
              <p className="nota-form">Due righe per scontro, solo dove hai qualcosa da dire. Quelli lasciati vuoti non compaiono.</p>
              {scontri.map((a, i) => {
                const chiave = chiaveScontro(a);
                const testo = commenti[chiave] || '';
                const gol = a.golCasa != null && a.golTrasferta != null ? ` (${a.golCasa}–${a.golTrasferta})` : '';
                return (
                  <div className="partita-campo" key={a._id || chiave}>
                    <label htmlFor={`e-partita-${i}`}>
                      {a.squadraCasa?.nome || 'Casa'} – {a.squadraTrasferta?.nome || 'Trasferta'}{gol}
                      {a.fantapuntiCasa != null && a.fantapuntiTrasferta != null && (
                        <span className="facoltativo"> · {formattaFantapunti(a.fantapuntiCasa)} a {formattaFantapunti(a.fantapuntiTrasferta)}</span>
                      )}
                    </label>
                    <textarea
                      id={`e-partita-${i}`}
                      rows={2}
                      maxLength={MAX_COMMENTO}
                      value={testo}
                      onChange={(ev) => setCommenti((c) => ({ ...c, [chiave]: ev.target.value }))}
                      placeholder="Es. Un derby da tregua armata: pareggio che non fa male a nessuno"
                    />
                    <span className="conta">{testo.length}/{MAX_COMMENTO}</span>
                  </div>
                );
              })}
            </>
          )}
        </fieldset>
      )}

      <ImageUpload
        label="Foto (facoltativa)"
        value={campi.immagineUrl}
        onChange={(url) => setCampi((c) => ({ ...c, immagineUrl: url }))}
      />

      <label htmlFor="e-didascalia">Didascalia <span className="facoltativo">facoltativa</span></label>
      <input id="e-didascalia" type="text" maxLength={140} value={campi.didascalia} onChange={set('didascalia')} placeholder="Es. Nella foto: la lavagna tattica" />

      <p className="nota-form">
        Miglior e peggior punteggio li calcola la Gazzetta dai punteggi della giornata. Il Re dei Gufi arriva dalle schedine.
      </p>
      {senzaPunteggi && (
        <p className="nota-form avviso">
          I punteggi della G{numero} non ci sono ancora: il tabellino resterà vuoto finché non li inserisci.
        </p>
      )}

      <button className="bottone-grande" type="submit" disabled={inviando}>
        {modifica
          ? (inviando ? 'Correggo le bozze…' : 'Salva le correzioni')
          : (inviando ? 'In stampa…' : 'Manda in stampa')}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
