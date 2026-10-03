# 3단계 QTE 장면: 보스 2 · 3 · 4에서 QTE가 반쯤 깨진 순간 (합 봇) — python3 qte30.py OUTDIR
import json, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'qte30'
os.makedirs(OUT, exist_ok=True)
SC = [('Q2_shield_clash', 1, ['rapier', 'great']), ('Q3_bell_toll', 2, ['chain', 'shield']), ('Q4_ssireum', 3, ['twin', 'great']), ('Q2_tag', 1, ['rapier', 'great'])]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, boss, chars in SC:
        pg = b.new_page(viewport={'width': 1920, 'height': 1080}); logs = []
        pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
        tag = name.endswith('tag')
        r = pg.evaluate("""([boss, chars, tag]) => { const P = window.PIPE, Q = P.Qte3; P.paused = true;
          P.setup(tag ? { mode: 'tag', bots: ['tag'], seed: 7, boss, chars } : { mode: 'duo', bots: ['coop', 'coop'], seed: 7, boss, chars });
          for (let i = 0; i < 90; i++) P.step(1/60, false);
          P.Dk.each(() => { P.AI.state = 'idle'; P.AI.t = 999; P.AI.cur = null; }); P.Dk.jointCd = 0; P.AI.phase = 2;
          P.Dk.with(P.Dk.main(), () => Q.start());
          let g = 0; while (Q.on && Q.cells.filter(c => c.res).length < Math.ceil(Q.cells.length / 2) && g++ < 800) P.step(1/60, false);
          for (let i = 0; i < 10; i++) P.step(1/60, false);
          P.Game.bannerT = 0; P.Style.glitchT = 0; P.Style.monoT = 0; P.step(1/60, true);
          return { on: Q.on, cells: Q.cells.map(c => c.col[0] + (c.res ? c.res[0] : '.')).join(''), t: +Q.t.toFixed(2) }; }""", [boss, chars, tag])
        pg.screenshot(path=f'{OUT}/{name}.png', timeout=240000); print(name, json.dumps(r), logs[:2], flush=True); pg.close()
    b.close()
