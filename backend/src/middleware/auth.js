const jwt = require('jsonwebtoken');
const User = require('../models/User');

function verificaToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ errore: 'Token mancante' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utente = payload; // { id, username, ruolo, squadra }
    next();
  } catch (err) {
    return res.status(401).json({ errore: 'Token non valido o scaduto' });
  }
}

// Il ruolo è scritto anche nel token, che però dura 90 giorni: se sul database
// uno viene promosso a redattore, il suo token continua a dire "giocatore" fino
// al prossimo accesso. Quindi il token vale solo come scorciatoia per dire di sì;
// quando dice di no si controlla il database prima di rifiutare. È una query in
// più solo sulle rotte di scrittura, che sono poche e non stanno in un ciclo.
async function ruoloCorrente(req) {
  if (req.utente?.ruolo === 'admin') return 'admin';
  const utente = await User.findById(req.utente?.id).select('ruolo').lean();
  return utente?.ruolo || req.utente?.ruolo || 'giocatore';
}

function guardia(ammessi, messaggio) {
  return async (req, res, next) => {
    try {
      if (ammessi.includes(req.utente?.ruolo)) return next();
      const ruolo = await ruoloCorrente(req);
      if (!ammessi.includes(ruolo)) return res.status(403).json({ errore: messaggio });
      req.utente.ruolo = ruolo;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Cancellare è l'unica azione senza ritorno: resta a chi amministra la lega.
const richiedeAdmin = guardia(['admin'], 'Questa la può fare solo l\'amministratore');

// Compilare la giornata, mandare in stampa l'edizione, tenere l'albo d'oro:
// è il lavoro della redazione. L'admin è un redattore con in più le cancellazioni.
const richiedeRedazione = guardia(['redattore', 'admin'], 'Questa la può fare solo il direttore di turno');

module.exports = { verificaToken, richiedeAdmin, richiedeRedazione };
