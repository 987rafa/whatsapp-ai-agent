import test from 'node:test';
import assert from 'node:assert/strict';
import { calc } from '../src/plugins/calc.js';

test('suma, resta y multiplicación', () => {
  assert.equal(calc('2+2'), 4);
  assert.equal(calc('10-3-2'), 5);
  assert.equal(calc('6*7'), 42);
});

test('precedencia y paréntesis', () => {
  assert.equal(calc('2+3*4'), 14);
  assert.equal(calc('(2+3)*4'), 20);
});

test('potencia y unarios', () => {
  assert.equal(calc('2^10'), 1024);
  assert.equal(calc('-3+5'), 2);
});

test('decimales con coma', () => {
  assert.equal(calc('1,5*2'), 3);
});

test('errores bien manejados', () => {
  assert.throws(() => calc('1/0'), /cero/i);
  assert.throws(() => calc('2+'), /esperado/i);
  assert.throws(() => calc('alert(1)'), /permitidos/i);
  assert.throws(() => calc(''), /vacía/i);
  assert.throws(() => calc('(1+2'), /paréntesis/i);
});
