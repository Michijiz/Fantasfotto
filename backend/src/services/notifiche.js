const webpush = require('web-push');
const PushSub = require('../models/PushSub');

// Notifiche push. Le chiavi VAPID stanno nelle variabili d'ambiente (si generano
// con `npm run vapid`): senza, le notifiche sono spente e nessuna rotta si rompe.
let configurato = null;

function configura() {
  if (configurato !== null) return configurato;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    configurato = false;
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:redazione@gazzetta.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configurato = true;
  return true;
}

const attive = () => configura();
const chiavePubblica = () => (configura() ? process.env.VAPID_PUBLIC_KEY : null);

// Manda `payload` { titolo, corpo, url } a tutti i dispositivi iscritti (tranne
// quelli di `escludiUtente`, di solito chi ha causato la notifica). Non lancia
// mai: una notifica persa non deve far fallire l'azione che l'ha generata. Le
// iscrizioni scadute (404/410) si cancellano.
async function inviaATutti(payload, { escludiUtente } = {}) {
  if (!configura()) return { inviate: 0 };
  try {
    const filtro = escludiUtente ? { utente: { $ne: escludiUtente } } : {};
    const iscrizioni = await PushSub.find(filtro).lean();
    const corpo = JSON.stringify(payload);
    const esiti = await Promise.allSettled(iscrizioni.map((s) => (
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, corpo, { TTL: 12 * 3600, timeout: 5000 })
    )));
    const scadute = [];
    esiti.forEach((e, i) => {
      if (e.status === 'rejected' && [404, 410].includes(e.reason?.statusCode)) scadute.push(iscrizioni[i].endpoint);
    });
    if (scadute.length) await PushSub.deleteMany({ endpoint: { $in: scadute } });
    return { inviate: esiti.filter((e) => e.status === 'fulfilled').length };
  } catch (err) {
    console.error('Notifiche non inviate:', err.message);
    return { inviate: 0 };
  }
}

module.exports = { attive, chiavePubblica, inviaATutti };
