import { NavLink } from 'react-router-dom';

const VOCI = [
  {
    to: '/',
    end: true,
    label: 'Home',
    icona: <path d="M3 11l9-7 9 7M5 10v10h14V10" />
  },
  {
    to: '/ultima',
    label: 'Ultima',
    icona: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 9h8M8 13h8M8 17h4" /></>
  },
  {
    to: '/verdetti',
    label: 'Verdetti',
    icona: <path d="M12 3l2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z" />
  },
  {
    to: '/squadre',
    label: 'Squadre',
    icona: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
  },
  {
    to: '/profilo',
    label: 'Profilo',
    icona: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-4 5-5.5 7-5.5s5.5 1.5 7 5.5" /></>
  }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {VOCI.map((voce) => (
        <NavLink
          key={voce.to}
          to={voce.to}
          end={voce.end}
          className={({ isActive }) => `nav-item${isActive ? ' attivo' : ''}`}
        >
          <span className="puntino" />
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round">
            {voce.icona}
          </svg>
          {voce.label}
        </NavLink>
      ))}
    </nav>
  );
}
