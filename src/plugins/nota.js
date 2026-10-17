export default {
  name: 'nota',
  aliases: ['recuerda'],
  description: 'Guarda un dato del contacto — ej: !nota Es cliente, espera cotización',
  run: async (ctx) => {
    const fact = ctx.args.join(' ').trim();
    if (!fact) return '📝 Uso: `!nota Es cliente, espera una cotización`';
    ctx.addFact(fact);
    return '🧠 Anotado: lo recordaré en esta conversación.';
  },
};
