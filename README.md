# minimalniy-deposit.github.io — Astro version

RU at `/`, EN at `/en/`. One data file → all pages.

```
src/data/casinos.json      ← единственный источник данных (10 карточек)
src/data/site.json         ← даты, Metrika, источник
src/content/home/*.html    ← текст главной 1-в-1 из старого index.html (не шаблонизируется)
src/i18n/{ru,en}.json      ← строки интерфейса
src/pages/                 ← / , /casino/[slug]/ , /methods/ , /methodology/ , /en/… , 404
.github/workflows/deploy.yml   ← сборка + деплой в Pages (withastro/action)
.github/workflows/verify.yml   ← понедельник 06:00 UTC: обновить lastVerified → коммит → деплой
scripts/textdiff.py        ← проверка, что видимый текст главной не изменился
```

## Локально
```
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/
python3 scripts/textdiff.py <старый index.html> dist/index.html
```

## Включить в репозитории
1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Actions → General → Workflow permissions: **Read and write** (нужно для verify.yml).
3. Яндекс.Вебмастер: sitemap теперь `/sitemap-index.xml`.

## Что сознательно не перенесено
- Скрипт click-redirect (любой клик → deal-streambest.com): ломает навигацию и фильтры.
