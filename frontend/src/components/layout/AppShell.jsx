import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import Guida from '../ui/Guida';

function ShellInterno({ utente }) {
  const scrollRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Sulla pagina di scrittura la navigazione in basso e il tasto + lasciano il
  // posto alla barra "Manda in stampa".
  const scrivendo = pathname.startsWith('/gazzetta/scrivi');
  const [drawerAperto, setDrawerAperto] = useState(false);

  // La guida "Come si gioca" si apre da sola solo dopo l'iscrizione (AuthContext
  // lascia il segno nel localStorage), con una breve pausa: prima si vede la Home.
  // Si può riaprire dal menù in qualsiasi momento.
  const chiaveGuida = `gazzetta_guida_${utente.id}`;
  const [guidaAperta, setGuidaAperta] = useState(false);
  useEffect(() => {
    let daMostrare = false;
    try { daMostrare = localStorage.getItem(chiaveGuida) === 'da-mostrare'; } catch { /* storage non disponibile */ }
    if (!daMostrare) return undefined;
    const timer = setTimeout(() => setGuidaAperta(true), 700);
    return () => clearTimeout(timer);
  }, [chiaveGuida]);
  const chiudiGuida = () => {
    setGuidaAperta(false);
    try { localStorage.setItem(chiaveGuida, 'visto'); } catch { /* storage non disponibile */ }
  };

  // Il contenitore di scroll è unico per tutte le pagine: senza questo, passando
  // da una pagina scorsa in basso a un'altra si atterrava a metà. Layout effect,
  // così avviene prima degli effetti delle pagine (es. Regolamento che scorre a
  // una sezione).
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div id="appScreen" className={scrivendo ? 'scrivendo' : undefined}>
      <InstallBanner />
      <RistampaBanner />
      <div className="area-scroll">
        <AppHeader scrollRef={scrollRef} onApriMenu={() => setDrawerAperto(true)} />
        <div className={`contenuto${scrivendo ? ' scrivendo' : ''}`} ref={scrollRef}>
          <div className="tab-content attiva">
            <Suspense fallback={null}>
              <Outlet context={{ utente }} />
            </Suspense>
          </div>
        </div>
      </div>

      <Drawer aperto={drawerAperto} onChiudi={() => setDrawerAperto(false)} onApriGuida={() => setGuidaAperta(true)} />
      <Guida aperta={guidaAperta} onChiudi={chiudiGuida} utente={utente} />

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
