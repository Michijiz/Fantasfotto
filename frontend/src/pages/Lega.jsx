import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Stemma from '../components/ui/Stemma';
import Sheet from '../components/ui/Sheet';
import AlboForm from '../components/ui/AlboForm';
import { formattaFantapunti } from '../utils/regolamento';
import { puoRedigere } from '../ruoli';
import '../styles/regolamento.css';

// Albo d'oro della lega: chi ha vinto in ogni stagione. La classifica e il
// calendario "in corso" si sono spostati nella Dashboard (si aprono toccando
// la propria squadra) — qui si guarda solo alla storia.
export default function Lega() {
  const { utente } = useOutletContext();
  const { albo } = useDati();
  const [voceDaModificare, setVoceDaModificare] = useState(null);
  const sonoRedazione = puoRedigere(utente);

  return (
    <>
      <div className="card">
        <h2 className="section-title">Albo d&apos;oro</h2>

        {sonoRedazione && (
          <button className="ghost blocco" onClick={() => setVoceDaModificare({})}>
            + Nuovo vincitore
          </button>
        )}

        {albo.length === 0 ? (
          <div className="empty">Nessun vincitore ancora registrato.</div>
        ) : (
          <div className="albo-lista">
            {albo.map((v) => (
              <div
                key={v._id}
                className={`riga-albo${sonoRedazione ? ' cliccabile' : ''}`}
                onClick={sonoRedazione ? () => setVoceDaModificare(v) : undefined}
                role={sonoRedazione ? 'button' : undefined}
                tabIndex={sonoRedazione ? 0 : undefined}
              >
                <span className="trofeo">🏆</span>
                <Stemma src={v.squadra?.stemma} nome={v.squadra?.nome} size={26} className="stemma-riga" />
                <div className="dati">
                  <div className="nome">{v.squadra?.nome}</div>
                  <div className="meta">
                    <span>{v.stagione}</span>
                    {v.punti != null && <span className="fp">{formattaFantapunti(v.punti)} fp</span>}
                    {v.note && <span className="note">{v.note}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sonoRedazione && (
        <Sheet
          aperto={Boolean(voceDaModificare)}
          onChiudi={() => setVoceDaModificare(null)}
          titolo="Albo d'oro"
          sottotitolo="Vincitore della stagione"
        >
          {voceDaModificare && (
            <AlboForm
              voce={voceDaModificare._id ? voceDaModificare : null}
              onFatto={() => setVoceDaModificare(null)}
            />
          )}
        </Sheet>
      )}
    </>
  );
}
