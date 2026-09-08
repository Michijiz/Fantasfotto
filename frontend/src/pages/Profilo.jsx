import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDati } from '../context/DataContext';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function Profilo() {
  const { utente } = useAuth();
  const { squadre, ricaricaSquadre } = useDati();
  const mostraToast = useToast();

  const miaSquadra = squadre.find((s) => s._id === utente.squadra || s._id === utente.squadra?._id);

  const [modifica, setModifica] = useState(false);
  const [bio, setBio] = useState('');
  const [rosa, setRosa] = useState('');
  const [stemma, setStemma] = useState('');
  const [errore, setErrore] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (miaSquadra) {
      setBio(miaSquadra.bio || '');
      setRosa((miaSquadra.rosa || []).join(', '));
      setStemma(miaSquadra.stemma || '');
    }
  }, [miaSquadra?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    setSalvando(true);
    try {
      await api.patch('/api/squadre/mia', { bio, rosa, stemma });
      await ricaricaSquadre();
      mostraToast('Squadra aggiornata!');
      setModifica(false);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="card">
        <h2 className="section-title">Il tuo profilo</h2>
        <div className="profilo-nome">{utente.nomeVisualizzato}</div>
        <span className={`profilo-badge`}>{utente.ruolo === 'admin' ? 'Direttore di turno' : 'Abbonato'}</span>
      </div>

      <div className="card">
        <h2 className="section-title">
          La tua squadra
          {!modifica && <button className="vedi-tutto" onClick={() => setModifica(true)}>Modifica</button>}
        </h2>

        {!miaSquadra ? (
          <div className="empty">Caricamento...</div>
        ) : !modifica ? (
          <div>
            <div style={{ textAlign: 'center', margin: '10px 0' }}>
              <span style={{ fontSize: 40 }}>{miaSquadra.stemma || '🛡️'}</span>
              <div className="profilo-nome" style={{ fontSize: 18 }}>{miaSquadra.nome}</div>
            </div>
            {miaSquadra.bio && <p>{miaSquadra.bio}</p>}
            {miaSquadra.rosa?.length > 0 && (
              <div className="players">
                {miaSquadra.rosa.map((n) => <span className="chip" key={n}>{n}</span>)}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={salva}>
            <label>Stemma (emoji)</label>
            <input type="text" value={stemma} onChange={(e) => setStemma(e.target.value)} placeholder="es. 🦅" />
            <label>Bio / storia della squadra</label>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Racconta la storia della tua squadra..." />
            <label>Rosa (nomi separati da virgola)</label>
            <input type="text" value={rosa} onChange={(e) => setRosa(e.target.value)} placeholder="Giocatore 1, Giocatore 2, ..." />
            <button className="primary" type="submit" disabled={salvando}>Salva squadra</button>
            {errore && <div className="errore-msg">{errore}</div>}
          </form>
        )}
      </div>
    </>
  );
}
