const mongoose = require('mongoose');
const User = require('../models/User');
const Schedina = require('../models/Schedina');
const { profiloPubblico } = require('./authController');

// La pagina Profilo di un altro utente, in sola lettura. Esce solo ciò che serve
// al ritaglio: niente username (è la credenziale d'accesso, insieme al PIN), né
// PIN, tentativi falliti o blocchi. Gli utenti disattivati non si vedono.
const profilo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ errore: 'Utente non trovato' });

  const user = await User.findOne({ _id: id, attivo: true })
    .select('nomeVisualizzato ruolo squadra tema avatar profilo createdAt')
    .populate('squadra', 'nome stemma')
    .lean();
  if (!user) return res.status(404).json({ errore: 'Utente non trovato' });

  const [giocate, vinte] = await Promise.all([
    Schedina.countDocuments({ utente: id, esito: { $ne: 'attesa' } }),
    Schedina.countDocuments({ utente: id, esito: 'vinta' })
  ]);

  res.json({
    utente: {
      id: user._id,
      nomeVisualizzato: user.nomeVisualizzato,
      ruolo: user.ruolo,
      squadra: user.squadra,
      tema: user.tema || 'palermo',
      avatar: user.avatar || '',
      profilo: profiloPubblico(user.profilo),
      iscrittoIl: user.createdAt
    },
    schedine: { giocate, vinte }
  });
};

module.exports = { profilo };
