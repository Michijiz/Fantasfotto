import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowDown, ArrowUp, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import Scontri from '../components/ui/Scontro';
import { estremiGiornata, haPunteggi, idDi, scontriGiocabili, statoGiornata } from '../utils/lega';
import { formattaFantapunti } from '../utils/regolamento';
import { puoRedigere } from '../ruoli';
import '../styles/gazzetta.css';

const MESE = { month: 'long', year: 'numeric' };
const GIORNO = { day: 'numeric', month: 'short' };

// L'autore è l'utente che ha stampato l'edizione, non la firma: la firma è libera
// (pseudonimi, refusi) e lo stesso autore con due firme finiva in due voci del
// filtro. Le edizioni senza autore (vecchie) ripiegano sulla firma.
function autoreDi(e) {
  const u = e.createdBy;
  if (u && typeof u === 'object' && u.nomeVisualizzato) return { id: u._id, nome: u.nomeVisualizzato };
  return { id: `firma:${e.direttore || ''}`, nome: e.direttore || '' };
}

// Il mese di una giornata si ricava dalla sua data di calendario; per quelle senza
// data si ripiega sul giorno in cui è uscita l'edizione.
function dataDi({ g, e }) {
  const grezza = g?.data || e?.createdAt;
  return grezza ? new Date(grezza) : null;
}

function etichettaMese(data) {
  if (!data) return 'Senza data';
  const mese = data.toLocaleDateString('it-IT', MESE);
  return mese.charAt(0).toUpperCase() + mese.slice(1);
}

function Estremo({ tipo, punto }) {
  const Freccia = tipo === 'su' ? ArrowUp : ArrowDown;
  return (
    <span className={tipo}>
      <Freccia size={14} weight="bold" aria-label={tipo === 'su' ? 'Miglior punteggio' : 'Peggior punteggio'} />
      <Stemma src={punto.squadra.stemma} nome={punto.squadra.nome} size={22} />
      {punto.squadra.nome} <b>{formattaFantapunti(punto.fp)}</b>
    </span>
  );
}

// Una giornata dell'archivio: l'edizione se è uscita (altrimenti lo si dice), i
// due estremi della giornata e, a richiesta, tutti i risultati.
function Giornata({ voce, giornate, aperta, onApri, onLeggi, onScrivi }) {
  const { g, e } = voce;
  const numero = g?.numero ?? e.giornataNumero;
  const estremi = g && haPunteggi(g) ? estremiGiornata(giornate, numero) : { migliore: null, peggiore: null };
  const quando = (g?.data ? new Date(g.data) : null)?.toLocaleDateString('it-IT', GIORNO);
  const haScontri = scontriGiocabili(g).length > 0;

  const corpo = (
    <>
      <span className="g">{numero}</span>
      <span className="testi">
        <span className="titolo">{e ? e.titolo : 'Edizione non ancora uscita'}</span>
        <span className="dettaglio">
          {[e && `di ${e.direttore}`, quando, !e && g && statoGiornata(g)].filter(Boolean).join(' · ')}
        </span>
      </span>
      {e && <CaretRight size={20} />}
    </>
  );

  return (
    <div className={`archivio-giornata${e ? '' : ' senza'}`}>
      {e ? (
        <button type="button" className="archivio-riga" onClick={() => onLeggi(e)}>{corpo}</button>
      ) : (
        <div className="archivio-riga">{corpo}</div>
      )}

      {(estremi.migliore || estremi.peggiore) && (
        <div className="archivio-estremi">
          {estremi.migliore && <Estremo tipo="su" punto={estremi.migliore} />}
          {estremi.peggiore && <Estremo tipo="giu" punto={estremi.peggiore} />}
        </div>
      )}

      {(haScontri || (!e && onScrivi)) && (
        <div className="archivio-azioni">
          {haScontri && (
            <button type="button" className="bottone-link" aria-expanded={aperta} onClick={() => onApri(numero)}>
              {aperta ? 'Nascondi i risultati' : 'I risultati'}
            </button>
          )}
          {!e && onScrivi && (
            <button type="button" className="bottone-link" onClick={() => onScrivi(numero)}>Scrivila</button>
          )}
        </div>
      )}
      {aperta && <div className="archivio-aperta"><Scontri giornata={g} /></div>}
    </div>
  );
}

