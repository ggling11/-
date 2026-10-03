# 3단계 아트: 정지 장면(봇 없음) — python3 shot30b.py OUT boss chars... (카메라 · 색 점검용)
import json, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; boss = int(sys.argv[2]); chars = sys.argv[3].split(',') if len(sys.argv) > 3 else ['rapier', 'great']
VW, VH = 1440, 810
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': VW, 'height': VH}); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    info = pg.evaluate("""([b, cs]) => { const P = window.PIPE; P.paused = true; P.setup({ mode: 'duo', bots: [null, null], seed: 3, boss: b, chars: cs });
      P.Companion.think = () => {};
      for (let t = 0; t < 3.0; t += 1/60) P.step(1/60, false);
      P.AI.state = 'idle'; P.AI.t = 99;
      const F = P.fighters; F[0].ch.place(-1.6, 2.4, 2.6); F[1].ch.place(1.8, 2.0, 3.4);
      for (let t = 0; t < 0.5; t += 1/60) P.step(1/60, false);
      P.Game.bannerT = 0; P.Style.glitchT = 0; const r = P.renderer; r.info.autoReset = false; r.info.reset(); P.step(1/60, true);
      return { calls: r.info.render.calls, zoom: P.CamRig.zoom, wpp: P.Pipe.wpp }; }""", [boss, chars])
    pg.screenshot(path=OUT)
    print(json.dumps(info), logs[:3])
    b.close()
