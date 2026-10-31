import test from 'node:test';
import assert from 'node:assert/strict';
import { idDi } from '../src/utils/lega.js';
import { trofeiSquadra, classificaTrofei, etichettaTrofeo } from '../src/utils/trofei.js';

test('idDi accetta id, oggetto popolato e vuoto', () => {
  assert.equal(idDi('a1'), 'a1');
  assert.equal(idDi({ _id: 'b2' }), 'b2');
  assert.equal(idDi(null), null);
});

test('trofeiSquadra raggruppa albo e verdetti in ordine', () => {
  const dati = {
    albo: [
      { stagione: '2025-26', squadra: 'A', secondo: 'B' },
      { stagione: '2024-25', squadra: 'A' }
    ],
    trofeiVerdetti: [{ categoria: 'culo', giornata: 3, squadre: ['A'] }],
    categorie: [{ id: 'culo', etichetta: 'San Culo' }]
  };
  const a = trofeiSquadra('A', dati);
  assert.deepEqual(a.map((t) => [t.id, t.quanti]), [['campione', 2], ['culo', 1]]);
  assert.deepEqual(a[0].dettagli, ['2024-25', '2025-26']);
  assert.deepEqual(trofeiSquadra('B', dati).map((t) => t.id), ['argento']);
});

test('classificaTrofei ordina dalla squadra più decorata', () => {
  const dati = { albo: [{ stagione: '1', squadra: 'A' }, { stagione: '2', squadra: 'A' }, { stagione: '3', squadra: 'B' }] };
  const righe = classificaTrofei([{ _id: 'A', nome: 'A' }, { _id: 'B', nome: 'B' }], dati).get('campione');
  assert.deepEqual(righe.map((r) => [r.squadra._id, r.quanti]), [['A', 2], ['B', 1]]);
});

test('etichettaTrofeo usa le categorie, poi le etichette fisse', () => {
  assert.equal(etichettaTrofeo('culo', [{ id: 'culo', etichetta: 'San Culo' }]).etichetta, 'San Culo');
  assert.equal(etichettaTrofeo('gufi').etichetta, 'Re dei Gufi');
});
