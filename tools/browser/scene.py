import os
# Run a bot fight in headless Chromium until a condition holds, then save the full frame (HUD included).
#   python3 scene.py name 'duo' 'coop,coop' seed 'P => cond' [maxSec] [--boss 1] [--crop]
import sys, json
from playwright.sync_api import sync_playwright
SHOTS = '' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'shots') + ''
import os; os.makedirs(SHOTS, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = [a for a in sys.argv[1:] if a.startswith('--')]
name, mode, bots, seed, cond = args[0], args[1], args[2].split(','), int(args[3]), args[4]
mx = float(args[5]) if len(args) > 5 else 400
boss = 1 if '--boss' in flags else 0
SETUP = """(o) => {
  const P = window.PIPE; P.paused = true;
  P.setup(o);
  const r = P.renderer; r.info.autoReset = false;
  window.__draw = () => { r.info.reset(); P.step(1/60, true); return { calls: r.info.render.calls }; };
  window.__run = (cond, maxSec, every) => { let t = 0, n = 0; while (t < maxSec) { const render = every > 0 && (++n % every === 0); P.step(1/60, render); t += 1/60; if (cond(P)) return { ok: true, t: +t.toFixed(2) }; if (P.Game.state !== 'play') return { ok: false, t, end: P.Game.state }; } return { ok: false, t }; };
  return true;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text))
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.goto('http://127.0.0.1:8766/index.html')
    pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    o = {'mode': mode, 'bots': [x if x != '-' else None for x in bots], 'seed': seed}
    if boss: o['boss'] = 1
    pg.evaluate(SETUP, o)
    res = pg.evaluate(f"() => window.__run({cond}, {mx}, 120)")
    d = pg.evaluate("() => window.__draw()")
    pg.screenshot(path=f'{SHOTS}/{name}.png')
    info = pg.evaluate("() => { const P = window.PIPE; return { t: +P.Game.t.toFixed(1), boss: P.Rush.idx, phase: P.AI.phase, state: P.AI.state, cur: P.AI.cur, rally: P.Duo.rally }; }")
    errs = [l for l in logs if l.startswith('ERR') or l.startswith('error')]
    print(name, json.dumps({'run': res, 'draw': d, 'info': info, 'errors': errs[:5]}), flush=True)
    b.close()
