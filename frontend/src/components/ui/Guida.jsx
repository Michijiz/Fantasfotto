import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { House, Newspaper, Trophy, SoccerBall, Gavel, Shield, List, Plus, Flag } from '@phosphor-icons/react';
import { puoRedigere } from '../../ruoli';
import '../../styles/guida.css';

// "Come si gioca": il giro dell'app, una scheda per ogni sezione, nell'ordine in cui
// le trovi (barra in basso da sinistra a destra, poi menù). Si apre da sola una volta,
// subito dopo l'iscrizione, e poi resta nel menù per chi la vuole rivedere.
//
// È una finestra FISSA, come un avviso: occupa lo schermo, non scorre, non ha link
// che portano in altre pagine e l'app dietro è bloccata (inert) finché non la
// chiude coi suoi bottoni. Non si chiude toccando fuori, né scorrendo.
//
// Le regole qui sono il riassunto di quelle del Regolamento: se cambiano là,
// cambiano anche qui. Ogni scheda ha al massimo 4 voci brevi: la finestra non
// scorre, quindi il contenuto deve starci per intero anche su uno schermo basso.
const SCHEDE = [
  {
    chiave: 'benvenuto',
    Icona: Flag,
    dove: 'Il giro dell\'app',
    titolo: 'Benvenuto in redazione',
    intro: (utente) => `${utente.nomeVisualizzato}, la Gazzetta racconta la vostra lega di fantacalcio con la satira che merita. Ecco ogni sezione.`,
    voci: [
      ['Barra in basso', 'Home, Gazzetta, Lega, Gioca, Squadre'],
      ['Menù in alto a sinistra', 'Profilo, allenatori, regolamento, colori'],
      ['Questa guida', 'La rivedi quando vuoi dal menù']
    ]
  },
  {
    chiave: 'home',
    Icona: House,
    dove: 'Barra in basso · Home',
    titolo: 'Home',
    intro: () => 'Il colpo d\'occhio: quello che conta adesso, in una sola schermata.',
    voci: [
      ['Prossima giornata', 'Gli scontri e quanto manca al fischio d\'inizio'],
      ['La tua schedina', 'Quanti pronostici hai già fatto'],
      ['Verdetti da dare', 'Compaiono dopo ogni edizione: tocca per votare'],
      ['Ultima edizione', 'Il titolo, e da lì si apre la Gazzetta']
    ]
  },
  {
    chiave: 'gazzetta',
    Icona: Newspaper,
    dove: 'Barra in basso · Gazzetta',
    titolo: 'Gazzetta',
    intro: () => 'Qui si legge. Dopo ogni giornata esce un\'edizione.',
    voci: [
      ['L\'ultima edizione', 'Titolo, articolo e tutti gli scontri'],
      ['Avanti e indietro', 'Sfogli le edizioni una per una'],
      ['L\'archivio', 'Tutte le uscite, filtrabili per squadra e autore']
    ]
  },
  {
    chiave: 'lega',
    Icona: Trophy,
    dove: 'Barra in basso · Lega',
    titolo: 'Lega',
    intro: () => 'Quattro schede in alto, tutte sulla stagione.',
    voci: [
      ['Classifica', 'Vittoria 3 punti, pareggio 1. A parità, i fantapunti'],
      ['Calendario', 'Tutte le giornate, dalla prima all\'ultima'],
      ['Culo', 'Quanto il calendario ha aiutato o punito ogni squadra'],
      ['Albo', 'I campioni di ogni stagione']
    ]
  },
  {
    chiave: 'schedina',
    Icona: SoccerBall,
    dove: 'Barra in basso · Gioca · Schedina',
    titolo: 'Schedina',
    intro: () => 'Una sola schedina a giornata: per ogni scontro scegli 1, X o 2.',
    voci: [
      ['La vinci', 'Solo se li azzecchi tutti'],
      ['Non si cambia', 'Una volta consegnata è definitiva'],
      ['Scopri com\'è andata', 'A giornata finita, con un tocco'],
      ['Il premio', 'Chi vince è Re dei Gufi e finisce nell\'edizione'],
      ['Pallino rosso su Gioca', 'C\'è ancora qualcosa da fare']
    ]
  },
  {
    chiave: 'verdetti',
    Icona: Gavel,
    dove: 'Barra in basso · Gioca · Verdetti',
    titolo: 'Verdetti',
    intro: () => 'Dopo ogni edizione la lega vota, una categoria alla volta.',
    voci: [
      ['Sette categorie', 'Fenomeno, Brocco, San Culo e le altre'],
      ['Un voto ciascuna', 'La tua squadra non si può votare'],
      ['Il risultato', 'Come ha votato la lega lo vedi dopo aver votato tutto'],
      ['Scadenza', 'Il fischio d\'inizio della giornata dopo']
    ]
  },
  {
    chiave: 'squadre',
    Icona: Shield,
    dove: 'Barra in basso · Squadre',
    titolo: 'Squadre',
    intro: () => 'Tocca una squadra per aprire la sua pagina.',
    voci: [
      ['Rosa e forma', 'I calciatori, gli ultimi risultati, la storia'],
      ['L\'album', 'Le foto della squadra'],
      ['La tua squadra', 'Tocca la matita per personalizzarla'],
      ['Gli allenatori', 'Il pulsante in fondo: chi allena chi']
    ]
  },
  {
    chiave: 'menu',
    Icona: List,
    dove: 'In alto a sinistra',
    titolo: 'Il menù',
    intro: () => 'Il pulsante con le tre righe apre tutto il resto.',
    voci: [
      ['Il mio profilo', 'I tuoi numeri, il motto, il PIN, l\'uscita'],
      ['Gli allenatori', 'Profili e notizie dal ritiro'],
      ['Regolamento e FAQ', 'Bonus, malus, calcolo dei gol, glossario del gergo'],
      ['Colori della Gazzetta', 'Il tema della squadra che tifi']
    ]
  },
  {
    chiave: 'redazione',
    Icona: Plus,
    dove: 'Solo per la redazione',
    titolo: 'La redazione',
    solo: puoRedigere,
    intro: () => 'Hai il tesserino da redattore: queste sono le tue.',
    voci: [
      ['Il pulsante +', 'Scrivi l\'edizione di una giornata e mandala in stampa'],
      ['Lega › Calendario', 'Imposti scontri e punteggi delle giornate'],
      ['Lega › Albo', 'Aggiungi il campione della stagione']
    ]
  }
];

