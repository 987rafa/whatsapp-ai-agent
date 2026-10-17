/** Punto de entrada: conexión con WhatsApp + orquestación. */
import path from 'node:path';
import qrcode from 'qrcode-terminal';
import { config } from './config.js';
import { logger } from './logger.js';
import { load } from './core/store.js';
import { handleMessage } from './core/agent.js';
import { loadPlugins } from './plugins/index.js';
import { isAIReady } from './ai/index.js';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from './baileys.js';

const AUTH_DIR = path.join(config.dataDir, 'auth');

function banner() {
  console.log(`
  ┌──────────────────────────────────────────────┐
  │  🤖  whatsapp-ai-agent · self-hosted          │
  │  provider: ${config.provider.padEnd(34)}│
  └──────────────────────────────────────────────┘
`);
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    /* opcional: si falla, usamos la versión por defecto de Baileys */
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger,
    browser: ['whatsapp-ai-agent', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  const plugins = await loadPlugins();

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      handleMessage({ sock, plugins, msg });
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !config.pairingPhone) {
      console.log('\n📲 Escanea este QR — WhatsApp → Dispositivos vinculados → Vincular dispositivo:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      logger.info(`✅ Conectado como ${sock.user?.id}`);
      if (!isAIReady()) {
        logger.warn(
          `⚠️  IA desactivada: falta la API key de "${config.provider}" en .env — por ahora solo funcionan los comandos.`,
        );
      }
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        logger.error('🚪 La sesión se cerró desde el teléfono. Borra ./data/auth y vuelve a iniciar.');
        process.exit(1);
      }
      logger.warn(`🔌 Conexión cerrada (${reason ?? 'razón desconocida'}). Reintentando en 5 s…`);
      setTimeout(() => connect().catch((err) => logger.error('Reconexión falló: ' + err.message)), 5000);
    }
  });

  if (config.pairingPhone && !state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairingPhone);
        console.log(
          `\n🔑 Código de vinculación: *${code}*\n   WhatsApp → Dispositivos vinculados → Vincular con número de teléfono\n`,
        );
      } catch (err) {
        logger.warn('No pude generar el código de vinculación: ' + err.message);
      }
    }, 3000);
  }

  return sock;
}

banner();
load();
logger.info(`Iniciando whatsapp-ai-agent… (datos en ${config.dataDir})`);

connect().catch((err) => {
  logger.error('Error fatal al conectar: ' + (err?.stack || err?.message || err));
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.info('Adiós 👋');
    process.exit(0);
  });
}
