import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Newspaper, SoccerBall, Gavel, Trophy, Flag } from '@phosphor-icons/react';
import '../../styles/guida.css';

// "Come si gioca": il giro della redazione in cinque schede. Si apre da sola una
// volta, subito dopo l'iscrizione, e poi resta nel menù per chi la vuole rivedere.
//
// È una finestra FISSA, come un avviso: occupa lo schermo, non scorre, non ha link
// che portano in altre pagine e l'app dietro è bloccata (inert) finché non la si
// chiude coi suoi bottoni. Non si chiude toccando fuori, né scorrendo.
//
// Le regole qui sono il riassunto di quelle del Regolamento: se cambiano là,
// cambiano anche qui.
const SCHEDE = [
  {
    chiave: 'benvenuto',
    Icona: Flag,
    titolo: 'Benvenuto in redazione',
    paragrafi: (utente) => [
      `${utente.nomeVisualizzato}, sei un Abbonato: leggi la Gazzetta, gufi le partite e giudichi gli altri.`,
      'La Gazzetta racconta la vostra lega di fantacalcio con la satira che merita. Quattro cose da sapere, due minuti.'
    ]
  },
  {
    chiave: 'leggi',
    Icona: Newspaper,
    titolo: 'Si legge',
    paragrafi: () => [
      'Dopo ogni giornata il direttore di turno manda in stampa un\'edizione: titolo, articolo e tutti gli scontri.',
      'La trovi in Home e nella scheda Gazzetta. Nell\'archivio ci sono quelle passate.'
    ]
  },
  {
    chiave: 'gufa',
    Icona: SoccerBall,
    titolo: 'Si gufa',
    paragrafi: () => [
      'Ogni giornata c\'è una schedina sola: per ogni scontro scegli 1, X o 2. La vinci solo se li azzecchi tutti.',
      'Puoi cambiarla fino al fischio d\'inizio. Chi la vince diventa Re dei Gufi e finisce nell\'edizione.'
    ]
  },
  {
    chiave: 'giudica',
    Icona: Gavel,
    titolo: 'Si giudica',
    paragrafi: () => [
      'Dopo ogni edizione la lega vota sette categorie: Fenomeno, Brocco, San Culo e le altre. Un voto per categoria, la tua squadra non si vota.',
      'Come ha votato la lega lo vedi appena hai votato tutto. Si chiude al fischio d\'inizio della giornata dopo.'
    ]
  },
  {
    chiave: 'primi-passi',
    Icona: Trophy,
    titolo: 'Da dove cominci',
    paragrafi: () => ['Tre mosse per non restare spettatore:'],
    // Solo da leggere: la guida non porta in nessuna pagina.
    mosse: [
      ['Gufa la schedina', 'scheda Gioca'],
      ['Dai un volto alla tua squadra', 'scheda Squadre, poi la matita'],
      ['Impara il gergo', 'menù, Regolamento e FAQ']
    ]
  }
];

export default function Guida({ aperta, onChiudi, utente }) {
  const [indice, setIndice] = useState(0);
  const bottonePrincipale = useRef(null);

  // Finché la guida è aperta l'app sotto non risponde a tocchi, tastiera e lettori
  // di schermo: è l'unica cosa con cui si può interagire. Al ritorno il fuoco
  // torna dov'era.
  useEffect(() => {
    if (!aperta) return undefined;
    const radice = document.getElementById('root');
    const precedente = document.activeElement;
    radice?.setAttribute('inert', '');
    bottonePrincipale.current?.focus({ preventScroll: true });
    return () => {
      radice?.removeAttribute('inert');
      if (precedente instanceof HTMLElement) precedente.focus({ preventScroll: true });
    };
  }, [aperta]);

  if (!aperta) return null;

  // Alla chiusura si riparte dalla prima scheda: la prossima apertura (dal menù)
  // non deve trovarsi a metà guida.
  const chiudi = () => {
    setIndice(0);
    onChiudi();
  };

  const scheda = SCHEDE[indice];
  const ultima = indice === SCHEDE.length - 1;
  const { Icona } = scheda;

  return createPortal(
    <div className="guida-velo">
      <div className="guida" role="dialog" aria-modal="true" aria-label="Come si gioca">
        <span className="guida-conto">{indice + 1} di {SCHEDE.length}</span>

        <div className="guida-scheda" key={scheda.chiave}>
          <span className="guida-icona" aria-hidden="true"><Icona size={32} weight="fill" /></span>
          <h2 className="guida-titolo">{scheda.titolo}</h2>
          {scheda.paragrafi(utente).map((p) => <p key={p} className="guida-testo">{p}</p>)}
          {scheda.mosse && (
            <ol className="guida-mosse">
              {scheda.mosse.map(([titolo, dove], i) => (
                <li key={titolo}>
                  <span className="n">{i + 1}</span>
                  <span className="testi"><b>{titolo}</b><span>{dove}</span></span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="guida-punti" aria-hidden="true">
          {SCHEDE.map((s, i) => <span key={s.chiave} className={`guida-punto${i === indice ? ' corrente' : ''}`} />)}
        </div>

        <div className="guida-nav">
          {indice > 0 ? (
            <button type="button" className="bottone-contorno" onClick={() => setIndice(indice - 1)}>Indietro</button>
          ) : (
            <button type="button" className="bottone-contorno" onClick={chiudi}>Salta</button>
          )}
          {ultima ? (
            <button type="button" className="bottone-grande" ref={bottonePrincipale} onClick={chiudi}>Ho capito, entro</button>
          ) : (
            <button type="button" className="bottone-grande" ref={bottonePrincipale} onClick={() => setIndice(indice + 1)}>Avanti</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
