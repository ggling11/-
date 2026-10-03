# 3단계 아트 점검 스크린샷: 보스마다 싸움 장면 (헤드리스 Chromium · SwiftShader) — python3 shot30.py OUTDIR [W H]
import json, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'shots30'
VW = int(sys.argv[2]) if len(sys.argv) > 2 else 1440
VH = int(sys.argv[3]) if len(sys.argv) > 3 else 810
os.makedirs(OUT, exist_ok=True)
SCENES = [
  ('B1_colossus', {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 0}, 7.0),
  ('B2_warden',   {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 1, 'chars': ['chain', 'shield']}, 7.0),
  ('B3_bell',     {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 2, 'chars': ['twin', 'great']}, 7.0),
  ('B4_dokkaebi', {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 3, 'chars': ['rapier', 'shield']}, 6.0),
]
only = os.environ.get('ONLY')
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, setup, sec in SCENES:
        if only and only not in name: continue
        pg = b.new_page(viewport={'width': VW, 'height': VH}); logs = []
        pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
        pg.goto('http://127.0.0.1:8766/' + os.environ.get('PAGE', 'index.html')); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
        info = pg.evaluate("""([o, sec]) => { const P = window.PIPE; P.paused = true; P.setup(o);
          for (let t = 0; t < sec; t += 1/60) P.step(1/60, false);
          P.Game.bannerT = 0; if (P.Style) { P.Style.glitchT = 0; P.Style.monoT = 0; } const r = P.renderer; r.info.autoReset = false; r.info.reset(); P.step(1/60, true);
          return { calls: r.info.render.calls, state: P.AI.state }; }""", [setup, sec])
        pg.screenshot(path=f'{OUT}/{name}.png', timeout=240000)
        res[name] = {'info': info, 'errors': logs[:4]}
        print(name, json.dumps(res[name]), flush=True)
        pg.close()
    b.close()
if not only: json.dump(res, open(f'{OUT}/shots.json', 'w'), indent=1)
