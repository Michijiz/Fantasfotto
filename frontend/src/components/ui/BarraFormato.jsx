import { TextB, TextItalic, TextUnderline, TextStrikethrough, TextH, Quotes, ListBullets } from '@phosphor-icons/react';
import { MARCATORI } from '../../utils/formato';

// Barra di formattazione unica per i campi con `data-formato` ("blocco" = pezzo,
// "riga" = commenti): agisce sull'ultimo campo in cui eri. I tasti non rubano il
// focus (pointerdown annullato), così sul telefono la tastiera resta aperta.
// La modifica passa dal setter nativo + evento `input`, quindi il campo React
// controllato la vede come se l'avessi scritta tu.
function scrivi(campo, valore, da, a) {
  if (campo.maxLength > 0 && valore.length > campo.maxLength) return false;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(campo, valore);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.setSelectionRange(da, a);
  return true;
}

function inLinea(campo, m) {
  const { value: v, selectionStart: s, selectionEnd: e } = campo;
  const sel = v.slice(s, e);
  // Già avvolto: lo togli.
  if (sel && v.slice(s - m.length, s) === m && v.slice(e, e + m.length) === m && !(m === '*' && (v[s - 2] === '*' || v[e + 1] === '*'))) {
    scrivi(campo, v.slice(0, s - m.length) + sel + v.slice(e + m.length), s - m.length, e - m.length);
    return;
  }
  scrivi(campo, v.slice(0, s) + m + sel + m + v.slice(e), s + m.length, e + m.length);
}

function inBlocco(campo, prefisso) {
  const { value: v, selectionStart: s, selectionEnd: e } = campo;
  const inizio = v.lastIndexOf('\n', s - 1) + 1;
  const fineRiga = v.indexOf('\n', e);
  const fine = fineRiga === -1 ? v.length : fineRiga;
  const righe = v.slice(inizio, fine).split('\n');
  const tutte = righe.every((r) => r.startsWith(prefisso));
  const nuove = righe.map((r) => (tutte ? r.slice(prefisso.length) : r.startsWith(prefisso) ? r : prefisso + r));
  const blocco = nuove.join('\n');
  scrivi(campo, v.slice(0, inizio) + blocco + v.slice(fine), inizio, inizio + blocco.length);
}

const INLINE = [
  { id: 'grassetto', Icona: TextB, etichetta: 'Grassetto' },
  { id: 'corsivo', Icona: TextItalic, etichetta: 'Corsivo' },
  { id: 'sottolineato', Icona: TextUnderline, etichetta: 'Sottolineato' },
  { id: 'barrato', Icona: TextStrikethrough, etichetta: 'Barrato' }
];
const BLOCCHI = [
  { prefisso: '## ', Icona: TextH, etichetta: 'Sottotitolo' },
  { prefisso: '> ', Icona: Quotes, etichetta: 'Citazione' },
  { prefisso: '- ', Icona: ListBullets, etichetta: 'Elenco' }
];

export default function BarraFormato({ campoRef, tipo }) {
  const campo = () => campoRef.current;
  const consentiBlocchi = tipo === 'blocco';

  return (
    <div className="barra-formato" role="toolbar" aria-label="Formattazione del testo" onPointerDown={(e) => e.preventDefault()}>
      {INLINE.map(({ id, Icona, etichetta }) => (
        <button key={id} type="button" aria-label={etichetta} title={etichetta}
          onClick={() => campo() && inLinea(campo(), MARCATORI[id])}>
          <Icona size={18} weight="bold" />
        </button>
      ))}
      <span className="sep" />
      {BLOCCHI.map(({ prefisso, Icona, etichetta }) => (
        <button key={prefisso} type="button" aria-label={etichetta} title={etichetta} disabled={!consentiBlocchi}
          onClick={() => campo() && inBlocco(campo(), prefisso)}>
          <Icona size={18} weight="bold" />
        </button>
      ))}
    </div>
  );
}
