#!/bin/bash
# build → serve → screenshots (desktop full, lightning frozen, mobile full)
cd "$(dirname "$0")/.." && npx astro build 2>&1 | grep -E "ERROR|page\(s\)"
pkill -f "http.server 4321" 2>/dev/null; (python3 -m http.server 4321 -d dist >/dev/null 2>&1 &); sleep 1
python3 scripts/shot.py http://localhost:4321/preview/ /tmp/g-desktop.png 1280 full
python3 scripts/shot.py http://localhost:4321/preview/ /tmp/g-flash.png 1280 flash
python3 scripts/shot.py http://localhost:4321/preview/ /tmp/g-mobile.png 390 full
python3 -c "from PIL import Image; im=Image.open('/tmp/g-mobile.png'); im.crop((0,0,390,1400)).resize((780,2800)).save('/tmp/g-mobile-top.png')"
echo shots-ok
