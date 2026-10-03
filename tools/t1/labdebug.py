import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from br import launch, BASE
with sync_playwright() as p:
    b = launch(p); pg = b.new_page(viewport={'width': 1280, 'height': 720}); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e) + ' ' + str(getattr(e, 'stack', ''))[:600])); pg.on('console', lambda m: logs.append(m.type + ': ' + m.text[:400]))
    pg.goto(BASE + (sys.argv[1] if len(sys.argv) > 1 else 'lab4_t1.html')); time.sleep(float(sys.argv[2]) if len(sys.argv) > 2 else 8)
    for l in logs[:20]: print(l)
    print(pg.evaluate("() => ({ lab: !!window.LAB, ready: window.LAB && window.LAB.ready })"))
    b.close()
