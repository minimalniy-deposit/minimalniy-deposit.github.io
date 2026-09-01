import sys
from playwright.sync_api import sync_playwright
url, out, w = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 1280
mode = sys.argv[4] if len(sys.argv)>4 else 'full'   # full | flash | top
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':900}, device_scale_factor=1)
    pg.goto(url, wait_until='networkidle')
    if mode=='flash':  # freeze every bolt at its brightest moment (0.5% of its cycle)
        pg.add_style_tag(content='.bolt, .bolt *{animation-play-state:paused !important}')
        pg.evaluate("""() => { document.querySelectorAll('.bolt').forEach(s => { const d = parseFloat(getComputedStyle(s).animationDuration); const t = `-${(d*0.006).toFixed(3)}s`; s.style.animationDelay = t; s.querySelectorAll('path,ellipse').forEach(e => e.style.animationDelay = t); }); }""")
    pg.wait_for_timeout(800)
    if mode=='top': pg.screenshot(path=out, clip={'x':0,'y':0,'width':w,'height':900})
    else: pg.screenshot(path=out, full_page=(mode!='flash'), clip=None if mode!='flash' else {'x':0,'y':0,'width':w,'height':900})
    b.close()
