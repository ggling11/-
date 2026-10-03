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
    for SLQ in [q for q in (('SL1', '?art=0'), ('SL1A', '?art=1')) if q[0] in WANT]:
        L = []
        pg = open_page(b, 'index.html', 1280, 720, SLQ[1], L)
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
        res[SLQ[0]] = {'steps': st, 'errors': L, 'ok': ok and not L and all(x[1].get('art', 0) == (1 if SLQ[1] == '?art=1' else 0) for x in st[:5])}
        print(SLQ[0], json.dumps(res[SLQ[0]], ensure_ascii=False)[:1500], flush=True)
        pg.close()
    if 'T2' in WANT:
        L = []
        pg = open_page(b, 'index.html', 1280, 720, '?art=1', L)
        r = pg.evaluate("""async () => { const P = window.PIPE, out = { boot: P.ART.cur }; P.paused = true;
            P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 5, boss: 1, chars: ['rapier', 'great'] }); for (let i = 0; i < 120; i++) P.step(1/60, false);
            const info = () => { const r = P.renderer; r.info.autoReset = false; r.info.reset(); P.step(1/60, true); return { calls: r.info.render.calls, tex: r.info.memory.textures, geo: r.info.memory.geometries, prog: (r.info.programs || []).length }; };
            out.t1a = info(); P.artSet(0); out.t0a = info(); P.artSet(1); out.t1x = info(); P.artSet(0); info();
            for (let k = 0; k < 3; k++) { P.artSet(1); info(); P.artSet(0); info(); }
            out.t0b = info(); P.artSet(1); out.t1b = info();
            const ev = new KeyboardEvent('keydown', { code: 'F9' }); dispatchEvent(ev); out.afterF9 = P.ART.cur; dispatchEvent(new KeyboardEvent('keydown', { code: 'F9' })); out.afterF9b = P.ART.cur;
            const M = P.Menu3; M.open(); const L = M.items(), i = L.findIndex(x => x.k === 'ART THEME'); L[i].set(1); out.menu1 = P.ART.cur; L[i].set(1); out.menu2 = P.ART.cur; M.close();
            P.paused = false; return out; }""")
        same = lambda a, c: a['calls'] == c['calls'] and a['tex'] == c['tex'] and a['geo'] == c['geo']
        res['T2'] = {'r': r, 'errors': L, 'ok': r['boot'] == 1 and same(r['t0a'], r['t0b']) and all(r['t1b'][k] <= r['t1x'][k] for k in ('calls', 'tex', 'geo', 'prog')) and r['afterF9'] == 0 and r['afterF9b'] == 1 and r['menu1'] != r['menu2'] and not L}
        print('T2', json.dumps(res['T2']), flush=True)
        pg.close()

    # ---------------------------------------------------------------- R4 · U2 · E1: 화면 5개 + 메뉴 모든 쪽 + 패배 · 태그 · 기술명을 지나며 그린 글자 전부 기록 → 글꼴 서브셋 글리프 검사 · 2P 키 · 콘솔 에러
    HOOK = None
    if True:
        HOOK = """() => { window.__txt = []; const C = CanvasRenderingContext2D.prototype; for (const k of ['fillText', 'strokeText']) { const o = C[k]; C[k] = function (s, ...a) { if (window.__t1on) window.__txt.push([String(s), this.font]); return o.call(this, s, ...a); }; }
          const H = window.PIPE.t1Hud, g = H.game; H.game = function () { window.__t1on = true; try { return g.apply(this, arguments); } finally { window.__t1on = false; } }; }"""
    if 'R4' in WANT:
        SCN = r"""async ([name]) => { const P = window.PIPE, AI = P.AI; P.paused = true; window.__seedRand(4242);
          const run = s => { for (let i = 0; i < Math.round(s * 60); i++) P.step(1 / 60, false); };
          const shot = () => { P.step(1 / 60, true); };
          const setup = (o) => P.setup(Object.assign({ mode: 'duo', bots: ['coop', 'coop'], seed: 5, boss: 1, chars: ['rapier', 'great'] }, o || {}));
          if (name === 'title') { P.Title3.open(); run(0.5); shot(); P.Menu3.open(); shot(); P.Menu3.close(); }
          if (name === 'battle') { setup(); run(5); shot(); for (let i = 0; i < 40; i++) { run(0.5); shot(); } }
          if (name === 'human') { setup({ bots: [null, null] }); P.UI.keys2P = false; run(3); shot(); P.fighters[1].hp = 0; P.fighters[1].down && P.fighters[1].down(); run(0.5); shot(); }
          if (name === 'tag') { setup({ mode: 'tag', bots: ['tag'] }); run(4); shot(); for (let i = 0; i < 10; i++) { run(0.5); shot(); } }
          if (name === 'fin') { setup({ seed: 7 }); for (let i = 0; i < 90 * 60; i++) { P.step(1 / 60, false); if (P.Game.techName && P.Game.techName.t > 0) { shot(); } if (i % 600 === 0) shot(); } }
          if (name === 'menu') { setup(); run(2); const M = P.Menu3; M.open(); shot(); const L = M.items(); for (let i = 0; i < L.length; i++) { M.cur = i; shot(); }
            M.page = 'keys'; shot(); M.page = 'pad'; shot(); M.page = 'main'; M.close(); }
          if (name === 'qte') { P.setup({ mode: 'duo', bots: [null, null], seed: 401, boss: 1, chars: ['rapier', 'great'] }); AI.state = 'idle'; AI.t = 999; AI.cur = null; run(0.3); AI.phase = 2; const Q = P.Qte3;
            P.Dk.with(P.Dk.main(), () => { if (Q.can(1)) Q.start(); }); for (const f of P.fighters) f.bot = { inp: new P.BotInput(), mode: 'coop' }; for (let i = 0; i < 12; i++) { run(0.25); shot(); } }
          if (name === 'won') { setup(); run(2); P.Game.win(); for (let i = 0; i < 8; i++) { run(0.5); shot(); } }
          if (name === 'lost') { setup(); run(2); P.Game.lose(); for (let i = 0; i < 8; i++) { run(0.5); shot(); } }
          if (name === 'card') { setup({ seed: 11 }); run(3); if (P.AI.startTransform) { P.AI.state = 'idle'; P.AI.startTransform(2); } for (let i = 0; i < 12; i++) { run(0.25); shot(); } }
          const k1 = P.keyNames(P.fighters[0]), k2 = P.keyNames(P.fighters[1]); return { k1, k2 }; }"""
        L = []; strings = []; keys = None
        for (w, h) in ((1366, 768), (1920, 1080), (2560, 1440)):
            pg = open_page(b, 'index.html', w, h, '?art=1', L); pg.evaluate(HOOK)
            for nm in ['title', 'battle', 'human', 'tag', 'fin', 'menu', 'qte', 'won', 'lost', 'card']:
                kk = pg.evaluate(SCN, [nm])
                if nm == 'human': keys = kk
                if nm in ('title', 'battle', 'qte', 'menu', 'won'): pg.screenshot(path=f'{OUT}/R4_{w}x{h}_{nm}.png')
            strings += pg.evaluate("() => window.__txt"); pg.close()
        res['R4_strings'] = sorted(set(map(tuple, strings)))
        res['R4_keys'] = keys; res['E1_errors'] = L
        print('R4 strings', len(res['R4_strings']), 'errors', L[:5], flush=True)
    if 'P2' in WANT:   # 자동 품질: 가짜 느린 프레임(60ms) → 3단계 Perf3가 단계를 내림 → 테마 렌더 크기 · 외곽선 방향 수가 따라감
        L = []; pg = open_page(b, 'index.html', 1920, 1080, '?art=1', L)
        r = pg.evaluate("""() => { const P = window.PIPE; P.paused = true; P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 5, boss: 1, chars: ['rapier', 'great'] });
          for (let i = 0; i < 60; i++) P.step(1 / 60, false); P.step(1 / 60, true);
          const snap = () => ({ lv: P.Perf3.level, w: P.t1.R.w, h: P.t1.R.h, dirs: P.t1.R.qDirs, boil: P.t1.R.qBoil, calls: P.renderer.info.render.calls });
          const a = snap(); for (let i = 0; i < 900; i++) P.Perf3.tick(60); P.step(1 / 60, true); const b = snap();
          return { a, b, changes: P.Perf3.changes }; }""")
        res['P2'] = {'r': r, 'errors': L, 'ok': r['b']['lv'] > r['a']['lv'] and r['b']['w'] < r['a']['w'] and r['b']['dirs'] <= r['a']['dirs'] and not L}
        print('P2', json.dumps(res['P2']), flush=True); pg.close()
    if 'R2' in WANT:   # 예고 장판 ↔ 바닥 밝기 차: 예고가 뜬 순간을 장판 거울 켠 채 / 끈 채 두 번 그려 바뀐 픽셀만 비교 (Oklab L)
        L = []; pg = open_page(b, 'index.html', 1920, 1080, '?art=1', L)
        info = pg.evaluate("""() => { const P = window.PIPE, AI = P.AI; P.paused = true; window.__seedRand(4242); P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 9, boss: 1, chars: ['rapier', 'great'] });
          for (let i = 0; i < 90; i++) P.step(1 / 60, false); for (let i = 0; i < 40 * 60; i++) { P.step(1 / 60, false); if (AI.tele && AI.tele.length && AI.cur !== 'qte') break; }
          P.t1SetHud(false); P.step(1 / 60, true); return { cur: AI.cur, n: AI.tele.length }; }""")
        pg.screenshot(path=f'{OUT}/R2_with.png')
        pg.evaluate("() => { const S = window.PIPE.t1; for (const [d, m] of S.mirrors) m.visible = false; S.FX.group.visible = false; S.R.render(0, null); }")
        pg.screenshot(path=f'{OUT}/R2_without.png')
        pg.evaluate("() => { const S = window.PIPE.t1; S.FX.group.visible = false; for (const [d, m] of S.mirrors) m.visible = true; S.R.render(0, null); }")
        pg.screenshot(path=f'{OUT}/R2_with2.png')
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from r123 import oklab
        A = np.asarray(Image.open(f'{OUT}/R2_with2.png').convert('RGB')).astype(float); B = np.asarray(Image.open(f'{OUT}/R2_without.png').convert('RGB')).astype(float)
        mask = np.abs(A - B).sum(-1) > 40; LA = oklab(A[mask])[:, 0]; LB = oklab(B[mask])[:, 0]
        ink = LA[LA <= np.percentile(LA, 50)] if LA.size else LA
        r = {'tele': info, 'px': int(mask.sum()), 'L_floor': round(float(LB.mean()), 3) if LB.size else None, 'L_tele_mean': round(float(LA.mean()), 3) if LA.size else None,
             'L_tele_dark': round(float(ink.mean()), 3) if ink.size else None}
        print('R2 debug', info, int(mask.sum()), flush=True)
        r['dL_mean'] = round(r['L_floor'] - r['L_tele_mean'], 3) if LA.size else 0; r['dL_dark'] = round(r['L_floor'] - r['L_tele_dark'], 3) if LA.size else 0
        res['R2'] = {'r': r, 'errors': L, 'ok': r['px'] > 2000 and abs(r['dL_mean']) >= 0.25 and not L}
        print('R2', json.dumps(res['R2']), flush=True); pg.close()
    if 'U2' in WANT:   # 싸우는 화면(2인 사람 · 2P 키 표시 끔)에서 그린 글자에 2P 전용 키 이름이 없어야 함 (QTE 칸은 3단계처럼 칸 주인의 키)
        L = []; pg = open_page(b, 'index.html', 1920, 1080, '?art=1', L); pg.evaluate(HOOK)
        r = pg.evaluate("""() => { const P = window.PIPE; P.paused = true; window.__seedRand(55); P.setup({ mode: 'duo', bots: [null, null], seed: 5, boss: 1, chars: ['rapier', 'great'] }); P.UI.keys2P = false;
          window.__txt = []; for (let i = 0; i < 40; i++) { for (let j = 0; j < 20; j++) P.step(1 / 60, false); if (!P.Qte3.on) P.step(1 / 60, true); }
          P.fighters[1].hp = 1; return { s: window.__txt.map(x => x[0]), k1: P.keyNames(P.fighters[0]), k2: P.keyNames(P.fighters[1]) }; }""")
        only2 = set(r['k2'].values()) - set(r['k1'].values())
        bad = sorted(set(x for x in r['s'] if x.strip() in only2 or any(x.startswith(pp + ' ' + v) for pp in ('P', 'D') for v in only2) or any(x.startswith(v + '  ') for v in only2)))
        res['U2'] = {'k1': r['k1'], 'k2': r['k2'], 'only2': sorted(only2), 'bad': bad, 'n': len(r['s']), 'errors': L, 'ok': not bad and not L}
        print('U2', json.dumps(res['U2']), flush=True); pg.close()
    b.close()
json.dump(res, open(f'{OUT}/t1check.json', 'w'), indent=1, ensure_ascii=False)
