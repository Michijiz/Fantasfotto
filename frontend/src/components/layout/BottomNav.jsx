// Barra di navigazione in basso, versione "vetro" (adattata dal Glass Tab Bar
// di AI Canvas). Rispetto all'originale:
// - le voci sono NavLink veri (rotte della Gazzetta), non stato locale;
// - i colori vengono dal tema della squadra (--ink, --nav-testo, --gold-chiaro)
//   invece che da una tinta fissa per voce, così segue il cambio di tema;
// - la barra fluttua sopra il contenuto, che le scorre sotto sfocato.
import { NavLink, useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { House, Newspaper, Trophy, SoccerBall, Shield } from '@phosphor-icons/react';

const VOCI = [
  { to: '/', end: true, label: 'Dashboard', Icona: House },
  { to: '/gazzetta', label: 'Gazzetta', Icona: Newspaper },
  { to: '/lega', label: 'Lega', Icona: Trophy },
  { to: '/gioca', label: 'Gioca', Icona: SoccerBall },
  { to: '/squadre', label: 'Squadre', Icona: Shield }
];

const MOLLA_PILLOLA = { type: 'spring', stiffness: 350, damping: 30 };
const MOLLA_ICONA = { type: 'spring', stiffness: 400, damping: 20 };

export default function BottomNav() {
  const { pathname } = useLocation();
  // Stesso criterio di "attivo" di NavLink (end solo sulla prima voce). Sulle
  // pagine fuori dalla barra (Profilo, Regolamento) nessuna voce è attiva e la
  // pillola sparisce invece di restare sotto Dashboard.
  const indiceAttivo = VOCI.findIndex((v) => (v.end ? pathname === v.to : pathname.startsWith(v.to)));

  return (
    // reducedMotion="user": con "riduci movimento" attivo nel sistema le molle
    // diventano cambi istantanei, come il resto dell'app (vedi global.css).
    <MotionConfig reducedMotion="user">
      <motion.nav
        className="bottom-nav-vetro"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        {VOCI.map(({ to, end, label, Icona }, i) => {
          const attivo = i === indiceAttivo;
          return (
            <NavLink key={to} to={to} end={end} className={`nav-item${attivo ? ' attivo' : ''}`}>
              {attivo && (
                <motion.span layoutId="nav-pillola" className="nav-pillola" transition={MOLLA_PILLOLA} />
              )}
              <motion.span
                className="nav-icona"
                animate={{ scale: attivo ? 1.12 : 1, y: attivo ? -1 : 0 }}
                transition={MOLLA_ICONA}
                whileTap={{ scale: 0.85 }}
              >
                <Icona size={24} weight={attivo ? 'fill' : 'regular'} />
              </motion.span>
              <span className="etichetta">{label}</span>
            </NavLink>
          );
        })}
      </motion.nav>
    </MotionConfig>
  );
}
