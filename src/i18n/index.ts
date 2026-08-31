import ru from './ru.json';
import en from './en.json';

export type Locale = 'ru' | 'en';
export const locales: Locale[] = ['ru', 'en'];
export const defaultLocale: Locale = 'ru';
const dict = { ru, en } as const;

export type Dict = typeof ru;

export function useT(locale: Locale): Dict {
  return dict[locale] as Dict;
}

/** Interpolate {name}-style placeholders. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** Path for a given locale. `path` is locale-less and starts with '/'. */
export function localePath(locale: Locale, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return locale === defaultLocale ? p : `/${locale}${p}`;
}

/** hreflang alternates for a locale-less path. */
export function alternates(path: string) {
  return [
    ...locales.map((l) => ({ hreflang: l, href: localePath(l, path) })),
    { hreflang: 'x-default', href: localePath(defaultLocale, path) },
  ];
}

export function otherLocale(l: Locale): Locale {
  return l === 'ru' ? 'en' : 'ru';
}

export function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₽';
}
