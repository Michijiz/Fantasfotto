const Lega = require('../models/Lega');

const leggi = async (req, res) => {
  const lega = await Lega.findOne({ chiave: 'lega' }).lean();
  res.json({ nome: lega?.nome || '' });
};

const aggiorna = async (req, res) => {
  const nome = String(req.body?.nome ?? '').trim().slice(0, 40);
  const lega = await Lega.findOneAndUpdate(
    { chiave: 'lega' },
    { nome },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ nome: lega.nome });
};

module.exports = { leggi, aggiorna };
