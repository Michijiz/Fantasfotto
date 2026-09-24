import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import { idDi } from '../utils/lega';
import '../styles/gazzetta.css';

const MESE = { month: 'long', year: 'numeric' };

// Tutte le edizioni, raggruppate per mese, con i filtri per squadra e per
// direttore. Una squadra "compare" in un'edizione se ha giocato quella giornata
// o se ha preso un premio.
export default function Archivio() {
  const { edizioni, giornate, squadre } = useDati();
  const navigate = useNavigate();
  const [squadra, setSquadra] = useState('');
  const [direttore, setDirettore] = useState('');

  const direttori = useMemo(
    () => [...new Set(edizioni.map((e) => e.direttore).filter(Boolean))].sort(),
    [edizioni]
  );

  const compare = (e, id) => {
    const g = giornate.find((x) => x.numero === e.giornataNumero);
    const inCampo = (g?.accoppiamenti || []).some((a) => idDi(a.squadraCasa) === id || idDi(a.squadraTrasferta) === id);
    const premiata = (e.stats?.reDeiGufi || []).some((s) => idDi(s) === id);
    return inCampo || premiata;
  };

  const filtrate = edizioni
    .filter((e) => !squadra || compare(e, squadra))
    .filter((e) => !direttore || e.direttore === direttore)
    .sort((a, b) => b.giornataNumero - a.giornataNumero);

  const gruppi = [];
  for (const e of filtrate) {
    const mese = e.createdAt ? new Date(e.createdAt).toLocaleDateString('it-IT', MESE) : 'Senza data';
    const etichetta = mese.charAt(0).toUpperCase() + mese.slice(1);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.etichetta === etichetta) ultimo.voci.push(e);
    else gruppi.push({ etichetta, voci: [e] });
  }

  const nomeSquadra = squadre.find((s) => s._id === squadra)?.nome;

  return (
    <div className="ritagli archivio">
      <header className="testa-sotto">
        <button type="button" className="indietro" onClick={() => navigate('/gazzetta')} aria-label="Torna alla Gazzetta">
          <CaretLeft size={22} weight="bold" />
        </button>
        <div className="testi">
          <span className="sopra">Gazzetta</span>
          <h1 className="titolo">L&apos;archivio</h1>
        </div>
      </header>

      <div className="filtri">
        <button type="button" className={`filtro${!squadra && !direttore ? ' attivo' : ''}`} onClick={() => { setSquadra(''); setDirettore(''); }}>
          Tutte
        </button>
        <select className={`filtro${squadra ? ' attivo' : ''}`} value={squadra} onChange={(e) => setSquadra(e.target.value)} aria-label="Filtra per squadra">
          <option value="">Squadra ▾</option>
          {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
        </select>
        <select className={`filtro${direttore ? ' attivo' : ''}`} value={direttore} onChange={(e) => setDirettore(e.target.value)} aria-label="Filtra per direttore">
          <option value="">Direttore ▾</option>
          {direttori.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {edizioni.length === 0 ? (
        <section className="ritaglio"><p className="ritaglio-vuoto">L&apos;archivio è vuoto: la storia deve ancora cominciare.</p></section>
      ) : filtrate.length === 0 ? (
        <section className="ritaglio">
          <p className="ritaglio-vuoto">
            {nomeSquadra ? 'Niente in archivio: questa squadra non fa notizia.' : 'Niente in archivio con questi filtri.'}
          </p>
        </section>
      ) : gruppi.map((g) => (
        <section className="ritaglio" key={g.etichetta}>
          <div className="ritaglio-occhiello"><span>{g.etichetta}</span><span className="filo" /></div>
          <div className="archivio-lista">
            {g.voci.map((e) => (
              <button key={e._id} type="button" className="archivio-riga" onClick={() => navigate('/gazzetta', { state: { edizioneId: e._id } })}>
                <span className="g">G{e.giornataNumero}</span>
                <span className="testi">
                  <span className="titolo">{e.titolo}</span>
                  <span className="dettaglio">di {e.direttore}</span>
                </span>
                <CaretRight size={20} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
