import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/global.css';
import App from './App.jsx';
import { applicaTema, temaSalvato } from './temi';

// Prima del primo render: senza questo l'app disegnerebbe un frame con i colori
// di default prima che il tema dell'utente arrivi dal server.
applicaTema(temaSalvato());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
