import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../src/plugins/menu.js';

const CATALOG = [
  { id: 1, name: 'Gaseosa 400 ml', category: 'Bebidas', price_cents: 350_000, stock: 10 },
  { id: 2, name: 'Café molido 250 g', category: 'Despensa', price_cents: 900_000, stock: 0 },
];

const CTX = { config: { pos: { url: 'http://pos.test', apiKey: 'clave' }, prefix: '!' } };

test('sin POS configurado responde con aviso', async () => {
  const reply = await plugin.run({ ...CTX, config: { pos: {}, prefix: '!' } });
  assert.match(reply, /no está configurado/);
});

test('lista productos por categoría con precio y marca agotados', async () => {
  const original = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify(CATALOG), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const reply = await plugin.run(CTX);
    assert.match(reply, /Bebidas/);
    assert.match(reply, /Gaseosa 400 ml/);
    assert.match(reply, /Café molido 250 g \(agotado\)/);
    assert.match(reply, /!pedido/);
  } finally {
    global.fetch = original;
  }
});
