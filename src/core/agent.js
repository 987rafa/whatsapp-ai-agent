/** Cerebro del agente: decide entre comando, IA o silencio. */
import { config } from '../config.js';
import { logger } from '../logger.js';
import { ask, isAIReady } from '../ai/index.js';
import { getSetting, setSetting, pushMemory, getMemory, clearMemory } from './store.js';
import { extractContent, jidToNumber } from '../utils/text.js';
import { downloadMediaMessage } from '../baileys.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function buildSystemPrompt() {
  const langHint = config.lang === 'en'
    ? 'Reply in the language the user writes in.'
    : 'Responde en el idioma en el que te escriban.';
  return `${config.systemPrompt} Your name is ${config.botName}. ${langHint} Keep replies short and natural for a WhatsApp chat.`;
}

export async function handleMessage({ sock, plugins, msg }) {
  try {
    const jid = msg.key.remoteJid || '';
    if (!jid || jid === 'status@broadcast') return;

    const isGroup = jid.endsWith('@g.us');
    const selfNumber = jidToNumber(sock.user?.id || '');
    const { text, image, mentioned, quotedFrom } = extractContent(msg);
    const cleanText = text.replace(/@\d+/g, '').trim();

    if (!cleanText && !image) return;

    const ctx = {
      sock,
      msg,
      jid,
      isGroup,
      config,
      logger,
      plugins,
      args: [],
      text: cleanText,
      getSetting: (k, d) => getSetting(jid, k, d),
      setSetting: (k, v) => setSetting(jid, k, v),
      clearMemory: () => clearMemory(jid),
    };

    // ── Comandos ──────────────────────────────────────────────
    if (cleanText.startsWith(config.prefix)) {
      const body = cleanText.slice(config.prefix.length).trim();
      const [rawCmd, ...args] = body.split(/\s+/);
      const plugin = plugins.get((rawCmd || '').toLowerCase());

      if (plugin) {
        const reply = await plugin.run({ ...ctx, args });
        if (reply) await sock.sendMessage(jid, { text: reply }, { quoted: msg });
        return;
      }
      if (!isGroup) {
        await sock.sendMessage(
          jid,
          { text: `🤔 No conozco el comando "${config.prefix}${rawCmd}". Prueba ${config.prefix}help.` },
          { quoted: msg },
        );
      }
      return;
    }

    // ── IA ────────────────────────────────────────────────────
    if (!isAIReady()) return;
    if (!getSetting(jid, 'ai', true)) return;

    const botMentioned = mentioned.some((j) => jidToNumber(j) === selfNumber);
    const replyToBot = Boolean(quotedFrom) && jidToNumber(quotedFrom) === selfNumber;
    const shouldReply = isGroup
      ? config.groupMentions && (botMentioned || replyToBot)
      : config.privateChats;
    if (!shouldReply) return;

    await sock.sendPresenceUpdate('composing', jid).catch(() => {});

    let imagePayload = null;
    if (image) {
      try {
        const buffer = await downloadMediaMessage(image.message, 'buffer', {});
        if (buffer.length <= MAX_IMAGE_BYTES) {
          imagePayload = { base64: buffer.toString('base64'), mimetype: image.mimetype };
        } else {
          await sock.sendMessage(
            jid,
            { text: '🖼️ La imagen es muy grande (máximo 5 MB).' },
            { quoted: msg },
          );
          return;
        }
      } catch (err) {
        logger.warn('No pude descargar la imagen: ' + err.message);
      }
    }

    if (!cleanText && !imagePayload) return;

    const history = getMemory(jid).map(({ role, content }) => ({ role, content }));

    let answer;
    try {
      answer = await ask({
        system: buildSystemPrompt(),
        history,
        prompt: cleanText,
        image: imagePayload,
      });
    } catch (err) {
      logger.warn('Error de IA: ' + err.message);
      answer = config.lang === 'en'
        ? '⚠️ Sorry, the AI service is not responding right now. Try again in a moment.'
        : '⚠️ La IA no está respondiendo ahora mismo. Intenta de nuevo en un momento.';
    } finally {
      await sock.sendPresenceUpdate('paused', jid).catch(() => {});
    }

    pushMemory(jid, { role: 'user', content: cleanText || '[imagen]' });
    pushMemory(jid, { role: 'assistant', content: answer });

    await sock.sendMessage(jid, { text: answer }, { quoted: msg });
  } catch (err) {
    logger.error('handleMessage: ' + (err?.stack || err?.message || String(err)));
  }
}
