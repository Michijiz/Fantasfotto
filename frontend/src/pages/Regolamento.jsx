import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import {
  SOGLIA_PRIMO_GOL, AMPIEZZA_FASCIA, PUNTI_VITTORIA, PUNTI_PAREGGIO, PUNTI_SCONFITTA,
  fantapuntiInGol, fasceGol, formattaFantapunti
} from '../utils/regolamento';
import '../styles/regolamento.css';

const MODULI = ['3-5-2', '3-4-3', '4-5-1', '4-4-2', '4-3-3', '5-3-2', '5-4-1'];

const BONUS = [
  ['Gol segnato, anche su rigore', '+3'],
  ['Assist, di qualunque tipo', '+1'],
  ['Rigore parato', '+3'],
  ['Porta inviolata', '+1'],
  ['Player of the match', '+0,5']
];

const MALUS = [
  ['Gol subito', '−1'],
  ['Rigore sbagliato', '−3'],
  ['Autogol', '−3'],
  ['Ammonizione', '−0,5'],
  ['Espulsione', '−1']
];

const MODIFICATORE = [
  ['Sotto 6', '0'],
  ['Da 6 a meno di 6,5', '+1'],
  ['Da 6,5 a meno di 7', '+3'],
  ['Da 7 a meno di 7,5', '+6'],
  ['7,5 o più', '+9']
];

const PREMI = [
  ['1º posto Campionato', 500],
  ['2º posto Campionato', 220],
  ['3º posto Campionato', 120],
  ['Vincitore Coppa', 120]
];

const euro = (n) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function Voce({ id, titolo, apertaAllInizio, children }) {
  return (
    <details className="faq-voce" id={`faq-${id}`} open={apertaAllInizio}>
      <summary>{titolo}</summary>
      <div className="faq-corpo">{children}</div>
    </details>
  );
}

