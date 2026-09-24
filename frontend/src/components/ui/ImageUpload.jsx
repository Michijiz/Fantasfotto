import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

// Lato lungo massimo delle immagini caricate: basta per foto squadra e articolo
// anche su schermi retina, e tiene il file ben sotto il limite del server.
const LATO_MASSIMO = 1600;

// Il server accetta 4 MB (routes/upload.js) e Vercel taglia i body oltre 4,5 MB
// prima ancora di arrivarci. Puntiamo a 3 MB: il margine copre l'overhead del
// multipart, che sul file grezzo non è trascurabile.
const OBIETTIVO_BYTE = 3 * 1024 * 1024;
const LIMITE_SERVER = 4 * 1024 * 1024;

// Qualità JPEG provate in ordine: si scende solo finché serve a stare sotto
// l'obiettivo. Una foto normale esce già alla prima.
const QUALITA = [0.85, 0.7, 0.55, 0.4];

const sottoSoglia = (blob) => blob && blob.size <= OBIETTIVO_BYTE;

// --- decodifica -------------------------------------------------------------
//
// Il telefono è il caso difficile, non il desktop:
//  - le foto dell'iPhone sono HEIC, un formato che `createImageBitmap` non
//    conosce ma che Safari sa disegnare con un normale <img>;
//  - `createImageBitmap(Blob)` è arrivato tardi su iOS e su qualche WebView
//    Android non c'è affatto;
//  - alcuni selettori Android restituiscono un file con `type` vuoto;
//  - le foto scattate in verticale portano l'orientamento nell'EXIF: disegnarle
//    su canvas senza tenerne conto le ruota di 90°.
// Da qui due strade, provate in quest'ordine, e l'originale come ultima spiaggia.

async function daCreateImageBitmap(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    // imageOrientation: senza, l'EXIF viene ignorato e la foto esce ruotata.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
}

function daElementoImg(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // Un <img> applica l'EXIF da solo, quindi questa strada non ruota nulla.
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function decodifica(file) {
  const bitmap = await daCreateImageBitmap(file);
  if (bitmap && bitmap.width && bitmap.height) {
    return {
      sorgente: bitmap,
      larghezza: bitmap.width,
      altezza: bitmap.height,
      chiudi: () => bitmap.close?.()
    };
  }

  const elemento = await daElementoImg(file);
  if (elemento && elemento.img.naturalWidth) {
    return {
      sorgente: elemento.img,
      larghezza: elemento.img.naturalWidth,
      altezza: elemento.img.naturalHeight,
      chiudi: () => URL.revokeObjectURL(elemento.url)
    };
  }

  return null;
}

const inBlob = (canvas, tipo, qualita) =>
  new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), tipo, qualita);
    } catch {
      resolve(null);
    }
  });

// --- preparazione -----------------------------------------------------------

