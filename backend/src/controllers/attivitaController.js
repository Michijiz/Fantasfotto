const Attivita = require('../models/Attivita');
const { TIPI } = require('../models/Attivita');

// Le ultime schedine giocate e i verdetti emessi, dalla più recente. Le righe di
// utenti o squadre che non esistono più (o disattivati) si scartano invece di
// mostrare "qualcuno". Il filtro sul tipo serve anche per le vecchie righe di
// temi, profili e simili ancora nel database: spariscono da sole entro 60 giorni.
const lista = async (req, res) => {
  const limite = Math.min(50, Math.max(1, Number(req.query.limite) || 20));

  const righe = await Attivita.find({ tipo: { $in: TIPI } })
    .sort({ quando: -1 })
    .limit(limite * 2)
    .populate('autore', 'nomeVisualizzato avatar tema attivo')
    .populate('squadra', 'nome stemma')
    .lean();

  const attivita = righe
    .filter((a) => a.autore && a.autore.attivo !== false)
    .slice(0, limite)
    .map((a) => ({
      id: a._id,
      tipo: a.tipo,
      quando: a.quando,
      dati: a.dati || {},
      autore: { id: a.autore._id, nomeVisualizzato: a.autore.nomeVisualizzato, avatar: a.autore.avatar || '', tema: a.autore.tema },
      squadra: a.squadra ? { _id: a.squadra._id, nome: a.squadra.nome, stemma: a.squadra.stemma } : null
    }));

  res.json({ attivita });
};

module.exports = { lista };
