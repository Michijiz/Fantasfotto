import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Menu profilo a scomparsa da sinistra, aperto dall'hamburger nell'header.
// Ospita anche il selettore temi: solo un'anteprima visiva per ora (cambia dal
// vivo l'accento --stamp-red), non salva nulla — vedi spec "Temi colore".
const TEMI = [
  { colore: '#c8102e', nome: 'Rosso stampa' },
  { colore: '#2f6fb0', nome: 'Blu' },
  { colore: '#2f9e57', nome: 'Verde' },
  { colore: '#7a3fae', nome: 'Viola' },
  { colore: '#b8892f', nome: 'Oro' }
];

export default function Drawer({ aperto, onChiudi }) {
  const { utente, logout } = useAuth();
  const navigate = useNavigate();
  const [temaPopoverAperto, setTemaPopoverAperto] = useState(false);
  const [temaSelezionato, setTemaSelezionato] = useState(TEMI[0].colore);

  const vai = (path) => {
    onChiudi();
    navigate(path);
  };

  const sceglieTema = (colore) => {
    setTemaSelezionato(colore);
    document.documentElement.style.setProperty('--stamp-red', colore);
  };

  return (
    <>
      <div className={`scrim${aperto ? ' aperto' : ''}`} onClick={onChiudi} />
      <div className={`drawer${aperto ? ' aperto' : ''}`}>
        <div className="drawer-intestazione">
          <div>
            <div className="chi">{utente?.nomeVisualizzato}</div>
            <div className="ruolo">{utente?.ruolo === 'admin' ? 'Direttore di turno' : 'Giocatore'}</div>
          </div>
          <button
            className="tema-dot"
            title="Cambia tema colore"
            aria-label="Cambia tema colore"
            onClick={() => setTemaPopoverAperto((v) => !v)}
          >
            <span className="pallina" />
          </button>
        </div>

        <div className={`tema-popover${temaPopoverAperto ? ' aperto' : ''}`}>
          {TEMI.map((t) => (
            <button
              key={t.colore}
              className={`tema-opzione${temaSelezionato === t.colore ? ' selezionata' : ''}`}
              style={{ '--tema': t.colore }}
              title={t.nome}
              aria-label={t.nome}
              onClick={() => sceglieTema(t.colore)}
            />
          ))}
        </div>

        <button className="drawer-link" onClick={() => vai('/profilo')}>Il mio profilo</button>
        <button className="drawer-link" onClick={() => vai('/squadre')}>Le squadre della lega</button>
        <button className="drawer-link esci" onClick={logout}>Esci</button>
      </div>
    </>
  );
}
