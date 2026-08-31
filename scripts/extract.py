"""One-off: extract data and verbatim text blocks from the legacy index.html."""
import re, json, os, html as H

SRC = '/home/claude/site/index.html'
OUT = '/home/claude/mindep/src'
h = open(SRC, encoding='utf-8').read()
body = h[h.find('<body'):]

def slugify(name):
    s = name.lower().replace(' casino', '').strip()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

# ---------- casinos ----------
cards = re.findall(r'<div class="casino-card( top)?" data-deposit="(\d+)">(.*?)\n      </div>\n', body, re.S)
casinos = []
for top, dep, c in cards:
    g = lambda p: (re.search(p, c, re.S) or [None, None])[1]
    name = g(r'<span class="casino-name">(.*?)</span>')
    badges = re.findall(r'<span class="card-badge (badge-\w+)">(.*?)</span>', c)
    pills = re.findall(r'<span class="pill(?: (\w+))?">(.*?)</span>', c)
    ctas = re.findall(r'<span class="cta-min">(.*?)</span>', c)
    promo = g(r'<span class="promo-tag">(.*?)</span>')
    bonus = g(r'<div class="card-bonus">(.*?)</div>')
    casinos.append({
        'slug': slugify(name),
        'name': name,
        'rank': int(g(r'<div class="card-rank[^"]*">(\d+)</div>')),
        'top': bool(top),
        'gold': 'gold-rank' in c,
        'minDeposit': int(dep),
        'rating': float(g(r'<span class="rating-num">(.*?)</span>')),
        'stars': g(r'<span class="stars">(.*?)</span>'),
        'ratingCnt': g(r'<span class="rating-cnt">(.*?)</span>'),
        'badges': [{'cls': b, 'text': t} for b, t in badges],
        'pills': [{'cls': cls or '', 'text': t} for cls, t in pills],
        'bonus': bonus,
        'url': g(r'<a href="([^"]+)" rel="nofollow sponsored"'),
        'ctaLines': ctas,
        'promo': promo,
    })
assert len(casinos) == 10, len(casinos)
json.dump(casinos, open(f'{OUT}/data/casinos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- FAQ ----------
faq = re.findall(r'<button class="faq-q" onclick="toggleFaq\(this\)">\s*(.*?)\s*<span class="faq-arrow">.*?<div class="faq-a-inner">\s*(.*?)\s*</div>', body, re.S)
json.dump([{'q': q.strip(), 'a': a.strip()} for q, a in faq], open(f'{OUT}/data/faq.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- payment methods ----------
methods = re.findall(r'<div class="method-card">\s*<div class="method-icon">(.*?)</div>\s*<div class="method-name">(.*?)</div>\s*<div class="method-desc">(.*?)</div>\s*<span class="method-speed">(.*?)</span>', body, re.S)
json.dump([{'icon': i, 'name': n, 'desc': d, 'speed': s} for i, n, d, s in methods], open(f'{OUT}/data/methods.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- verbatim HTML blocks (text must not change) ----------
def block(start_marker, end_marker, name):
    i = body.find(start_marker); j = body.find(end_marker, i)
    assert i > -1 and j > -1, name
    frag = body[i + len(start_marker):j]
    open(f'{OUT}/content/home/{name}.html', 'w', encoding='utf-8').write(frag.strip() + '\n')
    return frag

os.makedirs(f'{OUT}/content/home', exist_ok=True)
block('<!-- Intro LSI-text -->', '<h2 class="section-title">Рейтинг', 'intro')
block('<!-- /casino-grid -->', '\n  </div>\n</section>\n\n<!-- TEXT BLOCK', 'other-casinos')
block('<!-- TEXT BLOCK: ЧТО ТАКОЕ', '<!-- PAYMENT METHODS -->', 'what-is')
# methods section trailing text (limits)
seg = body[body.find('<!-- PAYMENT METHODS -->'):body.find('<section id="howto">')]
i = seg.find('<div class="text-block"'); j = seg.rfind('</div>\n  </div>\n</section>')
open(f'{OUT}/content/home/limits.html', 'w', encoding='utf-8').write(seg[i:j+6].strip() + '\n')
block('<section id="howto">', '</section>\n\n<!-- PROS', 'howto') if '<!-- PROS' in body else None
# generic: grab sections by index for howto, pros/cons, slots+bonuses, tips
secs = re.findall(r'(<section[^>]*>.*?</section>)', body, re.S)
names = {}
for s in secs:
    if 'id="howto"' in s: names['howto'] = s
    elif 'Плюсы и минусы' in s: names['pros-cons'] = s
    elif 'Игровые автоматы с минимальным' in s: names['slots-bonuses'] = s
    elif 'Полезные советы' in s: names['tips'] = s
for k, s in names.items():
    inner = re.search(r'<div class="container">(.*)</div>\s*</section>', s, re.S).group(1)
    open(f'{OUT}/content/home/{k}.html', 'w', encoding='utf-8').write(inner.strip() + '\n')

# hero + section subtitles + disclaimer for reuse
hero = re.search(r'<section class="hero">\s*<div class="container">(.*?)</div>\s*</section>', body, re.S).group(1)
open(f'{OUT}/content/home/hero.html', 'w', encoding='utf-8').write(hero.strip() + '\n')
disc = re.search(r'<div class="disclaimer">(.*?)</div>', body, re.S).group(1).strip()
subs = dict(
    ratingTitle=re.search(r'<h2 class="section-title">(Рейтинг.*?)</h2>', body).group(1),
    ratingSub=re.search(r'<p class="section-sub">(Лучшие онлайн.*?)</p>', body).group(1),
    methodsTitle='Методы пополнения и вывода',
    methodsSub=re.search(r'<p class="section-sub">(Казино с пополнением с карты.*?)</p>', body).group(1),
    faqTitle=re.search(r'<h2 class="section-title">(Частые вопросы.*?)</h2>', body).group(1),
    faqSub=(re.search(r'faqTitle', 'x') and None),
    disclaimer=disc,
    filtersLabel='Фильтр по минимальному депозиту:',
)
m = re.search(r'<section id="faq".*?<p class="section-sub">(.*?)</p>', body, re.S)
subs['faqSub'] = m.group(1) if m else ''
m = re.search(r'<section id="howto".*?<p class="section-sub">(.*?)</p>', body, re.S)
subs['howtoSub'] = m.group(1) if m else ''
json.dump(subs, open(f'{OUT}/data/home-strings.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- JSON-LD from head (reuse verbatim) ----------
lds = re.findall(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', h, re.S)
os.makedirs(f'{OUT}/data/ld', exist_ok=True)
for ld in lds:
    d = json.loads(ld)
    json.dump(d, open(f"{OUT}/data/ld/{d['@type'].lower()}.json", 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- CSS ----------
css = re.search(r'<style>(.*?)</style>', h, re.S).group(1)
os.makedirs(f'{OUT}/styles', exist_ok=True)
open(f'{OUT}/styles/legacy.css', 'w', encoding='utf-8').write(css.strip() + '\n')
print('ok', len(casinos), 'casinos', len(faq), 'faq', len(methods), 'methods', len(lds), 'ld blocks', sorted(names))
