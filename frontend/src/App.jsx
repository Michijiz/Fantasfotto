import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/layout/AppShell';
import Splash from './components/ui/Splash';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ultima from './pages/Ultima';
import Lega from './pages/Lega';
import Verdetti from './pages/Verdetti';
import Squadre from './pages/Squadre';
import Profilo from './pages/Profilo';
import Regolamento from './pages/Regolamento';

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
          <Route path="/lega" element={<Lega />} />
          <Route path="/gioca" element={<Verdetti />} />
          <Route path="/squadre" element={<Squadre />} />
          <Route path="/profilo" element={<Profilo />} />
          <Route path="/regolamento" element={<Regolamento />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
