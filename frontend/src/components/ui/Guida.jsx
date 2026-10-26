import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, SoccerBall, Gavel, Trophy, Flag } from '@phosphor-icons/react';
import Sheet from './Sheet';
import { idDi } from '../../utils/lega';
import '../../styles/guida.css';

// "Come si gioca": il giro della redazione in cinque schede. Si apre da solo una
// volta, subito dopo l'iscrizione, e poi resta nel menù per chi la vuole rivedere.
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
    paragrafi: () => [
      'Tre mosse per non restare spettatore. Ognuna si fa in meno di un minuto.'
    ],
    azioni: true
  }
];

export default function Guida({ aperta, onChiudi, utente }) {
  const navigate = useNavigate();
  const [indice, setIndice] = useState(0);

  // Alla chiusura si riparte dalla prima scheda: la prossima apertura (dal menù)
  // non deve trovarsi a metà guida.
  const chiudi = () => {
    setIndice(0);
    onChiudi();
  };

  const scheda = SCHEDE[indice];
  const ultima = indice === SCHEDE.length - 1;
  const { Icona } = scheda;

  const vai = (path, opzioni) => {
    chiudi();
    navigate(path, opzioni);
  };

  return (
    <Sheet aperto={aperta} onChiudi={chiudi} titolo="Come si gioca" sottotitolo={`${indice + 1} di ${SCHEDE.length}`}>
      <div className="guida">
        <div className="guida-scheda" key={scheda.chiave}>
          <span className="guida-icona" aria-hidden="true"><Icona size={34} weight="fill" /></span>
          <h4 className="guida-titolo">{scheda.titolo}</h4>
          {scheda.paragrafi(utente).map((p) => <p key={p} className="guida-testo">{p}</p>)}

          {scheda.azioni && (
            <div className="guida-azioni">
              <button type="button" className="guida-azione" onClick={() => vai('/gioca')}>
                <span className="n">1</span>
                <span className="testi">
                  <b>Gufa la schedina</b>
                  <span>Scegli 1, X o 2 su ogni scontro</span>
                </span>
              </button>
              <button type="button" className="guida-azione" onClick={() => vai(`/squadre/${idDi(utente.squadra)}`)}>
                <span className="n">2</span>
                <span className="testi">
                  <b>Dai un volto alla tua squadra</b>
                  <span>Rosa, motto e colori: tocca la matita</span>
                </span>
              </button>
              <button type="button" className="guida-azione" onClick={() => vai('/regolamento', { state: { sezione: 'glossario' } })}>
                <span className="n">3</span>
                <span className="testi">
                  <b>Impara il gergo</b>
                  <span>Gufo, cedolino, culo, ristampa: il glossario</span>
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="guida-punti" role="group" aria-label="Schede della guida">
          {SCHEDE.map((s, i) => (
            <button
              key={s.chiave}
              type="button"
              className={`guida-punto${i === indice ? ' corrente' : ''}`}
              aria-label={`Scheda ${i + 1}: ${s.titolo}`}
              aria-current={i === indice ? 'step' : undefined}
              onClick={() => setIndice(i)}
            />
          ))}
        </div>

        <div className="guida-nav">
          {indice > 0 ? (
            <button type="button" className="bottone-contorno" onClick={() => setIndice(indice - 1)}>Indietro</button>
          ) : (
            <button type="button" className="bottone-contorno" onClick={chiudi}>Salta</button>
          )}
          {ultima ? (
            <button type="button" className="bottone-grande" onClick={chiudi}>Ho capito, entro</button>
          ) : (
            <button type="button" className="bottone-grande" onClick={() => setIndice(indice + 1)}>Avanti</button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
