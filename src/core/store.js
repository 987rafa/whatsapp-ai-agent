/**
 * Persistencia simple en JSON: ajustes por chat, memoria de conversación
 * y fichas de contactos (nombre, hechos aprendidos, resumen).
 * Sin dependencias — los datos viven en {DATA_DIR}/store.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

const FILE = path.join(config.dataDir, 'store.json');

let state = { settings: {}, memory: {}, contacts: {}, summaries: {} };
let timer = null;

export function load() {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    if (fs.existsSync(FILE)) {
      state = { settings: {}, memory: {}, contacts: {}, summaries: {}, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
    }
  } catch (err) {
    logger.warn('No pude cargar store.json: ' + err.message);
  }
}

function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
    } catch (err) {
      logger.warn('No pude guardar store.json: ' + err.message);
    }
  }, 400);
}

// ── Ajustes por chat ───────────────────────────────────────────
export function getSetting(jid, key, fallback) {
  return state.settings[jid]?.[key] ?? fallback;
}

export function setSetting(jid, key, value) {
  state.settings[jid] = { ...(state.settings[jid] || {}), [key]: value };
  save();
}

// ── Memoria reciente (ventana de mensajes) ─────────────────────
export function pushMemory(jid, entry, max = config.historySize) {
  const arr = state.memory[jid] || [];
  arr.push({ ...entry, ts: Date.now() });
  while (arr.length > max * 2) arr.shift();
  state.memory[jid] = arr;
  save();
}

export function getMemory(jid) {
  return state.memory[jid] || [];
}

export function clearMemory(jid) {
  delete state.memory[jid];
  delete state.summaries[jid];
  save();
}

// ── Ficha de contacto (quién es, qué sabemos) ──────────────────
export function touchContact(jid, { name } = {}) {
  const contact = state.contacts[jid] || { firstSeen: Date.now(), messages: 0, facts: [] };
  contact.messages = (contact.messages || 0) + 1;
  contact.lastSeen = Date.now();
  if (name && contact.nameSource !== 'manual') {
    contact.name = name;
    contact.nameSource = 'push';
  }
  state.contacts[jid] = contact;
  save();
  return contact;
}

export function setContactName(jid, name) {
  const contact = state.contacts[jid] || { firstSeen: Date.now(), messages: 0, facts: [] };
  contact.name = name;
  contact.nameSource = 'manual';
  state.contacts[jid] = contact;
  save();
}

export function addFact(jid, fact) {
  const contact = state.contacts[jid] || { firstSeen: Date.now(), messages: 0, facts: [] };
  contact.facts = contact.facts || [];
  if (!contact.facts.includes(fact)) {
    contact.facts.push(fact);
    while (contact.facts.length > 30) contact.facts.shift();
    state.contacts[jid] = contact;
    save();
  }
}

export function getDossier(jid) {
  const contact = state.contacts[jid] || {};
  return { ...contact, summary: state.summaries[jid] || '' };
}

export function clearDossier(jid) {
  delete state.contacts[jid];
  delete state.summaries[jid];
  save();
}

// ── Resumen rodante de la conversación ─────────────────────────
export function setSummary(jid, text) {
  state.summaries[jid] = text;
  save();
}

export function getSummary(jid) {
  return state.summaries[jid] || '';
}
