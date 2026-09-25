import { useState } from 'react';
import { CaretUp, CaretDown, Palette } from '@phosphor-icons/react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ImageUpload from './ImageUpload';
import { RUOLI_ROSA } from '../../utils/lega';
import { logoSquadra, magliaSquadra } from '../../loghi';
import { RITAGLI_SQUADRA, COLORI_PROPOSTI } from '../../squadra';
import '../../styles/profilo.css';

// Il foglio "Componi la squadra". Come "Componi la tua pagina" lavora su una bozza
// che vive nella pagina Squadra (onCambia a ogni tocco): dietro lo sheet la pagina
// cambia mentre si scrive, e chiudendo senza salvare torna quella pubblicata.
//
// Niente di ciò che c'è già si perde: stemma e maglia vuoti tornano a quelli di
// redazione, i nomi della rosa senza ruolo restano nel loro campo finché non li
// sposta qualcuno, e le immagini tolte restano su Cloudinary.

const INDIRIZZO = /^(https?:\/\/|\/|data:image\/|blob:)/i;
const soloIndirizzo = (v) => (typeof v === 'string' && INDIRIZZO.test(v.trim()) ? v : '');
const inTesto = (nomi) => (nomi || []).join(', ');
const inNomi = (testo) => String(testo || '').split(',').map((n) => n.trim()).filter(Boolean);

