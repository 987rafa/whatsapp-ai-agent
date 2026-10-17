import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-agent-store-'));
process.env.DATA_DIR = tmp;

const store = await import('../src/core/store.js');

test('ajustes por chat', () => {
  store.setSetting('a@g.us', 'ai', false);
  assert.equal(store.getSetting('a@g.us', 'ai', true), false);
  assert.equal(store.getSetting('b@g.us', 'ai', true), true);
});

test('la memoria se limita y se puede borrar', () => {
  for (let i = 0; i < 40; i++) {
    store.pushMemory('c@s.whatsapp.net', { role: 'user', content: 'm' + i }, 5);
  }
  const memory = store.getMemory('c@s.whatsapp.net');
  assert.ok(memory.length <= 10, 'debe quedar limitada a max*2 entradas');
  assert.equal(memory.at(-1).content, 'm39');

  store.clearMemory('c@s.whatsapp.net');
  assert.equal(store.getMemory('c@s.whatsapp.net').length, 0);
});
