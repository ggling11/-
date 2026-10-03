import os
# 1.5단계 렌더링 점검 (헤드리스 Chromium · SwiftShader): 8 finishers at their hit frame · shuttle in flight · mark cover moment
# · boss 2 shield phase · tag-solo tag finisher. Records draw calls per frame and console errors → shots15/render15.json
import json, sys
from playwright.sync_api import sync_playwright
SH = '' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'shots') + ''
os.makedirs(SH, exist_ok=True)
FIN = [('lift', 1, 'skyPierce', 0.5), ('lift', 2, 'skyDance', 0.76), ('kneel', 1, 'crownThrust', 0.76), ('kneel', 2, 'spineRide', 0.84),
       ('stagger', 1, 'ramLink', 0.38), ('stagger', 2, 'topple', 0.52), ('turn', 1, 'backRiser', 0.6), ('turn', 2, 'pinDown', 0.7)]
SETUP_FIN = """([kind, slot, tag]) => {
  const P = window.PIPE; P.paused = true;
  P.setup(tag ? { mode: 'tag', bots: [null], seed: 11 } : { mode: 'duo', bots: [null, null], seed: 11 });
  if (!P.__think) P.__think = P.Companion.think;   // keep the real bot brain: the bot scenes below put it back
  P.Companion.think = () => {};
  for (let i = 0; i < 1100; i++) P.step(1 / 60, false);      // past the opening help text
  const F = P.fighters, B = P.boss, AI = P.AI;
  AI.state = 'idle'; AI.t = 999; AI.cur = null; P.Shots.clear(); P.Hazards.clear(); P.Game.bannerT = 0; P.Game.noteT = 0; P.Game.popups = [];
  B.place(0, -0.5, Math.PI * 0.25);
  const starter = (kind === 'lift' || kind === 'kneel') ? F[1] : F[0], recv = starter === F[0] ? F[1] : F[0];
  if (tag && !starter.onField) { P.Game.tagCd = 0; P.Game.tagSwap(recv); }
  const put = (f, a, r) => { f.ch.place(B.pos.x + Math.sin(a) * r, B.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; f.hp = 100; };
  put(starter, Math.PI * 0.25 + 0.3, 2.3); if (!tag) put(recv, Math.PI * 0.25 - 0.9, 3.2);
  AI.startStatus(kind, starter);
  for (let i = 0; i < 20; i++) P.step(1 / 60, false);
  if (tag) P.Game.tagSwap(starter, { finish: slot }); else P.Duo.startFinish(recv, slot);
  return true;
}"""
RUNTO = """(t) => { const P = window.PIPE; for (let i = 0; i < Math.round(t * 60); i++) P.step(1 / 60, false); return true; }"""
DRAW = """() => { const P = window.PIPE, r = P.renderer; r.info.autoReset = false; r.info.reset(); P.step(1 / 60, true);
  return { calls: r.info.render.calls, ai: P.AI.state, fin: P.Duo.fins[0] ? P.Duo.fins[0].name : null }; }"""
BOTSCENE = """([o, cond, mx]) => { const P = window.PIPE; P.paused = true; if (P.__think) P.Companion.think = P.__think; P.setup(o);
  let t = 0; while (t < mx) { P.step(1 / 60, false); t += 1 / 60; if (eval(cond)(P)) { P.Game.noteT = 0; if (P.Game.bannerT > 1.2) P.Game.bannerT = 0; return { ok: true, t: +t.toFixed(2) }; } if (P.Game.state !== 'play') return { ok: false, end: P.Game.state }; }
  return { ok: false, t }; }"""
import os
res = json.load(open(f'{SH}/render15.json')) if os.path.exists(f'{SH}/render15.json') else {}
res.pop('maxCalls', None); res.pop('errors', None)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 540}); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.on('console', lambda m: logs.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    only = sys.argv[1:]
    for kind, slot, name, t in FIN:
        if only and 'fin' not in only: break
        pg.evaluate(SETUP_FIN, [kind, slot, False]); pg.evaluate(RUNTO, t); d = pg.evaluate(DRAW)
        pg.screenshot(path=f'{SH}/V1_{name}.png'); res[f'V1_{name}'] = d; print(name, d, flush=True)
    scenes = [
        ('V2_shuttle', {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 4}, "P => { const o = P.Shuttle.o; return o && o.n >= 1 && o.phase === 'fly' && o.t > o.T * 0.4 && o.t < o.T * 0.6 && P.fighters[0].ch.pos.distanceTo(P.fighters[1].ch.pos) > 3 && P.Game.t > 17; }", 500),
        ('V3_mark_cover', {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 1}, "P => { const c = P.Duo.stats.mark.cover; if (window.__mc === undefined) window.__mc = c; const hit = c > window.__mc; window.__mc = c; return hit && P.Game.t > 17; }", 500),
        ('V4_shield_phase', {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 6, 'boss': 1}, "P => P.AI.state === 'attack' && (P.AI.cur === 'bash' || P.AI.cur === 'shieldRush') && P.boss.f >= 8 && P.Game.t > 17", 500),
    ]
    for name, o, cond, mx in scenes:
        if only and name not in only: continue
        r = pg.evaluate(BOTSCENE, [o, cond, mx]); d = pg.evaluate(DRAW); d['run'] = r
        pg.screenshot(path=f'{SH}/{name}.png'); res[name] = d; print(name, d, flush=True)
    if not only or 'V5' in only:
        pg.evaluate(SETUP_FIN, ['kneel', 2, True]); pg.evaluate(RUNTO, 0.7); d = pg.evaluate(DRAW)
        pg.screenshot(path=f'{SH}/V5_tag_finisher.png'); res['V5_tag_finisher'] = d; print('V5', d, flush=True)
    b.close()
res['maxCalls'] = max(v['calls'] for k, v in res.items() if isinstance(v, dict))
res['errors'] = [l for l in logs if 'ERR' in l or 'console.error' in l][:10]
print('max draw calls', res['maxCalls'], 'errors', res['errors'])
json.dump(res, open(f'{SH}/render15.json', 'w'), indent=1)
