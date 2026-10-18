/**
 * Pedido para NOVUS POS: el cliente escribe su pedido por WhatsApp y entra
 * directo al panel de Pedidos del POS, donde caja lo confirma o lo rechaza.
 *
 * Requiere POS_URL (ej. http://localhost:8000) y POS_API_KEY (la ORDERS_API_KEY del POS).
 */
import { jidToNumber } from '../utils/text.js';
import { createOrder, fetchCatalog, formatCop, posConfigured } from '../utils/pos.js';

/** Quita tildes y pasa a minúsculas, para comparar nombres de producto. */
export function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** "2 pan tajado, 1x leche" → [{ qty: 2, name: 'pan tajado' }, { qty: 1, name: 'leche' }] */
export function parseItems(raw) {
  return String(raw || '')
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d+)\s*(?:x|\*)?\s*(.+)$/i);
      if (match) {
        const qty = Math.max(1, Number.parseInt(match[1], 10) || 1);
        return { qty, name: match[2].trim() };
      }
      return { qty: 1, name: part };
    })
    .filter((item) => item.name.length > 0);
}

/** Busca el producto del catálogo que mejor coincide con lo que pidió el cliente. */
export function matchProduct(name, catalog) {
  const wanted = normalize(name);
  if (!wanted) return null;

  const tokens = wanted.split(/\s+/).filter((token) => token.length >= 2);
  let best = null;
  let bestScore = 0;

  for (const product of catalog) {
    const productName = normalize(product.name);
    if (productName === wanted) return product;

    let score = 0;
    if (productName.includes(wanted) || wanted.includes(productName)) score += 2;
    if (tokens.length) {
      const hits = tokens.filter((token) => productName.includes(token)).length;
      score += hits / tokens.length;
    }
    if (product.stock <= 0) score -= 0.25;

    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return bestScore >= 1 ? best : null;
}

const HELP = `🛒 Escríbeme tu pedido con cantidad y producto, separados por comas:

  !pedido 2 gaseosa, 1 pan tajado

Lo mando al negocio y te confirman por aquí. Lista de productos: !menu`;

export default {
  name: 'pedido',
  aliases: ['pedidos', 'order', 'comprar'],
  description: 'Pide al negocio — ej: !pedido 2 gaseosa, 1 pan tajado',
  run: async (ctx) => {
    if (!posConfigured(ctx.config)) {
      return '🛒 Los pedidos al negocio no están configurados (POS_URL y POS_API_KEY).';
    }

    const raw = ctx.args.join(' ').trim();
    if (!raw) return HELP;

    let catalog;
    try {
      catalog = await fetchCatalog(ctx.config);
    } catch (err) {
      return `⚠️ No pude consultar los productos del negocio (${err.message}).`;
    }
    if (!catalog.length) return '🛒 El negocio no tiene productos disponibles ahora mismo.';

    const matched = [];
    const missing = [];
    for (const item of parseItems(raw)) {
      const product = matchProduct(item.name, catalog);
      if (product) {
        matched.push({ product_id: product.id, qty: item.qty, product });
      } else {
        missing.push(item.name);
      }
    }

    if (!matched.length) {
      return `🤔 No reconocí ningún producto de tu pedido ("${raw}").\n\n${HELP}`;
    }

    let order;
    try {
      order = await createOrder(ctx.config, {
        channel: 'whatsapp',
        customer_name: ctx.msg?.pushName || 'Cliente de WhatsApp',
        customer_phone: `+${jidToNumber(ctx.senderJid)}`,
        note: ctx.isGroup ? 'Pedido desde un grupo de WhatsApp' : null,
        items: matched.map(({ product_id, qty }) => ({ product_id, qty })),
      });
    } catch (err) {
      return `⚠️ No pude registrar el pedido: ${err.message}. Intenta de nuevo en un momento.`;
    }

    const summary = order.items
      .map((item) => `• ${item.qty} × ${item.product_name} — ${formatCop(item.line_total_cents)}`)
      .join('\n');
    const missingNote = missing.length
      ? `\n\n⚠️ No encontré: ${missing.join(', ')} — quedaron por fuera (mira !menu).`
      : '';

    return `✅ *Pedido #${order.id} enviado al negocio:*\n\n${summary}\n\n*Total:* ${formatCop(order.total_cents)}${missingNote}\n\nTe confirman por este mismo chat. ¡Gracias! 🙌`;
  },
};
