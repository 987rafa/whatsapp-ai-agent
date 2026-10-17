/**
 * Proveedor Google Gemini (REST, sin SDK).
 * https://ai.google.dev/gemini-api/docs
 */
import { config } from '../config.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const name = 'gemini';

export async function chat({ system, history = [], prompt, image }) {
  const contents = history.map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const parts = [];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimetype, data: image.base64 } });
  }
  parts.push({
    text: prompt || 'Describe y analiza esta imagen. Responde en el idioma del usuario.',
  });
  contents.push({ role: 'user', parts });

  const res = await fetch(`${API}/${config.gemini.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.gemini.apiKey,
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: config.maxTokens },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini devolvió una respuesta vacía');
  return text;
}
