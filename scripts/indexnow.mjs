// Ping IndexNow (shared endpoint: Yandex, Bing, Seznam...) with the core URLs
// after each successful deploy. Slots are staged manually, wave by wave.
const HOST = 'minimalniy-deposit.github.io';
const KEY = '4eb597bf18bf878bf8c762bc58358bdd';
const urls = [];
for (const seg of ['core-ru', 'core-en']) {
  const xml = await (await fetch(`https://${HOST}/sitemap-${seg}.xml`)).text();
  urls.push(...[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]));
}
const body = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(0, 200) };
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body),
});
console.log('IndexNow:', r.status, 'urls:', body.urlList.length);
