import { useEffect, useState } from 'react';
import { api } from '../api/client';

// Il nome della lega, scelto dall'amministratore. Si chiede al server una volta
// sola per sessione e si condivide tra tutti i componenti; finché non c'è, i testi
// dicono "la Lega".
let nomeCorrente = null;
let richiesta = null;
const ascoltatori = new Set();

function aggiorna(nome) {
  nomeCorrente = nome || '';
  for (const f of ascoltatori) f(nomeCorrente);
}

export function impostaNomeLega(nome) {
  aggiorna(nome);
}

export default function useNomeLega() {
  const [nome, setNome] = useState(nomeCorrente || '');
  useEffect(() => {
    ascoltatori.add(setNome);
    if (nomeCorrente === null && !richiesta) {
      richiesta = api.get('/api/lega').then((d) => aggiorna(d.nome)).catch(() => aggiorna(''));
    }
    return () => { ascoltatori.delete(setNome); };
  }, []);
  return nome;
}
