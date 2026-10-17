export default {
  name: 'clima',
  aliases: ['weather', 'tiempo'],
  description: 'Clima actual — ej: !clima Bogotá',
  run: async (ctx) => {
    const city = ctx.args.join(' ').trim();
    if (!city) return '🌦️ Dime una ciudad — ej: `!clima Medellín`';

    try {
      const format = encodeURIComponent('%l: %c %t (sensación %f) · 💧%h · 🌬️%w');
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=${format}&lang=${ctx.config.lang}`, {
        headers: { 'User-Agent': 'whatsapp-ai-agent' },
        signal: AbortSignal.timeout(15_000),
      });
      const text = (await res.text()).trim();

      if (!res.ok || !text || /unknown location|sorry, we|no matching/i.test(text)) {
        return `🔎 No encontré el clima para "${city}".`;
      }
      return `🌦️ ${text}`;
    } catch (err) {
      return `⚠️ El servicio de clima no respondió (${err.message}). Intenta de nuevo.`;
    }
  },
};
