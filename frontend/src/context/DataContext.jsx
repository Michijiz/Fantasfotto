import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// Stato condiviso tra le pagine per i dati "di lega" che tutte usano (squadre,
// tabellone, ultima edizione, prossima giornata, calendario completo, categorie
// di voto, schedina aperta), così non vengono richiesti due volte e restano
// sincronizzati dopo un'azione (es. pubblicare una nuova edizione).
const DataContext = createContext(null);

const SCHEDINA_VUOTA = { giornata: null, miaSchedina: null, chiusa: true, motivo: null, precedente: null };

// Le categorie di voto arrivano dal backend già con etichetta e descrizione. Una
// vecchia versione dell'API mandava solo gli id come stringhe: normalizziamo qui
// così le pagine vedono sempre la stessa forma.
function normalizzaCategorie(elenco) {
  return (elenco || []).map((c) => (
    typeof c === 'string' ? { id: c, etichetta: c, breve: c, descrizione: '' } : c
  ));
}

export function DataProvider({ children }) {
  const { utente } = useAuth();
  const [squadre, setSquadre] = useState([]);
  const [tabellone, setTabellone] = useState([]);
  const [ultimaEdizione, setUltimaEdizione] = useState(null);
  const [prossimaGiornata, setProssimaGiornata] = useState(null);
  const [giornate, setGiornate] = useState([]);
  const [risultatiVoti, setRisultatiVoti] = useState({ conteggi: {}, mioVoto: {} });
  const [categorieVoto, setCategorieVoto] = useState([]);
  const [schedina, setSchedina] = useState(SCHEDINA_VUOTA);

  const ricaricaSquadre = useCallback(async () => {
    const { squadre } = await api.get('/api/squadre');
    setSquadre(squadre);
  }, []);

  const ricaricaTabellone = useCallback(async () => {
    const { tabellone } = await api.get('/api/squadre/classifica');
    setTabellone(tabellone);
  }, []);

  const ricaricaUltimaEdizione = useCallback(async () => {
    const { edizione } = await api.get('/api/edizioni/ultima');
    setUltimaEdizione(edizione);
  }, []);

  const ricaricaProssimaGiornata = useCallback(async () => {
    const { giornata } = await api.get('/api/giornate/prossima');
    setProssimaGiornata(giornata);
  }, []);

  // Calendario completo della stagione, ordinato per numero crescente (il
  // backend le restituisce in ordine decrescente, comodo per altri usi ma non
  // per mostrare "Giornata 1, 2, 3...").
  const ricaricaGiornate = useCallback(async () => {
    const { giornate } = await api.get('/api/giornate');
    setGiornate([...giornate].sort((a, b) => a.numero - b.numero));
  }, []);

  const ricaricaRisultatiVoti = useCallback(async (edizioneId) => {
    if (!edizioneId) return;
    const dati = await api.get(`/api/voti/${edizioneId}`);
    setRisultatiVoti(dati);
  }, []);

  const ricaricaCategorieVoto = useCallback(async () => {
    const { categorie } = await api.get('/api/voti/categorie');
    setCategorieVoto(normalizzaCategorie(categorie));
  }, []);

  // La schedina aperta porta con sé la giornata già arricchita di quote: una sola
  // chiamata serve sia alla pagina Gioca sia al riquadro in Dashboard.
  const ricaricaSchedina = useCallback(async () => {
    try {
      const dati = await api.get('/api/schedine/apertura');
      setSchedina({ ...SCHEDINA_VUOTA, ...dati });
    } catch {
      setSchedina(SCHEDINA_VUOTA);
    }
  }, []);

  const ricaricaTutto = useCallback(() => {
    ricaricaSquadre();
    ricaricaCategorieVoto();
    if (utente) {
      ricaricaTabellone();
      ricaricaUltimaEdizione();
      ricaricaProssimaGiornata();
      ricaricaGiornate();
      ricaricaSchedina();
    }
  }, [
    utente, ricaricaSquadre, ricaricaCategorieVoto, ricaricaTabellone, ricaricaUltimaEdizione,
    ricaricaProssimaGiornata, ricaricaGiornate, ricaricaSchedina
  ]);

  useEffect(() => {
    ricaricaTutto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente]);

  useEffect(() => {
    if (ultimaEdizione) ricaricaRisultatiVoti(ultimaEdizione._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimaEdizione]);

  return (
    <DataContext.Provider value={{
      squadre, tabellone, ultimaEdizione, prossimaGiornata, giornate, risultatiVoti,
      categorieVoto, schedina,
      ricaricaSquadre, ricaricaTabellone, ricaricaUltimaEdizione, ricaricaProssimaGiornata,
      ricaricaGiornate, ricaricaRisultatiVoti, ricaricaCategorieVoto, ricaricaSchedina, ricaricaTutto
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDati() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDati va usato dentro <DataProvider>');
  return ctx;
}
