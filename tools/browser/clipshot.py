import os
# Contact sheet of animation clips from the showcase, rendered by the real pipeline in headless Chromium.
#   python3 clipshot.py out.png player2:gs1:0,2,4,5,6,8,12 player:sThrust:0,3,4,6 boss:kneelDown:0,2,8
#   char = player | player2 | boss · frames = key frames to show (pose set exactly with play(name, 1, f))
#   options: --yaw N (camera turns of 90°), --scale 2
import sys, json, math
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
out = sys.argv[1]
yaw = 0; specs = []; PER = 8; SKIN = 0
args = sys.argv[2:]
i = 0
while i < len(args):
    if args[i] == '--yaw': yaw = int(args[i + 1]); i += 2; continue
    if args[i] == '--per': PER = int(args[i + 1]); i += 2; continue
    if args[i] == '--skin': SKIN = int(args[i + 1]); i += 2; continue
    specs.append(args[i]); i += 1
VW, VH = 1440, 810      # 3x the 480x270 internal image
K = VW / 480
SETUP = """() => {
  const P = window.PIPE; P.paused = true;
  if (P.Game.mode !== 'showcase') P.Game.toggleMode();
  return true;
}"""
POSE = """([who, clip, f, yaw]) => {
  const P = window.PIPE, extra = !['boss', 'player', 'player2'].includes(who);   // 2단계: chain | shield | twin (or any CHARS id) = that character's own rig · dk0 / dk1 = 도깨비
  const isDk = /^dk[01]$/.test(who); if (isDk) { P.Dk.ensure(); for (const r of P.Dk.rigs) { r.root.visible = false; r.root.scale.setScalar(P.FEEL.DK.scale); } }
  const ch = isDk ? P.Dk.rigs[+who[2]] : extra ? P.Rigs.get(who) : who === 'boss' ? P.boss : who === 'player2' ? P.player2 : P.player;
  if (isDk) ch.root.visible = true;
  const S = P.Show; S.sel = who === 'boss' ? 2 : who === 'player2' ? 1 : 0;
  P.player.root.visible = S.sel !== 1 && !extra; P.player2.root.visible = S.sel === 1;
  for (const g of P.Rigs.list) if (g !== P.player && g !== P.player2) g.root.visible = g === ch;
  if (extra) { P.player.place(60, 60, 0); P.player2.place(60, 60, 0); P.boss.place(-60, -60, 0); }
  if (who !== 'boss') { ch.place(0.4, 2.6, Math.PI * 0.75); } else ch.place(0, 0, Math.PI * 0.75);
  let ix = ch.order.indexOf(clip); if (ix < 0 && ch.remap) for (const k in ch.remap) if (ch.remap[k] === clip) ix = ch.order.indexOf(k); S.idx[S.sel] = Math.max(0, ix); S.restart = false;
  ch.play(clip, 1, f); if (extra) ch.update(0, null);   // (the new rigs aren't in the showcase loop: run their per-rig extras by hand)
  if (extra) P.CamRig.target.set(ch.pos.x, ch.focus || (isDk ? 2.2 : 1.1), ch.pos.z); else P.CamRig.target.copy(P.Game.focus()); P.CamRig.apply();
  P.step(1e-6, true);
  // crop box: feet → head in HUD pixels
  const v = ch.pos.clone(); const pr = (x, y, z) => { const q = new v.constructor(x, y, z).project(P.camera); return [(q.x * 0.5 + 0.5) * 480, (0.5 - q.y * 0.5) * 270]; };
  const h = who === 'boss' ? 5.2 * P.FEEL.BOSS_SCALE : isDk ? 3.7 : 2.3, r = who === 'boss' ? 3.6 : isDk ? 2.9 : 1.9;
  const a = pr(ch.pos.x, 0, ch.pos.z), b = pr(ch.pos.x, h, ch.pos.z);
  return { cx: a[0], top: b[1], bot: a[1], r: r * P.CFG.PPU, clip: ch.clip ? ch.clip.name : null, frames: ch.clip ? ch.clip.frames : 0 };
}"""
tiles = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': VW, 'height': VH})
    logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:8766/index.html')
    pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    pg.evaluate(SETUP)
    if SKIN: pg.evaluate(f"() => {{ const P = window.PIPE; P.Rush.idx = {SKIN}; P.Rush.apply({SKIN}); P.AI.setLook(1); }}")
    for k in range(yaw): pg.evaluate("() => { window.PIPE.CamRig.rotate(1); for (let i = 0; i < 60; i++) window.PIPE.step(1/60, false); }")
    for spec in specs:
        who, clip, fr = spec.split(':')
        for f in [float(x) for x in fr.split(',')]:
            info = pg.evaluate(POSE, [who, clip, f, yaw])
            if info['clip'] != clip: print('missing clip', who, clip, info['clip']); break
            if any(v != v for v in (info['cx'], info['top'], info['bot'])): print('bad crop', who, clip, f, info, logs[:3]); break
            pg.screenshot(path='/tmp/_cs.png')
            im = Image.open('/tmp/_cs.png')
            pad = 6
            x0 = int((info['cx'] - info['r']) * K); x1 = int((info['cx'] + info['r']) * K)
            y0 = int((info['top'] - pad * 2) * K); y1 = int((info['bot'] + pad) * K)
            t = im.crop((max(0, x0), max(0, y0), min(VW, x1), min(VH, y1)))
            d = ImageDraw.Draw(t); d.text((3, 2), f"{who[0:2]} {clip} f{f:g}", fill=(220, 210, 180))
            tiles.append(t)
    print('\n'.join(logs[:5]))
    b.close()
if tiles:
    W = sum(t.width for t in tiles[:PER]); rows = [tiles[i:i + PER] for i in range(0, len(tiles), PER)]
    H = sum(max(t.height for t in r) for r in rows)
    sheet = Image.new('RGB', (max(sum(t.width for t in r) for r in rows), H), (7, 6, 11))
    y = 0
    for r in rows:
        x = 0
        for t in r: sheet.paste(t, (x, y)); x += t.width
        y += max(t.height for t in r)
    sheet.save(out)
    print('saved', out, sheet.size)
