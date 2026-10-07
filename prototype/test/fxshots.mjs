// [알파] 이펙트 시간 순서 연속 사진 (docs/실험/알파-스프링송-프롬프트.md 단계 5)
//
//   cd prototype/test && npm install && node fxshots.mjs [룩 이름]
//
// 판정을 멈춘 장면에서 이펙트를 한 번 터뜨리고 정해진 시각(0.03, 0.06, 0.1, 0.2, 0.35, 0.6, 1.0, 2.0초)에 찍는다.
// 순서가 맞는지 본다: ① 흰 섬광 → ② 가로 번짐 → ③ 불꽃 줄기 → ④ 먼지 → ⑤ 균열.
// 함께 재는 것: 프레임마다 화면 평균 휘도 → 섬광이 0.1초 안에 가라앉는지
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').replace('window.__game = {', 'window.__game = { cineFx, impactStar,');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));
const LOOK = process.argv[2] || '스프링 송';
const TIMES = [0.03, 0.06, 0.1, 0.2, 0.35, 0.6, 1.0, 2.0];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 520, height: 400 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
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
  const { G, THREE } = __game, B = G.boss, [P1, P2] = G.players;
  B.cd = 999; B.pos.set(0, 0, 0); B.yaw = Math.PI / 4; P1.pos.set(1.6, 0, 1.9); P1.yaw = -Math.PI * 0.75; P2.pos.set(-2.4, 0, 1.4); P2.yaw = Math.PI * 0.4;
  G.running = false; for (const id of ['hud', 'tuneBtn']) document.getElementById(id).hidden = true;
  const c = new THREE.Vector3(0.6, 1.0, 1.2), dir = new THREE.Vector3(13, 13, 13).normalize();
  window.__camHook = cam => { cam.position.copy(c).addScaledVector(dir, 9.5); cam.lookAt(c); };
  // 1/60초씩 정확히: __hold 프레임만 굴리고 멈춘다. 휘도도 기록
  let last = performance.now(); window.__hold = 0; window.__lum = [];
  window.__afterFrame = r => {
    const now = performance.now(), d = Math.max(1, now - last); last = now;
    if (window.__rec) { const gl = r.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let s = 0, n = 0; for (let i = 0; i < px.length; i += 4 * 37) { s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; n++; } window.__lum.push([+(G.time - window.__t0).toFixed(3), +(s / n).toFixed(1)]); }
    if (window.__hold > 0) { window.__hold--; G.timeScale = window.__hold > 0 ? Math.min(1, (1000 / 60) / Math.min(50, d)) : 0; } else G.timeScale = 0;
  };
});
const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const advanceTo = t => page.evaluate(t => new Promise(r => { const go = () => { if (__game.G.time - window.__t0 >= t - 1 / 120) { window.__hold = 0; requestAnimationFrame(() => requestAnimationFrame(r)); } else { window.__hold = 2; requestAnimationFrame(go); } }; go(); }), t);
const strips = [];
for (const [kind, name] of [['clash', '받아낸 순간 (받기 성공)'], ['slam', '보스 내려찍기 (지형 파쇄)'], ['hap', '합 (금빛)']]) {
  await page.evaluate(() => { window.__hold = 0; __game.G.timeScale = 0; });
  for (let i = 0; i < 6; i++) await settle();
  await page.evaluate(kind => {
    const { G, THREE } = __game; window.__t0 = G.time; window.__lum = []; window.__rec = true;
    const p = kind === 'slam' ? new THREE.Vector3(0.4, 0, 1.6) : new THREE.Vector3(0.9, 1.2, 1.1);
    __game.cineFx(kind, p);
    if (kind === 'clash') __game.impactStar(p, 0.9, 0.2, false); // 정확한 받기에서 함께 나오는 것
    if (kind === 'hap') __game.impactStar(p, 1.5, 0.24, false);
  }, kind);
  const shots = [];
  for (const t of TIMES) { await advanceTo(t); const f = path.join(out, `fx_${kind}_${t}.png`); await page.screenshot({ path: f }); shots.push({ f, t }); }
  const lum = await page.evaluate(() => { window.__rec = false; return window.__lum; });
  strips.push({ name, shots, lum });
}
const sheet = await browser.newPage({ viewport: { width: 1640, height: 1000 } });
const b64 = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
await sheet.setContent(`<style>body{margin:0;background:#07080c;color:#e8ecf6;font:600 14px sans-serif;padding:6px}h3{margin:8px 2px 4px}div{display:grid;grid-template-columns:repeat(8,1fr);gap:3px}figure{margin:0}img{width:100%;display:block}figcaption{font-weight:400;font-size:12px}</style>
${strips.map(s => `<h3>${s.name}</h3><div>${s.shots.map(x => `<figure><img src="${b64(x.f)}"><figcaption>${x.t}초</figcaption></figure>`).join('')}</div>`).join('')}`);
await sheet.screenshot({ path: path.join(out, 'fx_sheet.png'), fullPage: true });
await browser.close();
for (const s of strips) {
  const base = s.lum.find(([t]) => t > 1.5)?.[1] ?? s.lum.at(-1)?.[1], peak = Math.max(...s.lum.map(l => l[1]));
  const over = s.lum.filter(([t, l]) => l > base + (peak - base) * 0.5).map(l => l[0]);
  console.log(`${s.name}: 평균 휘도 바탕 ${base} → 최고 ${peak}, 절반 넘게 밝은 시간 ${over.length ? (over.at(-1) - over[0] + 1 / 60).toFixed(3) : 0}초`);
}
console.log(JSON.stringify({ ok: !errors.length, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
