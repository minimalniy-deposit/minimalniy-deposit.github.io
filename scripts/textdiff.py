"""Compare visible text of the legacy page and the built page. Exit 1 on any missing sentence."""
import re, sys, difflib

def visible(path):
    h = open(path, encoding='utf-8').read()
    b = h[h.find('<body'):]
    b = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', b, flags=re.S)
    b = re.sub(r'<!--.*?-->', ' ', b, flags=re.S)
    b = re.sub(r'<[^>]+>', ' ', b)
    b = b.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&quot;', '"')
    return re.sub(r'\s+', ' ', b).strip()

old = visible(sys.argv[1]); new = visible(sys.argv[2])
old_words = old.split(); new_words = new.split()
sm = difflib.SequenceMatcher(a=old_words, b=new_words, autojunk=False)
missing, added = [], []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag in ('delete', 'replace'): missing.append(' '.join(old_words[i1:i2]))
    if tag in ('insert', 'replace'): added.append(' '.join(new_words[j1:j2]))
print(f'old words: {len(old_words)}, new words: {len(new_words)}, ratio: {sm.ratio():.4f}')
print('MISSING from new page:'); [print('  -', m) for m in missing] or print('  (none)')
print('ADDED in new page:'); [print('  +', a) for a in added] or print('  (none)')
sys.exit(1 if missing else 0)
