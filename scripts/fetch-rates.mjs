// Daily: official USD rate (Bank of Russia) + market USDT/BTC in roubles → src/data/rates.json
// and one line per day in src/data/rates-history.jsonl (append-only).
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
const out = new URL('../src/data/rates.json', import.meta.url);
const hist = new URL('../src/data/rates-history.jsonl', import.meta.url);
const today = new Date().toISOString().slice(0, 10);
const UA = { 'User-Agent': 'minimalniy-deposit-rates/1.0' };

async function cbrUsd() {
  // Mirror in UTF-8 JSON first, official XML (cp1251) as fallback.
  try {
    const j = await (await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { headers: UA })).json();
    return { usd: j.Valute.USD.Value, eur: j.Valute.EUR.Value, date: j.Date.slice(0, 10), source: 'ЦБ РФ (cbr-xml-daily.ru)' };
  } catch (e) {
    const buf = Buffer.from(await (await fetch('https://www.cbr.ru/scripts/XML_daily.asp', { headers: UA })).arrayBuffer());
    const xml = new TextDecoder('windows-1251').decode(buf);
    const val = (code) => parseFloat(xml.match(new RegExp(`<CharCode>${code}</CharCode>[\\s\\S]*?<Value>([\\d,]+)</Value>`))[1].replace(',', '.'));
    return { usd: val('USD'), eur: val('EUR'), date: (xml.match(/Date="(\d\d)\.(\d\d)\.(\d{4})"/) || []).slice(1).reverse().join('-'), source: 'ЦБ РФ (cbr.ru)' };
  }
}
async function market() {
  const key = process.env.COINGECKO_API_KEY;
  const h = key ? { ...UA, 'x-cg-demo-api-key': key } : UA;
  const j = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin&vs_currencies=rub,usd', { headers: h })).json();
  return { usdt: j.tether.rub, btc: j.bitcoin.rub, usdtUsd: j.tether.usd, source: 'CoinGecko' };
}

const [c, m] = await Promise.all([cbrUsd(), market()]);
const rates = { date: today, cbrDate: c.date, usd: c.usd, eur: c.eur, usdt: m.usdt, btc: m.btc, sources: [c.source, m.source] };
const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
if (prev.date === today && prev.usd === rates.usd && prev.usdt === rates.usdt) { console.log('rates unchanged today'); process.exit(0); }
writeFileSync(out, JSON.stringify(rates, null, 2) + '\n');
const line = JSON.stringify({ date: today, usd: c.usd, usdt: m.usdt, btc: m.btc });
const lines = existsSync(hist) ? readFileSync(hist, 'utf8').trim().split('\n').filter(Boolean) : [];
if (!lines.some((l) => l.startsWith(`{"date":"${today}"`))) appendFileSync(hist, line + '\n');
console.log('rates ->', rates);
