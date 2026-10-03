# 4단계 T1 동작 프레임 띠 · 실루엣 마스크 (헤드리스 Chromium · SwiftShader)
#   띠:   python3 motion.py strip OUT.png [--s3] [--n 8] [--view game|side] 모델:클립[:f0-f1] ...
#         모델 = rapier | great | warden · 클립 = 숨은 리그 클립 이름(대검 대기 = idleB) · 칸마다 f0..f1을 n등분한 프레임
#         --s3: 각 줄 아래에 3단계 리그(같은 카메라 · 같은 프레임)를 같이 그림 (비교 띠)
#   마스크: motion.py iou 모델:클립:f ... → 3단계 리그 vs 새 보이는 모델 실루엣 겹침(IoU) JSON
#   장면: 빠른 테스트판 듀오(세검 · 대검) · 보스 1 · 아레나 · 이펙트 · HUD 숨김 · 모델은 원점(띠) / (50, 0, 50)(마스크)
import sys, os, json, base64, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from br import launch, open_page
from PIL import Image, ImageDraw, ImageFont

JS = r"""
window.__T1M = (() => {
  const P = window.PIPE; let S, THREE, cam;
  const M = {};
  M.prep = () => {
    P.paused = true; window.__seedRand(4242);
    P.setup({ mode: 'duo', bots: [null, null], seed: 5, boss: 1, chars: ['rapier', 'great'] });
    P.step(1 / 60, true); S = P.t1; THREE = S.R.THREE || S.R.scene.constructor && window.__THREE;
    P.t1SetHud(false); P.step(1 / 60, true);
    cam = S.R.camera; return { ok: !!S.built };
  };
  const hidden = kind => kind === 'warden' ? P.boss : P.fighters.find(f => (f.char === 'great') === (kind === 'great')).ch;
  const solo = kind => { for (const k in S.models) if (S.models[k]) S.models[k].root.visible = k === kind; for (const k in S.shadows) S.shadows[k].visible = false;
    S.arena.visible = false; S.FX.group.visible = false; for (const [d, m] of S.mirrors) m.visible = false; if (S.shots) for (const k in S.shots) if (S.shots[k]) S.shots[k].visible = false; if (S.spikes) S.spikes.visible = false;
    for (const k in S.trails) S.trails[k].mesh.visible = false; };
  M.poseHidden = (kind, clip, f) => { const ch = hidden(kind), oe = ch.onEvent, sm = ch.smear; ch.onEvent = null; ch.smear = null; ch.play(clip, 0, f); ch.onEvent = oe; ch.smear = sm; return ch; };
  M.poseT1 = (kind, clip, f, at, facing) => {
    const ch = M.poseHidden(kind, clip, f), Mo = S.models[kind];
    Mo.root.position.set(at[0], at[1], at[2]); Mo.root.rotation.set(0, facing, 0); Mo.root.updateMatrixWorld(true);
    P.t1Pose.apply(Mo, ch, { poses: P.t1Data.poses[kind] }); Mo.root.updateMatrixWorld(true); return Mo;
  };
  const placeCam = (c, center, view, h) => {
    const yaw = Math.PI / 4, pitch = (view === 'side' ? 8 : 41) * Math.PI / 180, fov = 26;
    const d = h / (2 * Math.tan(fov * Math.PI / 360)) * 1.0;
    c.fov = fov; c.aspect = 1; c.near = 0.5; c.far = 200; c.updateProjectionMatrix();
    c.position.set(center[0] + Math.sin(yaw) * Math.cos(pitch) * d, center[1] + Math.sin(pitch) * d, center[2] + Math.cos(yaw) * Math.cos(pitch) * d);
    c.rotation.set(-pitch, yaw, 0, 'YXZ'); c.updateMatrixWorld(true);
  };
  const H = { rapier: 3.0, great: 3.2, warden: 5.4 };
  /* 띠 한 칸: 새 모델을 테마 렌더 경로로 (정사각형 캔버스 영역 가운데) */
  /* 실시간으로 0 → f까지 돌려 2차 움직임(머리카락 · 코트 스프링) · 칼 궤적을 쌓은 뒤 그림 (게임과 같은 코드 · 12fps 계단) */
  M.cell = (kind, clip, f, view, facing) => {
    solo(kind); let Mo = null; const ch = hidden(kind), c = ch.clips[(ch.remap && ch.remap[clip]) || clip], sm = (c.smears || []).map(x => (typeof x === 'number' ? x : x.f));
    const T = S.trails[kind]; if (T) { T.on = 0; T.hist.length = 0; } Mo = S.models[kind]; Mo.chains = null;
    for (let g = 0; g <= f; g += 0.25) {
      Mo = M.poseT1(kind, clip, g, [0, 0, 0], facing); P.t1Pose.secondary(Mo, 1 / 48, Mo.root.position, facing, g / 12); Mo.root.updateMatrixWorld(true);
      if (T && sm.some(s0 => g >= s0 - 0.01 && g < s0 + 0.01)) T.on = 0.3; if (T) S.tool.updTrail(kind, Mo, 1 / 48);
    }
    const W = S.R.w, Hh = S.R.h; cam.aspect = W / Hh;
    placeCam(cam, [0, H[kind] * 0.36, 0], view, H[kind]); cam.aspect = W / Hh; cam.updateProjectionMatrix();
    S.R.render(0, null); return { stat: P.t1Pose.stats[kind + ':' + (hidden(kind).clip.name)] };
  };
  /* 3단계 리그를 같은 카메라로: 게임 장면의 레이어 31(숨은 리그)만 · 3단계 재질 그대로 */
  M.cellS3 = (kind, clip, f, view, facing) => {
    const ch = M.poseHidden(kind, clip, f), sc = P.t1Scene(), rnd = P.renderer;
    const keep = { p: ch.pos.clone(), f: ch.facing, rp: ch.root.position.clone(), ry: ch.root.rotation.y };
    ch.root.position.set(80, 0, 80); ch.root.rotation.set(0, facing, 0); ch.root.updateMatrixWorld(true);
    const c = new cam.constructor(26, rnd.domElement.width / rnd.domElement.height, 0.5, 200); placeCam(c, [80, H[kind] * 0.36, 80], view, H[kind]);
    c.aspect = rnd.domElement.width / rnd.domElement.height; c.updateProjectionMatrix(); c.layers.set(31);
    const bg = sc.background, fog = sc.fog; sc.background = null; sc.fog = null;
    rnd.setRenderTarget(null); rnd.setClearColor(0xf4f0f0, 1); rnd.clear(); rnd.render(sc, c);
    sc.background = bg; sc.fog = fog;
    ch.root.position.copy(keep.rp); ch.root.rotation.y = keep.ry; ch.root.updateMatrixWorld(true);
    return {};
  };
  /* 실루엣 마스크 (128²): which = 't1' | 's3' — 흰 실루엣 / 검정 바탕, 같은 카메라 */
  let rt = null;
  M.mask = (kind, clip, f, which, facing, view) => {
    const rnd = P.renderer, N = 128;
    if (!rt) rt = new P.finalRT.constructor(N, N);
    const c = new cam.constructor(26, 1, 0.5, 200); placeCam(c, [80, H[kind] * 0.36, 80], view || 'game', H[kind]);
    let sc, restore = () => {};
    if (which === 't1') {
      solo(kind); M.poseT1(kind, clip, f, [80, 0, 80], facing); sc = S.R.scene;
    } else {
      const ch = M.poseHidden(kind, clip, f), keep = { rp: ch.root.position.clone(), ry: ch.root.rotation.y };
      ch.root.position.set(80, 0, 80); ch.root.rotation.set(0, facing, 0); ch.root.updateMatrixWorld(true);
      sc = P.t1Scene(); c.layers.set(31);
      restore = () => { ch.root.position.copy(keep.rp); ch.root.rotation.y = keep.ry; ch.root.updateMatrixWorld(true); };
    }
    const om = sc.overrideMaterial, bg = sc.background, fog = sc.fog;
    sc.overrideMaterial = window.__maskMat; sc.background = null; sc.fog = null;
    rnd.setRenderTarget(rt); rnd.setClearColor(0x000000, 1); rnd.clear(); rnd.render(sc, c); rnd.setRenderTarget(null);
    sc.overrideMaterial = om; sc.background = bg; sc.fog = fog; restore();
    const buf = new Uint8Array(N * N * 4); rnd.readRenderTargetPixels(rt, 0, 0, N, N, buf);
    let s = ''; for (let i = 0; i < N * N; i++) s += buf[i * 4] > 127 ? '1' : '0';
    return s;
  };
  return M;
})();
"""
# 마스크 재질: 페이지 안의 THREE를 모듈에서 꺼낼 수 없어서, 테마 렌더 모듈의 재질 생성기로 흰 단색 재질을 만듦
MASKMAT = r"""(() => { const R = window.PIPE.t1.R; window.__maskMat = new R.THREE.MeshBasicMaterial({ color: 0xffffff, side: 2 }); return true; })()"""