export default function ComponiSquadra({ squadra, bozza, onCambia, onFatto }) {
  const mostraToast = useToast();
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');
  const [slotColore, setSlotColore] = useState(0);

  // La rosa si scrive come testo ("Rossi, Bianchi"): il testo resta qui così com'è
  // (virgole comprese mentre si scrive), la bozza riceve già i nomi separati.
  const [rosaTesto, setRosaTesto] = useState(() => ({
    ...Object.fromEntries(RUOLI_ROSA.map((r) => [r.id, inTesto(bozza.rosaRuoli[r.id])])),
    senzaRuolo: inTesto(squadra.rosa)
  }));

  const cambia = (campi) => onCambia({ ...bozza, ...campi });
  const cambiaPagina = (campi) => onCambia({ ...bozza, pagina: { ...bozza.pagina, ...campi } });
  const testo = (campo) => (e) => cambia({ [campo]: e.target.value });

  const scriviRosa = (id, valore) => {
    setRosaTesto((prima) => ({ ...prima, [id]: valore }));
    if (id === 'senzaRuolo') cambia({ rosa: inNomi(valore) });
    else cambia({ rosaRuoli: { ...bozza.rosaRuoli, [id]: inNomi(valore) } });
  };

  // --- colori ---
  const colori = bozza.colori;
  const scegliColore = (colore) => {
    const nuovi = [...colori];
    // Il secondo colore senza il primo non ha senso: finisce al primo posto.
    const posto = Math.min(slotColore, nuovi.length);
    nuovi[posto] = colore.toLowerCase();
    cambia({ colori: nuovi.slice(0, 2) });
    if (posto === 0 && nuovi.length < 2) setSlotColore(1);
  };
  const togliColore = (i) => {
    cambia({ colori: colori.filter((_, j) => j !== i) });
    setSlotColore(Math.min(i, Math.max(0, colori.length - 2)));
  };

  // --- ritagli ---
  const { ordine, nascosti } = bozza.pagina;
  const acceso = (id) => !nascosti.includes(id);
  const interruttore = (id) => cambiaPagina({
    nascosti: acceso(id) ? [...nascosti, id] : nascosti.filter((n) => n !== id)
  });
  const sposta = (i, passo) => {
    const j = i + passo;
    if (j < 0 || j >= ordine.length) return;
    const nuovo = [...ordine];
    [nuovo[i], nuovo[j]] = [nuovo[j], nuovo[i]];
    cambiaPagina({ ordine: nuovo });
  };
  const infoRitaglio = (id) => RITAGLI_SQUADRA.find((r) => r.id === id);

  const salva = async (e) => {
    e.preventDefault();
    setErrore('');
    if (!bozza.nome.trim()) { setErrore('Il nome della squadra non può restare vuoto'); return; }
    if (bozza.fondataNel.trim() && !/^\d{4}$/.test(bozza.fondataNel.trim())) {
      setErrore("L'anno di fondazione va scritto con quattro cifre");
      return;
    }
    setSalvando(true);
    try {
      await api.patch('/api/squadre/mia', {
        nome: bozza.nome,
        occhiello: bozza.occhiello,
        slogan: bozza.slogan,
        fondataNel: bozza.fondataNel.trim(),
        bio: bozza.bio,
        foto: bozza.foto,
        stemma: bozza.stemma,
        maglia: bozza.maglia,
        colori: bozza.colori,
        pagina: bozza.pagina,
        rosaRuoli: Object.fromEntries(RUOLI_ROSA.map((r) => [r.id, inNomi(rosaTesto[r.id])])),
        // Sempre inviata: così il server non svuota i nomi senza ruolo da solo.
        rosa: inNomi(rosaTesto.senzaRuolo)
      });
      mostraToast('Squadra mandata in stampa!');
      await onFatto(true);
    } catch (err) {
      setErrore(err.message);
      setSalvando(false);
    }
  };

  return (
    <form className="componi componi-squadra" onSubmit={salva} noValidate>
      <p className="tema-nota">Ogni campo è facoltativo tranne il nome: lascialo vuoto e sparisce dalla pagina.</p>

      {/* ---------------- Immagini ---------------- */}
      <div className="componi-gruppo">Le immagini</div>

      <div className="componi-etichetta"><span>Foto di copertina</span><span className="facoltativo">facoltativa</span></div>
      <ImageUpload
        value={soloIndirizzo(bozza.foto)}
        onChange={(foto) => cambia({ foto })}
        cartella="squadre"
        forma="larga"
      />

      <div className="componi-etichetta"><span>Stemma</span><span className="facoltativo">vuoto = logo di redazione</span></div>
      <ImageUpload
        value={soloIndirizzo(bozza.stemma)}
        onChange={(stemma) => cambia({ stemma })}
        cartella="squadre"
        forma="tonda"
        anteprima={logoSquadra(bozza.nome) || logoSquadra(squadra.nome)}
        etichettaTogli="Torna al logo"
      />

      <div className="componi-etichetta"><span>Maglia</span><span className="facoltativo">vuoto = maglia di redazione</span></div>
      <ImageUpload
        value={soloIndirizzo(bozza.maglia)}
        onChange={(maglia) => cambia({ maglia })}
        cartella="squadre"
        anteprima={magliaSquadra(bozza.nome) || magliaSquadra(squadra.nome)}
        etichettaTogli="Torna alla maglia"
      />
      <p className="nota-form">Le foto dell&apos;album si aggiungono direttamente dalla pagina, nel ritaglio &quot;L&apos;album&quot;.</p>

      {/* ---------------- Colori ---------------- */}
      <div className="componi-gruppo">I colori sociali</div>
      <p className="nota-form">Tingono la fascia di copertina quando non c&apos;è una foto.</p>
      <div className="colori-slot">
        {[0, 1].map((i) => (
          <button
            key={i}
            type="button"
            className={`colore-slot${slotColore === i ? ' attivo' : ''}`}
            onClick={() => setSlotColore(Math.min(i, colori.length))}
            aria-pressed={slotColore === i}
          >
            <span className="campione" style={{ background: colori[i] || 'transparent' }} />
            <span>{i === 0 ? 'Primo' : 'Secondo'}</span>
            {colori[i] && (
              <span
                role="button"
                tabIndex={0}
                className="togli"
                onClick={(e) => { e.stopPropagation(); togliColore(i); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); togliColore(i); } }}
                aria-label="Togli il colore"
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="sfondi-riga">
        {COLORI_PROPOSTI.map((c) => (
          <button
            key={c}
            type="button"
            className={`sfondo-pallino${colori[slotColore] === c ? ' scelto' : ''}`}
            style={{ background: c }}
            onClick={() => scegliColore(c)}
            aria-label={`Colore ${c}`}
            title={c}
          />
        ))}
        <label className="sfondo-pallino pallino-libero" title="Scegli un colore qualsiasi">
          <Palette size={22} weight="bold" />
          <input
            type="color"
            value={colori[slotColore] || '#241b1e'}
            onChange={(e) => scegliColore(e.target.value)}
            aria-label="Scegli un colore qualsiasi"
          />
        </label>
      </div>

      {/* ---------------- Testata ---------------- */}
      <div className="componi-gruppo">La testata</div>

      <label htmlFor="sq-occhiello" className="componi-etichetta">
        <span>Occhiello</span><span className="facoltativo">facoltativo</span>
      </label>
      <input id="sq-occhiello" type="text" maxLength={40} value={bozza.occhiello} onChange={testo('occhiello')} placeholder="Es. Dal 2019 a ogni costo" />

      <label htmlFor="sq-nome" className="componi-etichetta"><span>Nome della squadra</span></label>
      <input id="sq-nome" type="text" className="campo-titolo" value={bozza.nome} onChange={testo('nome')} />

      <label htmlFor="sq-slogan" className="componi-etichetta">
        <span>Slogan o coro</span><span className="facoltativo">facoltativo</span>
      </label>
      <textarea id="sq-slogan" rows={2} maxLength={120} className="campo-motto" value={bozza.slogan} onChange={testo('slogan')} placeholder="Quello che canta la curva (cioè tu)" />

      <label htmlFor="sq-fondata" className="componi-etichetta">
        <span>Fondata nel</span><span className="facoltativo">facoltativo</span>
      </label>
      <input id="sq-fondata" type="text" inputMode="numeric" maxLength={4} value={bozza.fondataNel} onChange={testo('fondataNel')} placeholder="es. 2019" />

      <div className="componi-etichetta"><span>Stile del nome</span></div>
      <div className="stili-titolo">
        {[['pieno', 'Pieno'], ['contorno', 'Contorno']].map(([id, nome]) => (
          <button
            key={id}
            type="button"
            className={`stile-carta stile-${id}${bozza.pagina.stileTitolo === id ? ' scelto' : ''}`}
            onClick={() => cambiaPagina({ stileTitolo: id })}
            aria-pressed={bozza.pagina.stileTitolo === id}
          >
            {nome}
          </button>
        ))}
      </div>

      {/* ---------------- Storia e rosa ---------------- */}
      <div className="componi-gruppo">La storia</div>
      <textarea id="sq-storia" rows={6} value={bozza.bio} onChange={testo('bio')} placeholder="Com'è nata, cosa promette, cosa non mantiene…" aria-label="La storia" />

      <div className="componi-gruppo">La rosa</div>
      {RUOLI_ROSA.map((ruolo) => (
        <div key={ruolo.id}>
          <label htmlFor={`sq-${ruolo.id}`} className="componi-etichetta">
            <span>{ruolo.nome}</span><span className="facoltativo">separati da virgola</span>
          </label>
          <input id={`sq-${ruolo.id}`} type="text" value={rosaTesto[ruolo.id]} onChange={(e) => scriviRosa(ruolo.id, e.target.value)} />
        </div>
      ))}
      {(squadra.rosa?.length > 0 || rosaTesto.senzaRuolo) && (
        <div>
          <label htmlFor="sq-senza" className="componi-etichetta">
            <span>Senza ruolo</span><span className="facoltativo">spostali nel ruolo giusto</span>
          </label>
          <input id="sq-senza" type="text" value={rosaTesto.senzaRuolo} onChange={(e) => scriviRosa('senzaRuolo', e.target.value)} />
        </div>
      )}

      {/* ---------------- Ritagli ---------------- */}
      <div className="componi-gruppo">I ritagli in pagina</div>
      <p className="nota-form">Accendi, spegni e metti in fila i ritagli come preferisci.</p>
      <div className="ritagli-lista">
        {ordine.map((id, i) => {
          const r = infoRitaglio(id);
          if (!r) return null;
          return (
            <div className="ritaglio-voce ritaglio-ordinabile" key={id}>
              <div className="sposta">
                <button type="button" onClick={() => sposta(i, -1)} disabled={i === 0} aria-label={`Sposta su ${r.nome}`}>
                  <CaretUp size={20} weight="bold" />
                </button>
                <button type="button" onClick={() => sposta(i, 1)} disabled={i === ordine.length - 1} aria-label={`Sposta giù ${r.nome}`}>
                  <CaretDown size={20} weight="bold" />
                </button>
              </div>
              <button type="button" className="voce-nome" onClick={() => interruttore(id)} aria-pressed={acceso(id)}>
                <span className="testi">
                  <span>{r.nome}</span>
                  {r.nota && <span className="nota">{r.nota}</span>}
                </span>
                <span className={`interruttore${acceso(id) ? ' acceso' : ''}`} aria-hidden="true"><span /></span>
              </button>
            </div>
          );
        })}
      </div>

      <button className="bottone-grande" type="submit" disabled={salvando}>
        {salvando ? 'In stampa…' : 'Manda in stampa'}
      </button>
      {errore && <div className="errore-msg">{errore}</div>}
    </form>
  );
}
