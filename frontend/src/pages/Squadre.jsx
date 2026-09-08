import { useState } from 'react';
import { useDati } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import Stemma from '../components/ui/Stemma';

export default function Squadre() {
  const { squadre, ricaricaSquadre } = useDati();
  const { utente } = useAuth();
  const [selezionataId, setSelezionataId] = useState(null);
  const [nuovoNome, setNuovoNome] = useState('');
  const [errore, setErrore] = useState('');
  const [creando, setCreando] = useState(false);
  const mostraToast = useToast();

  // Deriviamo la squadra selezionata dalla lista aggiornata (non da uno snapshot),
  // così se torni da "modifica la mia squadra" in Profilo vedi subito le modifiche.
  const selezionata = squadre.find((s) => s._id === selezionataId);

  const creaSquadra = async (e) => {
    e.preventDefault();
    setErrore('');
    if (!nuovoNome.trim()) return;
    setCreando(true);
    try {
      await api.post('/api/squadre', { nome: nuovoNome.trim() });
      await ricaricaSquadre();
      setNuovoNome('');
      mostraToast('Squadra creata!');
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCreando(false);
    }
  };

  if (selezionata) {
    return (
      <div className="card">
        <button className="link" onClick={() => setSelezionataId(null)}>← Tutte le squadre</button>
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <Stemma src={selezionata.stemma} size={64} />
          <div className="profilo-nome">{selezionata.nome}</div>
        </div>
        {selezionata.foto && <div className="article-img"><img src={selezionata.foto} alt={selezionata.nome} /></div>}
        {selezionata.maglia && (
          <div style={{ textAlign: 'center', margin: '14px 0' }}>
            <img src={selezionata.maglia} alt="Maglia" style={{ maxWidth: 140, border: '1px solid var(--ink-soft)' }} />
          </div>
        )}
        {selezionata.bio && <p>{selezionata.bio}</p>}
        {selezionata.rosa?.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: 16 }}>Rosa</h2>
            <div className="players">
              {selezionata.rosa.map((n) => <span className="chip" key={n}>{n}</span>)}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="section-title">Le Squadre della Lega</h2>
        {squadre.length === 0
          ? <div className="empty">Nessuna squadra ancora.</div>
          : squadre.map((s) => (
            <button className="squadra-riga" key={s._id} onClick={() => setSelezionataId(s._id)}>
              <Stemma src={s.stemma} size={40} />
              <div className="info">
                <b>{s.nome}</b>
                <span>{s.rosa?.length || 0} giocatori in rosa</span>
              </div>
            </button>
          ))}
      </div>

      {utente.ruolo === 'admin' && (
        <div className="card">
          <h2 className="section-title">Aggiungi squadra</h2>
          <form onSubmit={creaSquadra}>
            <label>Nome squadra</label>
            <input type="text" value={nuovoNome} onChange={(e) => setNuovoNome(e.target.value)} placeholder="es. I Faraoni del Fango" />
            <button className="primary" type="submit" disabled={creando}>Crea squadra</button>
            {errore && <div className="errore-msg">{errore}</div>}
          </form>
        </div>
      )}
    </>
  );
}
