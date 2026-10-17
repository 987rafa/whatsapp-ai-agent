/**
 * Interoperabilidad con @whiskeysockets/baileys (ESM en v7, CJS en v6).
 * Expone solo lo que usa el agente, con un error claro si falta la dependencia.
 */
import * as baileys from '@whiskeysockets/baileys';

const B = baileys.makeWASocket ? baileys : (baileys.default ?? {});

if (!B.makeWASocket) {
  throw new Error(
    'No pude cargar @whiskeysockets/baileys. Ejecuta `npm install` y vuelve a intentarlo.',
  );
}

export const makeWASocket = B.makeWASocket;
export const useMultiFileAuthState = B.useMultiFileAuthState;
export const DisconnectReason = B.DisconnectReason || {};
export const fetchLatestBaileysVersion = B.fetchLatestBaileysVersion;
export const downloadMediaMessage = B.downloadMediaMessage;
