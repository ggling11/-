# 3단계 성능 탐침 (헤드리스 Chromium · SwiftShader = CPU 래스터라 GPU 절대 시간은 의미 없음, 패스끼리 상대 비교 · JS/HUD 시간은 실제 CPU 비용)
#   python3 probe30.py [W H DPR]  → 프레임당: update · HUD · 렌더 패스별(gl.finish로 동기화) · fillRect 수 · 드로우콜
import json, sys
from playwright.sync_api import sync_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1920; H = int(sys.argv[2]) if len(sys.argv) > 2 else 1080; DPR = float(sys.argv[3]) if len(sys.argv) > 3 else 1
JS = r"""
() => { const P = window.PIPE, r = P.renderer, gl = r.getContext(); P.paused = true; window.__FIN = false;
  P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 5, boss: 0 });
  for (let i = 0; i < 240; i++) P.step(1/60, false);
  if (P.Style) { P.Style.monoT = 0; P.Style.glitchT = 0; }
  const hud = document.getElementById('hud').getContext('2d'); let fr = 0; const ofr = hud.fillRect.bind(hud); hud.fillRect = (...a) => { fr++; return ofr(...a); };
  const orender = r.render.bind(r); const passes = {}; let idx = 0;
  r.render = (s, c) => { if (window.__FIN) gl.finish(); const t = performance.now(); orender(s, c); if (window.__FIN) gl.finish(); const d = performance.now() - t; const k = (idx++) + ':' + (s.overrideMaterial ? 'override' : s.children.length) + ':' + (r.getRenderTarget() ? r.getRenderTarget().width + 'x' + r.getRenderTarget().height : 'canvas'); passes[k] = (passes[k] || 0) + d; return; };
  const N = 30; let tf = 0, calls = 0, frs = 0; const tot = { render: 0 };
  for (let i = 0; i < N; i++) { idx = 0; fr = 0; r.info.autoReset = false; r.info.reset(); const t = performance.now(); P.step(1/60, true); tf += performance.now() - t; calls += r.info.render.calls; frs += fr; }
  r.render = orender;
  let tu = 0; for (let i = 0; i < N; i++) { const t = performance.now(); P.step(1/60, false); tu += performance.now() - t; }
  const pass = Object.fromEntries(Object.entries(passes).map(([k, v]) => [k, +(v / N).toFixed(2)]));
  const rsum = Object.values(pass).reduce((a, b) => a + b, 0);
  return { size: [innerWidth, innerHeight, devicePixelRatio], canvas: [document.getElementById('game').width, document.getElementById('game').height], k: P.Pipe.k, scale: P.Pipe.scale, rt: [P.Pipe.rtW, P.Pipe.rtH],
           frame: +(tf / N).toFixed(2), update: +(tu / N).toFixed(2), renderPasses: +rsum.toFixed(2), hudEtc: +((tf / N) - rsum - tu / N).toFixed(2), drawCalls: Math.round(calls / N), fillRect: Math.round(frs / N), pass };
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=DPR)
    pg.goto('http://127.0.0.1:8766/' + (sys.argv[4] if len(sys.argv) > 4 else 'index.html')); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    r = pg.evaluate(JS); print(json.dumps(r, indent=1)); b.close()
