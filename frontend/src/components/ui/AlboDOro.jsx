import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, PencilSimple, CaretRight, Plus } from '@phosphor-icons/react';
import { useDati } from '../../context/DataContext';
import Stemma from './Stemma';
import { formattaFantapunti } from '../../utils/regolamento';
import { idDi, bacheca, recordLega } from '../../utils/lega';
import { miniatura } from '../../squadra';
import '../../styles/albo.css';

function Occhiello({ children }) {
  return <div className="ritaglio-occhiello"><span>{children}</span><span className="filo" /></div>;
}

// "Tizio", "Tizio e Caio", "Tizio, Caio e Sempronio"
const elencoNomi = (nomi) => (nomi.length <= 1 ? nomi[0] || '' : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`);

// Le coppe di una squadra: una per titolo finché ci stanno, poi "×n".
function Coppe({ quante, tipo = 'oro', dimensione = 22 }) {
  if (!quante) return null;
  if (quante > 5) {
    return (
      <span className={`coppe ${tipo}`} aria-label={`${quante} volte`}>
        <Trophy size={dimensione} weight="fill" /><b>×{quante}</b>
      </span>
    );
  }
  return (
    <span className={`coppe ${tipo}`} aria-label={`${quante} volte`}>
      {Array.from({ length: quante }, (_, i) => <Trophy key={i} size={dimensione} weight="fill" />)}
    </span>
  );
}

// L'albo d'oro come bacheca dei trofei, in tre ritagli: il campione in carica in
// grande, la bacheca di tutte le squadre (con i record calcolati dalle giornate)
// e la linea del tempo delle stagioni. La redazione tocca una voce per correggerla.
export default function AlboDOro({ sonoRedazione, onModifica }) {
  const { albo, squadre, giornate, edizioni } = useDati();
  const navigate = useNavigate();

  const trofei = useMemo(() => bacheca(albo, squadre), [albo, squadre]);
  const record = useMemo(() => recordLega(giornate, edizioni), [giornate, edizioni]);
  const nomeSquadra = (id) => squadre.find((s) => s._id === id)?.nome || '';

  const campione = albo[0];
  const squadraCampione = campione && squadre.find((s) => s._id === idDi(campione.squadra));
  // Chi l'ha vinta: quelli fissati nella voce; per le voci di prima, gli attuali.
  const allenatoriCampione = campione?.allenatori?.length
    ? campione.allenatori.map((a) => a.nome)
    : (squadraCampione?.allenatori || []).map((a) => a.nomeVisualizzato);
  const titoliCampione = trofei.find((t) => t.squadra._id === idDi(campione?.squadra))?.titoli || 0;

  return (
    <>
      {sonoRedazione && (
        <button type="button" className="bottone-contorno" onClick={() => onModifica({})}>
          <Plus size={18} weight="bold" /> Aggiungi un campione
        </button>
      )}

      {!campione ? (
        <section className="ritaglio albo-vuoto">
          <Trophy size={64} weight="duotone" />
          <h2 className="ritaglio-titolo medio">La bacheca aspetta il primo trofeo</h2>
          <p className="ritaglio-vuoto">Nessun campione ancora. Qualcuno dovrà pur vincere.</p>
        </section>
      ) : (
        <>
          {/* 1 · Il campione in carica */}
          <section className="ritaglio albo-campione">
            <div className="campione-testa">
              <span className="occhiello-oro">Campione in carica · {campione.stagione}</span>
              {sonoRedazione && (
                <button type="button" className="campione-matita" onClick={() => onModifica(campione)} aria-label="Correggi la voce">
                  <PencilSimple size={18} />
                </button>
              )}
            </div>

            {campione.foto ? (
              <div className="campione-foto">
                <img src={miniatura(campione.foto, 1200)} alt="" decoding="async" />
                <span className="campione-stemma-piccolo">
                  <Stemma src={campione.squadra?.stemma} nome={campione.squadra?.nome} size={64} />
                </span>
              </div>
            ) : (
              <div className="campione-medaglione">
                <span className="alone" aria-hidden="true" />
                <Stemma src={campione.squadra?.stemma} nome={campione.squadra?.nome} size={120} />
                <span className="coppa-grande" aria-hidden="true"><Trophy size={34} weight="fill" /></span>
              </div>
            )}

            <button
              type="button"
              className="campione-nome"
              onClick={() => squadraCampione && navigate(`/squadre/${squadraCampione._id}`)}
            >
              {campione.squadra?.nome || 'Squadra sciolta'}
            </button>
            {allenatoriCampione.length > 0 && (
              <div className="dettaglio campione-chi">allenata da {elencoNomi(allenatoriCampione)}</div>
            )}

            <div className="campione-numeri">
              {campione.punti != null && (
                <div><b>{formattaFantapunti(campione.punti)}</b><span className="dettaglio">fantapunti</span></div>
              )}
              <div><b>{titoliCampione}</b><span className="dettaglio">{titoliCampione === 1 ? 'titolo' : 'titoli'} in bacheca</span></div>
            </div>

            {campione.note && <blockquote className="campione-citazione">{campione.note}</blockquote>}

            {(campione.secondo || campione.terzo) && (
              <div className="podio-mini">
                {campione.secondo && (
                  <span className="gradino argento"><b>2ª</b> <Stemma src={campione.secondo.stemma} nome={campione.secondo.nome} size={26} /> {campione.secondo.nome}</span>
                )}
                {campione.terzo && (
                  <span className="gradino bronzo"><b>3ª</b> <Stemma src={campione.terzo.stemma} nome={campione.terzo.nome} size={26} /> {campione.terzo.nome}</span>
                )}
              </div>
            )}
          </section>

          {/* 2 · La bacheca */}
          <section className="ritaglio">
            <Occhiello>La bacheca</Occhiello>
            <div className="bacheca">
              {trofei.map((t) => {
                const vuota = !t.titoli && !t.secondi && !t.terzi;
                return (
                  <button
                    key={t.squadra._id}
                    type="button"
                    className={`bacheca-riga${vuota ? ' vuota' : ''}`}
                    onClick={() => navigate(`/squadre/${t.squadra._id}`)}
                  >
                    <Stemma src={t.squadra.stemma} nome={t.squadra.nome} size={40} />
                    <span className="testi">
                      <span className="nome">{t.squadra.nome}</span>
                      {vuota ? (
                        <span className="dettaglio">bacheca vuota</span>
                      ) : t.stagioni.length > 0 ? (
                        <span className="dettaglio">{t.stagioni.join(' · ')}</span>
                      ) : (
                        <span className="dettaglio">sempre sul podio, mai sul trono</span>
                      )}
                    </span>
                    <span className="trofei">
                      <Coppe quante={t.titoli} />
                      {(t.secondi > 0 || t.terzi > 0) && (
                        <span className="podi">
                          {t.secondi > 0 && <span className="argento">{t.secondi}×2ª</span>}
                          {t.terzi > 0 && <span className="bronzo">{t.terzi}×3ª</span>}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {record.length > 0 && (
              <div className="record-griglia">
                {record.map((r) => (
                  <div key={r.id} className={`record record-${r.id}`}>
                    <span className="dettaglio">{r.nome}</span>
                    <b>{elencoNomi(r.ids.map(nomeSquadra).filter(Boolean))}</b>
                    <span className="volte">×{r.volte}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3 · Le stagioni */}
          <section className="ritaglio">
            <Occhiello>Le stagioni</Occhiello>
            <ol className="stagioni">
              {albo.map((v, i) => (
                <li key={v._id} className={i === 0 ? 'ultima' : ''}>
                  <span className="pallino" aria-hidden="true" />
                  <button
                    type="button"
                    className="stagione-voce"
                    onClick={sonoRedazione ? () => onModifica(v) : () => v.squadra && navigate(`/squadre/${idDi(v.squadra)}`)}
                  >
                    <span className="stagione-etichetta">{v.stagione}</span>
                    <span className="stagione-vincitrice">
                      <Stemma src={v.squadra?.stemma} nome={v.squadra?.nome} size={34} />
                      <span className="nome">{v.squadra?.nome || 'Squadra sciolta'}</span>
                      {v.punti != null && <span className="punti">{formattaFantapunti(v.punti)}</span>}
                    </span>
                    {(v.secondo || v.terzo) && (
                      <span className="dettaglio">
                        {[v.secondo && `2ª ${v.secondo.nome}`, v.terzo && `3ª ${v.terzo.nome}`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {v.allenatori?.length > 0 && (
                      <span className="dettaglio">con {elencoNomi(v.allenatori.map((a) => a.nome))} in panchina</span>
                    )}
                    {v.note && <span className="stagione-nota">{v.note}</span>}
                    {sonoRedazione && <CaretRight size={18} className="stagione-freccia" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
