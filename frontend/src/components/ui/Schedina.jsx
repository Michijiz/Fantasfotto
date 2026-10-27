import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X as Croce, CaretDown, CaretUp, Eye, Lock, LockOpen } from '@phosphor-icons/react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { puoRedigere } from '../../ruoli';
import { useToast } from '../../context/ToastContext';
import Stemma from './Stemma';
import { formattaQuota, formattaFantapunti } from '../../utils/regolamento';

const SEGNI = ['1', 'X', '2'];

// '1' | 'X' | '2' già uscito, oppure null se lo scontro non ha ancora un risultato.
const esitoReale = (a) => {
  if (a.golCasa == null || a.golTrasferta == null) return null;
  if (a.golCasa > a.golTrasferta) return '1';
  if (a.golCasa < a.golTrasferta) return '2';
  return 'X';
};

// La data è solo un'informazione: il banco lo chiude la redazione, non l'orologio.
function tempo(giornata, chiusa) {
  if (giornata?.conclusa) return 'fischio finale';
  if (chiusa) return 'banco chiuso';
  if (!giornata?.data) return null;
  const diff = new Date(giornata.data).getTime() - Date.now();
  if (diff <= 0) return null;
  return `fischio d'inizio tra ${Math.floor(diff / 86400000)}g ${Math.floor((diff % 86400000) / 3600000)}h`;
}

// L'esito in cima al cedolino dopo la chiusura, in parole semplici.
function esitoTesto(giornata, miaSchedina) {
  if (!miaSchedina) return null;
  if (miaSchedina.esito === 'vinta') return 'Vinta';
  if (miaSchedina.esito === 'persa') {
    const scontri = giornata.accoppiamenti || [];
    const giusti = (miaSchedina.pronostici || []).filter((p) => {
      const a = scontri.find((x) => String(x._id) === String(p.accoppiamento));
      return a && esitoReale(a) === p.esito;
    }).length;
    return `Persa, ${giusti} su ${scontri.length}`;
  }
  return 'In attesa dei risultati';
}

function Scontro({ a, scelta, quotaGiocata, soloLettura, onScegli }) {
  const uscito = esitoReale(a);
  const haFantapunti = a.fantapuntiCasa != null && a.fantapuntiTrasferta != null;
  const pariConPuntiDiversi = uscito === 'X' && haFantapunti && a.fantapuntiCasa !== a.fantapuntiTrasferta;
  return (
    <div className="cedolino-scontro">
      <div className="squadre">
        <Stemma src={a.squadraCasa?.stemma} nome={a.squadraCasa?.nome} size={32} />
        <span className="nome casa">{a.squadraCasa?.nome}</span>
        <span className="vs">vs</span>
        <span className="nome trasferta">{a.squadraTrasferta?.nome}</span>
        <Stemma src={a.squadraTrasferta?.stemma} nome={a.squadraTrasferta?.nome} size={32} />
      </div>
      <div className="segni">
        {SEGNI.map((segno) => {
          // Quote vive dalla giornata; a banco chiuso quella congelata sulla schedina.
          const quota = a.quote?.[segno] ?? (scelta === segno ? quotaGiocata : null);
          const giusto = soloLettura && uscito && scelta === segno && uscito === segno;
          const sbagliato = soloLettura && uscito && scelta === segno && uscito !== segno;
          return (
            <button
              key={segno}
              type="button"
              disabled={soloLettura}
              aria-pressed={scelta === segno}
              className={`segno${scelta === segno ? ' scelto' : ''}${uscito === segno ? ' uscito' : ''}`}
              onClick={() => onScegli(String(a._id), segno)}
            >
              <b>{segno}</b>
              <span>{quota ? formattaQuota(quota) : '·'}</span>
              {giusto && <Check className="spunta" size={18} weight="bold" aria-label="azzeccato" />}
              {sbagliato && <Croce className="spunta" size={18} weight="bold" aria-label="sbagliato" />}
            </button>
          );
        })}
      </div>
      {soloLettura && uscito && (
        <span className="dettaglio risultato">
          Risultato: {a.golCasa} – {a.golTrasferta}
          {haFantapunti && <> · fantapunti {formattaFantapunti(a.fantapuntiCasa)} / {formattaFantapunti(a.fantapuntiTrasferta)}</>}
          {/* L'esito si decide sui gol, non sui fantapunti: se i punti differiscono ma i gol
              sono pari, senza questa riga sembrerebbe un errore dell'app. */}
          {pariConPuntiDiversi && <><br />Pari sui gol: conta il risultato, non i fantapunti</>}
        </span>
      )}
    </div>
  );
}