function Tabella({ righe }) {
  return (
    <table className="faq-tabella">
      <tbody>
        {righe.map(([voce, valore]) => (
          <tr key={voce}>
            <td>{voce}</td>
            <td className="val">{valore}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalcolatriceGol() {
  const [fantapunti, setFantapunti] = useState('');
  const gol = fantapuntiInGol(fantapunti);
  const mancano = gol == null
    ? null
    : SOGLIA_PRIMO_GOL + AMPIEZZA_FASCIA * gol - Number(fantapunti);

  return (
    <div className="card calcolatrice-gol">
      <h2 className="section-title">Quanti gol fai?</h2>
      <div className="calcolatrice-riga">
        <div className="calcolatrice-input">
          <label htmlFor="calc-fp">I tuoi fantapunti</label>
          <input
            id="calc-fp"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={fantapunti}
            onChange={(e) => setFantapunti(e.target.value)}
            placeholder="es. 71,5"
          />
        </div>
        <div className="calcolatrice-esito" aria-live="polite">
          <span className="numero">{gol ?? '–'}</span>
          <span className="unita">gol</span>
        </div>
      </div>
      <p className="faq-nota">
        {gol == null
          ? `Sotto i ${SOGLIA_PRIMO_GOL} punti non si segna. Dopo, un gol ogni ${AMPIEZZA_FASCIA} punti.`
          : `Per il gol successivo servono altri ${formattaFantapunti(mancano)} punti.`}
      </p>
    </div>
  );
}

export default function Regolamento() {
  const { state } = useLocation();
  const { squadre } = useDati();
  const sezione = state?.sezione;

  // Porta la voce richiesta (es. "Come si calcola" dalla classifica) appena sotto la
  // testata compatta. Si scorre solo il contenitore .contenuto: scrollIntoView
  // scorrerebbe anche la shell dell'app, spostando testata e barra in basso.
  useEffect(() => {
    if (!sezione) return;
    const frame = requestAnimationFrame(() => {
      const voce = document.getElementById(`faq-${sezione}`);
      const scroller = voce?.closest('.contenuto');
      if (!voce || !scroller) return;

      const header = document.querySelector('.app-header');
      const safeArea = header ? parseFloat(getComputedStyle(header).paddingTop) || 0 : 0;
      const barra = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--barra-compatta')) || 48;

      const posizione = voce.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: Math.max(0, posizione - safeArea - barra - 10), behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [sezione]);

  const numeroSquadre = squadre.length || 8;
  const maggioranzaAssoluta = Math.floor(numeroSquadre / 2) + 1;
  const montepremi = PREMI.reduce((tot, [, cifra]) => tot + cifra, 0);

  return (
    <>
      <div className="card">
        <h2 className="section-title">Regolamento</h2>
        <p className="faq-intro">
          Le regole della lega per la stagione 2026/27. Voti e bonus arrivano da Leghe Fantacalcio,
          qui la Gazzetta trasforma i punteggi in gol, risultati e classifica.
        </p>

        <Voce id="rosa" titolo="Rosa e formazione" apertaAllInizio={sezione === 'rosa'}>
          <p>La rosa è di 25 calciatori: 3 portieri, 8 difensori, 8 centrocampisti e 6 attaccanti.</p>
          <p>Si schiera un modulo tra questi:</p>
          <div className="faq-moduli">
            {MODULI.map((m) => <span className="faq-chip" key={m}>{m}</span>)}
          </div>
          <p>
            In panchina vanno tutti i 14 calciatori rimasti, nell'ordine che preferisci:
            quell'ordine decide chi entra per primo.
          </p>
        </Voce>

        <Voce id="sostituzioni" titolo="Sostituzioni" apertaAllInizio={sezione === 'sostituzioni'}>
          <p>
            Massimo 3 cambi, in modalità cambio modulo Dynamic: i panchinari entrano nell'ordine
            in cui li hai messi, anche se hanno un ruolo diverso da chi sostituiscono, purché il
            modulo che ne esce sia uno di quelli consentiti.
          </p>
          <p>
            Riserva d'ufficio con voto 6 solo per i calciatori di una partita rinviata che viene
            recuperata oltre le 24 ore.
          </p>
        </Voce>

        <Voce id="bonus" titolo="Voti, bonus e malus" apertaAllInizio={sezione === 'bonus'}>
          <p>I voti sono quelli di Fantacalcio.it. A ogni voto si aggiungono:</p>
          <h4 className="faq-sottotitolo">Bonus</h4>
          <Tabella righe={BONUS} />
          <h4 className="faq-sottotitolo">Malus</h4>
          <Tabella righe={MALUS} />
          <p className="faq-nota">Rigore parato, gol subito e porta inviolata riguardano il portiere.</p>
        </Voce>

        <Voce id="modificatore" titolo="Modificatore difesa" apertaAllInizio={sezione === 'modificatore'}>
          <p>In base alla media voto del reparto difensivo, la squadra riceve:</p>
          <Tabella righe={MODIFICATORE} />
        </Voce>

        <Voce id="gol" titolo="Da fantapunti a gol" apertaAllInizio={sezione === 'gol'}>
          <p>
            Il primo gol arriva a {SOGLIA_PRIMO_GOL} fantapunti, poi un gol in più ogni {AMPIEZZA_FASCIA} punti.
            Non si arrotonda: {formattaFantapunti(SOGLIA_PRIMO_GOL - 0.5)} resta a zero gol.
          </p>
          <Tabella
            righe={[
              [`Meno di ${SOGLIA_PRIMO_GOL}`, '0 gol'],
              ...fasceGol(6).map((f) => [
                `Da ${formattaFantapunti(f.da)} a ${formattaFantapunti(f.a)}`,
                `${f.gol} gol`
              ]),
              [`E così via, +1 ogni ${AMPIEZZA_FASCIA} punti`, '']
            ]}
          />
          <p>
            Esempio: 72 contro 69,5 finisce 2 a 1. Con 73,5 contro 70 è 2 a 2, anche se una squadra
            ha fatto più punti.
          </p>
        </Voce>

        <Voce id="classifica" titolo="Classifica e parità" apertaAllInizio={sezione === 'classifica'}>
          <p>
            Ogni scontro diretto vale {PUNTI_VITTORIA} punti per la vittoria, {PUNTI_PAREGGIO} per il
            pareggio, {PUNTI_SCONFITTA} per la sconfitta. A parità di punti l'ordine si decide così:
          </p>
          <ol className="faq-criteri">
            <li>Punti</li>
            <li>Punti totali, cioè la somma dei fantapunti</li>
            <li>Gol fatti</li>
            <li>Differenza reti</li>
            <li>Gol subiti, meno è meglio</li>
            <li>Classifica avulsa</li>
          </ol>
          <p>
            Nella classifica avulsa contano solo gli scontri diretti tra le squadre ancora appaiate:
            prima i punti fatti tra loro, poi la differenza reti, poi i gol fatti. Se non basta
            nemmeno quello, la Gazzetta le mette in ordine alfabetico finché la lega non decide.
          </p>
          <p>Gli stessi criteri valgono per la Coppa.</p>
        </Voce>

        <Voce id="scambi" titolo="Scambi" apertaAllInizio={sezione === 'scambi'}>
          <p>
            Scambi liberi fino al 31 marzo 2027, sia di calciatori sia di crediti. A scambio concluso,
            entrambe le rose devono restare complete nella configurazione 3-8-8-6.
          </p>
          <p>Ogni scambio va dichiarato in chat.</p>
          <p>
            Uno scambio palesemente sbilanciato si può discutere e bloccare con la maggioranza assoluta
            delle squadre: con {numeroSquadre} squadre servono almeno {maggioranzaAssoluta} voti.
          </p>
        </Voce>

        <Voce id="competizioni" titolo="Campionato e Coppa" apertaAllInizio={sezione === 'competizioni'}>
          <h4 className="faq-sottotitolo">Campionato</h4>
          <p>
            Scontri diretti con classifica a punti, dalla prima giornata utile fino all'ultima di
            campionato. Vanno a premio le prime tre.
          </p>
          <h4 className="faq-sottotitolo">Coppa</h4>
          <p>
            Parte tra novembre e dicembre, data da definire. Due gironi da 4 squadre con andata e
            ritorno; passano le prime due di ogni girone. Semifinali andata e ritorno, finale secca.
          </p>
          <p>
            Se la finale finisce in parità si va ai supplementari e poi ai rigori, con i calcoli
            stabiliti da Fantacalcio.it.
          </p>
        </Voce>

        <Voce id="premi" titolo="Premi" apertaAllInizio={sezione === 'premi'}>
          <Tabella righe={PREMI.map(([voce, cifra]) => [voce, euro(cifra)])} />
          <p className="faq-nota">Montepremi complessivo: {euro(montepremi)}.</p>
        </Voce>
      </div>

      <CalcolatriceGol />

      <div className="card">
        <h2 className="section-title">Domande frequenti</h2>

        <Voce id="chi-calcola" titolo="Chi calcola bonus e modificatore?" apertaAllInizio={sezione === 'chi-calcola'}>
          <p>
            Leghe Fantacalcio. Alla Gazzetta arriva il totale fantapunti di ogni squadra, già
            comprensivo di voti, bonus, malus e modificatore. Da lì la Gazzetta calcola gol,
            risultato dello scontro e classifica.
          </p>
        </Voce>

        <Voce id="quando" titolo="Quando si aggiorna la classifica?" apertaAllInizio={sezione === 'quando'}>
          <p>
            Quando il direttore di turno pubblica l'edizione con i punteggi della giornata. Da quel
            momento la giornata risulta conclusa e i risultati compaiono anche nel calendario.
          </p>
        </Voce>

        <Voce id="diversa" titolo="La classifica non coincide con Leghe" apertaAllInizio={sezione === 'diversa'}>
          <p>
            Di solito manca il punteggio di una squadra, oppure l'ultima giornata non è ancora stata
            pubblicata. Controlla nel calendario: uno scontro senza risultato mostra VS al posto
            dei gol. Se i numeri sono tutti al loro posto e la classifica è ancora diversa, avvisa
            il direttore.
          </p>
        </Voce>

        <Voce id="coppa-app" titolo="La Coppa è nella Gazzetta?" apertaAllInizio={sezione === 'coppa-app'}>
          <p>
            Non ancora. Per ora la Gazzetta segue solo il campionato; gironi e tabellone della Coppa
            restano su Leghe Fantacalcio.
          </p>
        </Voce>
      </div>
    </>
  );
}
