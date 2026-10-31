const PushSub = require('../models/PushSub');
const { attive, chiavePubblica } = require('../services/notifiche');

const errore = (status, messaggio) => Object.assign(new Error(messaggio), { status, esposto: true });

// La chiave pubblica serve al browser per iscriversi. `null` = notifiche spente
// sul server (chiavi VAPID non configurate): l'app nasconde il comando.
const chiave = (req, res) => res.json({ attive: attive(), chiave: chiavePubblica() });

const iscrivi = async (req, res) => {
  const { endpoint, keys } = req.body?.subscription || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw errore(400, 'Iscrizione non valida');
  await PushSub.findOneAndUpdate(
    { endpoint },
    { utente: req.utente.id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ ok: true });
};

const disiscrivi = async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) throw errore(400, 'Manca il dispositivo');
  await PushSub.deleteOne({ endpoint, utente: req.utente.id });
  res.json({ ok: true });
};

module.exports = { chiave, iscrivi, disiscrivi };
