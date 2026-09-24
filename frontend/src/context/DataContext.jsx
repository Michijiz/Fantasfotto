import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// Stato condiviso tra le pagine per i dati "di lega" che tutte usano (squadre,
// tabellone, ultima edizione, prossima giornata, calendario completo, categorie
// di voto, schedina aperta), così non vengono richiesti due volte e restano
// sincronizzati dopo un'azione (es. pubblicare una nuova edizione).
const DataContext = createContext(null);

const SCHEDINA_VUOTA = { giornata: null, miaSchedina: null, chiusa: true, motivo: null, precedente: null };
const VOTI_VUOTI = { conteggi: null, mioVoto: {}, chiuse: false, visibili: false, votantiCompleti: 0, utentiTotali: 0 };

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
  const utenteId = utente?.id || null;
  const [squadre, setSquadre] = useState([]);
  const [tabellone, setTabellone] = useState([]);
  const [ultimaEdizione, setUltimaEdizione] = useState(null);
  const [edizioni, setEdizioni] = useState([]);
  const [prossimaGiornata, setProssimaGiornata] = useState(null);
  const [giornate, setGiornate] = useState([]);
  const [risultatiVoti, setRisultatiVoti] = useState(VOTI_VUOTI);
  const [categorieVoto, setCategorieVoto] = useState([]);
  const [schedina, setSchedina] = useState(SCHEDINA_VUOTA);
  const [albo, setAlbo] = useState([]);

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

  // L'archivio completo sta nel contesto e non nella pagina Gazzetta: dopo una
  // correzione o un'eliminazione deve aggiornarsi insieme a tutto il resto.
  const ricaricaEdizioni = useCallback(async () => {
    const { edizioni } = await api.get('/api/edizioni');
    setEdizioni(edizioni);
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
    if (!edizioneId) {
      setRisultatiVoti(VOTI_VUOTI);
      return;
    }
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

  const ricaricaAlbo = useCallback(async () => {
    const { albo } = await api.get('/api/albo');
    setAlbo(albo);
  }, []);

  // Restituisce una promessa che si risolve quando TUTTE le ricariche sono finite:
  // i form fanno `await ricaricaTutto()` prima di chiudersi e di mostrare il toast,
  // e prima restituiva undefined — il messaggio "salvato" compariva mentre in
  // classifica c'erano ancora i numeri vecchi.
  // allSettled e non all: una rotta che fallisce (albo vuoto, rete ballerina) non
  // deve impedire alle altre di aggiornare la pagina.
  const ricaricaTutto = useCallback(() => {
    const lavori = [ricaricaSquadre(), ricaricaCategorieVoto()];
    if (utenteId) {
      lavori.push(
        ricaricaTabellone(),
        ricaricaUltimaEdizione(),
        ricaricaEdizioni(),
        ricaricaProssimaGiornata(),
        ricaricaGiornate(),
        ricaricaSchedina(),
        ricaricaAlbo()
      );
    }
    return Promise.allSettled(lavori);
  }, [
    utenteId, ricaricaSquadre, ricaricaCategorieVoto, ricaricaTabellone, ricaricaUltimaEdizione,
    ricaricaEdizioni, ricaricaProssimaGiornata, ricaricaGiornate, ricaricaSchedina, ricaricaAlbo
  ]);

  // Dipendere dall'id e non dall'oggetto: `utente` è un oggetto nuovo a ogni
  // risposta del server (anche solo per un cambio di tema), e con `[utente]`
  // ogni cambio colore rilanciava nove richieste e sovrascriveva la schedina
  // che si stava compilando con quella già salvata.
  useEffect(() => {
    ricaricaTutto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utenteId]);

  // Stesso motivo: si guarda l'id dell'edizione, non l'oggetto. E quando l'ultima
  // edizione viene cancellata i conteggi vanno azzerati, altrimenti la Dashboard
  // continua a mostrare i verdetti di un'edizione che non esiste più.
  useEffect(() => {
    ricaricaRisultatiVoti(ultimaEdizione?._id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimaEdizione?._id]);

  return (
    <DataContext.Provider value={{
      squadre, tabellone, ultimaEdizione, edizioni, prossimaGiornata, giornate, risultatiVoti,
      categorieVoto, schedina, albo,
      // Solo le ricariche mirate che qualcuno usa davvero: Profilo (squadre),
      // Schedina (schedina), Verdetti (risultatiVoti). Tutto il resto passa da
      // ricaricaTutto — le altre sette erano superficie pubblica mai chiamata.
      ricaricaSquadre, ricaricaSchedina, ricaricaRisultatiVoti, ricaricaTutto
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
