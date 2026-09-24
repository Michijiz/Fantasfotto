import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDati } from '../context/DataContext';
import Schedina from '../components/ui/Schedina';
import Verdetti from './Verdetti';
import '../styles/gioca.css';

// Due linguette: la schedina guarda alla giornata che deve iniziare, i verdetti a
// quella appena raccontata. Il bollino rosso conta le cose ancora da fare.
export default function Gioca() {
  const location = useLocation();
  const { schedina, risultatiVoti, categorieVoto, ultimaEdizione } = useDati();
  const [tab, setTab] = useState(() => location.state?.tab || 'schedina');

  const scontri = schedina.giornata?.accoppiamenti?.length || 0;
  const daPronosticare = !schedina.chiusa && !schedina.miaSchedina ? scontri : 0;
  const daVotare = ultimaEdizione && !risultatiVoti.chiuse
    ? Math.max(0, categorieVoto.length - Object.keys(risultatiVoti.mioVoto || {}).length)
    : 0;

  const linguetta = (id, nome, conto) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      className={`tab${tab === id ? ' active' : ''}`}
      onClick={() => setTab(id)}
    >
      {nome}
      {conto > 0 && <span className="bollino-conto" aria-label={`${conto} da fare`}>{conto}</span>}
    </button>
  );

  return (
    <div className="ritagli gioca">
      <div className="tabs linguette" role="tablist">
        {linguetta('schedina', 'Schedina', daPronosticare)}
        {linguetta('verdetti', 'Verdetti', daVotare)}
      </div>
      {tab === 'schedina' ? <Schedina /> : <Verdetti />}
    </div>
  );
}
