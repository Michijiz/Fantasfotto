import { useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import InstallBanner from './InstallBanner';
import Drawer from './Drawer';
import Sheet from '../ui/Sheet';
import NuovaEdizioneForm from '../ui/NuovaEdizioneForm';
import Splash from '../ui/Splash';

function ShellInterno({ utente }) {
  const scrollRef = useRef(null);
  const [sheetNuovaAperta, setSheetNuovaAperta] = useState(false);
  const [drawerAperto, setDrawerAperto] = useState(false);

  return (
    <div id="appScreen">
      <InstallBanner />
      <AppHeader scrollRef={scrollRef} onApriMenu={() => setDrawerAperto(true)} />
      <div className="contenuto" ref={scrollRef}>
        <div className="tab-content attiva">
          <Outlet context={{ utente }} />
        </div>
      </div>

      <Drawer aperto={drawerAperto} onChiudi={() => setDrawerAperto(false)} />

      {utente.ruolo === 'admin' && (
        <button className="fab" onClick={() => setSheetNuovaAperta(true)} title="Nuova edizione">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      <Sheet aperto={sheetNuovaAperta} onChiudi={() => setSheetNuovaAperta(false)} titolo="Nuova Edizione" grande>
        {sheetNuovaAperta && <NuovaEdizioneForm onFatto={() => setSheetNuovaAperta(false)} />}
      </Sheet>

      <BottomNav />
    </div>
  );
}

export default function AppShell() {
  const { utente, caricamento } = useAuth();

  if (caricamento) return <Splash />;
  if (!utente) return <Navigate to="/login" replace />;

  return (
    <DataProvider>
      <ShellInterno utente={utente} />
    </DataProvider>
  );
}
