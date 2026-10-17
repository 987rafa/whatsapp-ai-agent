export default {
  name: 'quien',
  aliases: ['contacto'],
  description: 'Muestra lo que sé de la persona con la que hablo',
  run: async (ctx) => {
    const dossier = ctx.dossier();
    const number = (ctx.senderJid || '').split('@')[0];
    const lines = [
      `👤 *${dossier.name || '(sin nombre todavía)'}* — +${number}`,
      dossier.firstSeen ? `• Primer mensaje: ${new Date(dossier.firstSeen).toLocaleDateString()}` : null,
      dossier.messages ? `• Mensajes vistos: ${dossier.messages}` : null,
      dossier.facts?.length ? `• Lo que sé: ${dossier.facts.join(' | ')}` : '• Aún no he aprendido datos de esta persona',
      dossier.summary ? `• Resumen: ${dossier.summary}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  },
};
