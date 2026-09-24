import { useNavigate } from 'react-router-dom';

// Un indirizzo che non esiste nell'app.
export default function NonTrovata() {
  const navigate = useNavigate();
  return (
    <div className="ritagli">
      <section className="ritaglio">
        <h1 className="ritaglio-titolo">Pagina strappata</h1>
        <p className="ritaglio-vuoto">Questa pagina non è mai andata in stampa.</p>
        <button type="button" className="bottone-grande" onClick={() => navigate('/')}>Torna alla Home</button>
      </section>
    </div>
  );
}
