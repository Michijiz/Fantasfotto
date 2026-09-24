import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import useNomeLega, { impostaNomeLega } from '../../hooks/useNomeLega';

// In fondo al Profilo, solo per l'amministratore: il nome della lega che compare
// nella testata al posto di "la Lega".
export default function NomeLega() {
  const attuale = useNomeLega();
  // Il modulo riparte dal nome salvato ogni volta che questo cambia.
  return <ModuloNome key={attuale} iniziale={attuale} />;
}

function ModuloNome({ iniziale }) {
  const mostraToast = useToast();
  const [nome, setNome] = useState(iniziale);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');


  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    setSalvando(true);
    try {
      const { nome: salvato } = await api.patch('/api/lega', { nome });
      impostaNomeLega(salvato);
      mostraToast('Nome della lega aggiornato');
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="ritaglio">
      <div className="ritaglio-occhiello"><span>La lega · solo amministratore</span><span className="filo" /></div>
      <form onSubmit={salva} noValidate>
        <label htmlFor="nome-lega">Nome della lega</label>
        <input id="nome-lega" type="text" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Lega del Bar Sport" />
        <p className="nota-form">Compare nei testi al posto di «la Lega». Se lo lasci vuoto, si torna a «la Lega».</p>
        <button className="bottone-contorno" type="submit" disabled={salvando}>Salva il nome</button>
        {errore && <div className="errore-msg">{errore}</div>}
      </form>
    </section>
  );
}
