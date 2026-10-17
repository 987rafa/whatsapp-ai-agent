import { config } from '../config.js';
import * as gemini from './gemini.js';
import * as openai from './openai.js';

const providers = { gemini, openai };

/** ¿Hay API key configurada para el proveedor activo? */
export function isAIReady() {
  return config.provider === 'gemini'
    ? Boolean(config.gemini.apiKey)
    : Boolean(config.openai.apiKey);
}

export async function ask(payload) {
  const provider = providers[config.provider];
  if (!provider) {
    throw new Error(`AI_PROVIDER desconocido: "${config.provider}" (usa "gemini" u "openai")`);
  }
  return provider.chat(payload);
}
