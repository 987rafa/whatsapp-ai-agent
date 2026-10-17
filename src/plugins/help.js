export default {
  name: 'help',
  aliases: ['ayuda', 'menu'],
  description: 'Muestra la lista de comandos',
  run: async (ctx) => {
    const unique = [...new Set(ctx.plugins.values())];
    const lines = unique.map((p) => `• *${ctx.config.prefix}${p.name}* — ${p.description || ''}`);
    return [
      `🤖 *${ctx.config.botName}*`,
      '',
      ...lines,
      '',
      '💬 También puedes escribirme directamente (o mencionarme en un grupo) y te responderé con IA.',
    ].join('\n');
  },
};
