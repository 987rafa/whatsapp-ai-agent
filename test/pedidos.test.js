import test from 'node:test';
import assert from 'node:assert/strict';
import plugin, { matchProduct, normalize, parseItems } from '../src/plugins/pedidos.js';

const CATALOG = [
  { id: 1, name: 'Gaseosa 400 ml', category: 'Bebidas', price_cents: 350_000, stock: 10 },
  { id: 2, name: 'Leche entera 1 L', category: 'Lácteos', price_cents: 480_000, stock: 8 },
  { id: 3, name: 'Pan tajado grande', category: 'Panadería', price_cents: 620_000, stock: 5 },
  { id: 4, name: 'Café molido 250 g', category: 'Despensa', price_cents: 900_000, stock: 0 },
];

const CTX = {
  config: { pos: { url: 'http://pos.test', apiKey: 'clave' }, prefix: '!' },
  msg: { pushName: 'Ana Pérez' },
  senderJid: '573001112233@s.whatsapp.net',
  isGroup: false,
};

function mockFetch(handler) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
  return {
    calls,
    restore: () => {
      global.fetch = original;
    },
  };
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('parseItems entiende cantidades, comas y saltos de línea', () => {
  assert.deepEqual(parseItems('2 pan tajado, 1 leche'), [
    { qty: 2, name: 'pan tajado' },
    { qty: 1, name: 'leche' },
  ]);
  assert.deepEqual(parseItems('3x gaseosa\n2 leche'), [
    { qty: 3, name: 'gaseosa' },
    { qty: 2, name: 'leche' },
  ]);
  assert.deepEqual(parseItems('pan'), [{ qty: 1, name: 'pan' }]);
  assert.deepEqual(parseItems('  '), []);
});

test('normalize ignora tildes y mayúsculas', () => {
  assert.equal(normalize('Café MOLIDO'), 'cafe molido');
});

test('matchProduct encuentra por nombre completo, parcial y sin tildes', () => {
  assert.equal(matchProduct('gaseosa 400 ml', CATALOG)?.id, 1);
  assert.equal(matchProduct('leche', CATALOG)?.id, 2);
  assert.equal(matchProduct('pan tajado', CATALOG)?.id, 3);
  assert.equal(matchProduct('cafe', CATALOG)?.id, 4);
  assert.equal(matchProduct('zapato deportivo', CATALOG), null);
});

test('sin POS configurado responde con aviso', async () => {
  const reply = await plugin.run({ ...CTX, args: ['2', 'gaseosa'], config: { pos: {}, prefix: '!' } });
  assert.match(reply, /no están configurados/);
});

test('sin argumentos muestra la ayuda', async () => {
  const reply = await plugin.run({ ...CTX, args: [] });
  assert.match(reply, /!pedido 2 gaseosa/);
});

test('run crea el pedido en el POS y confirma al cliente', async () => {
  const mock = mockFetch((url) => {
    if (url.endsWith('/api/orders/catalog')) return json(CATALOG);
    return json(
      {
        id: 7,
        total_cents: 1_320_000,
        items: [
          { qty: 2, product_name: 'Gaseosa 400 ml', line_total_cents: 700_000 },
          { qty: 1, product_name: 'Pan tajado grande', line_total_cents: 620_000 },
        ],
      },
      201,
    );
  });

  try {
    const reply = await plugin.run({ ...CTX, args: ['2', 'gaseosa,', '1', 'pan', 'tajado'] });

    assert.match(reply, /Pedido #7/);
    assert.match(reply, /Gaseosa 400 ml/);
    assert.match(reply, /Total/);

    const post = mock.calls.find((c) => c.url.endsWith('/api/orders') && c.options.method === 'POST');
    const body = JSON.parse(post.options.body);
    assert.equal(body.channel, 'whatsapp');
    assert.equal(body.customer_name, 'Ana Pérez');
    assert.equal(body.customer_phone, '+573001112233');
    assert.deepEqual(body.items, [
      { product_id: 1, qty: 2 },
      { product_id: 3, qty: 1 },
    ]);
  } finally {
    mock.restore();
  }
});

test('productos no reconocidos avisan y no crean pedido', async () => {
  const mock = mockFetch(() => json(CATALOG));
  try {
    const reply = await plugin.run({ ...CTX, args: ['2', 'zapato'] });
    assert.match(reply, /No reconocí/);
    assert.ok(!mock.calls.some((c) => c.options.method === 'POST'));
  } finally {
    mock.restore();
  }
});

test('si el POS rechaza el pedido, se muestra el motivo', async () => {
  const mock = mockFetch((url) => {
    if (url.endsWith('/api/orders/catalog')) return json(CATALOG);
    return json({ detail: 'Stock insuficiente para Pan tajado grande (disponible: 1)' }, 409);
  });
  try {
    const reply = await plugin.run({ ...CTX, args: ['99', 'pan'] });
    assert.match(reply, /Stock insuficiente/);
  } finally {
    mock.restore();
  }
});
