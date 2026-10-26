import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import Stemma from './Stemma';
import '../../styles/culo.css';

// +0,67 / −1,00 / 0,00: il segno è esplicito e il meno è quello tipografico.
function formattaCulo(n) {
  const v = Math.round(n * 100) / 100;
  if (v === 0) return '0,00';
  const testo = Math.abs(v).toFixed(2).replace('.', ',');
  return `${v > 0 ? '+' : '−'}${testo}`;
}
const classeCulo = (n) => (n > 0.004 ? 'culo-pos' : n < -0.004 ? 'culo-neg' : '');

function Trofeo({ titolo, sottotitolo, riga }) {
  return (
    <div className="culo-trofeo">
      <span className="culo-trofeo-titolo">{titolo}</span>
      <Stemma src={riga.stemma} nome={riga.nome} size={44} />
      <span className="culo-trofeo-nome">{riga.nome}</span>
      <span className={`culo-trofeo-valore ${classeCulo(riga.culo)}`}>{formattaCulo(riga.culo)}</span>
      <span className="dettaglio">{sottotitolo}</span>
    </div>
  );
}

function Spiegazione() {
  return (
    <details className="culo-spiega">
      <summary>Come si calcola</summary>
      <p>
        In ogni giornata affronti una sola squadra, ma il tuo punteggio avrebbe potuto affrontarle tutte.
        Qui lo facciamo giocare contro ognuna delle altre (con le solite fasce di gol) e si fa la media dei punti.
        <strong> Culo = punti presi davvero − punti medi.</strong> Positivo: il calendario ti ha aiutato.
        Negativo: ti ha penalizzato.
      </p>
      <p>
        La classifica sotto è quella che avresti con i punti medi. Il Culo Index dice quanto, in tutta la lega,
        il calendario ha spostato i punti (più è alto, più ha deciso il sorteggio). Non è a somma zero: un pareggio
        vale 2 punti in totale, una vittoria 3.
      </p>
    </details>
  );
}

