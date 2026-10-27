import { formazioneSchierata, posizioniCampo, testoSu } from '../../squadra';
import '../../styles/formazione.css';

// La formazione ideale a metà campo, come nei ritagli dei giornali: barra col nome
// della squadra, il modulo, il prato con i titolari numerati e il portiere in basso.
// Barra e cerchi prendono il primo colore sociale (senza colori, l'inchiostro del
// tema); il verde del prato non cambia mai, è un colore "di cose", non di tema.
//
// Disegna solo una formazione completa e ancora valida (vedi formazioneSchierata):
// altrimenti non restituisce nulla e lascia alla pagina il messaggio di ritaglio vuoto.
export default function FormazioneIdeale({ squadra, nome, colori }) {
  const formazione = formazioneSchierata(squadra);
  if (!formazione) return null;

  const giocatori = posizioniCampo(formazione.righe);
  const principale = (colori || []).find(Boolean);
  const stile = principale ? { '--fz-colore': principale, '--fz-testo': testoSu(principale) } : undefined;

  return (
    <div className="formazione" style={stile}>
      <div className="fz-barra">{nome}</div>
      <p className="fz-info"><b>Modulo</b> {formazione.modulo}</p>
      <div className="fz-campo" role="list" aria-label={`Formazione ideale, modulo ${formazione.modulo}`}>
        <svg viewBox="0 0 340 440" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <rect x="85" y="350" width="170" height="90" />
          <rect x="125" y="400" width="90" height="40" />
          <path d="M145 350A30 30 0 0 1 195 350" />
          <path d="M120 0A50 50 0 0 0 220 0" />
        </svg>
        {giocatori.map((g) => (
          <div
            key={g.numero}
            role="listitem"
            className={`fz-giocatore${g.fitto ? ' fitto' : ''}`}
            style={{ left: `${g.x}%`, top: `${g.y}%` }}
          >
            <i>{g.numero}</i>
            <b title={g.nome}>{g.nome}</b>
          </div>
        ))}
        <span className="fz-modulo" aria-hidden="true">{formazione.modulo}</span>
      </div>
    </div>
  );
}
