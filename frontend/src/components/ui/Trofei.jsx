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

const DETTAGLI_VISIBILI = 4;

// La bacheca di una squadra: una targhetta per tipo di trofeo, con quante volte e
// quando. `gruppi` arriva da trofeiSquadra().
export default function BachecaTrofei({ gruppi, categorie = [] }) {
  return (
    <div className="trofei-griglia">
      {gruppi.map((g) => {
        const { etichetta } = etichettaTrofeo(g.id, categorie);
        const { tono } = aspettoTrofeo(g.id);
        const visibili = g.dettagli.slice(-DETTAGLI_VISIBILI);
        const resto = g.dettagli.length - visibili.length;
        return (
          <div className={`trofeo ${tono}`} key={g.id}>
            <IconaTrofeo id={g.id} />
            <span className="trofeo-quanti">{g.quanti > 1 ? `×${g.quanti}` : '1'}</span>
            <span className="trofeo-nome">{etichetta}</span>
            <span className="trofeo-quando dettaglio">
              {resto > 0 && `+${resto} · `}{visibili.join(' · ')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
