# 3단계 화면 점검: 시작 화면 · 메뉴(메인 · 조작키 3탭 · 패드) · 선택 화면 — python3 ui30.py OUTDIR
import json, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1440, 'height': 810}); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    def shot(name, js):
        info = pg.evaluate("() => { const P = window.PIPE; P.paused = true; const r = P.renderer; " + js + "; r.info.autoReset = false; r.info.reset(); P.step(1/60, true); return { calls: r.info.render.calls, state: P.Game.state, menu: P.Menu3 ? P.Menu3.on : null }; }")
        pg.screenshot(path=f'{OUT}/{name}.png', timeout=240000); res[name] = info; print(name, json.dumps(info), flush=True)
    shot('U1_title', "for (let i = 0; i < 60; i++) P.step(1/60, false)")
    shot('U2_menu_title', "P.Menu3.open(); P.step(1/60, false)")
    shot('U3_menu_keys', "P.Menu3.page = 'keys'; P.Menu3.tab = 0")
    shot('U4_menu_keys2p', "P.Menu3.tab = 1")
    shot('U5_menu_pad', "P.Menu3.page = 'pad'")
    shot('U6_select', "P.Menu3.close(); P.Title3.tap = true; for (let i = 0; i < 60; i++) P.step(1/60, false)")
    shot('U7_fight_menu', "P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 4 }); for (let i = 0; i < 300; i++) P.step(1/60, false); P.Menu3.open(); P.Menu3.cur = 4")
    shot('U8_tagsolo', "P.Menu3.close(); P.setup({ mode: 'tag', bots: [null], seed: 4 }); for (let i = 0; i < 200; i++) P.step(1/60, false); P.keys.add('Enter'); for (let i = 0; i < 20; i++) P.step(1/60, false)")
    print('errors', logs[:4])
    json.dump({'res': res, 'errors': logs}, open(f'{OUT}/ui30.json', 'w'), indent=1)
    b.close()