def strip(out, specs, s3=False, n=8, view='game'):
    rows = []
    with sync_playwright() as p:
        b = launch(p); L = []; pg = open_page(b, 'index.html', 1280, 720, '?art=1', L)
        pg.evaluate(JS); print('prep', pg.evaluate('() => __T1M.prep()'))
        for sp in specs:
            parts = sp.split(':'); kind, clip = parts[0], parts[1]
            fr = pg.evaluate(f"() => {{ const P = PIPE, ch = '{kind}' === 'warden' ? P.boss : P.fighters.find(f => (f.char === 'great') === ('{kind}' === 'great')).ch; const c = ch.clips[(ch.remap && ch.remap['{clip}']) || '{clip}']; return c ? c.frames : -1; }}")
            if fr < 0: print('no clip', sp); continue
            f0, f1 = (0, fr) if len(parts) < 3 else map(float, parts[2].split('-'))
            frames = [round(f0 + (f1 - f0) * i / max(1, n - 1)) for i in range(n)] if len(parts) < 3 or '-' in parts[2] else [float(parts[2])]
            facing = 3 * 3.14159 / 4 - 0.45
            for which in (['t1', 's3'] if s3 else ['t1']):
                cells = []
                for f in frames:
                    info = pg.evaluate(f"() => __T1M.{'cell' if which == 't1' else 'cellS3'}('{kind}', '{clip}', {f}, '{view}', {facing})")
                    shot = pg.screenshot(clip={'x': 280, 'y': 0, 'width': 720, 'height': 720})
                    cells.append(Image.open(io.BytesIO(shot)).convert('RGB').resize((200, 200), Image.LANCZOS))
                rows.append((f"{kind}:{clip} {'stage3' if which == 's3' else 'T1 ' + str(info.get('stat'))}", frames, cells))
        print('errors', L[:5]); b.close()
    W = 200 * n + 150; Hh = len(rows) * 214
    G = Image.new('RGB', (W, Hh), 'white'); d = ImageDraw.Draw(G)
    try: fnt = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'design', '_ko.ttf'), 14)
    except Exception: fnt = None
    for i, (lab, frames, cells) in enumerate(rows):
        y = i * 214; d.text((4, y + 90), lab.replace(' ', '\n'), fill='black', font=fnt)
        for j, (c, f) in enumerate(zip(cells, frames)):
            G.paste(c, (150 + j * 200, y + 14)); d.text((150 + j * 200 + 4, y), f'f{f:g}', fill='black', font=fnt)
    G.save(out); print(out, G.size)

