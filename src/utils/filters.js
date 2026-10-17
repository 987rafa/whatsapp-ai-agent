/** Filtros de números de teléfono para la auto-respuesta. */

/** "57 300 123 4567, 57 310..." → ["573001234567", "573100000000"] */
export function parseNumberList(value) {
  return String(value || '')
    .split(/[,;\n]+/)
    .map((s) => s.replace(/\D/g, ''))
    .filter(Boolean);
}

/** "+57 300 1234567" → "573001234567@s.whatsapp.net" */
export function toJid(value) {
  const n = String(value || '').replace(/\D/g, '');
  return n ? `${n}@s.whatsapp.net` : '';
}

/**
 * ¿Podemos responder automáticamente a este número?
 * - deny tiene prioridad.
 * - Si allow no está vacío, solo esos números pueden recibir respuesta.
 */
export function isNumberAllowed(number, { allow = [], deny = [] } = {}) {
  const n = String(number || '');
  if (!n) return false;
  if (deny.includes(n)) return false;
  if (allow.length > 0) return allow.includes(n);
  return true;
}
