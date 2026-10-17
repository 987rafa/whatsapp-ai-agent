import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumberList, toJid, isNumberAllowed } from '../src/utils/filters.js';

test('parseNumberList limpia y separa por comas', () => {
  assert.deepEqual(parseNumberList('57 300 123 4567, +57(310)000-0000'), [
    '573001234567',
    '573100000000',
  ]);
  assert.deepEqual(parseNumberList(''), []);
});

test('toJid normaliza a JID de WhatsApp', () => {
  assert.equal(toJid('+57 300 1234567'), '573001234567@s.whatsapp.net');
  assert.equal(toJid(''), '');
});

test('isNumberAllowed respeta allow/deny', () => {
  assert.equal(isNumberAllowed('123', { allow: [], deny: [] }), true);
  assert.equal(isNumberAllowed('123', { allow: [], deny: ['123'] }), false);
  assert.equal(isNumberAllowed('123', { allow: ['555'], deny: [] }), false);
  assert.equal(isNumberAllowed('555', { allow: ['555'], deny: [] }), true);
  assert.equal(isNumberAllowed('555', { allow: ['555'], deny: ['555'] }), false);
  assert.equal(isNumberAllowed('', {}), false);
});
