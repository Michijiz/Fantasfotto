import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

// Lato lungo massimo delle immagini caricate: basta per foto squadra e articolo
// anche su schermi retina, e tiene il file ben sotto il limite di 4 MB del server.
const LATO_MASSIMO = 1600;
const QUALITA_JPEG = 0.85;

// Le foto scattate col telefono pesano spesso 4-8 MB e verrebbero rifiutate:
// le rimpiccioliamo nel browser prima dell'invio. PNG resta PNG (gli stemmi
// possono avere lo sfondo trasparente), il resto diventa JPEG. Se il browser
// non riesce a elaborare il file si invia l'originale.
async function preparaImmagine(file) {
  const tipiElaborabili = ['image/jpeg', 'image/png', 'image/webp'];
  if (!tipiElaborabili.includes(file.type) || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scala = Math.min(1, LATO_MASSIMO / Math.max(bitmap.width, bitmap.height));

    if (scala === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scala);
    canvas.height = Math.round(bitmap.height * scala);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const tipo = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, tipo, QUALITA_JPEG));
    if (!blob || blob.size >= file.size) return file;

    const estensione = tipo === 'image/png' ? 'png' : 'jpg';
    const nome = file.name.replace(/\.[^.]+$/, '') || 'immagine';
    return new File([blob], `${nome}.${estensione}`, { type: tipo });
  } catch {
    return file;
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
      input.value = '';
    }
  };

  return (
    <>
      <label>{label}</label>
      <div className="upload-row">
        {value && <img src={value} className="img-preview" alt="" />}
        <input type="file" accept="image/*" onChange={onFile} disabled={caricando} />
        {caricando && <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 11, color: 'var(--ink-soft)' }}>Caricamento...</span>}
      </div>
    </>
  );
}