export default function Guida({ aperta, onChiudi, utente }) {
  const [indice, setIndice] = useState(0);
  const bottonePrincipale = useRef(null);
  const schede = useMemo(() => SCHEDE.filter((x) => !x.solo || x.solo(utente)), [utente]);

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

  const scheda = schede[indice];
  const ultima = indice === schede.length - 1;
  const { Icona } = scheda;

  return createPortal(
    <div className="guida-velo">
      <div className="guida" role="dialog" aria-modal="true" aria-label="Come si gioca">
        <span className="guida-conto">{indice + 1} di {schede.length}</span>

        <div className="guida-scheda" key={scheda.chiave}>
          <span className="guida-icona" aria-hidden="true"><Icona size={30} weight="fill" /></span>
          <span className="guida-dove">{scheda.dove}</span>
          <h2 className="guida-titolo">{scheda.titolo}</h2>
          <p className="guida-testo">{scheda.intro(utente)}</p>
          <ul className="guida-voci">
            {scheda.voci.map(([titolo, testo]) => (
              <li key={titolo}><b>{titolo}</b><span>{testo}</span></li>
            ))}
          </ul>
        </div>

        <div className="guida-punti" aria-hidden="true">
          {schede.map((s, i) => <span key={s.chiave} className={`guida-punto${i === indice ? ' corrente' : ''}`} />)}
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
