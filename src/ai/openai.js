/**
 * Proveedor OpenAI-compatible (REST, sin SDK):
 * OpenAI, Groq, OpenRouter, Together, Ollama, LM Studio, etc.
 */
import { config } from '../config.js';

export const name = 'openai';

export async function chat({ system, history = [], prompt, image, maxTokens }) {
  const messages = [{ role: 'system', content: system }];
  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }

  if (image) {
    const content = [
      { type: 'text', text: prompt || 'Describe y analiza esta imagen. Responde en el idioma del usuario.' },
      {
        type: 'image_url',
        image_url: { url: `data:${image.mimetype};base64,${image.base64}` },
      },
    ];
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const res = await fetch(`${config.openai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      messages,
      max_tokens: maxTokens ?? config.maxTokens,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`OpenAI ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();

  if (!text) throw new Error('OpenAI devolvió una respuesta vacía');
  return text;
}