// Gli altri gufi: prima della chiusura chi ha consegnato e con che quota; dopo,
// anche l'esito, e toccando una riga i suoi pronostici.
function AltriGufi({ giornata, chiusa }) {
  const { squadre } = useDati();
  const { utente } = useAuth();
  const mia = typeof utente?.squadra === 'object' ? utente?.squadra?._id : utente?.squadra;
  const [dati, setDati] = useState(null);
  const [aperta, setAperta] = useState(null);
  const numero = giornata?.numero;

  useEffect(() => {
    if (!numero) return undefined;
    let attivo = true;
    let inCorso = false;
    const carica = () => {
      if (inCorso || document.visibilityState !== 'visible') return;
      inCorso = true;
      api.get(`/api/schedine/giornata/${numero}`)
        .then((d) => { if (attivo) setDati(d); })
        .catch(() => { if (attivo) setDati(null); })
        .finally(() => { inCorso = false; });
    };
    carica();
    // A banco aperto la lista cambia: un poll leggero, in pausa a scheda nascosta.
    const intervallo = chiusa ? null : setInterval(carica, 30000);
    if (!chiusa) document.addEventListener('visibilitychange', carica);
    return () => {
      attivo = false;
      if (intervallo) clearInterval(intervallo);
      document.removeEventListener('visibilitychange', carica);
    };
  }, [numero, chiusa]);

  if (!dati) return null;

  let righe;
  if (!dati.chiusa) {
    const consegnate = new Map((dati.partecipanti || []).map((p) => [p.squadra?._id, p]));
    righe = squadre.filter((s) => s._id !== mia).map((s) => ({
      chiave: s._id, squadra: s,
      quota: consegnate.has(s._id) ? formattaQuota(consegnate.get(s._id).quotaTotale) : '—',
      stato: consegnate.has(s._id) ? 'Consegnata' : 'Non ancora'
    }));
    if (consegnate.size === 0) righe = [];
  } else {
    righe = (dati.schedine || []).filter((s) => s.squadra?._id !== mia).map((s) => ({
      chiave: s._id, squadra: s.squadra, quota: formattaQuota(s.quotaTotale),
      stato: s.esito === 'vinta' ? 'Vinta' : s.esito === 'persa' ? 'Persa' : 'In attesa', schedina: s
    }));
  }

  return (
    <section className="ritaglio">
      <div className="ritaglio-occhiello"><span>Gli altri gufi</span><span className="filo" /></div>
      {righe.length === 0 ? (
        <p className="ritaglio-vuoto">Nessun gufo in giro, per ora.</p>
      ) : (
        <div className="gufi">
          {righe.map((r) => (
            <div key={r.chiave}>
              <button
                type="button"
                className="gufo"
                disabled={!r.schedina}
                onClick={() => setAperta(aperta === r.chiave ? null : r.chiave)}
                aria-expanded={r.schedina ? aperta === r.chiave : undefined}
              >
                <Stemma src={r.squadra?.stemma} nome={r.squadra?.nome} size={36} />
                <span className="nome">{r.squadra?.nome}</span>
                <span className="dx">
                  <b>{r.quota}</b>
                  <span className="dettaglio">{r.stato}</span>
                </span>
              </button>
              {aperta === r.chiave && r.schedina && (
                <div className="gufo-pronostici">
                  {(r.schedina.pronostici || []).map((p) => (
                    <span key={String(p.accoppiamento)} className="dettaglio">
                      {p.squadraCasa?.nome} – {p.squadraTrasferta?.nome}: <b>{p.esito}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Cedolino({ giornata, miaSchedina, chiusa, onSalvato }) {
  const mostraToast = useToast();
  const [scelte, setScelte] = useState({});
  const [inviando, setInviando] = useState(false);
  // Consegnare è definitivo: il primo tocco chiede conferma, il secondo consegna.
  const [conferma, setConferma] = useState(false);
  const inviandoRef = useRef(false);

  useEffect(() => {
    const iniziali = {};
    for (const p of miaSchedina?.pronostici || []) iniziali[String(p.accoppiamento)] = p.esito;
    setScelte(iniziali);
  }, [miaSchedina]);

  const scontri = useMemo(() => giornata?.accoppiamenti || [], [giornata]);
  const quoteGiocate = useMemo(() => {
    const q = {};
    for (const p of miaSchedina?.pronostici || []) q[String(p.accoppiamento)] = p.quota;
    return q;
  }, [miaSchedina]);

  const fatti = scontri.filter((a) => scelte[String(a._id)]).length;
  const completa = scontri.length > 0 && fatti === scontri.length;
  const quotaTotale = useMemo(() => {
    const scelti = scontri.filter((a) => scelte[String(a._id)]);
    if (scelti.length === 0) return null;
    return Math.round(scelti.reduce((acc, a) => acc * (a.quote?.[scelte[String(a._id)]] ?? 1), 1) * 100) / 100;
  }, [scontri, scelte]);

  // La conferma si spegne da sola se ci si ripensa, e a ogni modifica del cedolino.
  useEffect(() => {
    if (!conferma) return undefined;
    const t = setTimeout(() => setConferma(false), 6000);
    return () => clearTimeout(t);
  }, [conferma]);

  const scegli = (id, segno) => {
    setConferma(false);
    setScelte((s) => ({ ...s, [id]: segno }));
  };

  const consegna = async () => {
    if (!completa) { mostraToast('Manca un pronostico: la multipla è una sola.'); return; }
    if (!conferma) { setConferma(true); return; }
    if (inviandoRef.current) return;
    inviandoRef.current = true;
    setInviando(true);
    try {
      await api.post('/api/schedine', {
        giornataNumero: giornata.numero,
        pronostici: scontri.map((a) => ({ accoppiamento: a._id, esito: scelte[String(a._id)] }))
      });
      await onSalvato();
      mostraToast('Consegnata. Ora i gufi aspettano');
    } catch (err) {
      mostraToast(err.message);
      // Il server ha rifiutato (banco chiuso nel frattempo, o schedina già consegnata
      // da un altro dispositivo): si ricarica perché la pagina dica lo stato vero.
      await onSalvato();
    } finally {
      setConferma(false);
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  const t = tempo(giornata, chiusa);
  const esito = chiusa ? esitoTesto(giornata, miaSchedina) : null;
  const etichettaBottone = inviando ? 'Consegno…' : conferma ? 'Conferma: non si cambia più' : 'Consegna';
  const bottoneSpento = !completa;

  return (
    <>
      <section className="ritaglio cedolino">
        <div className="cedolino-testa">
          <div className="ritaglio-testa">
            <span className="occhiello-oro">Cedolino · Giornata {giornata.numero}</span>
            {t && <span className="chip-tempo">{t}</span>}
          </div>
          <h1 className="ritaglio-titolo">Gufa la giornata</h1>
          {esito && <span className={`cedolino-esito ${miaSchedina?.esito || ''}`}>{esito}</span>}
          {chiusa && !miaSchedina && <p className="ritaglio-vuoto">Questa giornata non l&apos;hai gufata.</p>}
        </div>
        <div className="cedolino-filo">
          <span className="tacca sx" aria-hidden="true" />
          <span className="tacca dx" aria-hidden="true" />
        </div>
        <div className="cedolino-scontri">
          {scontri.map((a) => (
            <Scontro
              key={String(a._id)}
              a={a}
              scelta={scelte[String(a._id)]}
              quotaGiocata={quoteGiocate[String(a._id)]}
              soloLettura={chiusa}
              onScegli={scegli}
            />
          ))}
        </div>
        {!chiusa && (
          <div className="barra-consegna">
            <span className="testi">
              <span className="dettaglio">{conferma ? 'Una volta consegnata è definitiva' : `Quota · ${fatti} su ${scontri.length}`}</span>
              <b>{quotaTotale ? formattaQuota(quotaTotale) : '—'}</b>
            </span>
            <button
              type="button"
              className={`bottone-grande${bottoneSpento ? ' spento' : ''}`}
              onClick={consegna}
              aria-disabled={bottoneSpento}
              disabled={inviando}
            >
              {etichettaBottone}
            </button>
          </div>
        )}
        {chiusa && miaSchedina && (
          <div className="cedolino-totale">
            <span className="dettaglio">Quota giocata</span>
            <b>{formattaQuota(miaSchedina.quotaTotale)}</b>
          </div>
        )}
      </section>

    </>
  );
}

// "Visto" per giornata, ricordato su questo dispositivo: l'esito è un avviso che arriva
// quando i risultati sono dentro, non un blocco fisso della pagina.
const chiaveVisto = (g) => `gazzetta_esito_visto_${g.stagione ?? ''}_${g.numero}`;
const leggiVisto = (g) => { try { return localStorage.getItem(chiaveVisto(g)) === '1'; } catch { return false; } };
const segnaVisto = (g) => { try { localStorage.setItem(chiaveVisto(g), '1'); } catch { /* storage non disponibile */ } };

// Com'è andata la giornata appena chiusa, in cima alla pagina. Appena i risultati sono
// inseriti l'esito compare in evidenza; con "Visto" si riduce a una riga, e il cedolino
// completo (pronostici, fantapunti, gli altri gufi) resta a un tocco. L'esito non si
// può segnare come visto finché è "in attesa": sarebbe sparito prima di sapere com'è andata.
function EsitoPrecedente({ precedente, onSalvato, apertoInizio = false }) {
  const { giornata, miaSchedina } = precedente || {};
  const [visto, setVisto] = useState(() => (giornata ? leggiVisto(giornata) : true));
  const [aperto, setAperto] = useState(apertoInizio);
  if (!giornata) return null;

  const risolta = miaSchedina && miaSchedina.esito !== 'attesa';
  const esito = miaSchedina ? esitoTesto(giornata, miaSchedina) : 'Non giocata';
  const evidenza = miaSchedina && (!visto || !risolta);
  const Freccia = aperto ? CaretUp : CaretDown;
  const chiudiAvviso = () => { segnaVisto(giornata); setVisto(true); };

  return (
    <>
      {evidenza ? (
        <section className="ritaglio esito-precedente">
          <div className="ritaglio-testa">
            <span className="occhiello-oro">Giornata {giornata.numero} · com&apos;è andata</span>
          </div>
          <span className={`cedolino-esito ${miaSchedina.esito || ''}`}>{esito}</span>
          <span className="dettaglio">Quota giocata {formattaQuota(miaSchedina.quotaTotale)}</span>
          <div className="esito-azioni">
            <button type="button" className="bottone-contorno" aria-expanded={aperto} onClick={() => setAperto(!aperto)}>
              <Freccia size={16} weight="bold" /> {aperto ? 'Nascondi il cedolino' : 'Vedi il cedolino'}
            </button>
            {risolta && <button type="button" className="bottone-contorno" onClick={chiudiAvviso}>Visto</button>}
          </div>
        </section>
      ) : (
        <button type="button" className="esito-riga" aria-expanded={aperto} onClick={() => setAperto(!aperto)}>
          <span>Giornata {giornata.numero} · {esito}</span>
          <Freccia size={16} weight="bold" />
        </button>
      )}
      {aperto && (
        <>
          <Cedolino giornata={giornata} miaSchedina={miaSchedina} chiusa onSalvato={onSalvato} />
          <AltriGufi giornata={giornata} chiusa />
        </>
      )}
    </>
  );
}

// Dieci e più posatoi sulla chioma: ogni squadra della lega ne prende uno, nell'ordine
// dell'elenco. Oltre i dodici non c'è più posto sull'albero e i gufi in più non si
// disegnano (il conteggio a parole resta quello vero).
const POSATOI = [
  [190, 82], [130, 104], [252, 106], [100, 154], [164, 138], [226, 142],
  [284, 158], [190, 186], [146, 64], [236, 66], [140, 184], [244, 184]
];

// Albero notturno con un paio d'occhi per ogni squadra: aperti se ha consegnato,
// una lineetta se dorme. Quello col cerchio rosa è il tuo. Colori fissi: è una
// scena, non una parte del tema.
function ScenaAlbero({ gufi, descrizione }) {
  return (
    <svg className="albero-gufi" viewBox="0 40 380 240" role="img" aria-label={descrizione}>
      <defs>
        <g id="gufo-occhi">
          <circle cx="-9" r="7" fill="#f2c24b" /><circle cx="9" r="7" fill="#f2c24b" />
          <circle cx="-9" r="3.4" fill="#1d1722" /><circle cx="9" r="3.4" fill="#1d1722" />
        </g>
      </defs>
      <rect y="40" width="380" height="240" fill="#1d1722" />
      <circle cx="325" cy="64" r="17" fill="#efe6c8" /><circle cx="333" cy="60" r="15" fill="#1d1722" />
      <rect y="268" width="380" height="12" fill="#120d10" />
      <path d="M190 284C186 245 192 205 188 155" fill="none" stroke="#3a2a22" strokeWidth="30" strokeLinecap="round" />
      <ellipse cx="190" cy="112" rx="125" ry="70" fill="#26382d" />
      <ellipse cx="112" cy="155" rx="70" ry="45" fill="#26382d" />
      <ellipse cx="268" cy="155" rx="70" ry="45" fill="#26382d" />
      <ellipse cx="190" cy="182" rx="88" ry="40" fill="#26382d" />
      <ellipse cx="148" cy="98" rx="62" ry="38" fill="#2f4435" />
      <ellipse cx="235" cy="104" rx="62" ry="38" fill="#2f4435" />
      <ellipse cx="190" cy="152" rx="72" ry="40" fill="#2f4435" />
      {gufi.slice(0, POSATOI.length).map((g, i) => {
        const [x, y] = POSATOI[i];
        return (
          <g key={g.chiave}>
            {g.mio && <ellipse cx={x} cy={y} rx="22" ry="12" fill="none" stroke="#e58fa6" strokeWidth="1.5" />}
            {g.sveglio
              ? <use href="#gufo-occhi" x={x} y={y} className="occhi" style={{ animationDelay: `${(i * 0.9) % 5}s` }} />
              : <path d={`M${x - 15} ${y}H${x - 5}M${x + 5} ${y}H${x + 15}`} stroke="#6e5f66" strokeWidth="2" strokeLinecap="round" fill="none" />}
          </g>
        );
      })}
    </svg>
  );
}

// Dopo la consegna il cedolino sparisce: restano i gufi che aspettano il fischio
// finale e un tasto piccolo per rivedere la propria schedina (in sola lettura).
function AlberoGufi({ giornata, miaSchedina, chiusa }) {
  const { squadre } = useDati();
  const { utente } = useAuth();
  const mia = typeof utente?.squadra === 'object' ? utente?.squadra?._id : utente?.squadra;
  const [dati, setDati] = useState(null);
  const [vedi, setVedi] = useState(false);
  const numero = giornata.numero;

  useEffect(() => {
    let attivo = true;
    let inCorso = false;
    const carica = () => {
      if (inCorso || document.visibilityState !== 'visible') return;
      inCorso = true;
      api.get(`/api/schedine/giornata/${numero}`)
        .then((d) => { if (attivo) setDati(d); })
        .catch(() => { /* resta l'ultimo conteggio noto */ })
        .finally(() => { inCorso = false; });
    };
    carica();
    // Gli altri consegnano mentre guardi: un poll leggero, fermo a scheda nascosta.
    const intervallo = setInterval(carica, 30000);
    document.addEventListener('visibilitychange', carica);
    return () => {
      attivo = false;
      clearInterval(intervallo);
      document.removeEventListener('visibilitychange', carica);
    };
  }, [numero]);

  // La mia consegna la so già io, anche se l'elenco del server non è ancora arrivato.
  const consegnate = new Set([
    ...(dati?.partecipanti || []).map((p) => p.squadra?._id),
    ...(dati?.schedine || []).map((s) => s.squadra?._id),
    mia
  ].filter(Boolean));
  const gufi = squadre.map((s) => ({ chiave: s._id, sveglio: consegnate.has(s._id), mio: s._id === mia }));
  const svegli = gufi.filter((g) => g.sveglio).length;

  return (
    <>
      <section className="ritaglio albero-scheda">
        <div className="ritaglio-testa">
          <span className="occhiello-oro">Cedolino · Giornata {giornata.numero}</span>
          <span className="chip-tempo">Consegnata</span>
        </div>
        <ScenaAlbero
          gufi={gufi}
          descrizione={`Albero con i gufi: ${svegli} su ${gufi.length} hanno consegnato, il tuo ha il cerchio rosa`}
        />
        <h1 className="ritaglio-titolo medio">I gufi aspettano il fischio finale</h1>
        <p className="dettaglio">
          {svegli} su {gufi.length} hanno già consegnato. Il gufo col cerchio rosa è il tuo.
          {chiusa ? ' Il banco è chiuso.' : ' Il banco è ancora aperto: gli altri possono consegnare.'}
        </p>
        <p className="dettaglio albero-blocco"><Lock size={15} weight="bold" aria-hidden="true" /> Consegnata: non si può più cambiare.</p>
        <button type="button" className="bottone-contorno" aria-expanded={vedi} onClick={() => setVedi(!vedi)}>
          <Eye size={16} weight="bold" /> {vedi ? 'Nascondi la mia schedina' : 'Vedi la mia schedina'}
        </button>
      </section>
      {vedi && <Cedolino giornata={giornata} miaSchedina={miaSchedina} chiusa onSalvato={() => {}} />}
    </>
  );
}

// Giornata finita, schedina consegnata ma ancora da scoprire: l'esito non si mostra
// da solo. Il tocco è registrato sul server, così vale su ogni dispositivo.
function RivelaEsito({ giornata, onRivelata }) {
  const mostraToast = useToast();
  const { squadre } = useDati();
  const { utente } = useAuth();
  const mia = typeof utente?.squadra === 'object' ? utente?.squadra?._id : utente?.squadra;
  const [invio, setInvio] = useState(false);
  const gufi = squadre.map((s) => ({ chiave: s._id, sveglio: true, mio: s._id === mia }));

  const scopri = async () => {
    if (invio) return;
    setInvio(true);
    try {
      await onRivelata(giornata.numero);
    } catch (err) {
      mostraToast(err.message);
      setInvio(false);
    }
  };

  return (
    <section className="ritaglio albero-scheda">
      <div className="ritaglio-testa">
        <span className="occhiello-oro">Cedolino · Giornata {giornata.numero}</span>
        <span className="chip-tempo">Giornata conclusa</span>
      </div>
      <ScenaAlbero gufi={gufi} descrizione="Albero con i gufi voltati verso di te" />
      <h1 className="ritaglio-titolo medio">Il fischio finale è suonato</h1>
      <p className="dettaglio">I gufi hanno fatto il loro dovere. Ora tocca a te sapere com&apos;è andata.</p>
      <button type="button" className="bottone-grande" onClick={scopri} disabled={invio}>
        <Eye size={20} weight="bold" aria-hidden="true" /> {invio ? 'Giro i gufi…' : 'Scopri se hai gufato bene'}
      </button>
    </section>
  );
}

// Com'è andata la giornata appena chiusa. Se la schedina c'è e non l'hai ancora
// scoperta, prima viene la rivelazione; dopo, l'esito col cedolino già aperto e i
// pronostici degli altri gufi. Prima compariva solo quando non c'era nessuna
// giornata aperta: con il calendario caricato per tutta la stagione ce n'è sempre
// una successiva, e l'esito spariva dalla pagina senza che nessuno lo vedesse.
function Precedente({ precedente, onSalvato }) {
  const [appena, setAppena] = useState(null);
  if (!precedente?.giornata) return null;
  const { giornata, miaSchedina } = precedente;

  if (miaSchedina && !miaSchedina.rivelataIl) {
    const rivela = async (numero) => {
      await api.post(`/api/schedine/rivela/${numero}`);
      setAppena(numero);
      await onSalvato();
    };
    return <RivelaEsito giornata={giornata} onRivelata={rivela} />;
  }
  return (
    <EsitoPrecedente
      key={giornata._id}
      precedente={precedente}
      onSalvato={onSalvato}
      apertoInizio={appena === giornata.numero}
    />
  );
}

// Il banco lo chiude la redazione, a mano, quando partono le partite. Due tocchi
// per chiudere (si può riaprire, ma i gufi se ne accorgono); uno per riaprire.
function BancoRedazione({ giornata, chiusa, onCambiato }) {
  const mostraToast = useToast();
  const [conferma, setConferma] = useState(false);
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    if (!conferma) return undefined;
    const t = setTimeout(() => setConferma(false), 6000);
    return () => clearTimeout(t);
  }, [conferma]);

  const imposta = async (chiuse) => {
    if (invio) return;
    setInvio(true);
    try {
      await api.put(`/api/schedine/banco/${giornata.numero}`, { chiuse });
      await onCambiato();
      mostraToast(chiuse ? 'Banco chiuso: niente più schedine.' : 'Banco riaperto.');
    } catch (err) {
      mostraToast(err.message);
    } finally {
      setConferma(false);
      setInvio(false);
    }
  };

  const Icona = chiusa ? LockOpen : Lock;
  return (
    <section className="ritaglio banco-redazione">
      <div className="ritaglio-testa">
        <span className="occhiello-oro">Redazione · Giornata {giornata.numero}</span>
        <span className="chip-tempo">{chiusa ? 'Banco chiuso' : 'Banco aperto'}</span>
      </div>
      <p className="dettaglio">
        {chiusa
          ? 'Nessuno può più consegnare. Si chiude da sola la giornata quando la segni conclusa.'
          : 'Chiudi il banco quando partono le partite: dopo, nessuno potrà più consegnare.'}
      </p>
      <button
        type="button"
        className="bottone-contorno"
        disabled={invio}
        onClick={() => (chiusa ? imposta(false) : conferma ? imposta(true) : setConferma(true))}
      >
        <Icona size={16} weight="bold" aria-hidden="true" />
        {' '}{chiusa ? 'Riapri il banco' : conferma ? 'Conferma: chiudi il banco' : 'Chiudi il banco'}
      </button>
    </section>
  );
}

export default function Schedina() {
  const { schedina, ricaricaSchedina } = useDati();
  const { utente } = useAuth();
  const { giornata, miaSchedina, chiusa, motivo, precedente } = schedina;

  if (!giornata) {
    return (
      <div className="ritagli">
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Banco chiuso</h2>
          <p className="ritaglio-vuoto">Si torna a gufare alla prossima giornata.</p>
        </section>
        <Precedente precedente={precedente} onSalvato={ricaricaSchedina} />
      </div>
    );
  }

  if (motivo === 'calendario-mancante' || !giornata.accoppiamenti?.length) {
    return (
      <div className="ritagli">
        <Precedente precedente={precedente} onSalvato={ricaricaSchedina} />
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Giornata {giornata.numero}</h2>
          <p className="ritaglio-vuoto">Il banco apre quando il direttore di turno imposta gli scontri.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="ritagli">
      <Precedente precedente={precedente} onSalvato={ricaricaSchedina} />
      {puoRedigere(utente) && !giornata.conclusa && (
        <BancoRedazione giornata={giornata} chiusa={chiusa} onCambiato={ricaricaSchedina} />
      )}
      {miaSchedina ? (
        <AlberoGufi giornata={giornata} miaSchedina={miaSchedina} chiusa={chiusa} />
      ) : (
        <>
          <Cedolino giornata={giornata} miaSchedina={null} chiusa={chiusa} onSalvato={ricaricaSchedina} />
          <AltriGufi giornata={giornata} chiusa={chiusa} />
        </>
      )}
    </div>
  );
}
