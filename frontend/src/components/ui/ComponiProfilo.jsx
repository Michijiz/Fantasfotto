import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { puoRedigere } from '../../ruoli';
import { SFONDI, RITAGLI } from '../../profilo';
import SelettoreAvatar from './SelettoreAvatar';

// Il foglio "Componi la tua pagina". Lavora su una bozza che vive nella pagina
// Profilo (onCambia a ogni tocco): così dietro lo sheet il ritaglio cambia mentre
// si scrive, e chiudendo senza salvare si torna a quello pubblicato.
export default function ComponiProfilo({ bozza, onCambia, onFatto }) {
  const { utente, setUtente } = useAuth();
  const mostraToast = useToast();
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');

  const p = bozza.profilo;
  const cambia = (campi) => onCambia({ ...bozza, ...campi });
  const cambiaProfilo = (campi) => onCambia({ ...bozza, profilo: { ...p, ...campi } });
  const testo = (campo) => (e) => cambiaProfilo({ [campo]: e.target.value });

  const ritagli = RITAGLI.filter((r) => !r.soloRedazione || puoRedigere(utente));
  const acceso = (id) => !p.nascosti.includes(id);
  const interruttore = (id) => cambiaProfilo({
    nascosti: acceso(id) ? [...p.nascosti, id] : p.nascosti.filter((n) => n !== id)
  });

  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    setSalvando(true);
    try {
      const { utente: aggiornato } = await api.patch('/api/auth/profilo', bozza);
      setUtente(aggiornato);
      mostraToast('Pagina mandata in stampa!');
      onFatto();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form className="componi" onSubmit={salva}>
      <p className="tema-nota">Lascia vuoto un campo e sparisce dal ritaglio.</p>

      <div className="componi-gruppo">La testata</div>

      <label htmlFor="c-occhiello" className="componi-etichetta">
        <span>Occhiello</span><span className="facoltativo">facoltativo</span>
      </label>
      <input id="c-occhiello" type="text" maxLength={40} value={p.occhiello} onChange={testo('occhiello')} placeholder="Es. Il personaggio" />

      <label htmlFor="c-nome" className="componi-etichetta"><span>Titolo · nome o soprannome</span></label>
      <input
        id="c-nome" type="text" maxLength={30} className="campo-titolo"
        value={bozza.nomeVisualizzato}
        onChange={(e) => cambia({ nomeVisualizzato: e.target.value })}
        placeholder="Es. Il Mister"
      />

      <label htmlFor="c-sottotitolo" className="componi-etichetta">
        <span>Sottotitolo</span><span className="facoltativo">facoltativo</span>
      </label>
      <input id="c-sottotitolo" type="text" maxLength={60} value={p.sottotitolo} onChange={testo('sottotitolo')} placeholder="Es. Tattico incompreso dal 2019" />

      <label htmlFor="c-motto" className="componi-etichetta">
        <span>Il motto</span><span className="facoltativo">facoltativo</span>
      </label>
      <textarea id="c-motto" rows={3} maxLength={160} className="campo-motto" value={p.motto} onChange={testo('motto')} placeholder="Una frase da prima pagina" />

      <label htmlFor="c-didascalia" className="componi-etichetta">
        <span>Didascalia della foto</span><span className="facoltativo">facoltativo</span>
      </label>
      <input id="c-didascalia" type="text" maxLength={100} value={p.didascalia} onChange={testo('didascalia')} placeholder="Es. Nella foto: prima del fantamercato" />

      <div className="componi-gruppo">Il volto</div>
      <SelettoreAvatar valore={bozza.avatar} onSceglie={(avatar) => cambia({ avatar })} />

      <div className="componi-etichetta"><span>Sfondo della foto</span></div>
      <div className="sfondi-riga">
        {SFONDI.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`sfondo-pallino${p.sfondo === s.id ? ' scelto' : ''}`}
            style={{ background: s.colore }}
            onClick={() => cambiaProfilo({ sfondo: s.id })}
            aria-pressed={p.sfondo === s.id}
            aria-label={s.nome}
            title={s.nome}
          />
        ))}
      </div>

      <div className="componi-gruppo">Il titolo</div>
      <div className="stili-titolo">
        {[['pieno', 'Pieno'], ['contorno', 'Contorno']].map(([id, nome]) => (
          <button
            key={id}
            type="button"
            className={`stile-carta stile-${id}${p.stileTitolo === id ? ' scelto' : ''}`}
            onClick={() => cambiaProfilo({ stileTitolo: id })}
            aria-pressed={p.stileTitolo === id}
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="componi-gruppo">I ritagli in pagina</div>
      <div className="ritagli-lista">
        {ritagli.map((r) => (
          <button
            key={r.id}
            type="button"
            className="ritaglio-voce"
            onClick={() => interruttore(r.id)}
            aria-pressed={acceso(r.id)}
          >
            <span>{r.nome}</span>
            <span className={`interruttore${acceso(r.id) ? ' acceso' : ''}`} aria-hidden="true"><span /></span>
          </button>
        ))}
      </div>

      <button className="primary" type="submit" disabled={salvando || !bozza.nomeVisualizzato.trim()}>
        {salvando ? 'In stampa…' : 'Manda in stampa'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
