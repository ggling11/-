# 게임 고정 장면 캡처 (헤드리스 Chromium · SwiftShader): python3 gameshot.py OUTDIR "?art=1" [장면...]
#   장면: p1 (페이즈 1 전투) · p2 (페이즈 2, 다른 순간) · fin (마무리 순간 · 기술명) · dash (대시 잔상) · qte (QTE 진행) · title · hud(= p1과 같음, 이름만)
#   장면마다: Math.random 시드 고정 → PIPE.setup → 게임 시간 진행(렌더 없이) → 효과 타이머 0 → 한 프레임 렌더 → 캡처
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from br import launch, open_page, RESET_FX
OUT = sys.argv[1]; Q = sys.argv[2] if len(sys.argv) > 2 else '?art=1'; os.makedirs(OUT, exist_ok=True)
SC = sys.argv[3:] or ['p1', 'p2', 'fin', 'dash', 'qte', 'title']
W, H = int(os.environ.get('GW', 1920)), int(os.environ.get('GH', 1080))
JS = r"""async ([name]) => {
  const P = window.PIPE, AI = P.AI; P.paused = true; window.__seedRand(4242);
  const run = s => { for (let i = 0; i < Math.round(s * 60); i++) P.step(1 / 60, false); };
  const setup = (seed = 5, mode = 'duo') => { P.setup({ mode, bots: mode === 'duo' ? ['coop', 'coop'] : ['tag'], seed, boss: 1, chars: ['rapier', 'great'] }); };
  const until = (fn, s) => { for (let i = 0; i < s * 60; i++) { P.step(1 / 60, false); if (fn()) return true; } return false; };
  let note = '';
  if (name === 'p1' || name === 'hud') { setup(5); run(6.2); }
  else if (name === 'p2') { setup(11); run(3); if (AI.startTransform) { AI.state = 'idle'; AI.startTransform(2); } run(4.0); note = 'phase ' + AI.phase; }
  else if (name === 'fin') { setup(7); const ok = until(() => P.Game.techName && P.Game.techName.t > P.UI.nameT - 0.12 && P.Duo.fins && P.Duo.fins.length, 90); note = 'fin ' + ok + ' ' + (P.Game.techName && P.Game.techName.s); }
  else if (name === 'dash') { setup(5); run(4.0); const f = P.fighters[0]; if (f.state !== 'move') { f.state = 'move'; f.ch.play('idle'); } f.startDodge(P.camera.position.clone().set(1, 0, 0.4)); run(0.1); note = 'dash ' + f.state; }
  else if (name === 'qte') { P.setup({ mode: 'duo', bots: [null, null], seed: 401, boss: 1, chars: ['rapier', 'great'] }); AI.state = 'idle'; AI.t = 999; AI.cur = null; run(0.3); AI.phase = 2; const Q = P.Qte3;
    P.Dk.with(P.Dk.main(), () => { if (Q.can(1)) Q.start(); }); for (const f of P.fighters) f.bot = { inp: new P.BotInput(), mode: 'coop' }; run(1.9); note = 'qte ' + Q.on + ' cells ' + (Q.cells || []).length + ' done ' + (Q.cells || []).filter(c => c.res).length; }
  else if (name === 'title') { P.Title3.open(); for (let i = 0; i < 40; i++) P.step(1 / 60, false); }
  P.Game.bannerT = 0; P.Game.noteT = 0; if (P.Style) { P.Style.glitchT = 0; if (name !== 'p1' && name !== 'p2') P.Style.monoT = 0; else P.Style.monoT = 0; }
  if (P.T1 && P.T1.resetFx) P.T1.resetFx();
  const r = P.renderer; r.info.autoReset = false; r.info.reset(); P.step(1 / 60, true);
  return { note, calls: r.info.render.calls, tris: r.info.render.triangles, art: P.ART ? P.ART.cur : 0 };
}"""
res = {}
with sync_playwright() as p:
    b = launch(p)
    for s in SC:
        L = []; pg = open_page(b, 'index.html', W, H, Q, L)
        t0 = time.time(); info = pg.evaluate(JS, [s]); pg.screenshot(path=f'{OUT}/{s}.png'); info['ms'] = round((time.time() - t0) * 1000); info['errors'] = L[:5]
        res[s] = info; print(s, json.dumps(info), flush=True); pg.close()
    b.close()
json.dump(res, open(f'{OUT}/gameshot.json', 'w'), indent=1)
