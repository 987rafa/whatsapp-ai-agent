export default {
  name: 'nombre',
  description: 'Guarda el nombre de esta persona — ej: !nombre Juan Pérez',
  run: async (ctx) => {
    const name = ctx.args.join(' ').trim();
    if (!name) return '📛 Uso: `!nombre Juan Pérez` (guarda el nombre del contacto de este chat)';
    ctx.setContactName(name);
    return `✅ Guardado: *${name}*.`;
  },
};