// Rimpicciolisce e ricomprime l'immagine nel browser. Restituisce il file da
// inviare, oppure lancia se non c'è modo di portarlo sotto il limite del server:
// meglio dirlo qui che farsi rifiutare il caricamento dopo l'attesa.
async function preparaImmagine(file) {
  const puoEssereTrasparente = file.type === 'image/png' || file.type === 'image/webp';

  // GIF animata: ridisegnarla su canvas la ridurrebbe al primo fotogramma.
  if (file.type === 'image/gif') {
    if (file.size <= LIMITE_SERVER) return file;
    throw new Error('GIF troppo grande: massimo 4 MB');
  }

  const immagine = await decodifica(file);

  if (!immagine) {
    // Formato che questo browser non sa disegnare (capita con certi HEIC su
    // Android). Si prova a mandarlo com'è: Cloudinary molti formati li converte.
    if (file.size <= LIMITE_SERVER) return file;
    throw new Error('Immagine troppo grande e non ridimensionabile su questo telefono: riprova con uno scatto più piccolo o con uno screenshot');
  }

  try {
    const { sorgente, larghezza, altezza } = immagine;
    const scala = Math.min(1, LATO_MASSIMO / Math.max(larghezza, altezza));

    // Già piccola e già leggera: si invia l'originale e si risparmia una
    // ricompressione che peggiorerebbe soltanto la qualità.
    if (scala === 1 && file.size <= 1.5 * 1024 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(larghezza * scala));
    canvas.height = Math.max(1, Math.round(altezza * scala));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Memoria esaurita o canvas disabilitato: non è un errore da mostrare
      // all'utente, è il caso in cui si prova comunque a mandare l'originale.
      if (file.size <= LIMITE_SERVER) return file;
      throw new Error('Immagine troppo grande e questo telefono non riesce a rimpicciolirla: riprova con uno scatto più piccolo');
    }
    ctx.drawImage(sorgente, 0, 0, canvas.width, canvas.height);

    // PNG solo se resta leggero: gli stemmi hanno lo sfondo trasparente e vale
    // la pena conservarlo, ma un PNG da 12 megapixel pesa più dell'originale.
    let blob = null;
    let tipo = 'image/jpeg';

    if (puoEssereTrasparente) {
      const png = await inBlob(canvas, 'image/png');
      if (sottoSoglia(png)) { blob = png; tipo = 'image/png'; }
    }

    if (!blob) {
      // Ripiego JPEG: il JPEG non ha il canale alpha, e sopra un canvas vuoto
      // il trasparente diventa nero. Si ridisegna su fondo bianco, che accanto
      // alla carta della Gazzetta sparisce, invece di una macchia scura.
      if (puoEssereTrasparente) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      for (const q of QUALITA) {
        blob = await inBlob(canvas, 'image/jpeg', q);
        if (sottoSoglia(blob)) break;
      }
    }

    if (!blob) {
      if (file.size <= LIMITE_SERVER) return file;
      throw new Error('Non riesco a comprimere questa immagine: riprova con una foto più piccola');
    }

    if (blob.size > LIMITE_SERVER) {
      throw new Error('Immagine troppo pesante anche dopo la compressione: riprova con una foto più piccola');
    }

    // Se la ricompressione non ha guadagnato nulla, tanto vale l'originale —
    // ma solo se l'originale passa dal server.
    if (blob.size >= file.size && file.size <= OBIETTIVO_BYTE) return file;

    const estensione = tipo === 'image/png' ? 'png' : 'jpg';
    const nome = (file.name || 'immagine').replace(/\.[^.]+$/, '') || 'immagine';
    return new File([blob], `${nome}.${estensione}`, { type: tipo });
  } finally {
    immagine.chiudi();
  }
}

// Campo "carica immagine" riutilizzabile: mostra l'anteprima corrente, un input file,
// e al cambio file la carica subito su /api/upload (Cloudinary) restituendo l'URL
// tramite onChange — il form che lo usa tiene solo l'URL nello stato, non il file.
export default function ImageUpload({ label, value, onChange }) {
  const [caricando, setCaricando] = useState(false);
  const mostraToast = useToast();

  const onFile = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    // L'input si azzera subito: su iOS, riscegliendo *lo stesso* file, l'evento
    // change non scatta se il valore non è cambiato — e dopo un errore sembrava
    // che il secondo tentativo non facesse nulla. `file` è già in mano nostra.
    input.value = '';
    if (!file) return;

    setCaricando(true);
    try {
      const daInviare = await preparaImmagine(file);
      const formData = new FormData();
      formData.append('immagine', daInviare);
      const { url } = await api.upload('/api/upload', formData);
      onChange(url);
    } catch (err) {
      mostraToast(err.message || 'Upload fallito');
    } finally {
      setCaricando(false);
    }
  };

  return (
    <>
      <label>{label}</label>
      <div className="upload-row">
        {value && <img src={value} className="img-preview" alt="" />}
        <label className={`bottone-contorno upload-bottone${caricando ? ' spento' : ''}`}>
          {caricando ? 'Sviluppo il rullino…' : value ? 'Cambia' : 'Carica foto'}
          <input type="file" accept="image/*" onChange={onFile} disabled={caricando} hidden />
        </label>
        {value && !caricando && (
          <button type="button" className="bottone-link" onClick={() => onChange('')}>Togli</button>
        )}
      </div>
    </>
  );
}
