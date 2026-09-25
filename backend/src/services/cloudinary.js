const { v2: cloudinary } = require('cloudinary');

const CAMPI = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

// Le variabili d'ambiente arrivano spesso incollate a mano: uno spazio o una
// virgoletta in coda non si vedono nel pannello di Vercel ma cambiano la firma,
// e Cloudinary risponde "Invalid Signature" come se il secret fosse sbagliato.
const pulisci = (v) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : v);

// Due modi di configurare, in ordine di precedenza:
//  1. CLOUDINARY_URL (cloudinary://chiave:secret@cloud) — una variabile sola,
//     si copia con un clic dalla dashboard e chiave e secret non possono essere
//     di due account diversi;
//  2. le tre variabili separate, come prima.
function daUrl() {
  const url = pulisci(process.env.CLOUDINARY_URL);
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'cloudinary:') return null;
    return {
      cloud_name: u.hostname,
      api_key: decodeURIComponent(u.username),
      api_secret: decodeURIComponent(u.password)
    };
  } catch {
    return null;
  }
}

const daCampiSeparati = () => ({
  cloud_name: pulisci(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: pulisci(process.env.CLOUDINARY_API_KEY),
  api_secret: pulisci(process.env.CLOUDINARY_API_SECRET)
});

const credenziali = daUrl() || daCampiSeparati();
const origineCredenziali = daUrl() ? 'CLOUDINARY_URL' : 'variabili separate';

cloudinary.config(credenziali);

// Senza le tre variabili d'ambiente la libreria fallisce a metà upload con un
// errore generico ("Must supply api_key"), che arrivava al client come un 500
// muto: meglio saperlo prima e dirlo chiaramente.
function variabiliMancanti() {
  if (daUrl()) return [];
  return CAMPI.filter((campo) => !pulisci(process.env[campo]));
}

function configurato() {
  return variabiliMancanti().length === 0;
}

// Diagnostica senza mai esporre i valori: lunghezza e presenza di spazi o
// virgolette in testa/coda. Un secret incollato con un ritorno a capo o con le
// virgolette attorno dà "Invalid Signature", che da fuori sembra un secret
// sbagliato — qui si vede che il problema è la copiatura.
function diagnosi() {
  const righe = { origine: origineCredenziali };
  if (process.env.CLOUDINARY_URL) {
    righe.CLOUDINARY_URL = daUrl()
      ? { formato: 'valido', lunghezzaSecret: credenziali.api_secret?.length }
      : { formato: 'NON valido: atteso cloudinary://chiave:secret@cloud' };
  }
  for (const campo of CAMPI) {
    const valore = process.env[campo];
    if (!valore) { righe[campo] = 'assente'; continue; }
    const pulito = valore.trim().replace(/^["']|["']$/g, '');
    righe[campo] = {
      lunghezza: valore.length,
      spaziEsterni: valore !== valore.trim(),
      virgolette: pulito !== valore.trim(),
      lunghezzaPulita: pulito.length
    };
  }
  return righe;
}

// Chiede a Cloudinary se le credenziali sono buone, senza caricare nulla.
async function ping() {
  if (!configurato()) return { ok: false, errore: 'credenziali mancanti' };
  try {
    const esito = await cloudinary.api.ping();
    return { ok: esito?.status === 'ok', esito: esito?.status };
  } catch (err) {
    return { ok: false, errore: err?.error?.message || err?.message || 'errore sconosciuto' };
  }
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

// Un indirizzo d'immagine salvato nel database deve venire dal nostro Cloudinary:
// altrimenti chiunque potrebbe mettere come stemma o in album un'immagine presa
// da un sito qualsiasi (che poi sparisce, o cambia contenuto). Senza nome del
// cloud configurato si accetta qualunque indirizzo di res.cloudinary.com.
function urlDelNostroCloud(url) {
  if (typeof url !== 'string') return false;
  const base = credenziali.cloud_name
    ? `https://res.cloudinary.com/${credenziali.cloud_name}/`
    : 'https://res.cloudinary.com/';
  return url.trim().startsWith(base);
}

module.exports = { caricaBuffer, configurato, variabiliMancanti, diagnosi, ping, urlDelNostroCloud };
