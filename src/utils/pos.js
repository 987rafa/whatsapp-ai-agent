/** Cliente mínimo de la API de pedidos de NOVUS POS (catálogo + crear pedido). */

export function formatCop(cents) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function posConfigured(config) {
  return Boolean(config.pos?.url && config.pos?.apiKey);
}

export async function fetchCatalog(config) {
  const res = await fetch(`${config.pos.url}/api/orders/catalog`, {
    headers: { 'X-API-Key': config.pos.apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`el POS respondió ${res.status}`);
  return res.json();
}

export async function createOrder(config, payload) {
  const res = await fetch(`${config.pos.url}/api/orders`, {
    method: 'POST',
    headers: { 'X-API-Key': config.pos.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : `error ${res.status}`;
    throw new Error(detail);
  }
  return data;
}
