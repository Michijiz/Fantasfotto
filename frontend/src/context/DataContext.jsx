import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// Stato condiviso tra le pagine per i dati "di lega" che tutte usano (squadre,
// tabellone, ultima edizione, prossima giornata, calendario completo), così non
// vengono richiesti due volte e restano sincronizzati dopo un'azione (es.
// pubblicare una nuova edizione).
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { utente } = useAuth();
  const [squadre, setSquadre] = useState([]);
  const [tabellone, setTabellone] = useState([]);
  const [ultimaEdizione, setUltimaEdizione] = useState(null);
  const [prossimaGiornata, setProssimaGiornata] = useState(null);
  const [giornate, setGiornate] = useState([]);
  const [risultatiVoti, setRisultatiVoti] = useState({ conteggi: {}, mioVoto: {} });

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

  const ricaricaTutto = useCallback(() => {
    ricaricaSquadre();
    if (utente) {
      ricaricaTabellone();
      ricaricaUltimaEdizione();
      ricaricaProssimaGiornata();
      ricaricaGiornate();
    }
  }, [utente, ricaricaSquadre, ricaricaTabellone, ricaricaUltimaEdizione, ricaricaProssimaGiornata, ricaricaGiornate]);

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
      ricaricaSquadre, ricaricaTabellone, ricaricaUltimaEdizione, ricaricaProssimaGiornata,
      ricaricaGiornate, ricaricaRisultatiVoti, ricaricaTutto
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
