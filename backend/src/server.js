require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  // Esecuzione locale: ascolta su una porta. Su Vercel il file viene importato come
  // funzione serverless, quindi questo blocco non parte.
  app.listen(PORT, () => console.log(`[server] In ascolto su http://localhost:${PORT}`));
}

module.exports = app;
