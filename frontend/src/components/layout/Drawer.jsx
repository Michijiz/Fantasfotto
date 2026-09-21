import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTema } from '../../context/TemaContext';
import { sfondoTema } from '../../temi';
import { etichettaRuolo } from '../../ruoli';
import Sheet from '../ui/Sheet';
import SelettoreTema from '../ui/SelettoreTema';

// Menu profilo a scomparsa da sinistra, aperto dall'hamburger nell'header.
// Il bollino accanto al nome mostra i colori della squadra scelta come tema e
// apre il foglio con tutte le squadre.
export default function Drawer({ aperto, onChiudi }) {
  const { utente, logout } = useAuth();
  const { temaId, tema, cambiaTema } = useTema();
  const navigate = useNavigate();
  const [sceltaAperta, setSceltaAperta] = useState(false);

  const vai = (path) => {
    onChiudi();
    navigate(path);
  };

  return (
    <>
      <div className={`scrim${aperto ? ' aperto' : ''}`} onClick={onChiudi} />
      <div className={`drawer${aperto ? ' aperto' : ''}`}>
        <div className="drawer-intestazione">
          <div>
            <div className="chi">{utente?.nomeVisualizzato}</div>
            <div className="ruolo">{etichettaRuolo(utente)}</div>
          </div>
          <button
            className="tema-dot"
            title={`Tema: ${tema.nome}`}
            aria-label={`Cambia tema colore (ora: ${tema.nome})`}
            onClick={() => setSceltaAperta(true)}
          >
            <span className="pallina" style={{ background: sfondoTema(tema.colori) }} />
          </button>
        </div>

        <button className="drawer-link" onClick={() => vai('/profilo')}>Il mio profilo</button>
        <button className="drawer-link" onClick={() => vai('/squadre')}>Le squadre della lega</button>
        <button className="drawer-link" onClick={() => vai('/regolamento')}>Regolamento e FAQ</button>
        <button className="drawer-link esci" onClick={logout}>Esci</button>
      </div>

      <Sheet
        aperto={sceltaAperta}
        onChiudi={() => setSceltaAperta(false)}
        titolo="Colori della Gazzetta"
        sottotitolo={`Ora: ${tema.nome}`}
        grande
      >
        <p className="tema-nota">
          Scegli la squadra che tifi: cambiano carta, inchiostro e accenti di tutta
          l&apos;app. Resta salvato sul tuo profilo, non solo su questo telefono.
        </p>
        <SelettoreTema valore={temaId} onSceglie={cambiaTema} />
      </Sheet>
    </>
  );
}
