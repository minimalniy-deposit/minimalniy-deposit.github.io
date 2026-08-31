import site from '../data/site.json';

const RU_NOM = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const RU_PREP = ['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'];
const EN_MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const d = new Date(site.contentUpdated);
const dd = String(d.getDate()).padStart(2, '0');
const mm = String(d.getMonth() + 1).padStart(2, '0');
const yyyy = d.getFullYear();

export const updated = {
  iso: site.contentUpdated,
  dmy: `${dd}.${mm}.${yyyy}`,
  ruNom: `${RU_NOM[d.getMonth()]} ${yyyy}`,     // "август 2026"
  ruPrep: `${RU_PREP[d.getMonth()]} ${yyyy}`,   // "августе 2026"
  en: `${EN_MON[d.getMonth()]} ${yyyy}`,        // "August 2026"
};

/** The legacy home text hard-codes May 2026; swap only those date tokens. */
export function applyDates(html: string): string {
  return html
    .replace(/15\.05\.2026/g, updated.dmy)
    .replace(/в мае 2026/g, `в ${updated.ruPrep}`)
    .replace(/май 2026/g, updated.ruNom);
}
