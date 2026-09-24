import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X as Croce } from '@phosphor-icons/react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Stemma from './Stemma';

const SEGNI = ['1', 'X', '2'];
const formattaQuota = (n) => (n == null ? '—' : Number(n).toFixed(2).replace('.', ','));

// '1' | 'X' | '2' già uscito, oppure null se lo scontro non ha ancora un risultato.
const esitoReale = (a) => {
  if (a.golCasa == null || a.golTrasferta == null) return null;
  if (a.golCasa > a.golTrasferta) return '1';
  if (a.golCasa < a.golTrasferta) return '2';
  return 'X';
};

function tempo(giornata) {
  if (!giornata?.data) return null;
  const diff = new Date(giornata.data).getTime() - Date.now();
  if (diff <= 0) return giornata.conclusa ? 'fischio finale' : 'in campo';
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
        <span className="dettaglio risultato">Risultato: {a.golCasa} – {a.golTrasferta}</span>
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

  const cambiata = miaSchedina && scontri.some((a) => {
    const p = miaSchedina.pronostici?.find((x) => String(x.accoppiamento) === String(a._id));
    return p?.esito !== scelte[String(a._id)];
  });

  const consegna = async () => {
    if (!completa) { mostraToast('Manca un pronostico: la multipla è una sola.'); return; }
    if (inviandoRef.current) return;
    inviandoRef.current = true;
    setInviando(true);
    try {
      await api.post('/api/schedine', {
        giornataNumero: giornata.numero,
        pronostici: scontri.map((a) => ({ accoppiamento: a._id, esito: scelte[String(a._id)] }))
      });
      await onSalvato();
      mostraToast('Consegnata. Che la fortuna ti assista');
    } catch (err) {
      mostraToast(err.message);
    } finally {
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  const t = tempo(giornata);
  const esito = chiusa ? esitoTesto(giornata, miaSchedina) : null;
  const etichettaBottone = inviando ? 'Consegno…' : miaSchedina ? 'Aggiorna' : 'Consegna';
  const bottoneSpento = !completa || (miaSchedina && !cambiata);

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
              onScegli={(id, segno) => setScelte((s) => ({ ...s, [id]: segno }))}
            />
          ))}
        </div>
        {chiusa && miaSchedina && (
          <div className="cedolino-totale">
            <span className="dettaglio">Quota giocata</span>
            <b>{formattaQuota(miaSchedina.quotaTotale)}</b>
          </div>
        )}
      </section>

      {!chiusa && (
        <div className="barra-consegna">
          <span className="testi">
            <span className="dettaglio">Quota · {fatti} su {scontri.length}</span>
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
    </>
  );
}

export default function Schedina() {
  const { schedina, ricaricaSchedina } = useDati();
  const { giornata, miaSchedina, chiusa, motivo, precedente } = schedina;

  if (!giornata) {
    return (
      <div className="ritagli">
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Banco chiuso</h2>
          <p className="ritaglio-vuoto">Si torna a gufare alla prossima giornata.</p>
        </section>
        {precedente?.giornata && (
          <>
            <Cedolino giornata={precedente.giornata} miaSchedina={precedente.miaSchedina} chiusa onSalvato={ricaricaSchedina} />
            <AltriGufi giornata={precedente.giornata} chiusa />
          </>
        )}
      </div>
    );
  }

  if (motivo === 'calendario-mancante' || !giornata.accoppiamenti?.length) {
    return (
      <div className="ritagli">
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Giornata {giornata.numero}</h2>
          <p className="ritaglio-vuoto">Il banco apre quando il direttore di turno imposta gli scontri.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="ritagli">
      <Cedolino giornata={giornata} miaSchedina={miaSchedina} chiusa={chiusa} onSalvato={ricaricaSchedina} />
      <AltriGufi giornata={giornata} chiusa={chiusa} />
    </div>
  );
}