// Le giornate della stagione, dalla più recente, raggruppate per mese: quelle con
// l'edizione si leggono, le altre dicono perché non c'è. Filtri per squadra e per
// autore. Una squadra "compare" in una giornata se ha giocato o se ha preso il
// premio di Re dei Gufi.
export default function Archivio() {
  const { utente } = useOutletContext();
  const { edizioni, giornate, squadre } = useDati();
  const navigate = useNavigate();
  const [squadra, setSquadra] = useState('');
  const [autore, setAutore] = useState('');
  const [aperte, setAperte] = useState(() => new Set());
  const sonoRedazione = puoRedigere(utente);

  const autori = useMemo(() => {
    const perId = new Map();
    for (const e of edizioni) {
      const { id, nome } = autoreDi(e);
      if (nome && !perId.has(id)) perId.set(id, nome);
    }
    return [...perId].sort((a, b) => a[1].localeCompare(b[1], 'it'));
  }, [edizioni]);

  // Una voce per giornata: quelle già giocate o con l'edizione, più le edizioni
  // la cui giornata non è a calendario (capita con i dati vecchi).
  const voci = useMemo(() => {
    const perNumero = new Map(edizioni.map((e) => [e.giornataNumero, e]));
    const lista = giornate
      .filter((g) => perNumero.has(g.numero) || statoGiornata(g) !== 'da giocare')
      .map((g) => ({ g, e: perNumero.get(g.numero) || null }));
    const numeriNoti = new Set(giornate.map((g) => g.numero));
    for (const e of edizioni) if (!numeriNoti.has(e.giornataNumero)) lista.push({ g: null, e });
    return lista.sort((a, b) => (b.g?.numero ?? b.e.giornataNumero) - (a.g?.numero ?? a.e.giornataNumero));
  }, [edizioni, giornate]);

  const compare = ({ g, e }, id) => {
    const inCampo = scontriGiocabili(g).some((a) => idDi(a.squadraCasa) === id || idDi(a.squadraTrasferta) === id);
    const premiata = (e?.stats?.reDeiGufi || []).some((s) => idDi(s) === id);
    return inCampo || premiata;
  };

  const filtrate = voci
    .filter((v) => !squadra || compare(v, squadra))
    .filter((v) => !autore || (v.e && autoreDi(v.e).id === autore));

  const gruppi = [];
  for (const v of filtrate) {
    const etichetta = etichettaMese(dataDi(v));
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.etichetta === etichetta) ultimo.voci.push(v);
    else gruppi.push({ etichetta, voci: [v] });
  }

  const alterna = (numero) => setAperte((prima) => {
    const dopo = new Set(prima);
    if (dopo.has(numero)) dopo.delete(numero);
    else dopo.add(numero);
    return dopo;
  });

  const filtroAttivo = Boolean(squadra || autore);
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
        <button type="button" className={`filtro${!filtroAttivo ? ' attivo' : ''}`} onClick={() => { setSquadra(''); setAutore(''); }}>
          Tutte
        </button>
        <select className={`filtro${squadra ? ' attivo' : ''}`} value={squadra} onChange={(e) => setSquadra(e.target.value)} aria-label="Filtra per squadra">
          <option value="">Squadra ▾</option>
          {squadre.map((s) => <option key={s._id} value={s._id}>{s.nome}</option>)}
        </select>
        <select className={`filtro${autore ? ' attivo' : ''}`} value={autore} onChange={(e) => setAutore(e.target.value)} aria-label="Filtra per autore">
          <option value="">Autore ▾</option>
          {autori.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select>
      </div>

      {voci.length === 0 ? (
        <section className="ritaglio"><p className="ritaglio-vuoto">L&apos;archivio è vuoto: la storia deve ancora cominciare.</p></section>
      ) : filtrate.length === 0 ? (
        <section className="ritaglio">
          <p className="ritaglio-vuoto">
            {nomeSquadra ? 'Niente in archivio: questa squadra non fa notizia.' : 'Niente in archivio con questi filtri.'}
          </p>
        </section>
      ) : gruppi.map((gr) => (
        <section className="ritaglio" key={gr.etichetta}>
          <div className="ritaglio-occhiello"><span>{gr.etichetta}</span><span className="filo" /></div>
          <div className="archivio-lista">
            {gr.voci.map((v) => {
              const numero = v.g?.numero ?? v.e.giornataNumero;
              return (
                <Giornata
                  key={v.g?._id || v.e._id}
                  voce={v}
                  giornate={giornate}
                  aperta={aperte.has(numero)}
                  onApri={alterna}
                  onLeggi={(e) => navigate('/gazzetta', { state: { edizioneId: e._id } })}
                  onScrivi={sonoRedazione ? (n) => navigate(`/gazzetta/scrivi?giornata=${n}`) : null}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
