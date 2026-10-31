import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { TemaProvider } from './context/TemaContext';
import AppShell from './components/layout/AppShell';
import Splash from './components/ui/Splash';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ultima from './pages/Ultima';
const Scrivi = lazy(() => import('./pages/Scrivi'));
const Lega = lazy(() => import('./pages/Lega'));
const Gioca = lazy(() => import('./pages/Gioca'));
const Squadre = lazy(() => import('./pages/Squadre'));
const Squadra = lazy(() => import('./pages/Squadra'));
const Archivio = lazy(() => import('./pages/Archivio'));
const Risultati = lazy(() => import('./pages/Risultati'));
import NonTrovata from './pages/NonTrovata';
const Profilo = lazy(() => import('./pages/Profilo'));
const Allenatori = lazy(() => import('./pages/Allenatori'));
const Regolamento = lazy(() => import('./pages/Regolamento'));

// Mostra lo splash finché AuthContext non ha finito di capire se c'è una
// sessione valida — a prescindere da dove l'utente stia per atterrare
// (app protetta o /login), così lo splash si vede sempre all'apertura.
function Gate() {
  const { caricamento } = useAuth();

  if (caricamento) return <Splash />;

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gazzetta" element={<Ultima />} />
          <Route path="/gazzetta/scrivi" element={<Scrivi />} />
          <Route path="/gazzetta/scrivi/:id" element={<Scrivi />} />
          <Route path="/lega" element={<Lega />} />
          <Route path="/gioca" element={<Gioca />} />
          <Route path="/archivio" element={<Archivio />} />
          <Route path="/verdetti/risultati" element={<Risultati />} />
          <Route path="/squadre" element={<Squadre />} />
          <Route path="/squadre/:id" element={<Squadra />} />
          <Route path="/profilo" element={<Profilo />} />
          <Route path="/profilo/:id" element={<Profilo />} />
          <Route path="/allenatori" element={<Allenatori />} />
          <Route path="/regolamento" element={<Regolamento />} />
          <Route path="*" element={<NonTrovata />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TemaProvider>
          <Gate />
        </TemaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
