import { useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import Sheet from '../components/ui/Sheet';
import AlboForm from '../components/ui/AlboForm';
import AlboDOro from '../components/ui/AlboDOro';
import GiornataForm from '../components/ui/GiornataForm';
import { formattaFantapunti } from '../utils/regolamento';
import { idDi, statoGiornata } from '../utils/lega';
import { puoRedigere } from '../ruoli';
import '../styles/lega.css';

const LINGUETTE = [
  { id: 'classifica', nome: 'Classifica' },
  { id: 'calendario', nome: 'Calendario' },
  { id: 'albo', nome: 'Albo' }
];

function Classifica({ miaSquadraId }) {
  const { tabellone } = useDati();
  const navigate = useNavigate();
  const giocati = tabellone.reduce((t, s) => t + (s.giocate || 0), 0);

  return (
    <section className="ritaglio">
      <div className="ritaglio-occhiello"><span>Classifica</span><span className="filo" /></div>
      {tabellone.length === 0 ? (
        <p className="ritaglio-vuoto">Lega deserta: l&apos;amministratore deve ancora aprire le iscrizioni.</p>
      ) : (
        <>
          <div className="classifica-intesta"><span>Squadra</span><span>Pt</span></div>
          <div className="classifica">
            {tabellone.map((s, i) => (
              <button
                type="button"
                key={s._id}
                className={`classifica-riga${s._id === miaSquadraId ? ' mia' : ''}`}
                onClick={() => navigate(`/squadre/${s._id}`)}
              >
                <span className="posto">{i + 1}</span>
                <Stemma src={s.stemma} nome={s.nome} size={36} />
                <span className="testi">
                  <span className="nome">{s.nome}</span>
                  <span className="dettaglio">
                    {s.vinte ?? 0}V {s.pareggiate ?? 0}N {s.perse ?? 0}P · {formattaFantapunti(s.puntiTotali ?? 0)} fp
                  </span>
                </span>
                <span className="punti">{s.punti ?? 0}</span>
              </button>
            ))}
          </div>
          {giocati === 0 && <p className="ritaglio-vuoto">Classifica immacolata: nessuno ha ancora perso la faccia.</p>}
          <p className="dettaglio">Vittoria 3, pareggio 1, sconfitta 0. A parità contano i fantapunti.</p>
          <button type="button" className="bottone-link" onClick={() => navigate('/regolamento', { state: { sezione: 'classifica' } })}>
            Come si calcola →
          </button>
        </>
      )}
    </section>
  );
}

function Calendario({ sonoRedazione, onModifica }) {
  const { giornate } = useDati();
  const prossimoNumero = giornate.length ? Math.max(...giornate.map((g) => g.numero)) + 1 : 1;

  return (
    <>
      {sonoRedazione && (
        <button type="button" className="bottone-contorno" onClick={() => onModifica({ numero: prossimoNumero })}>
          + Nuova giornata
        </button>
      )}
      {giornate.length === 0 ? (
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Il calendario è ancora in bozza</h2>
          <p className="ritaglio-vuoto">Appena il direttore di turno imposta gli scontri, li trovi qui.</p>
        </section>
      ) : [...giornate].sort((a, b) => b.numero - a.numero).map((g) => (
        <section className="ritaglio giornata" key={g._id}>
          <div className="giornata-testa">
            <span className="titolo">
              Giornata {g.numero}
              {g.serieANumero ? <span className="dettaglio"> · {g.serieANumero}ª di Serie A</span> : null}
            </span>
            <span className={`chip-tempo${statoGiornata(g) === 'conclusa' ? ' chiaro' : ''}`}>{statoGiornata(g)}</span>
          </div>
          {g.accoppiamenti.length === 0 ? (
            <p className="ritaglio-vuoto">Scontri non ancora impostati: ci pensa il direttore di turno.</p>
          ) : g.accoppiamenti.filter((a) => a.squadraCasa && a.squadraTrasferta).map((a) => {
            const risultato = a.golCasa != null && a.golTrasferta != null;
            return (
              <div className="scontro" key={a._id}>
                <span className={`lato casa${risultato && a.golCasa > a.golTrasferta ? ' vince' : ''}`}>
                  <span className="nome">{a.squadraCasa.nome}</span>
                  <Stemma src={a.squadraCasa.stemma} nome={a.squadraCasa.nome} size={30} />
                </span>
                {risultato ? (
                  <span className="risultato">
                    <b>{a.golCasa} – {a.golTrasferta}</b>
                    <span className="dettaglio">{formattaFantapunti(a.fantapuntiCasa)} / {formattaFantapunti(a.fantapuntiTrasferta)}</span>
                  </span>
                ) : <span className="vs">VS</span>}
                <span className={`lato trasferta${risultato && a.golTrasferta > a.golCasa ? ' vince' : ''}`}>
                  <Stemma src={a.squadraTrasferta.stemma} nome={a.squadraTrasferta.nome} size={30} />
                  <span className="nome">{a.squadraTrasferta.nome}</span>
                </span>
              </div>
            );
          })}
          {sonoRedazione && (
            <button type="button" className="bottone-link" onClick={() => onModifica(g)}>Modifica</button>
          )}
        </section>
      ))}
    </>
  );
}

// La lega in tre linguette: classifica, calendario e albo d'oro.
export default function Lega() {
  const { utente } = useOutletContext();
  const location = useLocation();
  const [tab, setTab] = useState(() => location.state?.tab || 'classifica');
  const [giornata, setGiornata] = useState(null);
  const [voceAlbo, setVoceAlbo] = useState(null);
  const sonoRedazione = puoRedigere(utente);

  return (
    <div className="ritagli lega">
      <div className="tabs linguette" role="tablist">
        {LINGUETTE.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={tab === l.id}
            className={`tab${tab === l.id ? ' active' : ''}`}
            onClick={() => setTab(l.id)}
          >
            {l.nome}
          </button>
        ))}
      </div>

      {tab === 'classifica' && <Classifica miaSquadraId={idDi(utente.squadra)} />}
      {tab === 'calendario' && <Calendario sonoRedazione={sonoRedazione} onModifica={setGiornata} />}
      {tab === 'albo' && <AlboDOro sonoRedazione={sonoRedazione} onModifica={setVoceAlbo} />}

      {sonoRedazione && (
        <>
          <Sheet aperto={Boolean(giornata)} onChiudi={() => setGiornata(null)} titolo="Compila la giornata" sottotitolo="Scontri e punteggi" grande>
            {giornata && <GiornataForm giornata={giornata} onFatto={() => setGiornata(null)} />}
          </Sheet>
          <Sheet aperto={Boolean(voceAlbo)} onChiudi={() => setVoceAlbo(null)} titolo="Albo d'oro" sottotitolo="Il campione della stagione">
            {voceAlbo && <AlboForm voce={voceAlbo._id ? voceAlbo : null} onFatto={() => setVoceAlbo(null)} />}
          </Sheet>
        </>
      )}
    </div>
  );
}
