# 2단계 렌더링 점검 (헤드리스 Chromium · SwiftShader WebGL2): 프롬프트의 장면 목록 — 장면마다 스크린샷 · 드로우콜 · 콘솔 에러
#   python3 render20.py OUTDIR   (서버: 127.0.0.1:8766 — tools/browser/serve.sh)
#   캐릭터 대기 자세 · 새 스킬 시동 순간은 clipshot.py, 공통 호응 4종은 finshot.py (render20.sh가 같이 부름)
import json, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'render'
os.makedirs(OUT, exist_ok=True)
PRE = """(o) => { const P = window.PIPE; P.paused = true; P.FEEL.STAGE.cutGap = o.cut ? 0 : 1e9;
  if (!P.__think) P.__think = P.Companion.think; P.Companion.think = P.__think;
  if (o.setup) P.setup(o.setup);
  const r = P.renderer; r.info.autoReset = false;
  window.__go = (cond, maxSec) => { let t = 0; while (t < maxSec) { P.step(1/60, false); t += 1/60; if (cond(P)) return +t.toFixed(2); } return null; };
  return true; }"""
DRAW = """() => { const P = window.PIPE, r = P.renderer; P.CamRig.target.copy(P.Game.focus()); P.CamRig.apply(); r.info.reset(); P.step(1e-6, true); return r.info.render.calls; }"""
SCENES = [
  # name, PRE options, JS run after setup (returns info)
  ('R04_exclusive_art', {'setup': {'mode': 'duo', 'bots': [None, None], 'seed': 11, 'exclusive': True}},
   """const P = window.PIPE, F = P.fighters, AI = P.AI, B = P.bossNow; P.Companion.think = () => {}; AI.state = 'idle'; AI.t = 999;
      B.place(0, -0.5, Math.PI * 0.25); const put = (f, a, r) => { f.ch.place(B.pos.x + Math.sin(a) * r, B.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; };
      put(F[1], Math.PI * 0.25 + 0.3, 2.3); put(F[0], Math.PI * 0.25 - 0.9, 3.2); AI.startStatus('lift', F[1]); __go(() => false, 0.3);
      P.Duo.startFinish(F[0], 1); const name = P.Duo.fins[0] && P.Duo.fins[0].name; __go(P => P.Duo.fins[0] && P.Duo.fins[0].hits >= 1, 2); return { fin: name };"""),
  ('R05_select', {'setup': None},
   """const P = window.PIPE; P.Select.open(); for (let i = 0; i < 60; i++) P.step(1/60, false); return { state: P.Game.state };"""),
  ('R06_relic_cards', {'setup': {'mode': 'duo', 'bots': [None, None], 'seed': 77}},
   """const P = window.PIPE; P.Game.t = 99; P.Rush.onBossDead(); __go(P => P.Relics.open, 10); __go(() => false, 0.3); P.Game.bannerT = 0; return { open: P.Relics.open };"""),
  ('R07_bell_beat', {'setup': {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 2}},
   """const P = window.PIPE, AI = P.AI; __go(() => false, 2.5); AI.state = 'idle'; P.Hazards.clear(); AI.start('beat'); __go(() => false, 1.95); P.Game.bannerT = 0; return { beat: !!P.Bell.beat };"""),
  ('R08_bell_phase3', {'setup': {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 6, 'boss': 2}},
   """const P = window.PIPE, AI = P.AI; __go(() => false, 2.5); AI.phase = 3; AI.setLook(3); AI.state = 'idle'; P.Hazards.clear(); AI.start('beat'); __go(() => false, 2.6); P.Game.bannerT = 0; return { phase: AI.phase };"""),
  ('R09_dokkaebi_pair', {'setup': {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 3}},
   """const P = window.PIPE; __go(() => false, 3.5); P.Game.bannerT = 0; return { s: [P.Dk.get(0, 'state'), P.Dk.get(1, 'state')] };"""),
  ('R10_link_break', {'setup': {'mode': 'duo', 'bots': [None, 'coop'], 'seed': 5, 'boss': 3}},
   """const P = window.PIPE, D = P.Dk, F = P.fighters, AI = P.AI; __go(() => false, 1.5);
      D.each(() => { AI.state = 'idle'; AI.t = 99; AI.liftCd = 99; }); P.FEEL.DK.bot.link = 1;
      const r = D.rigs[0]; F[0].ch.place(r.pos.x + Math.sin(r.facing) * 1.6, r.pos.z + Math.cos(r.facing) * 1.6, r.facing + Math.PI); F[0].state = 'move';
      F[1].ch.place(F[0].ch.pos.x + 1.4, F[0].ch.pos.z + 0.6, 0); F[1].state = 'move';
      D.with(0, () => { AI.aggro = F[0]; D.jointCd = 0; AI.start('dkLink'); });
      const t = __go(P => (P.Duo.stats.dk || {}).linkBreak >= 1, 4); __go(() => false, 0.05); P.Game.bannerT = 0; return { brk: t };"""),
  ('R11_hap_dae_hap', {'setup': {'mode': 'duo', 'bots': ['coop', 'coop'], 'seed': 5, 'boss': 3}, 'cut': True},
   """const P = window.PIPE, D = P.Dk, F = P.fighters, AI = P.AI; __go(() => false, 1.5); P.FEEL.DK.bot.ult = 1;
      D.each(() => { AI.state = 'idle'; AI.t = 99; AI.phase = 3; AI.setLook(3); AI.liftCd = 99; }); F[0].ch.place(-2.2, 2.2, 0); F[1].ch.place(2.2, 2.2, 0);
      D.with(0, () => { D.jointCd = 0; AI.start('dkUlt'); });
      const t = __go(P => P.Stage.cut && P.Stage.cut.hap && P.Stage.cut.t > 0.3, 5); return { cut: t };"""),
  ('R12_tag_finisher', {'setup': {'mode': 'tag', 'bots': [None], 'seed': 11}, 'cut': True},
   """const P = window.PIPE, F = P.fighters, AI = P.AI, B = P.bossNow; P.Companion.think = () => {}; AI.state = 'idle'; AI.t = 999;
      B.place(0, -0.5, Math.PI * 0.25); const on = F.find(f => f.onField); on.ch.place(B.pos.x + 2, B.pos.z + 1, 0); on.state = 'move';
      AI.startStatus('lift', on); __go(() => false, 0.3); P.Game.tagSwap(on, { finish: 1 });
      __go(P => P.Duo.fins[0] && P.Duo.fins[0].hits >= 1, 2); return { fin: P.Duo.fins[0] && P.Duo.fins[0].name, tagFin: P.Duo.stats.tagFin };"""),
]
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, o, js in SCENES:
        pg = b.new_page(viewport={'width': 960, 'height': 540}); logs = []
        pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
        pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
        pg.evaluate(PRE, o)
        info = pg.evaluate("() => { " + js + " }")
        calls = pg.evaluate(DRAW)
        pg.screenshot(path=f'{OUT}/{name}.png')
        res[name] = {'info': info, 'calls': calls, 'errors': logs[:4]}
        print(name, json.dumps(res[name]), flush=True)
        pg.close()
    b.close()
json.dump(res, open(f'{OUT}/render20.json', 'w'), indent=1)
print('max calls', max(v['calls'] for v in res.values()), 'errors', sum(len(v['errors']) for v in res.values()))
