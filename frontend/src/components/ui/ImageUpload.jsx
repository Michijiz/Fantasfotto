import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

// Campo "carica immagine" riutilizzabile: mostra l'anteprima corrente, un input file,
// e al cambio file la carica subito su /api/upload (Cloudinary) restituendo l'URL
// tramite onChange — il form che lo usa tiene solo l'URL nello stato, non il file.
export default function ImageUpload({ label, value, onChange }) {
  const [caricando, setCaricando] = useState(false);
  const mostraToast = useToast();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCaricando(true);
    try {
      const formData = new FormData();
      formData.append('immagine', file);
      const { url } = await api.upload('/api/upload', formData);
      onChange(url);
    } catch (err) {
      mostraToast(err.message || 'Upload fallito');
    } finally {
      setCaricando(false);
      e.target.value = '';
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
