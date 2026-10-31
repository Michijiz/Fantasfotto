import { api } from './api/client';

// Notifiche push dal lato del browser. Funzionano solo con service worker e Push
// API; su iPhone anche solo dopo aver aggiunto l'app alla schermata Home.

export const pushSupportato = () => (
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
);

// La chiave VAPID arriva in base64url: il browser la vuole come byte.
function inBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const grezzo = atob(base64);
  return Uint8Array.from(grezzo, (c) => c.charCodeAt(0));
}

async function registrazione() {
  return navigator.serviceWorker.ready;
}

// 'non-supportato' | 'spente-dal-server' | 'negate' | 'attive' | 'disattive'
export async function statoNotifiche() {
  if (!pushSupportato()) return 'non-supportato';
  const { attive } = await api.get('/api/push/chiave');
  if (!attive) return 'spente-dal-server';
  if (Notification.permission === 'denied') return 'negate';
  const sub = await (await registrazione()).pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'attive' : 'disattive';
}

// Va chiamata da un tocco dell'utente: il browser chiede il permesso solo così.
export async function attivaNotifiche() {
  const { chiave } = await api.get('/api/push/chiave');
  if (!chiave) throw new Error('Notifiche non attive sul server');
  const permesso = await Notification.requestPermission();
  if (permesso !== 'granted') throw new Error('Permesso negato: si cambia dalle impostazioni del browser');
  const reg = await registrazione();
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: inBytes(chiave) }));
  await api.post('/api/push/iscrivi', { subscription: sub.toJSON() });
}

export async function disattivaNotifiche() {
  const sub = await (await registrazione()).pushManager.getSubscription();
  if (!sub) return;
  await api.post('/api/push/disiscrivi', { endpoint: sub.endpoint });
  await sub.unsubscribe();
}
