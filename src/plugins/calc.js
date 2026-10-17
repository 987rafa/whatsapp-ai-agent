/**
 * Calculadora segura (parser propio, sin eval).
 * Soporta + - * / % ^ paréntesis, decimales y unarios.
 */

export function calc(expression) {
  const s = String(expression).replace(/\s+/g, '');
  if (!s) throw new Error('Expresión vacía');
  if (!/^[0-9+\-*/%^().,]+$/.test(s)) throw new Error('Caracteres no permitidos');

  let i = 0;
  const peek = () => s[i];

  function parseExpression() {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = s[i++];
      const right = parseUnary();
      if (op === '*') value *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('División por cero');
        value /= right;
      } else {
        if (right === 0) throw new Error('Módulo por cero');
        value %= right;
      }
    }
    return value;
  }

  function parseUnary() {
    if (peek() === '-') { i++; return -parseUnary(); }
    if (peek() === '+') { i++; return parseUnary(); }
    return parsePower();
  }

  function parsePower() {
    const base = parsePrimary();
    if (peek() === '^') {
      i++;
      return Math.pow(base, parseUnary());
    }
    return base;
  }

  function parsePrimary() {
    if (peek() === '(') {
      i++;
      const value = parseExpression();
      if (peek() !== ')') throw new Error('Falta un paréntesis de cierre');
      i++;
      return value;
    }
    const start = i;
    while (i < s.length && /[0-9.,]/.test(s[i])) i++;
    if (start === i) throw new Error('Número esperado');
    const num = parseFloat(s.slice(start, i).replace(',', '.'));
    if (Number.isNaN(num)) throw new Error('Número inválido');
    return num;
  }

  const result = parseExpression();
  if (i !== s.length) throw new Error('Expresión inválida');
  if (!Number.isFinite(result)) throw new Error('El resultado no es un número finito');
  return result;
}

export default {
  name: 'calc',
  aliases: ['calcular'],
  description: 'Calculadora — ej: !calc (2+3)*4^2',
  run: async (ctx) => {
    const expr = ctx.args.join(' ');
    try {
      const value = calc(expr);
      return `🧮 \`${expr}\` = *${Number(value.toFixed(6))}*`;
    } catch (err) {
      return `⚠️ No pude calcular eso: ${err.message}`;
    }
  },
};
