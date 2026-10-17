/**
 * Aprendizaje en segundo plano: la IA actualiza el resumen de la conversación
 * y extrae datos duraderos del contacto (quién es, qué relación tiene, qué espera).
 * No bloquea nunca la respuesta al mensaje.
 */
import { config } from '../config.js';
import { logger } from '../logger.js';
import { ask } from '../ai/index.js';
import { getMemory, getDossier, setSummary, addFact } from './store.js';

const running = new Set();

/** ¿Toca aprender? (cada MEMORY_SUMMARY_EVERY mensajes del contacto) */
export function shouldLearn(contact) {
  const count = contact?.messages || 0;
  return count > 0 && count % config.summaryEvery === 0;
}

export async function learn(jid, { name, number } = {}) {
  if (running.has(jid)) return;
  running.add(jid);

  try {
    const history = getMemory(jid)
      .slice(-30)
      .map((m) => `${m.role === 'user' ? name || 'Contacto' : 'Asistente'}: ${m.content}`)
      .join('\n');

    if (history.trim().length < 60) return;

    const dossier = getDossier(jid);
    const prompt = `Contacto: ${name || number || jid}${number ? ` (${number})` : ''}
Datos actuales: ${JSON.stringify(dossier.facts || [])}
Resumen actual: ${dossier.summary || '(sin resumen)'}

Conversación reciente:
${history}

Tarea:
1) Actualiza el resumen de la conversación (máx. 4 frases, hechos concretos, en el idioma de la conversación).
2) Propón hasta 2 hechos NUEVOS y duraderos sobre el CONTACTO o su relación (ej: "es cliente", "trabaja en X", "espera una cotización", "habla inglés"). No repitas lo que ya está en los datos actuales.
Responde SOLO con este JSON: {"summary":"...","facts":["..."]}`;

    const raw = await ask({
      system:
        'Eres un sistema de memoria para un asistente de WhatsApp. Respondes únicamente con JSON válido, sin texto adicional.',
      prompt,
      maxTokens: 400,
    });

    const parsed = parseJson(raw);
    if (!parsed) {
      logger.warn('Aprendizaje: respuesta no parseable');
      return;
    }

    if (parsed.summary) setSummary(jid, String(parsed.summary).slice(0, 600));
    for (const fact of (parsed.facts || []).slice(0, 2)) {
      const clean = String(fact).trim();
      if (clean) addFact(jid, clean.slice(0, 200));
    }
    logger.info(`🧠 Memoria actualizada para ${name || number || jid}`);
  } catch (err) {
    logger.warn('Aprendizaje en segundo plano falló: ' + err.message);
  } finally {
    running.delete(jid);
  }
}

function parseJson(raw) {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}
