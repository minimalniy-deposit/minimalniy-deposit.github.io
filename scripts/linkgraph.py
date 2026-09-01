"""Internal link graph of dist/: inbound counts, orphans, click depth from /, broken internal links."""
import re, os, sys
from collections import defaultdict, deque
D='dist'; pages={}
for root,_,fs in os.walk(D):
    for f in fs:
        if f=='index.html':
            url='/'+os.path.relpath(root,D).replace(os.sep,'/')+'/'; url=url.replace('/./','/')
            if url=='/.' or url=='//': url='/'
            pages[url]=open(os.path.join(root,f),encoding='utf-8').read()
pages={('/' if k in ('/./','/.','//') else k):v for k,v in pages.items()}
def body(h):
    i=h.find('<body'); return h[i:]
out=defaultdict(set)
for u,h in pages.items():
    for href in re.findall(r'href="(/[^"#?]*)',body(h)):
        if not href.endswith('/'): continue
        if href in pages: out[u].add(href)
inb=defaultdict(set)
for u,ts in out.items():
    for t in ts: inb[t].add(u)
# depth by BFS from home
depth={'/':0}; q=deque(['/'])
while q:
    u=q.popleft()
    for t in out[u]:
        if t not in depth: depth[t]=depth[u]+1; q.append(t)
def grp(u):
    if u=='/': return 'home'
    seg=u.strip('/').split('/')
    if seg[0]=='en': return 'en/'+(seg[1] if len(seg)>1 else 'home')
    if seg[0] in ('slots','casino','deposit','methods') and len(seg)>1: return seg[0]+'/*'
    return seg[0]
stats=defaultdict(lambda:[0,0,0,[]])
for u in pages:
    g=grp(u); s=stats[g]; s[0]+=1; s[1]+=len(inb[u]); s[2]=max(s[2],depth.get(u,99)); 
    if len(inb[u])==0: s[3].append(u)
print(f"{'group':14} pages  avg-inbound  max-depth  orphans")
for g,s in sorted(stats.items()):
    print(f"{g:14} {s[0]:5}  {s[1]/s[0]:11.1f}  {s[2]:9}  {len(s[3])}")
focus=['/fast-withdrawal/','/deposit/100/','/deposit/500/','/deposit/1000/','/methods/sbp/','/methods/card/','/methods/crypto/','/methods/','/glossary/','/methodology/','/slots/']
print(); [print(f"{u:20} inbound {len(inb[u]):3}  depth {depth.get(u,'-')}  from: {', '.join(sorted({grp(x) for x in inb[u]}))}") for u in focus]
# broken internal hrefs
broken=set()
for u,h in pages.items():
    for href in re.findall(r'href="(/[^"#?]*/)"',body(h)):
        if href not in pages and not href.startswith('/slots/img/') and not href.startswith('/img/'): broken.add((u,href))
print('\nbroken internal links:', len(broken), list(broken)[:5])
