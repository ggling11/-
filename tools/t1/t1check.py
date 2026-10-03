# T1 (테마 0 화면 = 3단계 최종) · SL1 (빠른 테스트판 흐름) · T2 (테마 전환) 브라우저 점검 — python3 t1check.py OUTDIR [T1|SL1|T2 ...]
import sys, os, json
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from br import launch, open_page, RESET_FX
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
WANT = sys.argv[2:] or ['T1', 'SL1', 'T2']
res = {}
SC = [('warden_p1', {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 1, 'chars': ['rapier', 'great']}, 6.0),
      ('warden_tag', {'mode': 'tag', 'bots': ['tag'], 'seed': 9, 'boss': 1, 'chars': ['rapier', 'great']}, 9.0)]
SETUP = """([o, sec]) => { const P = window.PIPE; P.paused = true; window.__seedRand(777); P.setup(o); for (let t = 0; t < sec; t += 1/60) P.step(1/60, false); return true; }"""
with sync_playwright() as p:
    b = launch(p)
    if 'T1' in WANT:
        diffs = []
        for name, o, sec in SC:
            imgs = []
            for page, q in (('v5.html', ''), ('index.html', '?art=0')):
                pg = open_page(b, page, 1440, 810, q)
                pg.evaluate(SETUP, [o, sec]); pg.evaluate(RESET_FX); pg.evaluate("() => { window.PIPE.step(1/60, true); }")
                fn = f'{OUT}/T1_{name}_{page.split(".")[0]}.png'; pg.screenshot(path=fn); imgs.append(np.asarray(Image.open(fn).convert('RGB')).astype(np.float32))
                assert not pg.logs, pg.logs
                pg.close()
            d = float(np.abs(imgs[0] - imgs[1]).mean() / 255.0); diffs.append(d)
            print('T1', name, 'mean abs diff', round(d * 100, 4), '%', flush=True)
        res['T1'] = {'diffs': diffs, 'ok': max(diffs) <= 0.01}
    if 'SL1' in WANT:
        L = []
        pg = open_page(b, 'index.html', 1280, 720, '?art=0', L)
        st = []
        g = lambda: pg.evaluate("() => { const P = window.PIPE; return { state: P.Game.state, sel: P.Select.on, boss: P.Rush.idx, name: P.Rush.boss.name, chars: P.fighters.map(f => f.char), lo: P.fighters.map(f => f.loadout.join('+')), relic: P.Relics.open, tag: P.Game.tagMode, art: P.ART.cur }; }")
        run = lambda n: pg.evaluate(f"() => {{ const P = window.PIPE; for (let i = 0; i < {n}; i++) P.step(1/60, false); }}")
        run(40); st.append(('title', g()))
        pg.keyboard.press('KeyX'); run(3); st.append(('afterKey', g()))
        # 보스 처치 → 결과: 판정을 빨리 끝내려고 보스 체력만 낮춤 (테스트 전용 · 아래에서 재시작으로 되돌림)
        pg.evaluate("() => { const P = window.PIPE; for (let i = 0; i < 900 && P.Game.state === 'play'; i++) { if (i % 20 === 0 && P.AI.targetable()) { P.AI.hp = Math.min(P.AI.hp, 1); P.AI.hurt(5, 0, false, P.bossNow.pos.clone(), P.bossNow.pos.clone().set(1, 0, 0), null, P.fighters[0]); } P.step(1/60, false); } }")
        st.append(('afterKill', g()))
        run(60); pg.keyboard.press('KeyZ'); run(2); st.append(('early', g()))
        run(200); pg.keyboard.press('KeyZ'); run(3); st.append(('afterAnyKey', g()))
        # Esc 메뉴: PLAYERS 줄로 태그 솔로 / AI / 2인
        menu = pg.evaluate("""() => { const P = window.PIPE, M = P.Menu3, out = []; M.open(); const L = M.items(); const i = L.findIndex(x => x.k === 'PLAYERS');
            for (let k = 0; k < 3; k++) { L[i].set(1); out.push(M.playersLabel()); } const rows = M.items().map(x => x.k); M.close(); return { out, rows }; }""")
        st.append(('menu', menu)); menu_i = len(st) - 1
        ok = (st[0][1]['state'] == 'title' and st[1][1]['state'] == 'play' and not st[1][1]['sel'] and st[1][1]['boss'] == 1 and st[1][1]['chars'] == ['rapier', 'great']
              and st[1][1]['lo'] == ['thrust+spin', 'launch+smash'] and st[2][1]['state'] == 'won' and not st[2][1]['relic'] and st[3][1]['state'] == 'won' and st[4][1]['state'] == 'play' and st[4][1]['boss'] == 1
              and len(set(menu['out'])) == 3 and 'ART THEME' in menu['rows'] and menu['rows'].index('ART THEME') == menu['rows'].index('RENDER SCALE') + 1 and 'CHARACTER SELECT' not in menu['rows'])
        res['SL1'] = {'steps': st, 'errors': L, 'ok': ok and not L}
        print('SL1', json.dumps(res['SL1'], ensure_ascii=False)[:1500], flush=True)
        pg.close()
    if 'T2' in WANT:
        L = []
        pg = open_page(b, 'index.html', 1280, 720, '?art=1', L)
        r = pg.evaluate("""async () => { const P = window.PIPE, out = { boot: P.ART.cur }; P.paused = true;
            P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 5, boss: 1, chars: ['rapier', 'great'] }); for (let i = 0; i < 120; i++) P.step(1/60, false);
            const info = () => { const r = P.renderer; r.info.autoReset = false; r.info.reset(); P.step(1/60, true); return { calls: r.info.render.calls, tex: r.info.memory.textures, geo: r.info.memory.geometries, prog: (r.info.programs || []).length }; };
            out.t1a = info(); P.artSet(0); out.t0a = info();
            for (let k = 0; k < 3; k++) { P.artSet(1); info(); P.artSet(0); info(); }
            out.t0b = info(); P.artSet(1); out.t1b = info();
            const ev = new KeyboardEvent('keydown', { code: 'F9' }); dispatchEvent(ev); out.afterF9 = P.ART.cur; dispatchEvent(new KeyboardEvent('keydown', { code: 'F9' })); out.afterF9b = P.ART.cur;
            const M = P.Menu3; M.open(); const L = M.items(), i = L.findIndex(x => x.k === 'ART THEME'); L[i].set(1); out.menu1 = P.ART.cur; L[i].set(1); out.menu2 = P.ART.cur; M.close();
            P.paused = false; return out; }""")
        res['T2'] = {'r': r, 'errors': L}
        print('T2', json.dumps(res['T2']), flush=True)
        pg.close()
    b.close()
json.dump(res, open(f'{OUT}/t1check.json', 'w'), indent=1, ensure_ascii=False)
