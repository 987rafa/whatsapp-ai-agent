/** Utilidades para extraer contenido de los mensajes de Baileys. */

export function extractContent(msg) {
  const m = msg.message || {};
  const contextInfo = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || {};

  const text =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    '';

  return {
    text: text.trim(),
    image: m.imageMessage
      ? { message: msg, mimetype: m.imageMessage.mimetype || 'image/jpeg' }
      : null,
    mentioned: contextInfo.mentionedJid || [],
    quotedFrom: contextInfo.participant || null,
  };
}

/** "57300...:12@s.whatsapp.net" → "57300..." */
export function jidToNumber(jid) {
  return (jid || '').split('@')[0].split(':')[0];
}
