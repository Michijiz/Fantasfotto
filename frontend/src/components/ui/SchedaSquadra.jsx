import { useState } from 'react';
import { api } from '../../api/client';
import { RUOLI_ROSA } from '../../utils/lega';

// Il modulo "La scheda della squadra": nome, anno di fondazione, storia e rosa
// per ruolo. Stemma e maglia non si caricano da qui: arrivano dai loghi di redazione.
// I nomi del vecchio formato (senza ruolo) non entrano in nessun campo: si
// mostrano in una nota, da ricopiare nel ruolo giusto prima di salvare.
export default function SchedaSquadra({ squadra, onSalvata }) {
  const r = squadra.rosaRuoli || {};
  const [nome, setNome] = useState(squadra.nome || '');
  const [fondata, setFondata] = useState(squadra.fondataNel ? String(squadra.fondataNel) : '');
  const [storia, setStoria] = useState(squadra.bio || '');
  const [rosa, setRosa] = useState(Object.fromEntries(RUOLI_ROSA.map((x) => [x.id, (r[x.id] || []).join(', ')])));
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');
  const senzaRuolo = squadra.rosa || [];

  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    if (!nome.trim()) { setErrore('Il nome della squadra non può restare vuoto'); return; }
    if (fondata.trim() && !/^\d{4}$/.test(fondata.trim())) { setErrore("L'anno di fondazione va scritto con quattro cifre"); return; }
    setSalvando(true);
    try {
      await api.patch('/api/squadre/mia', { nome, fondataNel: fondata.trim(), bio: storia, rosaRuoli: rosa });
      await onSalvata();
    } catch (err) {
      setErrore(err.message);
      setSalvando(false);
    }
  };

  return (
    <form className="scheda-form" onSubmit={salva} noValidate>
      <label htmlFor="s-nome">Nome della squadra</label>
      <input id="s-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />

      <label htmlFor="s-fondata">Fondata nel <span className="facoltativo">facoltativo</span></label>
      <input id="s-fondata" type="text" inputMode="numeric" maxLength={4} value={fondata} onChange={(e) => setFondata(e.target.value)} placeholder="es. 2019" />

      <label htmlFor="s-storia">La storia</label>
      <textarea id="s-storia" rows={5} value={storia} onChange={(e) => setStoria(e.target.value)} placeholder="Com'è nata, cosa promette, cosa non mantiene…" />

      {RUOLI_ROSA.map((ruolo) => (
        <div key={ruolo.id}>
          <label htmlFor={`s-${ruolo.id}`}>{ruolo.nome} <span className="facoltativo">nomi separati da virgola</span></label>
          <input
            id={`s-${ruolo.id}`}
            type="text"
            value={rosa[ruolo.id]}
            onChange={(e) => setRosa((prima) => ({ ...prima, [ruolo.id]: e.target.value }))}
          />
        </div>
      ))}

      {senzaRuolo.length > 0 && (
        <p className="nota-form">
          Senza ruolo, da sistemare nei campi qui sopra: {senzaRuolo.join(', ')}. Salvando la scheda questo elenco si svuota.
        </p>
      )}

      <button className="bottone-grande" type="submit" disabled={salvando}>
        {salvando ? "Aggiorno l'annuario…" : 'Salva la scheda'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
