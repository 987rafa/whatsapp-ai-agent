/** Carga automática de plugins: cada archivo en src/plugins exporta uno o varios. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from '../logger.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function loadPlugins() {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js') && f !== 'index.js');

  const registry = new Map();

  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(path.join(dir, file)).href);
      const plugins = Array.isArray(mod.default) ? mod.default : [mod.default];
      for (const plugin of plugins) {
        if (!plugin?.name || typeof plugin.run !== 'function') {
          logger.warn(`Plugin inválido en ${file} (necesita "name" y "run")`);
          continue;
        }
        registry.set(plugin.name.toLowerCase(), plugin);
        for (const alias of plugin.aliases || []) {
          registry.set(alias.toLowerCase(), plugin);
        }
      }
    } catch (err) {
      logger.warn(`No pude cargar el plugin ${file}: ${err.message}`);
    }
  }

  const names = [...new Set([...registry.values()].map((p) => p.name))];
  logger.info(`Plugins cargados: ${names.join(', ') || 'ninguno'}`);
  return registry;
}
