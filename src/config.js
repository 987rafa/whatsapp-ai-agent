import path from 'node:path';
import { parseNumberList, toJid } from './utils/filters.js';

const bool = (value, fallback) =>
  value === undefined || value === ''
    ? fallback
    : ['1', 'true', 'yes', 'on', 'si', 'sí'].includes(String(value).toLowerCase());

export const config = {
  provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  botName: process.env.BOT_NAME || 'AI Agent',
  lang: (process.env.BOT_LANG || 'es').toLowerCase().startsWith('en') ? 'en' : 'es',
  systemPrompt:
    process.env.AI_SYSTEM_PROMPT ||
    'You are a helpful, friendly assistant inside WhatsApp. Keep answers concise and natural.',

  prefix: process.env.BOT_PREFIX || '!',
  privateChats: bool(process.env.AI_PRIVATE_CHATS, true),
  groupMentions: bool(process.env.AI_GROUP_MENTIONS, true),
  historySize: Math.max(2, parseInt(process.env.AI_HISTORY_SIZE || '12', 10) || 12),
  maxTokens: Math.max(64, parseInt(process.env.AI_MAX_TOKENS || '1024', 10) || 1024),

  // ── Modo secretario autónomo ─────────────────────────────────
  autoReplyMode: (process.env.AUTO_REPLY_MODE || 'assistant').toLowerCase(), // assistant | owner
  ownerName: process.env.OWNER_NAME || '',
  ownerStyle:
    process.env.OWNER_STYLE ||
    'Responde natural: cercano, claro y breve; nunca suenes robótico.',
  autoReplyAllow: parseNumberList(process.env.AUTO_REPLY_ALLOW),
  autoReplyDeny: parseNumberList(process.env.AUTO_REPLY_DENY),
  ownerNotify: toJid(process.env.OWNER_NOTIFY),
  summaryEvery: Math.max(6, parseInt(process.env.MEMORY_SUMMARY_EVERY || '16', 10) || 16),

  pairingPhone: (process.env.PAIRING_PHONE || '').replace(/\D/g, ''),

  logLevel: process.env.LOG_LEVEL || 'info',
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
};
