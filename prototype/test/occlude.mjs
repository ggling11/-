// [알파] 이펙트가 판정 표시를 가리는 시간 (docs/실험/알파-스프링송-프롬프트.md 단계 5)
//
//   cd prototype/test && npm install && node occlude.mjs [룩 이름] [초]
//
// 자동 관람을 1/60초씩 굴리며, 두 프레임마다 "이펙트만" 회색 바탕에 다시 그려서
// 보스 예고 원 테두리(24점)와 받기 고리(16점) 자리가 이펙트로 덮였는지 본다.
//   덮임 = 회색에서 30 넘게 달라진 픽셀. 화면 전체를 덮는 흰 섬광(DOM)·집중선은 진하면(0.5 넘게) 전부 덮은 것으로 친다.
//   한 표시의 점 절반 넘게 덮인 프레임이 이어진 가장 긴 시간 < 0.25초면 통과.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  .replace('window.__game = {', 'window.__game = { hfImpactTest: p => { hfFlare(p, 0, 9, 0xffffff, 0.3); const f = hfFlares[hfFlares.length - 1]; f.m.scale.set(12, 12, 1); f.m.quaternion.copy(camera.quaternion); }, fxObjs, parts, cine, hfGhosts, hfSparks, hfFlares, get hfSlash() { return hfSlash; },');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));
const LOOK = process.argv[2] || '스프링 송', SECS = +(process.argv[3] || 20);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.evaluate(n => { __game.CFG.relicDraft = false; __game.CFG.style = n; __game.applyStyle(); }, LOOK);
await page.keyboard.press('Digit4');
await page.waitForFunction(() => __game.G.mode === 'demo' && __game.G.running);
const res = await page.evaluate(([secs, selftest]) => new Promise(done => {
  const g = __game, { G, THREE, scene, camera, renderer } = g;
  let last = performance.now(), frame = 0, t0 = G.time;
  const run = { tele: 0, ring: 0 }, worst = { tele: 0, ring: 0 }, seen = { tele: 0, ring: 0 }, covFrames = { tele: 0, ring: 0 };
  const gray = new THREE.Color(0x808080);
  const fxRoots = () => {
    const s = new Set();
    const add = o => o && o.traverse(c => s.add(c));
    g.fxObjs.forEach(f => add(f.obj)); g.parts.forEach(p => add(p.m)); g.hfGhosts.forEach(h => add(h.g)); g.hfFlares.forEach(f => add(f.m));
    add(g.hfSparks.mesh); if (g.hfSlash) { add(g.hfSlash.core); add(g.hfSlash.rim); }
    const c = g.cine; [c.dust, c.smoke, c.glow].forEach(x => add(x.pts)); c.trails.forEach(t => add(t.mesh)); c.debris.forEach(d => add(d.m));
    return s;
  };
  window.__afterFrame = () => {
    const now = performance.now(), d = Math.max(1, now - last); last = now;
    G.timeScale = Math.min(1, (1000 / 60) / Math.min(50, d));
    frame++;
    if (frame % 2) return;
    const dtPair = (G.time - (window.__tPrev ?? G.time)); window.__tPrev = G.time;
    // 판정 표시 자리 (세계 → 화면)
    const pts = { tele: [], ring: [] }, B = G.boss;
    if (B.tele?.g?.userData.radius) { const c = B.tele.g.position, R = B.tele.g.userData.radius - 0.07; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pts.tele.push(new THREE.Vector3(c.x + Math.cos(a) * R, 0.04, c.z + Math.sin(a) * R)); } }
    for (const p of G.players) if (p.ring.visible && p.root.visible) { const c = p.pos; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.ring.push(new THREE.Vector3(c.x + Math.cos(a) * 0.95, 0.04, c.z + Math.sin(a) * 0.95)); } }
    if (selftest && B.tele?.g) g.hfImpactTest(B.tele.g.position.clone().setY(0.3)); // 자체 검사: 일부러 예고 원 위에 큰 섬광
    // 이펙트만 회색 바탕에
    const keep = fxRoots(), hidden = [];
    scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !keep.has(o)) { hidden.push(o); o.visible = false; } });
    const bg = scene.background, fog = scene.fog; scene.background = gray; scene.fog = null;
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    scene.background = bg; scene.fog = fog; hidden.forEach(o => (o.visible = true));
    const overlay = G.flash > 0.5 || G.lines > 0.5;
    for (const k of ['tele', 'ring']) {
      if (!pts[k].length) { run[k] = 0; continue; }
      seen[k]++;
      let cov = 0;
      for (const v of pts[k]) { const s = v.clone().project(camera), x = Math.round((s.x * 0.5 + 0.5) * w), y = Math.round((s.y * 0.5 + 0.5) * h); if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = (y * w + x) * 4; if (Math.max(Math.abs(px[i] - 128), Math.abs(px[i + 1] - 128), Math.abs(px[i + 2] - 128)) > 30) cov++; }
      const occ = overlay || cov > pts[k].length * 0.5;
      if (occ) { covFrames[k]++; run[k] += dtPair; worst[k] = Math.max(worst[k], run[k]); } else run[k] = 0;
    }
    if (G.time - t0 > secs) { window.__afterFrame = null; G.timeScale = 1; done({ worst, seen, covFrames, simSec: +(G.time - t0).toFixed(1) }); }
  };
}), [SECS, !!process.env.SELFTEST]);
await browser.close();
const ok = !errors.length && res.worst.tele < 0.25 && res.worst.ring < 0.25;
console.log(`가장 오래 가린 시간: 예고 원 ${res.worst.tele.toFixed(3)}초 · 받기 고리 ${res.worst.ring.toFixed(3)}초 (기준 0.25초 미만)  · 본 프레임 예고 ${res.seen.tele}/덮임 ${res.covFrames.tele}, 고리 ${res.seen.ring}/덮임 ${res.covFrames.ring} · 관람 ${res.simSec}초`);
console.log(JSON.stringify({ ok, errors }, null, 2));
process.exit(ok ? 0 : 1);
