import { Fragment } from 'react';

// Rende la sintassi di utils/formato.js in elementi React (mai HTML grezzo).
const TAG = { '**': 'strong', '__': 'u', '~~': 's', '*': 'em' };
const ORDINE = ['**', '__', '~~', '*'];

// Chiusura del marcatore: per '*' si saltano i '**' (così "*a **b** c*" funziona).
function chiusura(s, d, da) {
  if (d !== '*') return s.indexOf(d, da);
  for (let j = da; j < s.length; j++) {
    if (s.startsWith('**', j)) { j++; continue; }
    if (s[j] === '*') return j;
  }
  return -1;
}

function inline(s) {
  const out = [];
  let buf = '';
  let i = 0;
  const scarica = () => { if (buf) { out.push(buf); buf = ''; } };

  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length && '*_~\\>#-'.includes(s[i + 1])) { buf += s[i + 1]; i += 2; continue; }
    const d = ORDINE.find((x) => s.startsWith(x, i));
    if (d) {
      const fine = chiusura(s, d, i + d.length);
      // Il marcatore deve "toccare" il testo: "2 * 3 * 4" resta com'è.
      if (fine > i + d.length && !/\s/.test(s[i + d.length]) && !/\s/.test(s[fine - 1])) {
        scarica();
        const Tag = TAG[d];
        out.push(<Tag key={out.length}>{inline(s.slice(i + d.length, fine))}</Tag>);
        i = fine + d.length;
        continue;
      }
    }
    buf += s[i];
    i++;
  }
  scarica();
  return out.map((x, k) => (typeof x === 'string' ? <Fragment key={k}>{x}</Fragment> : x));
}

// Una riga di testo (commenti delle partite).
export function Inline({ testo }) {
  return <>{inline(testo || '')}</>;
}

function Blocco({ testo }) {
  const righe = testo.split('\n');
  if (testo.startsWith('## ')) return <h2 className="articolo-sottotitolo">{inline(testo.slice(3))}</h2>;
  if (righe.every((r) => r.startsWith('> '))) {
    return <blockquote>{inline(righe.map((r) => r.slice(2)).join(' '))}</blockquote>;
  }
  if (righe.every((r) => r.startsWith('- '))) {
    return <ul>{righe.map((r, i) => <li key={i}>{inline(r.slice(2))}</li>)}</ul>;
  }
  return <p>{inline(testo)}</p>;
}

// Il pezzo: un blocco per paragrafo.
export function Corpo({ paragrafi }) {
  return paragrafi.map((p, i) => <Blocco key={i} testo={p} />);
}
