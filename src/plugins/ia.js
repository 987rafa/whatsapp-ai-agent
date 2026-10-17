export default [
  {
    name: 'ia',
    aliases: ['ai'],
    description: 'Activa/desactiva la IA en este chat — ej: !ia off',
    run: async (ctx) => {
      const arg = (ctx.args[0] || '').toLowerCase();
      if (['on', '1', 'si', 'sí'].includes(arg)) {
        ctx.setSetting('ai', true);
        return '✅ IA activada en este chat.';
      }
      if (['off', '0', 'no'].includes(arg)) {
        ctx.setSetting('ai', false);
        return '🔕 IA desactivada en este chat.';
      }
      const current = ctx.getSetting('ai', true);
      return `La IA está *${current ? 'activada' : 'desactivada'}* aquí. Usa \`${ctx.config.prefix}ia on\` o \`${ctx.config.prefix}ia off\`.`;
    },
  },
  {
    name: 'olvidar',
    aliases: ['reset'],
    description: 'Borra la memoria del chat — "!olvidar todo" borra también el contacto',
    run: async (ctx) => {
      const all = ctx.args.join(' ').toLowerCase().includes('todo');
      ctx.clearMemory({ all });
      return all
        ? '🧹 Memoria y ficha del contacto borradas. Empezamos de cero.'
        : '🧹 Memoria del chat borrada. (La ficha del contacto se mantiene; usa `!olvidar todo` para borrar todo.)';
    },
  },
];
