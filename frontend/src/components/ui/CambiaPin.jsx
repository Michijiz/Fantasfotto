import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

// Il foglio "Cambia PIN", aperto dal Profilo o dal Menù.
export default function CambiaPin({ onFatto }) {
  const mostraToast = useToast();
  const [attuale, setAttuale] = useState('');
  const [nuovo, setNuovo] = useState('');
  const [ripeti, setRipeti] = useState('');
  const [errore, setErrore] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    if (!/^\d{4,6}$/.test(nuovo)) { setErrore('Il PIN va da 4 a 6 cifre. Niente di più, niente di meno'); return; }
    if (nuovo !== ripeti) { setErrore('I due PIN nuovi non coincidono'); return; }
    if (nuovo === attuale) { setErrore('Il nuovo PIN è uguale al vecchio: così non vale'); return; }
    setSalvando(true);
    try {
      await api.patch('/api/auth/pin', { pinAttuale: attuale, nuovoPin: nuovo });
      mostraToast('PIN cambiato: non dirlo a nessuno');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salva} noValidate>
      <label htmlFor="p-attuale">PIN attuale</label>
      <input id="p-attuale" type="password" inputMode="numeric" autoComplete="current-password" value={attuale} onChange={(e) => setAttuale(e.target.value)} />
      <label htmlFor="p-nuovo">Nuovo PIN <span className="facoltativo">4-6 cifre</span></label>
      <input id="p-nuovo" type="password" inputMode="numeric" autoComplete="new-password" value={nuovo} onChange={(e) => setNuovo(e.target.value)} />
      <label htmlFor="p-ripeti">Ripeti il nuovo PIN</label>
      <input id="p-ripeti" type="password" inputMode="numeric" autoComplete="new-password" value={ripeti} onChange={(e) => setRipeti(e.target.value)} />
      <button className="bottone-grande" type="submit" disabled={salvando}>
        {salvando ? 'Cambio la serratura…' : 'Cambia la serratura'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
