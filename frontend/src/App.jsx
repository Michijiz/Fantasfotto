import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Home from './pages/Home';
import Ultima from './pages/Ultima';
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
              <Route path="/" element={<Home />} />
              <Route path="/ultima" element={<Ultima />} />
              <Route path="/verdetti" element={<Verdetti />} />
              <Route path="/squadre" element={<Squadre />} />
              <Route path="/profilo" element={<Profilo />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
