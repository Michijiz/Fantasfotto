import { TEMI, sfondoTema } from '../../temi';

// Griglia delle squadre: un dischetto con i colori sociali veri e il nome sotto.
// Usata sia nel foglio "Cambia tema" del drawer sia in fase di iscrizione.
export default function SelettoreTema({ valore, onSceglie }) {
  return (
    <div className="tema-griglia">
      {TEMI.map((tema) => (
        <button
          key={tema.id}
          type="button"
          className={`tema-carta${valore === tema.id ? ' scelto' : ''}`}
          onClick={() => onSceglie(tema.id)}
          aria-pressed={valore === tema.id}
        >
          <span className="dischetto" style={{ background: sfondoTema(tema.colori) }} />
          <span className="nome">{tema.nome}</span>
        </button>
      ))}
    </div>
  );
}
