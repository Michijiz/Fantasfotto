import { NavLink, useLocation } from 'react-router-dom';

const VOCI = [
  {
    to: '/',
    end: true,
    label: 'Dashboard',
    icona: <path d="M3 11l9-7 9 7M5 10v10h14V10" />
  },
  {
    to: '/gazzetta',
    label: 'Gazzetta',
    icona: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 9h8M8 13h8M8 17h4" /></>
  },
  {
    to: '/lega',
    label: 'Lega',
    icona: <path d="M4 19h16M6 19V9l6-5 6 5v10" />
  },
  {
    to: '/gioca',
    label: 'Gioca',
    icona: <path d="M12 3l2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z" />
  },
  {
    to: '/squadre',
    label: 'Squadre',
    icona: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
  }
];

export default function BottomNav() {
  const { pathname } = useLocation();
  // stesso criterio di "attivo" di NavLink (end solo sulla prima voce)
  const indiceAttivo = Math.max(
    0,
    VOCI.findIndex((v) => (v.end ? pathname === v.to : pathname.startsWith(v.to)))
  );

  return (
    <nav className="bottom-nav">
      <div className="pillola" style={{ transform: `translateX(${indiceAttivo * 100}%)` }} />
      {VOCI.map((voce) => (
        <NavLink
          key={voce.to}
          to={voce.to}
          end={voce.end}
          className={({ isActive }) => `nav-item${isActive ? ' attivo' : ''}`}
        >
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round">
            {voce.icona}
          </svg>
          {voce.label}
        </NavLink>
      ))}
    </nav>
  );
}
