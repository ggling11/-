// [알파] 레퍼런스 룩 테스트: 룩마다 같은 전투 순간을 찍고, 한 장의 비교판으로 묶는다.
//
//   cd prototype/test && npm install && node looks.mjs
//
// prototype/test/out/look_*.png 와 look_sheet.png 가 생긴다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));
const LOOKS = ['기본 툰', '하데스', '퓨리', '하이파이 러시', '데스 도어', '하이퍼 라이트', '디 어센트'];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
await page.evaluate(() => { __game.CFG.groggyOn = false; __game.CFG.relicDraft = false; });
await page.keyboard.press('Digit2');
await page.waitForFunction(() => __game.G.running);
// 장면 고정: 1P가 받기 자세, 보스 내려찍기 예비 동작 70%, 2P는 등 뒤에서 휘두르는 중
await page.evaluate(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.cd = 999; B.pos.set(0, 0, 0); P1.pos.set(0.4, 0, 3.4); P1.yaw = Math.PI; P2.pos.set(3.6, 0, -1.4); P2.yaw = -Math.PI / 2;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup * 0.7;
  P1.state = 'receive'; P1.receiveStart = G.now; P1.forceRcv = 999;
  G.running = false; // 멈춘 채로 그리기만
  document.getElementById('hud').hidden = true; document.getElementById('tuneBtn').hidden = true;
});
const shots = [];
async function scene2() { // 틈이 열린 순간: 금색 부채꼴이 2P 쪽, 2P가 휘두르는 중
  await page.evaluate(() => {
    const { G } = __game; const B = G.boss, [P1, P2] = G.players;
    B.state = 'gap'; B.hapDone = false; B.gapReceivers = [P1]; B.openDir.set(0, 0, -1); B.showOpen();
    B.tele?.dispose(); B.tele = null;
    P1.state = 'recoil'; P1.t = 9; P2.pos.set(1.6, 0, -3.4); P2.yaw = Math.PI - 0.4; P2.state = 'attack'; P2.t = 0.05; P2.windup = 0.2; P2.recover = 0.2; P2.hitDone = false;
  });
}
async function scene1() {
  await page.evaluate(() => {
    const { G } = __game; const B = G.boss, [P1, P2] = G.players;
    B.hideOpen(); B.state = 'chase'; B.begin('slam'); B.t = B.atk.windup * 0.7; P1.state = 'receive'; P2.state = 'free'; P2.pos.set(3.6, 0, -1.4);
  });
}
for (const name of LOOKS) {
  await page.evaluate(n => { __game.CFG.style = n; __game.applyStyle(); }, name);
  await scene1();
  await page.waitForTimeout(1200);
  const f = path.join(out, `look_${LOOKS.indexOf(name)}a.png`);
  await page.screenshot({ path: f });
  await scene2();
  await page.waitForTimeout(800);
  const f2 = path.join(out, `look_${LOOKS.indexOf(name)}b.png`);
  await page.screenshot({ path: f2 });
  shots.push({ name, f, f2 });
}
// 비교판
const sheet = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const b64 = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const imgs = shots.map(s => `<figure><img src="${b64(s.f)}"><figcaption>${s.name} · 예비 동작</figcaption></figure><figure><img src="${b64(s.f2)}"><figcaption>${s.name} · 틈 열림</figcaption></figure>`).join('');
await sheet.setContent(`<style>body{margin:0;background:#0d0f16;color:#eee;font:600 18px sans-serif;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:8px}
figure{margin:0}img{width:100%;display:block;border-radius:3px}figcaption{padding:4px 2px}</style>${imgs}`);
await sheet.screenshot({ path: path.join(out, 'look_sheet.png'), fullPage: true });
await browser.close();
console.log(JSON.stringify({ ok: !errors.length, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
