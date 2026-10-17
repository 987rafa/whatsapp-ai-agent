/**
 * Cerebro del agente: comandos, memoria por contacto y auto-respuesta autónoma.
 */
import { config } from '../config.js';
import { logger } from '../logger.js';
import { ask, isAIReady } from '../ai/index.js';
import {
  getSetting,
  setSetting,
  pushMemory,
  getMemory,
  clearMemory,
  clearDossier,
  getDossier,
  getSummary,
  setContactName,
  addFact,
  touchContact,
} from './store.js';
import { shouldLearn, learn } from './dossier.js';
import { extractContent, jidToNumber } from '../utils/text.js';
import { isNumberAllowed } from '../utils/filters.js';
import { downloadMediaMessage } from '../baileys.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSystemPrompt({ contactName, dossier, chatSummary, isGroup }) {
  const langHint = config.lang === 'en'
    ? 'Reply in the language the person writes in.'
    : 'Responde en el idioma en el que te escriban.';

  const persona = config.autoReplyMode === 'owner'
    ? `Respondes los mensajes de WhatsApp de ${config.ownerName || 'el dueño de esta cuenta'} EN SU NOMBRE, mientras él no está. Escribe tal como él lo haría: ${config.ownerStyle} Si te preguntan directamente si eres una IA, sé honesto.`
    : `Eres ${config.botName}, el secretario personal de ${config.ownerName || 'tu jefe'}: respondes a sus mensajes de WhatsApp de forma autónoma, amable y muy al grano. ${config.ownerStyle}`;

  const parts = [persona];
  if (contactName) parts.push(`Hablas con ${contactName}.`);
  if (dossier?.facts?.length) parts.push(`Cosas que ya sabes de esta persona: ${dossier.facts.join('; ')}.`);
  if (chatSummary) parts.push(`Contexto de la conversación hasta ahora: ${chatSummary}`);
  if (isGroup) parts.push('Estás en un grupo: responde solo a lo que te preguntan, sin meterte en todo.');
  if (config.ownerNotify) {
    parts.push('Si el mensaje necesita de verdad a una persona real (dinero, temas legales, urgencia personal), responde lo mejor posible y añade exactamente <escalate/> al final.');
  }

  return `${config.systemPrompt}\n\n${parts.join(' ')}\n${langHint} Mensajes cortos y naturales de WhatsApp (1-4 frases), sin markdown pesado.`;
}

export async function handleMessage({ sock, plugins, msg }) {
  try {
    const jid = msg.key.remoteJid || '';
    if (!jid || jid === 'status@broadcast') return;

    const isGroup = jid.endsWith('@g.us');
    const selfNumber = jidToNumber(sock.user?.id || '');
    const senderJid = isGroup ? msg.key.participant || jid : jid;
    const senderNumber = jidToNumber(senderJid);

    const { text, image, mentioned, quotedFrom } = extractContent(msg);
    const cleanText = text.replace(/@\d+/g, '').trim();
    if (!cleanText && !image) return;

    const contact = touchContact(senderJid, { name: msg.pushName || '' });

    const ctx = {
      sock,
      msg,
      jid,
      senderJid,
      isGroup,
      config,
      logger,
      plugins,
      args: [],
      text: cleanText,
      getSetting: (k, d) => getSetting(jid, k, d),
      setSetting: (k, v) => setSetting(jid, k, v),
      dossier: () => getDossier(senderJid),
      setContactName: (name) => setContactName(senderJid, name),
      addFact: (fact) => addFact(senderJid, fact),
      getSummary: () => getSummary(jid),
      clearMemory: (opts = {}) => {
        clearMemory(jid);
        if (opts.all) clearDossier(senderJid);
      },
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

    // ── Respuesta autónoma con IA ─────────────────────────────
    if (!isAIReady()) return;
    if (!getSetting(jid, 'ai', true)) return;

    const botMentioned = mentioned.some((j) => jidToNumber(j) === selfNumber);
    const replyToBot = Boolean(quotedFrom) && jidToNumber(quotedFrom) === selfNumber;
    const shouldReply = isGroup
      ? config.groupMentions && (botMentioned || replyToBot)
      : config.privateChats &&
        isNumberAllowed(senderNumber, { allow: config.autoReplyAllow, deny: config.autoReplyDeny });
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

    const dossier = getDossier(senderJid);
    const chatSummary = getSummary(jid);
    const history = getMemory(jid).map(({ role, content }) => ({ role, content }));

    let answer;
    try {
      answer = await ask({
        system: buildSystemPrompt({
          contactName: dossier.name || msg.pushName,
          dossier,
          chatSummary,
          isGroup,
        }),
        history,
        prompt: cleanText,
        image: imagePayload,
      });
    } catch (err) {
      logger.warn('Error de IA: ' + err.message);
      answer = config.lang === 'en'
        ? '⚠️ Sorry, I could not answer right now. I will get back to you as soon as possible.'
        : '⚠️ Disculpa, no pude responder ahora mismo. Te escribo en cuanto pueda.';
    } finally {
      await sock.sendPresenceUpdate('paused', jid).catch(() => {});
    }

    let escalate = false;
    if (answer.includes('<escalate/>')) {
      escalate = true;
      answer = answer.replace(/<escalate\/>/g, '').trim();
    }

    pushMemory(jid, { role: 'user', content: cleanText || '[imagen]' });
    pushMemory(jid, { role: 'assistant', content: answer });

    // Pausa humana antes de enviar (solo en privados)
    if (!isGroup) await sleep(700 + Math.random() * 1500);
    await sock.sendMessage(jid, { text: answer }, { quoted: msg });

    if (escalate && config.ownerNotify && !isGroup) {
      const note = `🔔 *${dossier.name || senderNumber}* necesita a una persona real:\n\n> ${(cleanText || '[imagen]').slice(0, 500)}\n\n🤖 Respondí: ${answer.slice(0, 500)}`;
      await sock
        .sendMessage(config.ownerNotify, { text: note })
        .catch((err) => logger.warn('No pude avisar al dueño: ' + err.message));
    }

    if (!isGroup && shouldLearn(contact)) {
      learn(senderJid, { name: dossier.name || msg.pushName, number: senderNumber });
    }
  } catch (err) {
    logger.error('handleMessage: ' + (err?.stack || err?.message || String(err)));
  }
}
