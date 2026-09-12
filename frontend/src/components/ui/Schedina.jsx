import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import Stemma from './Stemma';

const SEGNI = ['1', 'X', '2'];

const formattaQuota = (n) => (n == null ? '—' : Number(n).toFixed(2).replace('.', ','));

const ETICHETTA_ESITO = { attesa: 'In attesa', vinta: 'Vinta', persa: 'Persa' };

// '1' | 'X' | '2' già uscito, oppure null se lo scontro non è ancora stato giocato.
const esitoReale = (a) => {
  if (a.golCasa == null || a.golTrasferta == null) return null;
  if (a.golCasa > a.golTrasferta) return '1';
  if (a.golCasa < a.golTrasferta) return '2';
  return 'X';
};

function Scontri({ scontri, scelte, onScegli, soloLettura, quotePronostici }) {
  return (
    <div className="schedina-lista">
      {scontri.map((a) => {
        const id = String(a._id);
        const scelta = scelte[id];
        const uscito = esitoReale(a);
        return (
          <div className="schedina-scontro" key={id}>
            <div className="squadre">
              <span className="sq">
                <Stemma src={a.squadraCasa?.stemma} size={18} />
                <span className="nome">{a.squadraCasa?.nome}</span>
              </span>
              <span className="trattino">—</span>
              <span className="sq">
                <Stemma src={a.squadraTrasferta?.stemma} size={18} />
                <span className="nome">{a.squadraTrasferta?.nome}</span>
              </span>
            </div>
            <div className="segni">
              {SEGNI.map((segno) => {
                // Le quote vive vengono dalla giornata; a giornata archiviata si
                // mostra invece quella congelata sulla schedina, che è quella a cui
                // hai davvero giocato.
                const quota = a.quote?.[segno] ?? (scelta === segno ? quotePronostici?.[id] : null);
                return (
                  <button
                    key={segno}
                    type="button"
                    disabled={soloLettura}
                    className={
                      `segno${scelta === segno ? ' scelto' : ''}${uscito === segno ? ' giusto' : ''}`
                    }
                    onClick={() => onScegli(id, segno)}
                  >
                    <b>{segno}</b>
                    <span>{quota ? formattaQuota(quota) : '·'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Il blocco su cui si gioca: multipla su tutti gli scontri della giornata che deve
// ancora cominciare. Niente puntata e niente valuta — si gioca per il titolo di Re
// dei Gufi, che finisce in prima pagina.
function SchedinaAperta({ giornata, miaSchedina, chiusa, motivo, onSalvato }) {
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

  const quotaTotale = useMemo(() => {
    const scelti = scontri.filter((a) => scelte[String(a._id)]);
    if (scelti.length === 0) return null;
    const tot = scelti.reduce((acc, a) => acc * (a.quote?.[scelte[String(a._id)]] ?? 1), 1);
    return Math.round(tot * 100) / 100;
  }, [scontri, scelte]);

  const completa = scontri.length > 0 && scontri.every((a) => scelte[String(a._id)]);

  if (!giornata) {
    return (
      <div className="card schedina">
        <h2 className="section-title">Schedina</h2>
        <div className="empty">Nessuna giornata aperta: si torna a gufare alla prossima.</div>
      </div>
    );
  }

  if (motivo === 'calendario-mancante' || scontri.length === 0) {
    return (
      <div className="card schedina">
        <h2 className="section-title">Schedina — Giornata {giornata.numero}</h2>
        <div className="empty">
          Gli scontri di questa giornata non sono ancora stati impostati: senza calendario non c&apos;è
          niente da pronosticare.
        </div>
      </div>
    );
  }

  const consegna = async () => {
    if (inviandoRef.current || !completa) return;
    inviandoRef.current = true;
    setInviando(true);
    try {
      await api.post('/api/schedine', {
        giornataNumero: giornata.numero,
        pronostici: scontri.map((a) => ({ accoppiamento: a._id, esito: scelte[String(a._id)] }))
      });
      await onSalvato();
      mostraToast(miaSchedina ? 'Schedina aggiornata!' : 'Schedina consegnata!');
    } catch (err) {
      mostraToast(err.message);
    } finally {
      setInviando(false);
      inviandoRef.current = false;
    }
  };

  return (
    <div className="card schedina">
      <h2 className="section-title">
        Schedina — Giornata {giornata.numero}
        {miaSchedina && <span className="bollo-esito consegnata">Consegnata</span>}
      </h2>

      {chiusa && !miaSchedina ? (
        <div className="empty">Schedine chiuse, e tu non ne hai consegnata nessuna.</div>
      ) : (
        <Scontri
          scontri={scontri}
          scelte={scelte}
          soloLettura={chiusa}
          onScegli={(id, segno) => setScelte((s) => ({ ...s, [id]: segno }))}
        />
      )}

      {!chiusa && (
        <>
          <div className="schedina-totale">
            <span>Quota totale</span>
            <b className={quotaTotale ? '' : 'vuota'}>
              {quotaTotale ? formattaQuota(quotaTotale) : 'da compilare'}
            </b>
          </div>
          <button className="primary" onClick={consegna} disabled={!completa || inviando}>
            {miaSchedina ? 'Aggiorna la schedina' : 'Consegna la schedina'}
          </button>
          {!completa && (
            <p className="nota-form">Serve un pronostico su tutti gli scontri: la multipla è unica.</p>
          )}
        </>
      )}
    </div>
  );
}

// Com'è andata l'ultima giornata archiviata: lo scontrino personale e la lista di
// tutti. Prima che la giornata chiuda le schedine altrui non sono visibili.
function SchedinaEsito({ giornata, miaSchedina }) {
  const [altre, setAltre] = useState([]);

  useEffect(() => {
    if (!giornata) return;
    api.get(`/api/schedine/giornata/${giornata.numero}`)
      .then((dati) => setAltre(dati.schedine || []))
      .catch(() => setAltre([]));
  }, [giornata]);

  if (!giornata) return null;
  if (!miaSchedina && altre.length === 0) return null;

  const scelte = {};
  const quote = {};
  for (const p of miaSchedina?.pronostici || []) {
    scelte[String(p.accoppiamento)] = p.esito;
    quote[String(p.accoppiamento)] = p.quota;
  }

  return (
    <div className="card schedina">
      <h2 className="section-title">
        Com&apos;è andata — Giornata {giornata.numero}
        {miaSchedina && (
          <span className={`bollo-esito ${miaSchedina.esito}`}>{ETICHETTA_ESITO[miaSchedina.esito]}</span>
        )}
      </h2>

      {miaSchedina ? (
        <>
          <Scontri
            scontri={giornata.accoppiamenti || []}
            scelte={scelte}
            quotePronostici={quote}
            soloLettura
            onScegli={() => {}}
          />
          <div className="schedina-totale">
            <span>Quota giocata</span>
            <b>{formattaQuota(miaSchedina.quotaTotale)}</b>
          </div>
        </>
      ) : (
        <div className="empty">Quella giornata non l&apos;avevi giocata.</div>
      )}

      {altre.length > 0 && (
        <>
          <h3 className="sotto-titolo">Chi ha gufato cosa</h3>
          <div className="gufi-lista">
            {altre.map((s) => (
              <div className={`gufo-riga ${s.esito}`} key={s._id}>
                <Stemma src={s.squadra?.stemma} size={22} />
                <span className="chi">{s.squadra?.nome || s.utente?.nomeVisualizzato}</span>
                <span className="quota">{formattaQuota(s.quotaTotale)}</span>
                <span className="esito">{ETICHETTA_ESITO[s.esito]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Schedina() {
  const { schedina, ricaricaSchedina } = useDati();
  const { giornata, miaSchedina, chiusa, motivo, precedente } = schedina;

  return (
    <>
      <SchedinaAperta
        giornata={giornata}
        miaSchedina={miaSchedina}
        chiusa={chiusa}
        motivo={motivo}
        onSalvato={ricaricaSchedina}
      />
      {precedente && (
        <SchedinaEsito giornata={precedente.giornata} miaSchedina={precedente.miaSchedina} />
      )}
    </>
  );
}
