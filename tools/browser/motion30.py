# 3단계 움직임 측정 + 장면 (M1): 서 있는 플레이어 키(화면 %) · 공중 마무리 최고 높이와 화면 속 위로 뜬 거리 · 대시 거리 · 대시 잔상 · 도약 꼭대기
#   python3 motion30.py OUTDIR  (서버 127.0.0.1:8766 · v4.html = 2단계 · index.html = 3단계)
import json, sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'motion30'
VW, VH = 1920, 1080
os.makedirs(OUT, exist_ok=True)
JS = r"""
([phase]) => {
  const P = window.PIPE, { Game, AI, Duo, fighters, camera, FEEL } = P; P.paused = true;
  const step = (s, r = false) => { for (let i = 0; i < Math.round(s * 60); i++) P.step(1 / 60, false); if (r) P.step(1 / 60, true); };
  const scr = v => { const q = v.clone().project(camera); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight]; };
  const V = (x, y, z) => { const v = camera.position.clone(); v.set(x, y, z); return v; };
  P.setup({ mode: 'duo', bots: [null, null], seed: 3, boss: 0, chars: ['rapier', 'great'] });
  const park = () => { AI.state = 'idle'; AI.t = 999; AI.cur = null; };
  const boss = P.bossNow; park(); boss.place(0, -0.5, Math.PI * 0.25);
  const red = c => P.CHARS[c.char].color === 'red';
  const starter = fighters.find(red), recv = fighters.find(q => q !== starter);
  const put = (f, a, r) => { f.ch.place(boss.pos.x + Math.sin(a) * r, boss.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; };
  put(starter, Math.PI * 0.25 + 0.3, 2.3); put(recv, Math.PI * 0.25 - 0.9, 3.2);
  if (P.Style) { P.Style.glitchT = 0; P.Style.monoT = 0; } Game.bannerT = 0;
  step(0.5, true);
  const out = {};
  // standing height: feet (pos) → top of the head joint's world bounding box
  const ch = recv.ch; ch.root.updateMatrixWorld(true);
  let top = -1e9; ch.root.traverse(o => { if (o.isMesh && o.visible && o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const w = V(x, y, z).applyMatrix4(o.matrixWorld); if (isFinite(w.y)) top = Math.max(top, w.y); } } });
  const f0 = scr(V(ch.pos.x, 0, ch.pos.z)), h0 = scr(V(ch.pos.x, top, ch.pos.z));
  out.standTop = +top.toFixed(2); out.standPx = Math.round(f0[1] - h0[1]); out.standPct = +((f0[1] - h0[1]) / innerHeight * 100).toFixed(1);
  if (phase === 'stand') return out;
  if (phase === 'dash') {                                   // dash distance + a frame mid-dash (afterimages)
    const f = recv; f.state = 'move'; const p0 = f.ch.pos.clone(); f.startDodge(V(1, 0, 0));
    let snap = null; for (let i = 0; i < 40; i++) { P.step(1 / 60, false); if (i === 5) { P.step(1 / 60, true); snap = f.ch.pos.distanceTo(p0); break; } }
    out.dashMid = +snap.toFixed(2); return out;
  }
  if (phase === 'dashlen') { const f = recv; const p0 = f.ch.pos.clone(); f.startDodge(V(1, 0, 0)); step(0.6); out.dash = +f.ch.pos.distanceTo(p0).toFixed(2); return out; }
  // aerial finisher: run to the apex, render that frame
  AI.startStatus('lift', starter); step(0.3);
  Duo.startFinish(recv, 1);
  let maxY = 0, prevY = 0, t = 0;
  for (; t < 3; t += 1 / 60) { P.step(1 / 60, false); const y = recv.ch.pos.y; if (y > maxY) maxY = y; if (phase === 'apex' && maxY > 0.5 && y < prevY - 1e-4) break; prevY = y; }
  if (phase === 'apex') { P.step(1 / 60, true); const p = recv.ch.pos; const a = scr(V(p.x, 0, p.z)), b = scr(V(p.x, p.y, p.z)); out.apexY = +maxY.toFixed(2); out.apexPx = Math.round(a[1] - b[1]); out.apexPct = +((a[1] - b[1]) / innerHeight * 100).toFixed(1); }
  else out.maxY = +maxY.toFixed(2);
  return out;
}
"""
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for page, tag in [('v4.html', 'old'), ('index.html', 'new')]:
        res[tag] = {}
        for phase in os.environ.get('PHASES', 'stand,dashlen,dash,apex').split(','):
            pg = b.new_page(viewport={'width': VW, 'height': VH}); logs = []
            pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
            pg.goto('http://127.0.0.1:8766/' + page); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
            r = pg.evaluate(JS, [phase]); res[tag][phase] = r
            if phase in ('dash', 'apex'): pg.screenshot(path=f'{OUT}/{tag}_{phase}.png', timeout=240000)
            if logs: res[tag][phase + '_err'] = logs[:3]
            print(tag, phase, json.dumps(r), logs[:2], flush=True)
            pg.close()
    b.close()
json.dump(res, open(f'{OUT}/motion.json', 'w'), indent=1)
