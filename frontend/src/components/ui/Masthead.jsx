// Testata condivisa: usata sia nell'header dell'app (AppHeader, con dati live
// sull'ultima edizione) sia nella schermata di login/registrazione (con una
// riga secondaria statica). Un solo posto da aggiornare se cambia lo stile.
// Nota: la variante "compatta" durante lo scroll è gestita dal CSS sul
// contenitore genitore (.app-header.compatto), qui non serve saperlo.
export default function Masthead({ sub, className = '' }) {
  return (
    <div className={`masthead${className ? ` ${className}` : ''}`}>
      <div className="kicker">Organo ufficiale (non richiesto) della Lega</div>
      <h1>La Gazzetta dello Sfottò</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