def iou(specs, facing=3 * 3.14159 / 4 - 0.45, view='game'):
    res = []
    with sync_playwright() as p:
        b = launch(p); L = []; pg = open_page(b, 'index.html', 640, 360, '?art=1', L)
        pg.evaluate(JS); pg.evaluate('() => __T1M.prep()'); pg.evaluate(MASKMAT)
        for sp in specs:
            kind, clip, f = sp.split(':')
            a = pg.evaluate(f"() => __T1M.mask('{kind}', '{clip}', {f}, 't1', {facing}, '{view}')")
            c = pg.evaluate(f"() => __T1M.mask('{kind}', '{clip}', {f}, 's3', {facing}, '{view}')")
            inter = sum(1 for x, y in zip(a, c) if x == '1' and y == '1'); uni = sum(1 for x, y in zip(a, c) if x == '1' or y == '1')
            res.append({'spec': sp, 'iou': round(inter / max(1, uni), 3), 't1px': a.count('1'), 's3px': c.count('1')})
            print(json.dumps(res[-1]), flush=True)
        print('errors', L[:5]); b.close()
    return res

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'strip':
        out = a[1]; s3 = '--s3' in a; n = int(a[a.index('--n') + 1]) if '--n' in a else 8; view = a[a.index('--view') + 1] if '--view' in a else 'game'
        specs = [x for i, x in enumerate(a[2:], 2) if not x.startswith('--') and a[i - 1] not in ('--n', '--view')]
        strip(out, specs, s3, n, view)
    elif a[0] == 'iou':
        out = None
        if '--json' in a: out = a[a.index('--json') + 1]
        specs = [x for i, x in enumerate(a[1:], 1) if not x.startswith('--') and a[i - 1] != '--json']
        r = iou(specs)
        if out: json.dump(r, open(out, 'w'), indent=1)
