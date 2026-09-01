"""Share of 8-word shingles a page has in common with another (rough near-duplicate check)."""
import re, sys
def text(p):
    h=open(p,encoding='utf-8').read(); b=h[h.find('<div class="page-head">'):h.find('<footer')]
    b=re.sub(r'<(script|style)[^>]*>.*?</\1>',' ',b,flags=re.S); b=re.sub(r'<[^>]+>',' ',b)
    return re.sub(r'\s+',' ',b).lower().split()
def sh(w,n=8): return {' '.join(w[i:i+n]) for i in range(len(w)-n+1)}
a=sh(text(sys.argv[1]))
for p in sys.argv[2:]:
    b=sh(text(p)); print(f'{p}: {len(b&a)/len(b):.0%} of its 8-word shingles also on {sys.argv[1]} ({len(b)} shingles)')
