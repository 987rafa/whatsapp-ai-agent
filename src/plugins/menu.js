/** Menú del negocio (productos y precios) leído del catálogo de NOVUS POS. */
import { fetchCatalog, formatCop, posConfigured } from '../utils/pos.js';

export default {
  name: 'menu',
  aliases: ['catalogo', 'catálogo', 'products'],
  description: 'Productos y precios del negocio — ej: !menu',
  run: async (ctx) => {
    if (!posConfigured(ctx.config)) {
      return '🛒 El menú del negocio no está configurado (POS_URL y POS_API_KEY).';
    }

    let catalog;
    try {
      catalog = await fetchCatalog(ctx.config);
    } catch (err) {
      return `⚠️ No pude consultar el menú (${err.message}).`;
    }
    if (!catalog.length) return '🛒 El negocio no tiene productos disponibles ahora mismo.';

    const byCategory = new Map();
    for (const product of catalog) {
      const list = byCategory.get(product.category) || [];
      list.push(product);
      byCategory.set(product.category, list);
    }

    const sections = [...byCategory.entries()].map(([category, items]) => {
      const lines = items
        .map((product) => `• ${product.name}${product.stock <= 0 ? ' (agotado)' : ''} — ${formatCop(product.price_cents)}`)
        .join('\n');
      return `*${category}*\n${lines}`;
    });

    return `🛒 *Menú* (${catalog.length} productos):\n\n${sections.join('\n\n')}\n\nPide así: *!pedido 2 gaseosa, 1 pan tajado*`;
  },
};
