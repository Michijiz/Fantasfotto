// Schermata di apertura: sostituisce il flash bianco che si vedeva prima che
// AuthContext capisse se c'è una sessione valida. Nessuna libreria, solo CSS —
// si spegne da sola per chi ha prefers-reduced-motion attivo (regola globale
// in global.css).
export default function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-kicker">Organo ufficiale (non richiesto) della Lega</div>
      <h1 className="splash-titolo">
        <span>La Gazzetta</span>
        <span>dello Sfottò</span>
      </h1>
      <div className="splash-rigo" />
      <span className="splash-sr">Caricamento…</span>
    </div>
  );
}
