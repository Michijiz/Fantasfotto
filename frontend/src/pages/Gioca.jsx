import Schedina from '../components/ui/Schedina';
import Verdetti from './Verdetti';
import '../styles/gioca.css';

// Scroll unico: prima si pronostica la giornata che deve ancora cominciare
// (schedina), poi si giudica quella appena finita (verdetti). La Gazzetta resta
// sola lettura: qui si gioca.
export default function Gioca() {
  return (
    <>
      <Schedina />
      <Verdetti />
    </>
  );
}
