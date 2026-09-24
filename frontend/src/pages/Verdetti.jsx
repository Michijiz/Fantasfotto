import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CaretLeft, CaretRight, ChartBar, LockSimple } from '@phosphor-icons/react';
import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import Stemma from '../components/ui/Stemma';
import { idDi } from '../utils/lega';
import '../styles/carosello.css';

// Il tribunale della lega: si vota una categoria alla volta, a carosello. I
// risultati di tutti stanno in un'altra pagina, che si sblocca dopo aver votato
// ogni categoria (o a votazioni chiuse, per tutti).
export default function Verdetti() {
  const { utente } = useOutletContext();
  const { ultimaEdizione, squadre, risultatiVoti, categorieVoto, ricaricaRisultatiVoti } = useDati();
  const mostraToast = useToast();
  const navigate = useNavigate();
  const mioVoto = risultatiVoti.mioVoto || {};
  const n = categorieVoto.length;

  // Si parte dalla prima categoria ancora da votare.
  const [indice, setIndice] = useState(() => {
    const i = categorieVoto.findIndex((c) => !mioVoto[c.id]);
    return i >= 0 ? i : 0;
  });
  const [inVoto, setInVoto] = useState(false);

  if (!ultimaEdizione) {
    return (
      <div className="ritagli">
        <section className="ritaglio"><p className="ritaglio-vuoto">Il tribunale è chiuso: niente edizione, niente processo.</p></section>
      </div>
    );
  }
  if (n === 0) return null;

  const i = Math.min(indice, n - 1);
  const cat = categorieVoto[i];
  const votate = categorieVoto.filter((c) => mioVoto[c.id]).length;
  const mancano = n - votate;
  const chiuse = Boolean(risultatiVoti.chiuse);
  const scelta = mioVoto[cat.id];
  const mia = idDi(utente.squadra);
  const votabili = squadre.filter((s) => s._id !== mia);

  const vai = (k) => setIndice((k + n) % n);
  const prossimaDaVotare = () => {
    for (let s = 1; s <= n; s++) {
      const k = (i + s) % n;
      if (!mioVoto[categorieVoto[k].id]) return k;
    }
    return -1;
  };

  const vota = async (squadraId) => {
    if (inVoto || chiuse) return;
    setInVoto(true);
    try {
      await api.post('/api/voti', { edizioneId: ultimaEdizione._id, categoria: cat.id, squadraId });
      await ricaricaRisultatiVoti(ultimaEdizione._id);
    } catch (err) {
      mostraToast(err.message);
    } finally {
      setInVoto(false);
    }
  };

  const nomeScelta = squadre.find((s) => s._id === scelta)?.nome;

  return (
    <div className="ritagli tribunale">
      <section className="ritaglio">
        <span className="occhiello-oro">Verdetti · Giornata {ultimaEdizione.giornataNumero}</span>
        <h1 className="ritaglio-titolo">Il tribunale della lega</h1>
        <span className="barra-avanzamento">
          <span className="binario"><span className="riempito" style={{ width: `${Math.round((100 * votate) / n)}%` }} /></span>
          <b>{votate}/{n}</b>
        </span>
        <p className="dettaglio">Si vota fino al fischio d&apos;inizio della giornata dopo. Un voto per categoria, la tua squadra non si vota.</p>
      </section>

      {chiuse ? (
        <section className="ritaglio">
          <h2 className="ritaglio-titolo medio">Votazioni chiuse</h2>
          {votate < n && <p className="ritaglio-vuoto">Non hai votato: ecco com&apos;è andata.</p>}
        </section>
      ) : (
        <section className="ritaglio voto">
          <div className="voto-testa">
            <button type="button" className="carosello-freccia" onClick={() => vai(i - 1)} aria-label="Categoria precedente">
              <CaretLeft size={22} weight="bold" />
            </button>
            <div className="voto-posizione">
              <span className="occhiello-oro">Categoria {i + 1} di {n}</span>
              <span className="pallini">
                {categorieVoto.map((c, k) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.etichetta}
                    className={`pallino${k === i ? ' corrente' : mioVoto[c.id] ? ' votato' : ''}`}
                    onClick={() => vai(k)}
                  />
                ))}
              </span>
            </div>
            <button type="button" className="carosello-freccia" onClick={() => vai(i + 1)} aria-label="Categoria successiva">
              <CaretRight size={22} weight="bold" />
            </button>
          </div>

          <div className="voto-categoria" aria-live="polite">
            <h2 className="ritaglio-titolo">{cat.etichetta}</h2>
            <p className="descrizione">{cat.descrizione}</p>
          </div>

          <div className="voto-squadre">
            {votabili.map((s) => (
              <button
                key={s._id}
                type="button"
                className={`voto-squadra${scelta === s._id ? ' scelta' : ''}`}
                aria-pressed={scelta === s._id}
                onClick={() => vota(s._id)}
                disabled={inVoto}
              >
                <Stemma src={s.stemma} nome={s.nome} size={38} />
                <span className="nome">{s.nome}</span>
              </button>
            ))}
          </div>

          <p className="dettaglio centro">
            {scelta ? `Il tuo voto: ${nomeScelta} · tocca un'altra squadra per cambiarlo` : 'Tocca una squadra per votarla'}
          </p>

          <button
            type="button"
            className="bottone-grande"
            disabled={mancano === 0}
            onClick={() => { const k = prossimaDaVotare(); if (k >= 0) vai(k); }}
          >
            {mancano === 0 ? 'Tutto votato' : scelta ? 'Avanti alla prossima' : 'Salta per ora'}
          </button>
        </section>
      )}

      {risultatiVoti.visibili ? (
        <button type="button" className="riga-azione sbloccata" onClick={() => navigate('/verdetti/risultati')}>
          <span className="freccia rossa"><ChartBar size={26} weight="bold" /></span>
          <span className="testi">
            <span className="ritaglio-titolo medio">Risultati</span>
            <span className="dettaglio">{chiuse ? 'Votazioni chiuse: i grafici sono per tutti' : 'Hai votato tutto: guarda i grafici'}</span>
          </span>
          <CaretRight size={22} weight="bold" />
        </button>
      ) : (
        <div className="riga-azione bloccata" aria-disabled="true">
          <span className="freccia"><LockSimple size={26} weight="bold" /></span>
          <span className="testi">
            <span className="ritaglio-titolo medio">Come ha votato la lega</span>
            <span className="dettaglio">Si sblocca quando hai votato tutte le categorie · ne mancano {mancano}</span>
          </span>
        </div>
      )}
    </div>
  );
}
