"""Quality gate for CI: builds must keep the home text intact, links unbroken, data complete."""
import re, sys, json, subprocess, os
fail = []
# 1. home text: nothing from the legacy page may be missing except known allowed tokens (dates, numbers)
r = subprocess.run([sys.executable, 'scripts/textdiff.py', 'docs/legacy-index.html', 'dist/index.html'], capture_output=True, text=True)
missing = [l[4:] for l in r.stdout.splitlines() if l.startswith('  - ')]
ALLOWED = re.compile(r'^(май|мае|\d+|ТОП-10|топ-10|\d\d\.\d\d\.\d{4}|Подробнее|ВЫБОР №1|Обновлено: \d\d\.\d\d\.\d{4}|Источник данных:)$')  # dates, rank numbers, badge moved to #1, footer labels
bad = [m for m in missing if not ALLOWED.match(m)]
if bad: fail.append(f'home text lost: {bad[:10]}')
# 2. links
r = subprocess.run([sys.executable, 'scripts/linkgraph.py'], capture_output=True, text=True)
m = re.search(r'broken internal links: (\d+)', r.stdout)
if not m or int(m.group(1)) > 0: fail.append('broken internal links: ' + (m.group(1) if m else '?'))
orph = [l for l in r.stdout.splitlines() if re.search(r'\s[1-9]\d*$', l) and not l.startswith('group') and 'en/' not in l]
# orphans column is last; check any non-zero
for l in r.stdout.splitlines()[1:]:
    if not l.strip() or l.startswith('broken'): break
    parts = l.split()
    if len(parts) == 5 and parts[4] != '0' and parts[0] != 'preview': fail.append(f'orphan pages in {parts[0]}: {parts[4]}')  # /preview/ is an unlinked design draft
# 3. data
r = subprocess.run(['node', 'scripts/check-data.mjs'], capture_output=True, text=True)
if 'incomplete' in r.stdout: fail.append('casinos.json incomplete: ' + r.stdout.strip().splitlines()[0])
# 4. JSON-LD parses on key pages
for p in ['dist/index.html', 'dist/deposit/100/index.html', 'dist/methods/sbp/index.html', 'dist/fast-withdrawal/index.html', 'dist/casino/joycasino/index.html']:
    h = open(p, encoding='utf-8').read()
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try: json.loads(b)
        except Exception as e: fail.append(f'bad JSON-LD in {p}: {e}')
# 5. no leftover jargon on player pages
JARGON = re.compile(r'\bEV\b|математическ|банкролл|дисперси|журнал сверок|rel="nofollow sponsored"')
for p in ['dist/deposit/100/index.html', 'dist/deposit/500/index.html', 'dist/deposit/1000/index.html', 'dist/methods/sbp/index.html', 'dist/methods/crypto/index.html', 'dist/fast-withdrawal/index.html']:
    h = open(p, encoding='utf-8').read(); body = h[h.find('<div class="page-head">'):h.find('<footer')]
    body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
    if JARGON.search(body): fail.append(f'jargon on {p}: {JARGON.search(body).group(0)}')
print('\n'.join(f'FAIL: {f}' for f in fail) if fail else 'QA: ok')
sys.exit(1 if fail else 0)
