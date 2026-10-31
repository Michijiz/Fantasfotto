const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fantapuntiInGol, puntiPerGol, repartiModulo, calcolaClassifica, esitoSchedina, arricchisciGiornata
} = require('../src/utils/regolamento');

test('fantapunti → gol: soglia 66 e un gol ogni 4 punti', () => {
  assert.equal(fantapuntiInGol(65.5), 0);
  assert.equal(fantapuntiInGol(66), 1);
  assert.equal(fantapuntiInGol(69.5), 1);
  assert.equal(fantapuntiInGol(70), 2);
  assert.equal(fantapuntiInGol(78), 4);
  assert.equal(fantapuntiInGol(null), null);
  assert.equal(fantapuntiInGol('boh'), null);
});

test('fantapunti: un float sporco non cambia fascia', () => {
  assert.equal(fantapuntiInGol(69.99999999999), 2);
});

test('punti per gol: 3 / 1 / 0', () => {
  assert.equal(puntiPerGol(2, 1), 3);
  assert.equal(puntiPerGol(1, 1), 1);
  assert.equal(puntiPerGol(0, 3), 0);
});

test('moduli: solo quelli del regolamento', () => {
  assert.deepEqual(repartiModulo('4-3-3'), { P: 1, D: 4, C: 3, A: 3 });
  assert.equal(repartiModulo('6-2-2'), null);
});

const squadre = [{ _id: 'a', nome: 'A' }, { _id: 'b', nome: 'B' }, { _id: 'c', nome: 'C' }];

test('classifica: vittoria 3 punti, ordine per punti e fantapunti totali', () => {
  const giornate = [{
    numero: 1,
    conclusa: true,
    accoppiamenti: [{ squadraCasa: 'a', squadraTrasferta: 'b', punteggioCasa: 80, punteggioTrasferta: 60 }]
  }];
  const t = calcolaClassifica(squadre, giornate);
  assert.equal(t[0]._id, 'a');
  assert.equal(t[0].punti, 3);
  assert.equal(t[0].vinte, 1);
  assert.equal(t[0].puntiTotali, 80);
  const b = t.find((r) => r._id === 'b');
  assert.equal(b.perse, 1);
  assert.equal(b.punti, 0);
  assert.equal(t.find((r) => r._id === 'c').giocate, 0);
});

test('classifica: pareggio 1 punto a testa', () => {
  const giornate = [{
    numero: 1,
    accoppiamenti: [{ squadraCasa: 'a', squadraTrasferta: 'b', punteggioCasa: 70, punteggioTrasferta: 71 }]
  }];
  const t = calcolaClassifica(squadre, giornate);
  assert.equal(t.find((r) => r._id === 'a').punti, 1);
  assert.equal(t.find((r) => r._id === 'b').punti, 1);
});

test('classifica: senza giornate tutte a zero', () => {
  const t = calcolaClassifica(squadre, []);
  assert.equal(t.length, 3);
  assert.ok(t.every((r) => r.punti === 0 && r.giocate === 0));
});

test('schedina: vinta solo se tutti i pronostici sono giusti', () => {
  const g = arricchisciGiornata({
    numero: 1,
    accoppiamenti: [
      { _id: 'x1', squadraCasa: 'a', squadraTrasferta: 'b', punteggioCasa: 80, punteggioTrasferta: 60 },
      { _id: 'x2', squadraCasa: 'c', squadraTrasferta: 'd', punteggioCasa: 60, punteggioTrasferta: 60 }
    ]
  });
  const giusti = [
    { accoppiamento: 'x1', squadraCasa: 'a', squadraTrasferta: 'b', esito: '1' },
    { accoppiamento: 'x2', squadraCasa: 'c', squadraTrasferta: 'd', esito: 'X' }
  ];
  assert.equal(esitoSchedina(giusti, g), 'vinta');
  assert.equal(esitoSchedina([{ ...giusti[0], esito: '2' }, giusti[1]], g), 'persa');
});

test('schedina: in attesa finché manca un risultato', () => {
  const g = arricchisciGiornata({
    numero: 1,
    accoppiamenti: [{ _id: 'x1', squadraCasa: 'a', squadraTrasferta: 'b' }]
  });
  const p = [{ accoppiamento: 'x1', squadraCasa: 'a', squadraTrasferta: 'b', esito: '1' }];
  assert.equal(esitoSchedina(p, g), 'attesa');
  assert.equal(esitoSchedina([], g), 'attesa');
});

test('schedina: ritrova lo scontro dalla coppia di squadre se l\'id è cambiato', () => {
  const g = arricchisciGiornata({
    numero: 1,
    accoppiamenti: [{ _id: 'nuovo', squadraCasa: 'a', squadraTrasferta: 'b', punteggioCasa: 80, punteggioTrasferta: 60 }]
  });
  const p = [{ accoppiamento: 'vecchio', squadraCasa: 'a', squadraTrasferta: 'b', esito: '1' }];
  assert.equal(esitoSchedina(p, g), 'vinta');
});
