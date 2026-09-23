const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  nomeVisualizzato: { type: String, required: true, trim: true },
  pinHash: { type: String, required: true },
  // Tre ruoli, in ordine di poteri:
  //  - giocatore: legge la Gazzetta, compila la schedina, vota i verdetti;
  //  - redattore: in più compila le giornate (scontri e punteggi), manda in
  //    stampa le edizioni e tiene l'albo d'oro — è il "direttore di turno";
  //  - admin: come il redattore, e in più può cancellare (edizioni, giornate,
  //    voci dell'albo). Cancellare è l'unica azione che non si annulla, quindi
  //    resta a chi amministra la lega.
  // Si sceglie in fase di iscrizione; 'admin' non si può chiedere da lì, si
  // assegna a mano sul database.
  ruolo: { type: String, enum: ['admin', 'redattore', 'giocatore'], default: 'giocatore' },
  squadra: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadra', required: true },

  // Tema colore dell'app: l'id di una squadra di Serie A (o 'palermo', il tema
  // storico della Gazzetta). L'elenco vero vive nel frontend (src/temi.js): qui
  // si salva solo lo slug scelto, così aggiungere una squadra non tocca il DB.
  tema: { type: String, default: 'palermo', trim: true, lowercase: true },

  // Avatar: lo slug di un'illustrazione in frontend/public/avatars/ (vedi
  // src/avatar.js). Come per il tema, qui si salva solo lo slug: aggiungere un
  // avatar non tocca il database. Vuoto = quello della squadra tifata.
  avatar: { type: String, default: '', trim: true, lowercase: true },

  // La pagina Profilo la compone l'utente: ogni testo è facoltativo e, se vuoto,
  // sparisce dal ritaglio. Il titolo è nomeVisualizzato. `nascosti` elenca i
  // ritagli spenti (e non quelli accesi): un ritaglio aggiunto in futuro compare
  // a tutti senza migrare nulla.
  profilo: {
    occhiello: { type: String, default: '', trim: true, maxlength: 40 },
    sottotitolo: { type: String, default: '', trim: true, maxlength: 60 },
    motto: { type: String, default: '', trim: true, maxlength: 160 },
    didascalia: { type: String, default: '', trim: true, maxlength: 100 },
    sfondo: { type: String, default: 'tema', trim: true, lowercase: true },
    stileTitolo: { type: String, enum: ['pieno', 'contorno'], default: 'pieno' },
    nascosti: [{ type: String, trim: true, lowercase: true }]
  },
  attivo: { type: Boolean, default: true },

  // Protezione del PIN (4-6 cifre, quindi indovinabile a forza di tentativi):
  // dopo troppi PIN sbagliati l'accesso si blocca per qualche minuto.
  tentativiFalliti: { type: Number, default: 0 },
  bloccatoFino: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
