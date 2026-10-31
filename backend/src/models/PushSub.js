const mongoose = require('mongoose');

// Un dispositivo che ha chiesto di ricevere le notifiche. L'endpoint è unico per
// dispositivo: la stessa persona con telefono e computer ha due righe.
const pushSubSchema = new mongoose.Schema({
  utente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('PushSub', pushSubSchema);
