// [알파] 움직임 연속 사진 (docs/실험/알파-스프링송-프롬프트.md 단계 4)
//
//   cd prototype/test && npm install && node motion.mjs [룩 이름]
//
// 자동 관람을 1/60초씩 정확히 굴리며(사이사이 멈춤) 장면별 연속 사진을 찍는다.
//   ① 보스 내려찍기: 예비 동작 → 꽂힘 → 회복 (0.1초 간격)
//   ② 휘두르기 (1/30초 간격)  ③ 걷기·달리기
// 재는 것: 천이 몸 구 안으로 파고든 점의 최대 수(0이어야 통과), 뼈 변환에 NaN이 있는지
// prototype/test/out/motion_*.png, motion_sheet.png
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

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.evaluate(n => { __game.CFG.relicDraft = false; __game.CFG.style = n; __game.applyStyle(); }, LOOK);
await page.keyboard.press('Digit4');
await page.waitForFunction(() => __game.G.mode === 'demo' && __game.G.running);
await page.evaluate(() => {
  for (const id of ['hud', 'demoBar', 'tuneBtn', 'caption', 'texts']) { const e = document.getElementById(id); if (e) e.hidden = true; }
  // 1/60초씩: 매 프레임 그린 뒤 다음 프레임의 시간 배율을 맞춘다. __hold > 0이면 그만큼 프레임을 굴리고 멈춘다
  const { G } = __game; let last = performance.now(); window.__hold = 1e9; window.__pen = 0; window.__nan = 0;
  window.__afterFrame = () => {
    const now = performance.now(), d = Math.max(1, now - last); last = now;
    // 천 검사
    for (const o of [G.boss, ...G.players]) { const M = o.hfM; if (!M?.on) continue; let n = 0; for (const c of [...M.cloths, ...M.chains]) { const k = c.penetrations(); n += k; if ((c.depth || 0) > (window.__depth || 0)) { window.__depth = c.depth; const cols = __game.hfColWorld(M, c.o.legs !== false); let ci = -1, cm = 0; for (let i = 0; i < c.p.length; i++) { if (c.pinF(i)) continue; cols.forEach((cc, j) => { const m = __game.hfDepth(c.p[i], [cc])[1]; if (m > cm) { cm = m; ci = j + (cc.b ? '(캡슐)' : '(구)') + ' 점' + i; } }); } window.__deepWho = (o === G.boss ? 'boss' : o.char.key) + ':' + (M.cloths.includes(c) ? 'cloth' + M.cloths.indexOf(c) : 'chain' + M.chains.indexOf(c)) + ' state=' + o.state + ' speed=' + M.mo.speed.toFixed(1) + ' strip=' + (window.__strip || '') + ' 충돌체=' + ci + ' dt=' + (G.time - (window.__lastT || 0)).toFixed(4) + ' hold=' + window.__hold; } if (k) window.__penWho = (o === G.boss ? 'boss' : o.char.key) + ':' + (M.cloths.includes(c) ? 'cloth' + M.cloths.indexOf(c) : 'chain' + M.chains.indexOf(c)) + '=' + k; } window.__pen = Math.max(window.__pen, n); M.root.traverse(b => { if (!Number.isFinite(b.position.x + b.quaternion.x)) window.__nan++; }); }
    window.__lastT = G.time;
    if (window.__drive && window.__hold > 1) window.__drive(); // 다음 프레임이 시간이 흐르는 프레임일 때만 옮긴다
    if (window.__hold > 0) { window.__hold--; G.timeScale = window.__hold > 0 ? Math.min(1, (1000 / 60) / Math.min(50, d)) : 0; } else G.timeScale = 0;
  };
});
const run = n => page.evaluate(n => new Promise(r => { window.__hold = n; const w = () => (window.__hold > 0 ? requestAnimationFrame(w) : requestAnimationFrame(() => requestAnimationFrame(r))); w(); }), n);
const free = () => page.evaluate(() => { window.__hold = 1e9; });
async function follow(who, dist) {
  await page.evaluate(([who, dist]) => {
    const { G, THREE } = __game, o = who === 'boss' ? G.boss : who === 'p1' ? G.players[0] : who === 'p2' ? G.players[1] : null;
    const dir = new THREE.Vector3(13, 13, 13).normalize();
    window.__camHook = cam => { const c = o ? o.pos.clone() : G.boss.pos.clone().lerp(G.players[0].pos, 0.5); c.y = who === 'boss' ? 1.9 : 0.9; cam.position.copy(c).addScaledVector(dir, dist); cam.lookAt(c); };
  }, [who, dist]);
}
const strips = [];
async function strip(name, who, dist, cond, n, every, file) {
  await page.evaluate(f => { window.__strip = f; }, file);
  await free();
  await page.waitForFunction(cond, null, { timeout: 240000, polling: 'raf' });
  await page.evaluate(() => { window.__hold = 0; __game.G.timeScale = 0; });
  await follow(who, dist);
  const shots = [];
  for (let i = 0; i < n; i++) {
    await run(i === 0 ? 1 : every);
    const f = path.join(out, `motion_${file}_${i}.png`); await page.screenshot({ path: f }); shots.push(f);
  }
  strips.push({ name, shots });
}
await strip('보스 내려찍기 · 예비 동작 → 꽂힘 → 회복 (0.1초 간격)', 'boss', 13, () => { const B = __game.G.boss; return B.state === 'windup' && B.atk && /slam/i.test(B.atk.kind) && B.t / B.atk.windup > 0.15; }, 12, 6, 'slam');
await strip('휘두르기 (1/30초 간격)', 'p2', 7, () => __game.G.players.some(p => p.state === 'attack' && p.t < 0.03) && (window.__who = __game.G.players.find(p => p.state === 'attack')), 12, 2, 'swing');
await strip('움직임 · 걷기와 달리기 (0.05초 간격)', 'p1', 8, () => __game.G.players.some(p => p.hfM?.mo.speed > 2.5 && p.state === 'free') && (window.__walker = 1), 12, 3, 'walk');
// ④ 걷기·달리기 옆모습: 판정을 멈추고 한 사람을 원을 따라 몰아 본다 (다리 IK·천의 뒤따름)
async function gait(name, who, speed, file) {
  await page.evaluate(f => { window.__strip = f; }, file);
  await page.evaluate(([who, speed]) => {
    const { G, THREE } = __game, p = G.players[who], o = G.players[1 - who]; G.running = false; G.boss.root.visible = false; o.root.visible = false;
    p.state = 'free'; p.root.visible = true; p.pos.set(0, 0, 0); let a = 0;
    window.__drive = () => { a += speed / 60 / 9; p.pos.set(Math.sin(a) * 9, 0, Math.cos(a) * 9 - 9); p.yaw = a + Math.PI / 2; }; // 반지름 9m 원 (거의 직선)
    window.__camHook = cam => { const c = p.pos.clone(); c.y = 0.95; const side = new THREE.Vector3(Math.sin(a), 0.3, Math.cos(a)).normalize(); cam.position.copy(c).addScaledVector(side, 5.2); cam.lookAt(c); }; // 진행 방향의 옆
  }, [who, speed]);
  await run(40);
  const shots = [];
  for (let i = 0; i < 12; i++) { await run(3); const f = path.join(out, `motion_${file}_${i}.png`); await page.screenshot({ path: f }); shots.push(f); }
  strips.push({ name, shots });
  await page.evaluate(() => { window.__drive = null; });
}
await gait('2P 제비 달리기 6m/s · 옆모습 (0.05초 간격)', 1, 6, 'run2');
await gait('1P 모루 걷기 3.5m/s · 옆모습 (0.05초 간격)', 0, 3.5, 'walk1');
const res = await page.evaluate(() => ({ pen: window.__pen, nan: window.__nan, who: window.__penWho, depth: window.__depth || 0, deep: window.__deepWho }));
const sheet = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const b64 = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
await sheet.setContent(`<style>body{margin:0;background:#07080c;color:#e8ecf6;font:600 15px sans-serif;padding:6px}h3{margin:8px 2px 4px}div{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}img{width:100%;display:block}</style>
${strips.map(s => `<h3>${s.name}</h3><div>${s.shots.map(f => `<img src="${b64(f)}">`).join('')}</div>`).join('')}`);
await sheet.screenshot({ path: path.join(out, 'motion_sheet.png'), fullPage: true });
await browser.close();
const ok = !errors.length && res.pen === 0 && res.nan === 0;
console.log(`천이 몸 구 안으로 3% 넘게 들어간 점(최대) ${res.pen}${res.who ? ' (마지막: ' + res.who + ')' : ''} · 가장 깊이 ${(res.depth * 100).toFixed(1)}cm (${res.deep}) · 뼈 NaN ${res.nan}`);
console.log(JSON.stringify({ ok, errors }, null, 2));
process.exit(ok ? 0 : 1);
