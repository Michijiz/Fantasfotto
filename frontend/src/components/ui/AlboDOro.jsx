import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, PencilSimple, Plus, Medal } from '@phosphor-icons/react';
import { api } from '../../api/client';
import { useDati } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import BottoneElimina from './BottoneElimina';
import Stemma from './Stemma';
import { IconaTrofeo } from './Trofei';
import { formattaFantapunti } from '../../utils/regolamento';
import { idDi, bacheca } from '../../utils/lega';
import { classificaTrofei, etichettaTrofeo, ordineTrofei, TROFEI_CAMPIONATO } from '../../utils/trofei';
import { miniatura } from '../../squadra';
import '../../styles/albo.css';
import '../../styles/trofei.css';

// "Tizio", "Tizio e Caio", "Tizio, Caio e Sempronio"
const elencoNomi = (nomi) => (nomi.length <= 1 ? nomi[0] || '' : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`);

const VISTE = [
  { id: 'stagioni', nome: 'Stagioni' },
  { id: 'medagliere', nome: 'Medagliere' },
  { id: 'tribunale', nome: 'Tribunale' }
];

// Cosa ha fatto vincere ogni premio che non è una categoria di voto: le categorie
// portano la propria descrizione dal backend.
const DESCRIZIONI = {
  gufi: 'Ha azzeccato tutti gli scontri della schedina.',
  top: 'Il miglior punteggio della giornata.',
  nera: 'Il peggior punteggio della giornata.'
};

// L'albo d'oro in tre viste: le stagioni come targhe di ottone, il medagliere
// della lega e il tribunale, cioè chi ha vinto più verdetti e premi di giornata.
// La redazione tocca una targa per correggerla.
export default function AlboDOro({ sonoRedazione, onModifica }) {
  const { albo, squadre, giornate, edizioni, trofeiVerdetti, categorieVoto, ricaricaTutto } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const [vista, setVista] = useState('stagioni');

  const medagliere = useMemo(() => bacheca(albo, squadre), [albo, squadre]);
  const classifiche = useMemo(
    () => classificaTrofei(squadre, { albo, edizioni, giornate, trofeiVerdetti, categorie: categorieVoto }),
    [squadre, albo, edizioni, giornate, trofeiVerdetti, categorieVoto]
  );

  const campione = albo[0];
  const squadraCampione = campione && squadre.find((s) => s._id === idDi(campione.squadra));
  const campioniDiversi = new Set(albo.map((v) => idDi(v.squadra))).size;
  const vaiAllaSquadra = (squadra) => squadra && navigate(`/squadre/${idDi(squadra)}`);

  // Fine stagione: il server prende i primi tre della classifica e scrive la voce.
  const chiudiStagione = async () => {
    try {
      const { voce } = await api.post('/api/albo/chiudi-stagione', {});
      await ricaricaTutto();
      mostraToast(`Stagione chiusa: il campione è ${voce.squadra?.nome || 'chi ha vinto'}.`);
    } catch (err) {
      mostraToast(err.message);
    }
  };

  const aggiungi = sonoRedazione && (
    <div className="albo-azioni">
      <button type="button" className="bottone-contorno" onClick={() => onModifica({})}>
        <Plus size={18} weight="bold" /> Aggiungi un campione
      </button>
      <BottoneElimina
        className="bottone-contorno"
        etichetta="Chiudi la stagione"
        conferma="Tocca di nuovo: incorono il primo in classifica"
        inCorsoTesto="Incorono…"
        onConferma={chiudiStagione}
      />
    </div>
  );

  if (!campione) {
    return (
      <>
        {aggiungi}
        <section className="ritaglio albo-vuoto">
          <Trophy size={64} weight="duotone" />
          <h2 className="ritaglio-titolo medio">L&apos;albo aspetta il primo nome</h2>
          <p className="ritaglio-vuoto">Nessun campione ancora. Qualcuno dovrà pur vincere.</p>
        </section>
      </>
    );
  }

  return (
    <>
      {aggiungi}

      <section className="ritaglio albo-testa">
        <span className="occhiello-oro">L&apos;albo d&apos;oro</span>
        <h2 className="albo-trono">
          Sul trono: <button type="button" onClick={() => vaiAllaSquadra(squadraCampione)}>{campione.squadra?.nome || 'Squadra sciolta'}</button>
        </h2>
        <p className="dettaglio">
          {albo.length} {albo.length === 1 ? 'stagione' : 'stagioni'} · {campioniDiversi} {campioniDiversi === 1 ? 'campione diverso' : 'campioni diversi'}
        </p>
        <div className="albo-viste" role="tablist">
          {VISTE.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={vista === v.id}
              className={`albo-vista${vista === v.id ? ' attiva' : ''}`}
              onClick={() => setVista(v.id)}
            >
              {v.nome}
            </button>
          ))}
        </div>
      </section>

      {vista === 'stagioni' && (
        <div className="targhe">
          {albo.map((v, i) => {
            const allenatori = v.allenatori?.length ? v.allenatori.map((a) => a.nome) : [];
            return (
              <button
                key={v._id}
                type="button"
                className={`targa${i === 0 ? ' prima' : ''}`}
                onClick={sonoRedazione ? () => onModifica(v) : () => vaiAllaSquadra(v.squadra)}
              >
                <span className="targa-stagione">
                  {i === 0 && <Trophy size={15} weight="fill" aria-hidden="true" />}
                  {i === 0 ? 'Campione in carica' : 'Campione'} · {v.stagione}
                </span>
                {v.foto && <img className="targa-foto" src={miniatura(v.foto, 1000)} alt="" loading="lazy" decoding="async" />}
                <span className="targa-squadra">
                  <Stemma src={v.squadra?.stemma} nome={v.squadra?.nome} size={i === 0 ? 64 : 46} />
                  <span className="nome">{v.squadra?.nome || 'Squadra sciolta'}</span>
                </span>
                <span className="targa-riga">
                  {v.punti != null && <span><b>{formattaFantapunti(v.punti)}</b> fantapunti</span>}
                  {allenatori.length > 0 && <span>in panchina {elencoNomi(allenatori)}</span>}
                </span>
                {(v.secondo || v.terzo) && (
                  <span className="targa-podio">
                    {v.secondo && <span className="argento"><Medal size={16} weight="fill" aria-hidden="true" /> {v.secondo.nome}</span>}
                    {v.terzo && <span className="bronzo"><Medal size={16} weight="fill" aria-hidden="true" /> {v.terzo.nome}</span>}
                  </span>
                )}
                {v.note && <span className="targa-nota">{v.note}</span>}
                {sonoRedazione && <PencilSimple size={18} className="targa-matita" aria-label="Correggi la voce" />}
              </button>
            );
          })}
        </div>
      )}

      {vista === 'medagliere' && (
        <section className="ritaglio">
          <div className="medagliere-intesta" aria-hidden="true">
            <span className="chi">Squadra</span>
            <span className="oro"><Medal size={18} weight="fill" /></span>
            <span className="argento"><Medal size={18} weight="fill" /></span>
            <span className="bronzo"><Medal size={18} weight="fill" /></span>
          </div>
          <div className="medagliere">
            {medagliere.map((t, i) => {
              // Pari merito: stesso posto di chi ha gli stessi titoli e podi.
              const prima = medagliere.findIndex((x) => x.titoli === t.titoli && x.secondi === t.secondi && x.terzi === t.terzi);
              const vuota = !t.titoli && !t.secondi && !t.terzi;
              return (
                <button
                  key={t.squadra._id}
                  type="button"
                  className={`medagliere-riga${vuota ? ' vuota' : ''}`}
                  onClick={() => vaiAllaSquadra(t.squadra)}
                >
                  <span className="posto">{vuota ? '' : (prima >= 0 ? prima : i) + 1}</span>
                  <Stemma src={t.squadra.stemma} nome={t.squadra.nome} size={36} />
                  <span className="chi">
                    <span className="nome">{t.squadra.nome}</span>
                    {t.stagioni.length > 0 && <span className="dettaglio">{t.stagioni.join(' · ')}</span>}
                  </span>
                  <span className="conto oro">{t.titoli || '·'}</span>
                  <span className="conto argento">{t.secondi || '·'}</span>
                  <span className="conto bronzo">{t.terzi || '·'}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {vista === 'tribunale' && (
        <Tribunale classifiche={classifiche} categorie={categorieVoto} onSquadra={vaiAllaSquadra} />
      )}
    </>
  );
}

// Per ogni verdetto e premio di giornata, le squadre più decorate. Il campionato sta
// nelle altre due viste, qui ci sono solo i trofei "satirici".
function Tribunale({ classifiche, categorie, onSquadra }) {
  const tipi = ordineTrofei(categorie).filter((id) => !TROFEI_CAMPIONATO.includes(id) && classifiche.has(id));

  if (tipi.length === 0) {
    return (
      <section className="ritaglio albo-vuoto">
        <Trophy size={64} weight="duotone" />
        <h2 className="ritaglio-titolo medio">Il tribunale non ha ancora sentenze</h2>
        <p className="ritaglio-vuoto">I verdetti diventano trofei quando le votazioni si chiudono.</p>
      </section>
    );
  }

  return tipi.map((id) => {
    const righe = classifiche.get(id);
    const { etichetta } = etichettaTrofeo(id, categorie);
    const descrizione = categorie.find((c) => c.id === id)?.descrizione || DESCRIZIONI[id] || '';
    const massimo = righe[0].quanti;
    return (
      <section className="ritaglio premio" key={id}>
        <div className="premio-testa">
          <IconaTrofeo id={id} />
          <div className="testi">
            <h3 className="ritaglio-titolo medio">{etichetta}</h3>
            {descrizione && <span className="dettaglio">{descrizione}</span>}
          </div>
        </div>
        <div className="premio-classifica">
          {righe.slice(0, 5).map((r) => (
            <button key={r.squadra._id} type="button" className="premio-riga" onClick={() => onSquadra(r.squadra)}>
              <Stemma src={r.squadra.stemma} nome={r.squadra.nome} size={30} />
              <span className="nome">{r.squadra.nome}</span>
              <span className="binario"><span className="pieno" style={{ width: `${Math.round((100 * r.quanti) / massimo)}%` }} /></span>
              <b>{r.quanti}</b>
            </button>
          ))}
        </div>
      </section>
    );
  });
}
