export default {
  name: 'resumen',
  description: 'Muestra el resumen que la IA recuerda de esta conversación',
  run: async (ctx) => ctx.getSummary() || '📭 Todavía no tengo resumen de esta conversación (se genera solo con el uso).',
};
