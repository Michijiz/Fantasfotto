import {
  Trophy, Medal, Star, Horse, Clover, Lightning, Drop, Gavel, Bird, Crown, Skull
} from '@phosphor-icons/react';
import { etichettaTrofeo } from '../../utils/trofei';
import '../../styles/trofei.css';

// Icona e tinta di ogni trofeo. Le tinte sono "da medaglia" fisse (vedi albo.css),
// gli altri trofei prendono i colori del tema.
const ASPETTO = {
  campione: { Icona: Trophy, tono: 'oro' },
  argento: { Icona: Medal, tono: 'argento' },
  bronzo: { Icona: Medal, tono: 'bronzo' },
  fenomeno: { Icona: Star, tono: 'verdetto' },
  bidone: { Icona: Horse, tono: 'verdetto' },
  culo: { Icona: Clover, tono: 'verdetto' },
  sfigato: { Icona: Lightning, tono: 'verdetto' },
  piangina: { Icona: Drop, tono: 'verdetto' },
  formazione: { Icona: Gavel, tono: 'verdetto' },
  gufi: { Icona: Bird, tono: 'notte' },
  top: { Icona: Crown, tono: 'verdetto' },
  nera: { Icona: Skull, tono: 'nera' }
};
const ASPETTO_BASE = { Icona: Trophy, tono: 'verdetto' };

const aspettoTrofeo = (id) => ASPETTO[id] || ASPETTO_BASE;

// Il disco con l'icona del trofeo: serve alla bacheca e all'albo.
export function IconaTrofeo({ id, size = 26 }) {
  const { Icona, tono } = aspettoTrofeo(id);
  return (
    <span className={`trofeo-disco ${tono}`} aria-hidden="true">
      <Icona size={size} weight="fill" />
    </span>
  );
}

// La nota sotto il nome: quando è stato vinto (stagione o giornata). Con più
// vittorie, le ultime due e il resto in coda.
const nota = (dettagli) => {
  const ultime = dettagli.slice(-2).reverse();
  const resto = dettagli.length - ultime.length;
  return resto > 0 ? `${ultime.join(' · ')} +${resto}` : ultime.join(' · ');
};

// I trofei di una squadra in piccolo, come quelli della PlayStation: un disco con
// l'icona, il "×3" appeso all'angolo e il nome sotto. `gruppi` arriva da
// trofeiSquadra(); toccando (o tenendo) un trofeo escono le giornate in cui è stato vinto.
export default function MiniTrofei({ gruppi, categorie = [] }) {
  return (
    <ul className="minitrofei">
      {gruppi.map((g) => {
        const { breve, etichetta } = etichettaTrofeo(g.id, categorie);
        return (
          <li className="minitrofeo" key={g.id} title={`${etichetta}: ${g.dettagli.join(' · ')}`}>
            <span className="minitrofeo-icona">
              <IconaTrofeo id={g.id} size={24} />
              {g.quanti > 1 && <b className="minitrofeo-conto">×{g.quanti}</b>}
            </span>
            <span className="minitrofeo-nome">{breve}</span>
            <span className="minitrofeo-nota">{nota(g.dettagli)}</span>
            <span className="visually-hidden">{`${etichetta}, ${g.quanti} ${g.quanti === 1 ? 'volta' : 'volte'}`}</span>
          </li>
        );
      })}
    </ul>
  );
}
