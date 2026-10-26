import { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import { puoRedigere } from '../../ruoli';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import InstallBanner from './InstallBanner';
import RistampaBanner from './RistampaBanner';
import Drawer from './Drawer';

function ShellInterno({ utente }) {
  const scrollRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Sulla pagina di scrittura la navigazione in basso e il tasto + lasciano il
  // posto alla barra "Manda in stampa".
  const scrivendo = pathname.startsWith('/gazzetta/scrivi');
  const [drawerAperto, setDrawerAperto] = useState(false);

  // Il contenitore di scroll è unico per tutte le pagine: senza questo, passando
  // da una pagina scorsa in basso a un'altra si atterrava a metà. Layout effect,
  // così avviene prima degli effetti delle pagine (es. Regolamento che scorre a
  // una sezione).
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div id="appScreen">
      <InstallBanner />
      <RistampaBanner />
      <div className="area-scroll">
        <AppHeader scrollRef={scrollRef} onApriMenu={() => setDrawerAperto(true)} />
        <div className={`contenuto${scrivendo ? ' scrivendo' : ''}`} ref={scrollRef}>
          <div className="tab-content attiva">
            <Outlet context={{ utente }} />
          </div>
        </div>
      </div>

      <Drawer aperto={drawerAperto} onChiudi={() => setDrawerAperto(false)} />

      {puoRedigere(utente) && !scrivendo && (
        <button className="fab" onClick={() => navigate('/gazzetta/scrivi')} title="Si va in stampa" aria-label="Si va in stampa">
          <Plus size={26} weight="bold" />
        </button>
      )}

      {!scrivendo && <BottomNav />}
    </div>
  );
}

export default function AppShell() {
  const { utente } = useAuth();

  if (!utente) return <Navigate to="/login" replace />;

  return (
    <DataProvider>
      <ShellInterno utente={utente} />
    </DataProvider>
  );
}
