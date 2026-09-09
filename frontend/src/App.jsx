import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ultima from './pages/Ultima';
import Lega from './pages/Lega';
import Verdetti from './pages/Verdetti';
import Squadre from './pages/Squadre';
import Profilo from './pages/Profilo';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
