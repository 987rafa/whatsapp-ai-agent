/**
 * Persistencia simple en JSON: ajustes por chat y memoria de conversación.
 * Sin dependencias — los datos viven en {DATA_DIR}/store.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

const FILE = path.join(config.dataDir, 'store.json');

let state = { settings: {}, memory: {} };
let timer = null;

export function load() {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    if (fs.existsSync(FILE)) {
      state = JSON.parse(fs.readFileSync(FILE, 'utf8'));
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

export function getSetting(jid, key, fallback) {
  return state.settings[jid]?.[key] ?? fallback;
}

export function setSetting(jid, key, value) {
  state.settings[jid] = { ...(state.settings[jid] || {}), [key]: value };
  save();
}

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
  save();
}
