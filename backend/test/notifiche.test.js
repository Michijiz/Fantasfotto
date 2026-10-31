const test = require('node:test');
const assert = require('node:assert/strict');

test('senza chiavi VAPID le notifiche sono spente e non lanciano', async () => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  const { attive, chiavePubblica, inviaATutti } = require('../src/services/notifiche');
  assert.equal(attive(), false);
  assert.equal(chiavePubblica(), null);
  assert.deepEqual(await inviaATutti({ titolo: 'x', corpo: 'y', url: '/' }), { inviate: 0 });
});
