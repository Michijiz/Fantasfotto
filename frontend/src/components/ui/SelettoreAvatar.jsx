import '../../styles/avatar.css';
import { AVATAR_SQUADRE, AVATAR_FUORI_CAMPIONATO, urlAvatar } from '../../avatar';

// Griglia degli avatar, divisa in "dalla Serie A" e "fuori campionato".
// Usata in fase di iscrizione e nel foglio "Componi la tua pagina".
function Gruppo({ titolo, elenco, valore, onSceglie }) {
  return (
    <>
      <div className="avatar-gruppo">{titolo}</div>
      <div className="avatar-griglia">
        {elenco.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`avatar-carta${valore === a.id ? ' scelto' : ''}`}
            onClick={() => onSceglie(a.id)}
            aria-pressed={valore === a.id}
            aria-label={a.nome}
          >
            <img src={urlAvatar(a.id)} alt="" loading="lazy" decoding="async" />
            <span className="nome">{a.nome}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function SelettoreAvatar({ valore, onSceglie }) {
  return (
    <div className="avatar-selettore">
      <Gruppo titolo="Dalla Serie A" elenco={AVATAR_SQUADRE} valore={valore} onSceglie={onSceglie} />
      <Gruppo titolo="Fuori campionato" elenco={AVATAR_FUORI_CAMPIONATO} valore={valore} onSceglie={onSceglie} />
    </div>
  );
}