function EEse({ righe, miaSquadraId }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [esito, setEsito] = useState(null);
  const [carica, setCarica] = useState(false);
  const [errore, setErrore] = useState('');

  const cambia = (setter) => (e) => {
    setter(e.target.value);
    setEsito(null);
    setErrore('');
  };

  const calcola = async () => {
    setCarica(true);
    setErrore('');
    try {
      setEsito(await api.get(`/api/squadre/culo/invertiti?a=${a}&b=${b}`));
    } catch (err) {
      setErrore(err.message || 'Non riesco a fare il conto');
    } finally {
      setCarica(false);
    }
  };

  const nomeDi = (id) => righe.find((r) => r.squadra === id)?.nome;
  const opzioni = (altra) => (
    <>
      <option value="">Scegli la squadra…</option>
      {righe.filter((r) => r.squadra !== altra).map((r) => <option key={r.squadra} value={r.squadra}>{r.nome}</option>)}
    </>
  );
  const mosse = esito ? esito.righe.filter((r) => r.posPrima !== r.posDopo || r.puntiPrima !== r.puntiDopo) : [];

  return (
    <section className="ritaglio culo-ese">
      <div className="ritaglio-occhiello"><span>E se…</span><span className="filo" /></div>
      <p className="dettaglio">Due squadre si scambiano le avversarie per tutta la stagione. Cosa cambia in classifica?</p>
      <div className="culo-ese-campi">
        <select aria-label="Prima squadra" value={a} onChange={cambia(setA)}>{opzioni(b)}</select>
        <span className="culo-ese-scambio" aria-hidden="true">⇄</span>
        <select aria-label="Seconda squadra" value={b} onChange={cambia(setB)}>{opzioni(a)}</select>
      </div>
      <button type="button" className="bottone-contorno" disabled={!a || !b || carica} onClick={calcola}>
        {carica ? 'Calcolo…' : 'Scambia le avversarie'}
      </button>
      {errore && <p className="ritaglio-vuoto" role="alert">{errore}</p>}

      {esito && (
        <div className="culo-ese-esito">
          {esito.giornateCambiate.length === 0 ? (
            <p className="ritaglio-vuoto">
              {nomeDi(a)} e {nomeDi(b)} non hanno avversarie da scambiarsi: o si sono sempre affrontate, o mancano i risultati.
            </p>
          ) : (
            <>
              <p className="dettaglio">
                Scambiate {esito.giornateCambiate.length} giornate
                {mosse.length === 0 ? ': la classifica non cambia di una virgola.' : '.'}
              </p>
              <div className="culo-ese-lista">
                {esito.righe.map((r) => {
                  const delta = r.posPrima - r.posDopo;
                  const rilevante = r.squadra === a || r.squadra === b || delta !== 0 || r.puntiPrima !== r.puntiDopo;
                  if (!rilevante) return null;
                  return (
                    <div key={r.squadra} className={`culo-ese-riga${r.squadra === miaSquadraId ? ' mia' : ''}`}>
                      <Stemma src={r.stemma} nome={r.nome} size={28} />
                      <span className="nome">{r.nome}</span>
                      <span className="dettaglio">{r.puntiPrima} → {r.puntiDopo} pt</span>
                      <span className={`culo-pos-cambio ${delta > 0 ? 'culo-pos' : delta < 0 ? 'culo-neg' : ''}`}>
                        {r.posPrima}º → {r.posDopo}º
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// La classifica del culo: non è un'altra classifica, è la stessa letta senza il sorteggio.
export default function Culo({ miaSquadraId }) {
  const { giornate } = useDati();
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState('');
  const [tentativo, setTentativo] = useState(0);

  // Si ricarica anche quando cambia il numero di giornate concluse: un risultato
  // appena inserito dalla redazione deve riflettersi senza uscire dalla scheda.
  const concluse = giornate.filter((g) => g.conclusa).length;
  useEffect(() => {
    let attivo = true;
    setErrore('');
    api.get('/api/squadre/culo')
      .then((r) => { if (attivo) setDati(r); })
      .catch((e) => { if (attivo) setErrore(e.message || 'Non riesco a caricare il culo'); });
    return () => { attivo = false; };
  }, [concluse, tentativo]);

  if (errore && !dati) {
    return (
      <section className="ritaglio">
        <p className="ritaglio-vuoto" role="alert">{errore}</p>
        <button type="button" className="bottone-link" onClick={() => setTentativo((t) => t + 1)}>Riprova</button>
      </section>
    );
  }
  if (!dati) return <section className="ritaglio"><p className="ritaglio-vuoto">Conto i colpi di fortuna…</p></section>;

  if (dati.vuoto) {
    return (
      <section className="ritaglio">
        <div className="ritaglio-occhiello"><span>Classifica del culo</span><span className="filo" /></div>
        <p className="ritaglio-vuoto">Nessuna giornata conclusa: per ora la fortuna è ancora in panchina.</p>
        <Spiegazione />
      </section>
    );
  }

  const perMerito = [...dati.righe].sort((x, y) => x.posGiusta - y.posGiusta);

  return (
    <>
      <section className="ritaglio">
        <div className="ritaglio-occhiello"><span>Culo Index</span><span className="filo" /></div>
        <div className="culo-indice">
          <span className="culo-indice-valore">{dati.indice.valore.toFixed(1).replace('.', ',')}%</span>
          <span className="culo-indice-giudizio">{dati.indice.giudizio}</span>
        </div>
        <p className="dettaglio">
          Su {dati.giornate} {dati.giornate === 1 ? 'giornata' : 'giornate'} concluse.
          {dati.indice.campionePiccolo ? ' Poche giornate: il giudizio è ancora ballerino.' : ''}
        </p>
        <div className="culo-trofei">
          <Trofeo titolo="Il più sculato" sottotitolo="il calendario lo coccola" riga={dati.sculato} />
          <Trofeo titolo="Il più sfigato" sottotitolo="il calendario lo perseguita" riga={dati.sfigato} />
        </div>
      </section>

      <section className="ritaglio">
        <div className="ritaglio-occhiello"><span>Classifica meritata</span><span className="filo" /></div>
        <div className="classifica-intesta"><span>Squadra</span><span>Culo</span></div>
        <div className="classifica">
          {perMerito.map((r) => {
            const salto = r.posReale - r.posGiusta; // positivo: meriterebbe di stare più in alto
            return (
              <div key={r.squadra} className={`classifica-riga culo-riga${r.squadra === miaSquadraId ? ' mia' : ''}`}>
                <span className="posto">{r.posGiusta}</span>
                <Stemma src={r.stemma} nome={r.nome} size={36} />
                <span className="testi">
                  <span className="nome">{r.nome}</span>
                  <span className="dettaglio">
                    {r.punti} pt reali · {r.puntiGiusti.toFixed(2).replace('.', ',')} giusti ·{' '}
                    {salto === 0 ? `${r.posReale}º, giusto così` : `${r.posReale}º in realtà`}
                  </span>
                </span>
                <span className={`punti culo-valore ${classeCulo(r.culo)}`}>{formattaCulo(r.culo)}</span>
              </div>
            );
          })}
        </div>
        <Spiegazione />
      </section>

      <EEse righe={perMerito} miaSquadraId={miaSquadraId} />
    </>
  );
}
