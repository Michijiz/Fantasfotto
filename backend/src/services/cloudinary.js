const { v2: cloudinary } = require('cloudinary');

const CAMPI = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Senza le tre variabili d'ambiente la libreria fallisce a metà upload con un
// errore generico ("Must supply api_key"), che arrivava al client come un 500
// muto: meglio saperlo prima e dirlo chiaramente.
function variabiliMancanti() {
  return CAMPI.filter((campo) => !process.env[campo]);
}

function configurato() {
  return variabiliMancanti().length === 0;
}

function caricaBuffer(buffer, cartella = 'fantasfotto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: cartella },
      (err, result) => {
        if (err) return reject(err);
        if (!result || !result.secure_url) {
          return reject(new Error('Cloudinary non ha restituito un URL'));
        }
        resolve(result);
      }
    );
    stream.on('error', reject);
    stream.end(buffer);
  });
}

module.exports = { caricaBuffer, configurato, variabiliMancanti };
