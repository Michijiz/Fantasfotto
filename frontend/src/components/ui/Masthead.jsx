import useNomeLega from '../../hooks/useNomeLega';

// La testata: occhiello, titolo a due colori e riga sotto (passata da chi la usa).
export default function Masthead({ sub, className = '' }) {
  const nomeLega = useNomeLega();
  return (
    <div className={`masthead${className ? ` ${className}` : ''}`}>
      <div className="kicker">Organo ufficiale (non richiesto) della {nomeLega || 'Lega'}</div>
      <h1><span className="testata-1">La Gazzetta</span> <span className="testata-2">dello Sfottò</span></h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
