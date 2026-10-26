import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Font self-hosted (prima venivano da Google Fonts): finiscono nel precache del service
// worker e l'app ha lo stesso aspetto anche offline o con la rete lenta. Solo il
// subset latin: copre le lettere accentate italiane.
import '@fontsource/anton/latin-400.css';
import '@fontsource/libre-baskerville/latin-400.css';
import '@fontsource/libre-baskerville/latin-400-italic.css';
import '@fontsource/libre-baskerville/latin-700.css';
import '@fontsource/oswald/latin-400.css';
import '@fontsource/oswald/latin-500.css';
import '@fontsource/oswald/latin-600.css';
import './index.css';
import './styles/global.css';
import './styles/ritagli.css';
import App from './App.jsx';
import { applicaTema, temaSalvato } from './temi';
import { seguiAltezzaApp } from './utils/altezzaApp';

// Prima del primo render: senza questo l'app disegnerebbe un frame con i colori
// di default prima che il tema dell'utente arrivi dal server.
applicaTema(temaSalvato());

// Altezza reale della finestra in --app-h: il CSS non si fida più del solo
// 100dvh, che si aggiorna a scatti e lasciava una striscia sotto la bottom nav.
seguiAltezzaApp();

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
