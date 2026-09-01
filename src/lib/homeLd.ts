/** JSON-LD for the home page: one entity per section, each with its own @id anchored to the section,
 *  all built from the same data the DOM is rendered from (so markup and page never disagree). */
import { casinos } from './casinos';
import methods from '../data/methods.json';
import faq from '../data/faq.json';
import site from '../data/site.json';
import { updated } from './dates';
import howtoHtml from '../content/home/howto.html?raw';

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const ROOT = `https://${site.domain}/`;

const howtoTitle = strip((howtoHtml.match(/<h2[^>]*>(.*?)<\/h2>/s) ?? [,''])[1]);
const howtoSub = strip((howtoHtml.match(/<p class="section-sub">(.*?)<\/p>/s) ?? [,''])[1]);
const criteria = [...howtoHtml.matchAll(/<div class="criteria-title">(.*?)<\/div>\s*<div class="criteria-text">(.*?)<\/div>/gs)]
  .map((m) => ({ name: strip(m[1]), text: strip(m[2]) }));

export function homeLd(title: string, description: string) {
  const rating = {
    '@context': 'https://schema.org', '@type': 'ItemList', '@id': ROOT + '#rating',
    name: `ТОП-${casinos.length} казино с минимальным депозитом ${updated.iso.slice(0, 4)}`, url: ROOT + '#rating',
    numberOfItems: casinos.length, itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: casinos.map((c) => ({ '@type': 'ListItem', position: c.rank, name: c.name, url: c.url, item: { '@type': 'Organization', name: c.name, url: c.url } })),
  };
  const methodsLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', '@id': ROOT + '#methods',
    name: 'Методы пополнения и вывода', url: ROOT + '#methods', numberOfItems: methods.length,
    itemListElement: methods.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.name, description: `${strip(m.desc)} ${strip(m.speed)}` })),
  };
  const howto = {
    '@context': 'https://schema.org', '@type': 'HowTo', '@id': ROOT + '#howto',
    name: howtoTitle, description: howtoSub, url: ROOT + '#howto',
    step: criteria.map((c, i) => ({ '@type': 'HowToStep', position: i + 1, name: c.name, text: c.text, url: ROOT + '#howto' })),
  };
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage', '@id': ROOT + '#faq', url: ROOT + '#faq',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: strip(f.q), acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } })),
  };
  const page = {
    '@context': 'https://schema.org', '@type': 'WebPage', '@id': ROOT + '#webpage',
    name: title, url: ROOT, description, inLanguage: 'ru', dateModified: updated.iso,
    isPartOf: { '@type': 'WebSite', '@id': ROOT + '#website', name: 'МинДеп.рейтинг', url: ROOT },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Главная', item: ROOT }] },
    mainEntity: { '@id': ROOT + '#rating' },
    hasPart: [{ '@id': ROOT + '#rating' }, { '@id': ROOT + '#methods' }, { '@id': ROOT + '#howto' }, { '@id': ROOT + '#faq' }],
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.intro-text p'] },
  };
  return [page, rating, methodsLd, howto, faqLd];
}
