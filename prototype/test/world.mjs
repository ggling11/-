// [알파] 스프링 송 월드 검사 (docs/실험/알파-스프링송-프롬프트.md 단계 2)
//
//   cd prototype/test && npm install && node world.mjs [룩 이름]
//
// 재는 것
//   void   = 화면 가장자리 24곳에서 카메라 광선을 쏴서 땅·벽·나무에 안 맞는 곳의 수 (0이어야 통과)
//   ring   = 예고 원 테두리와 바로 바깥 8px 띠의 휘도 대비 (WCAG 식, 3 이상 통과) — 눈이 실제로 보는 대비
//   bare   = 테두리와 그 자리 맨바닥의 대비 (참고)
//   calls  = 한 프레임의 그리기 호출 수 (후처리 포함)
// prototype/test/out/world_<폭>x<높이>.png 와 world_sheet.png
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));
const LOOK = process.argv[2] || '스프링 송';
const SIZES = process.argv[3] ? process.argv[3].split(',').map(t => t.split('x').map(Number)) : [[1280, 720], [400, 800], [960, 540]];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const rows = [], shots = [];
for (const [W, H] of SIZES) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
  await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
  await page.goto('http://local.test/');
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.evaluate(([n, noPost]) => { __game.CFG.groggyOn = false; __game.CFG.relicDraft = false; __game.CFG.style = n; if (noPost) __game.CFG.postOn = false; __game.applyStyle(); }, [LOOK, !!process.env.NOPOST]); // NOPOST=1: 후처리 없이 (원인 가르기용)
  await page.keyboard.press('Digit2');
  await page.waitForFunction(() => __game.G.running);
  await page.evaluate(() => {
    const { G } = __game; const B = G.boss, [P1, P2] = G.players;
    B.cd = 999; B.pos.set(0, 0, 0); P1.pos.set(0.4, 0, 3.4); P1.yaw = Math.PI; P2.pos.set(3.6, 0, -1.4); P2.yaw = -Math.PI / 2;
    B.target = P1; B.begin('slam'); B.t = B.atk.windup * 0.7;
    P1.state = 'receive'; P1.receiveStart = G.now; P1.forceRcv = 999;
    G.running = false;
    document.getElementById('hud').hidden = true; document.getElementById('tuneBtn').hidden = true;
  });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => new Promise(ok => { const c = __game.camera.position.clone(); requestAnimationFrame(() => requestAnimationFrame(() => ok(c.distanceTo(__game.camera.position) < 1e-4))); }), null, { timeout: 120000, polling: 200 });
  const f = path.join(out, `world_${W}x${H}.png`);
  await page.screenshot({ path: f });
  shots.push({ name: `${W}×${H}`, f });
  const r = await page.evaluate(() => new Promise(done => {
    const { camera, scene, THREE, G, renderer } = __game;
    // 1) 가장자리 광선: 화면 테두리 24곳
    const rc = new THREE.Raycaster(); rc.far = 190;
    const targets = []; scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible && o.material && !o.material.transparent && o.geometry?.type !== 'SphereGeometry') targets.push(o); });
    let miss = 0; const misses = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 24, side = Math.floor(t * 4), u = (t * 4) % 1 * 2 - 1;
      const ndc = [[u, 0.985], [0.985, -u], [-u, -0.985], [-0.985, u]][side];
      rc.setFromCamera(new THREE.Vector2(...ndc), camera);
      const hit = rc.intersectObjects(targets, false)[0];
      if (!hit) { miss++; misses.push(ndc.map(v => +v.toFixed(2))); }
    }
    // 2) 예고 원 대비: 예고를 켠 프레임과 끈 프레임을 비교해 테두리 픽셀을 찾고,
    //    ① 그 자리 맨바닥과의 대비(bare) ② 테두리 바로 바깥 8px 띠와의 대비(local, 눈이 실제로 보는 대비)
    const B = G.boss, teleGroup = B.tele?.g, style_world = (teleGroup?.children.length || 0) > 3;
    let stage = 0, A = null;
    renderer.info.autoReset = false;
    window.__afterFrame = rr => {
      const gl = rr.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (stage === 0) { renderer.info.reset(); stage = 1; return; }
      if (stage === 1) { A = { px, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; renderer.info.autoReset = true; if (teleGroup) teleGroup.visible = false; stage = 2; return; }
      if (stage === 2) { stage = 3; return; } // 한 프레임 쉬고
      window.__afterFrame = null; if (teleGroup) teleGroup.visible = true;
      const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const Y = (p, i) => 0.2126 * lin(p[i]) + 0.7152 * lin(p[i + 1]) + 0.0722 * lin(p[i + 2]);
      // 원 둘레를 화면에 투영해 같은 자리를 잰다: 테두리(r-0.05m), 바로 바깥(r+0.12m), 바깥 바닥(r+0.6m)
      const c3 = teleGroup.position, R = teleGroup.userData.radius, v = new THREE.Vector3();
      const at = (p, rr, an) => { v.set(c3.x + Math.cos(an) * rr, 0.03, c3.z + Math.sin(an) * rr).project(camera); const x = Math.round((v.x * 0.5 + 0.5) * w), y = Math.round((v.y * 0.5 + 0.5) * h); return x >= 0 && y >= 0 && x < w && y < h ? Y(p, (y * w + x) * 4) : null; };
      const avg = (p, rr) => { let s = 0, n = 0; for (let k = 0; k < 360; k++) { const y = at(p, rr, k / 360 * Math.PI * 2); if (y !== null) { s += y; n++; } } return s / Math.max(1, n); };
      const ringY = avg(A.px, R - (style_world ? 0.075 : 0.05)), bandY = avg(A.px, R + 0.12), outY = avg(A.px, R + 0.6), bareY = avg(px, R - 0.05);
      const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const ring = { length: 360 };
      const prof = []; for (let d = -0.4; d <= 0.61; d += 0.05) prof.push(+avg(A.px, R + d).toFixed(3)); // 테두리를 가로지르는 휘도 단면
      done({ miss, misses, ring: +cr(ringY, bandY).toFixed(2), bare: +cr(ringY, bareY).toFixed(2), out: +cr(ringY, outY).toFixed(2), ringPx: ring.length, ringY: +ringY.toFixed(3), floorY: +bareY.toFixed(4), calls: A.calls, tris: A.tris, tele: !!teleGroup, prof });
    };
  }));
  rows.push({ size: `${W}x${H}`, ...r });
  console.log('  단면(r-0.4 → r+0.6, 0.05m):', r.prof.join(' '));
  console.log(`${W}×${H}  허공 ${r.miss}/24 ${r.misses.length ? JSON.stringify(r.misses) : ''}  예고 테두리 대비: 바로 바깥 ${r.ring}:1 · 바깥 바닥 ${r.out}:1 · 예고 없는 같은 자리 ${r.bare}:1  (테두리 휘도 ${r.ringY}, 바닥 ${r.floorY})  그리기 ${r.calls}회 · 삼각형 ${r.tris}`);
  await page.close();
}
const sheet = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const b64 = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
await sheet.setContent(`<style>body{margin:0;background:#07080c;color:#e8ecf6;font:600 18px sans-serif;display:flex;flex-wrap:wrap;gap:8px;padding:8px;align-items:flex-start}
figure{margin:0}img{display:block;border-radius:3px;max-height:820px}figcaption{padding:4px 2px}</style>${shots.map(s => `<figure><img src="${b64(s.f)}" style="width:${s.name.startsWith('400') ? 300 : 900}px"><figcaption>${s.name}</figcaption></figure>`).join('')}`);
await sheet.screenshot({ path: path.join(out, 'world_sheet.png'), fullPage: true });
await browser.close();
const ok = !errors.length && rows.every(r => r.miss === 0 && r.ring >= 3);
console.log(JSON.stringify({ ok, errors }, null, 2));
process.exit(ok ? 0 : 1);
