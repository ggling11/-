# 랩 장면 캡처: python3 labshot.py OUTDIR [장면...] (기본 4장: wide close finisher hud) · 1920×1080
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from br import launch, BASE
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
SC = sys.argv[2:] or ['wide', 'close', 'finisher', 'hud']
W, H = int(os.environ.get('LW', 1920)), int(os.environ.get('LH', 1080))
res = {}
with sync_playwright() as p:
    b = launch(p); pg = b.new_page(viewport={'width': W, 'height': H}); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e))); pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.goto(BASE + 'lab4_t1.html'); pg.wait_for_function('window.LAB && window.LAB.ready', timeout=120000)
    for s in SC:
        t0 = time.time(); info = pg.evaluate(f"() => window.LAB.scene('{s}')"); pg.screenshot(path=f'{OUT}/{s}.png'); res[s] = {'info': info, 'ms': round((time.time() - t0) * 1000)}
        print(s, json.dumps(res[s]), flush=True)
    res['logs'] = logs[:20]; print('logs', logs[:10]); b.close()
json.dump(res, open(f'{OUT}/labshot.json', 'w'), indent=1)
