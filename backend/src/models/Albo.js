const mongoose = require('mongoose');

// Una riga dell'albo d'oro: chi ha vinto la lega in una stagione. Inserito a mano
// dalla redazione (non c'è un concetto di "stagione" altrove nel modello dati: qui
// è solo un'etichetta libera, es. "2023/2024").
//
// Tutto ciò che va oltre stagione e squadra è facoltativo: le voci inserite prima
// che esistessero podio, foto e allenatori restano valide così come sono.
const alboSchema = new mongoose.Schema({
  stagione: { type: String, required: true, trim: true },
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },
  punti: { type: Number },
  note: { type: String, default: '' },

  // Il podio, facoltativo.
  secondo: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' },
  terzo: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra' },
  // Foto della stagione (premiazione, squadra, trofeo): prende il posto dello
  // stemma nel ritaglio del campione in carica.
  foto: { type: String, default: '' },
  // Chi allenava la squadra quando ha vinto, fissato al momento dell'inserimento:
  // se poi la squadra cambia allenatore, il titolo resta a chi l'ha vinto davvero.
  allenatori: [{
    _id: false,
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nome: { type: String, trim: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Albo', alboSchema);
