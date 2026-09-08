import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useDati } from '../context/DataContext';
import Article from '../components/ui/Article';

export default function Ultima() {
  const { ultimaEdizione } = useDati();
  const [edizioni, setEdizioni] = useState([]);
  const [selezionata, setSelezionata] = useState(null);
  const [mostraArchivio, setMostraArchivio] = useState(false);

  useEffect(() => {
    api.get('/api/edizioni').then(({ edizioni }) => setEdizioni(edizioni)).catch(() => {});
  }, []);

  const edizioneMostrata = selezionata || ultimaEdizione;

  return (
    <>
      <div className="card">
        <Article edizione={edizioneMostrata} />
      </div>

      <div className="card">
        <h2 className="section-title">
          Archivio
          <button className="vedi-tutto" onClick={() => setMostraArchivio((v) => !v)}>
            {mostraArchivio ? 'Nascondi' : 'Sfoglia tutte'}
          </button>
        </h2>
        {mostraArchivio && (
          edizioni.length === 0
            ? <div className="empty">Nessuna edizione archiviata.</div>
            : edizioni.map((ed) => (
              <button key={ed._id} className="archivio-item" onClick={() => setSelezionata(ed)}>
                <div className="g">Giornata {ed.giornataNumero}</div>
                <h4>{ed.titolo}</h4>
              </button>
            ))
        )}
      </div>
    </>
  );
}
