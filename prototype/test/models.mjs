// [알파] 캐릭터 모델 비교판 (docs/실험/알파-스프링송-프롬프트.md 단계 3)
//
//   cd prototype/test && npm install && node models.mjs [룩 이름]
//
// 찍는 것: 보스·1P·2P를 하나씩 세워 ① 게임 각도 확대 ② 정면 ③ 옆 ④ 실루엣(160px, 검은 덩어리)
// 재는 것: 실루엣 겹침 IoU (키를 맞춰 겹쳤을 때 겹치는 넓이 비율, 낮을수록 서로 다르게 생김) — 셋 다 0.6 미만이면 통과
//         모델 뼈 수·그리기 호출
// prototype/test/out/model_sheet.png, model_sil.png
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
const POSE = process.argv[3] || 'idle';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.evaluate(n => { __game.CFG.groggyOn = false; __game.CFG.relicDraft = false; __game.CFG.style = n; __game.applyStyle(); }, LOOK);
await page.keyboard.press('Digit2');
await page.waitForFunction(() => __game.G.running);
await page.evaluate(() => {
  const { G } = __game; G.boss.cd = 999; G.running = false;
  for (const id of ['hud', 'tuneBtn', 'demoBar']) { const e = document.getElementById(id); if (e) e.hidden = true; }
});
// 대상 하나만 가운데 세운다. pose: idle / attack(휘두르기 직전) / windup(보스 내려찍기 예비 동작)
async function stage(who, pose) {
  await page.evaluate(([who, pose]) => {
    const { G } = __game, B = G.boss, [P1, P2] = G.players, all = [B, P1, P2];
    const subj = who === 'boss' ? B : who === 'p1' ? P1 : P2;
    for (const o of all) { o.root.visible = o === subj; o.pos.set(o === subj ? 0 : 60, 0, o === subj ? 0 : 60); }
    B.tele?.dispose(); B.tele = null; B.state = 'chase'; B.atk = null; B.hideOpen?.();
    for (const p of [P1, P2]) { p.state = 'free'; p.t = 0; }
    subj.yaw = Math.PI / 4 - 0.45;
    if (pose === 'attack' && subj !== B) { subj.state = 'attack'; subj.t = subj.windup * 0.95; subj.hitDone = false; }
    if (pose === 'windup' && subj === B) { B.target = P1; P1.pos.set(0, 0, 4); B.begin('slam'); B.t = B.atk.windup * 0.7; B.tele?.dispose(); B.tele = null; B.yaw = Math.PI / 4 - 0.45; }
    window.__subj = subj;
  }, [who, pose]);
  for (let i = 0; i < 4; i++) await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function shoot(view, file) {
  await page.evaluate(view => {
    const s = window.__subj, h = s === __game.G.boss ? 4.3 : 1.9, c = new __game.THREE.Vector3(0, h * 0.5, 0);
    const d = h * 2.1;
    const dirs = { game: [13, 16, 13], front: [0.7, 0.25, 0.7], side: [1, 0.2, -1], back: [-0.7, 0.3, -0.7] };
    const v = new __game.THREE.Vector3(...dirs[view]).normalize().multiplyScalar(view === 'game' ? d * 1.15 : d);
    window.__camHook = cam => { cam.position.copy(c).add(v); cam.lookAt(c); };
  }, view);
  for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: file });
}
// 실루엣: 대상의 몸(spin 아래)만 검게, 나머지는 모두 숨기고 흰 바탕에 바로 그린다 → 덩어리 마스크
async function silhouette() {
  return page.evaluate(() => {
    const { scene, camera, renderer, THREE } = __game, s = window.__subj;
    const keep = new Set(); s.spin.traverse(o => keep.add(o));
    const vis = []; scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !keep.has(o)) { vis.push([o, o.visible]); o.visible = false; } });
    const bg = scene.background, fog = scene.fog, ov = scene.overrideMaterial;
    scene.background = new THREE.Color(0xffffff); scene.fog = null; scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    scene.background = bg; scene.fog = fog; scene.overrideMaterial = ov; for (const [o, v] of vis) o.visible = v;
    const m = new Uint8Array(w * h); let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let i = 0; i < w * h; i++) if (px[i * 4] < 128) { m[i] = 1; const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    // 키 160px로 맞춘 마스크 (가로 가운데 정렬, 160×160 칸, 위가 위)
    const H = 160, k = (y1 - y0 + 1) / H, cx = (x0 + x1) / 2, out = new Uint8Array(H * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < H; x++) { const sx = Math.round(cx + (x - H / 2) * k), sy = Math.round(y1 - y * k); if (sx >= 0 && sx < w && sy >= 0 && sy < h && m[sy * w + sx]) out[y * H + x] = 1; }
    const cv = document.createElement('canvas'); cv.width = cv.height = H; const g = cv.getContext('2d'), img = g.createImageData(H, H);
    for (let i = 0; i < H * H; i++) { const v = out[i] ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    return { mask: Array.from(out), url: cv.toDataURL() };
  });
}
const subjects = [['boss', '보스 · 수문장'], ['p1', '1P · 모루'], ['p2', '2P · 제비']];
const shots = [], sils = {};
for (const [who, name] of subjects) {
  const pose = who === 'boss' ? (POSE === 'attack' ? 'windup' : 'idle') : POSE;
  await stage(who, pose);
  for (const view of ['game', 'front', 'side', 'back']) { const f = path.join(out, `model_${who}_${view}.png`); await shoot(view, f); shots.push({ name: `${name} · ${view}`, f }); }
  await shoot('game', path.join(out, `model_${who}_game.png`));
  sils[who] = await silhouette();
  fs.writeFileSync(path.join(out, `model_${who}_sil.png`), Buffer.from(sils[who].url.split(',')[1], 'base64'));
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };
const pairs = { 'boss-p1': iou(sils.boss.mask, sils.p1.mask), 'boss-p2': iou(sils.boss.mask, sils.p2.mask), 'p1-p2': iou(sils.p1.mask, sils.p2.mask) };
const calls = await page.evaluate(() => { const r = __game.renderer; r.info.autoReset = false; r.info.reset(); return new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => { const c = r.info.render.calls; r.info.autoReset = true; ok(c); }))); });
const sheet = await browser.newPage({ viewport: { width: 1600, height: 1300 } });
const b64 = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
await sheet.setContent(`<style>body{margin:0;background:#07080c;color:#e8ecf6;font:600 15px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px}
figure{margin:0}img{width:100%;display:block;border-radius:3px}figcaption{padding:3px 2px}</style>${shots.map(s => `<figure><img src="${b64(s.f)}"><figcaption>${s.name}</figcaption></figure>`).join('')}`);
await sheet.screenshot({ path: path.join(out, 'model_sheet.png'), fullPage: true });
await sheet.setContent(`<body style="margin:0;background:#fff;display:flex;gap:16px;padding:16px;font:600 14px sans-serif">${subjects.map(([w, n]) => `<figure style="margin:0;text-align:center"><img src="${sils[w].url}" style="width:160px;height:160px;border:1px solid #ccc"><figcaption>${n}</figcaption></figure>`).join('')}</body>`);
await sheet.setViewportSize({ width: 560, height: 220 });
await sheet.screenshot({ path: path.join(out, 'model_sil.png') });
await browser.close();
const ok = !errors.length && Object.values(pairs).every(v => v < 0.6);
console.log(`실루엣 겹침 IoU: 보스-1P ${pairs['boss-p1'].toFixed(2)} · 보스-2P ${pairs['boss-p2'].toFixed(2)} · 1P-2P ${pairs['p1-p2'].toFixed(2)}  (0.6 미만 통과)  그리기 ${calls}회`);
console.log(JSON.stringify({ ok, errors }, null, 2));
process.exit(ok ? 0 : 1);
