import os
# Filmstrip of a finisher in a real fight: force a status, fire the partner's finisher, capture frames around the boss.
#   python3 finshot.py out.png lift:1 kneel:2 ...   (status:slot) · --times 0.1,0.3,... (seconds after the finisher starts)
import sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
out = sys.argv[1]; nocut = False; specs = []; times = [0.05, 0.25, 0.4, 0.5, 0.65, 0.85, 1.1, 1.4]; per = 8
a = sys.argv[2:]; i = 0
while i < len(a):
    if a[i] == '--times': times = [float(x) for x in a[i + 1].split(',')]; i += 2; continue
    if a[i] == '--per': per = int(a[i + 1]); i += 2; continue
    if a[i] == '--nocut': nocut = True; i += 1; continue   # no cut-in band (to see the motion under it)
    specs.append(a[i]); i += 1
VW, VH = 1440, 810; K = VW / 480
SETUP = """([kind, slot, tag, nocut]) => {
  const P = window.PIPE; P.paused = true; if (nocut) P.FEEL.STAGE.cutGap = 1e9;
  P.setup(tag ? { mode: 'tag', bots: [null], seed: 11 } : { mode: 'duo', bots: [null, null], seed: 11 });
  P.Companion.think = () => {};
  for (let i = 0; i < 30; i++) P.step(1 / 60, false);
  const F = P.fighters, B = P.boss, AI = P.AI;
  AI.state = 'idle'; AI.t = 999; AI.cur = null;
  B.place(0, -0.5, Math.PI * 0.25);
  const starter = (kind === 'lift' || kind === 'kneel') ? F[1] : F[0], recv = starter === F[0] ? F[1] : F[0];
  if (tag) { if (!starter.onField) { P.Game.tagCd = 0; P.Game.tagSwap(recv); } }
  const put = (f, a, r) => { f.ch.place(B.pos.x + Math.sin(a) * r, B.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; };
  put(starter, Math.PI * 0.25 + 0.3, 2.3); if (!tag) put(recv, Math.PI * 0.25 - 0.9, 3.2);
  AI.startStatus(kind, starter);
  for (let i = 0; i < 20; i++) P.step(1 / 60, false);
  if (tag) P.Game.tagSwap(starter, { finish: slot }); else P.Duo.startFinish(recv, slot);
  window.__t = 0;
  return { st: AI.state, fins: P.Duo.fins.length, name: P.Duo.fins[0] && P.Duo.fins[0].name };
}"""
SHOT = """(t) => {
  const P = window.PIPE;
  while (window.__t < t - 1e-6) { P.step(1 / 60, false); window.__t += 1 / 60; }
  P.CamRig.target.copy(P.Game.focus()); P.CamRig.apply(); P.step(1e-6, true);
  const pr = (x, y, z) => { const q = P.boss.pos.clone().set(x, y, z).project(P.camera); return [(q.x * 0.5 + 0.5) * 480, (0.5 - q.y * 0.5) * 270]; };
  const b = P.boss.pos, c = pr(b.x, 1.6, b.z);
  const L = P.Duo.fins[0], f = P.fighters.find(q => q.onField && q.state !== 'down');
  return { cx: c[0], cy: c[1], ai: P.AI.state, hp: P.AI.hp, fin: L ? L.name : null, hits: L ? L.hits : null, fy: +(P.fighters.map(q => q.ch.pos.y).reduce((a, v) => Math.max(a, v), 0)).toFixed(2) };
}"""
tiles = []
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': VW, 'height': VH})
    logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:8766/index.html')
    pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    for spec in specs:
        parts = spec.split(':'); kind, slot = parts[0], int(parts[1]); tag = len(parts) > 2 and parts[2] == 'tag'
        r = pg.evaluate(SETUP, [kind, slot, tag, nocut]); print(spec, r)
        for t in times:
            info = pg.evaluate(SHOT, t)
            pg.screenshot(path='/tmp/_fs.png')
            im = Image.open('/tmp/_fs.png')
            hw, hh = 95, 80
            x0 = int((info['cx'] - hw) * K); y0 = int((info['cy'] - hh) * K)
            tl = im.crop((max(0, x0), max(0, y0), min(VW, x0 + int(2 * hw * K)), min(VH, y0 + int(2 * hh * K)))).resize((int(2 * hw * 2), int(2 * hh * 2)))
            d = ImageDraw.Draw(tl); d.text((3, 2), f"{spec} t{t:.2f} {info['ai']} h{info['hits']}", fill=(230, 220, 190))
            tiles.append(tl)
    print('\n'.join(logs[:6]))
    br.close()
rows = [tiles[i:i + per] for i in range(0, len(tiles), per)]
W = max(sum(t.width for t in r) for r in rows); H = sum(max(t.height for t in r) for r in rows)
sheet = Image.new('RGB', (W, H), (7, 6, 11)); y = 0
for r in rows:
    x = 0
    for t in r: sheet.paste(t, (x, y)); x += t.width
    y += max(t.height for t in r)
sheet.save(out); print('saved', out, sheet.size)
