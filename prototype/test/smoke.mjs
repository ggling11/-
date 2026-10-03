// 프로토타입 스모크 테스트
// 클라우드 세션에서는 jsdelivr CDN이 막혀 있어서, npm으로 받은 three / lil-gui로 요청을 대신 응답한다.
//
//   cd prototype/test && npm install && node smoke.mjs
//
// 스크린샷은 prototype/test/out/ 에 저장된다.
// 헤드리스 크로미움은 프레임이 매우 느리므로 "실제 시간"이 아니라 게임 상태(G.boss.state 등)를 기다린다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
// 아티팩트 게시 때처럼 문서 뼈대로 감싸서 연다
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 15000 });
await page.screenshot({ path: path.join(out, '0_title.png') });

const ev = f => page.evaluate(f);
const waitState = (f, timeout = 15000) => page.waitForFunction(f, null, { timeout });
const results = {};

// 1) 둘이 하기: 1P 정확한 받기(G) → 2P 틈 공격(K) → 합
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.pos.set(0, 0, 0); P1.pos.set(0, 0, 3); P2.pos.set(0, 0, -3.2); P2.yaw = 0; P1.yaw = Math.PI;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.12;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
results.duoReceive = await ev(() => __game.G.boss.state);
await page.keyboard.up('KeyG');
await page.keyboard.press('KeyK');
await waitState(() => __game.G.boss.state !== 'gap');
results.duoHap = await ev(() => __game.G.stats.hap);
await page.screenshot({ path: path.join(out, '1_duo_hap.png') });

// 2) 혼자 듀오 연습: A 받기 자세 유지한 채 Q → B로 틈 공격
await page.keyboard.press('Escape');
await page.keyboard.press('Digit3');
await waitState(() => __game.G.mode === 'practice' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, [A, Bc] = G.players;
  B.cd = 99; B.pos.set(0, 0, 0); A.pos.set(0, 0, 3); Bc.pos.set(0.5, 0, -3.4); A.yaw = Math.PI;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.players[0].state === 'receive');
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.active === 1);
await page.keyboard.up('KeyG');
await ev(() => { const { G } = __game; G.boss.target = G.players[0]; G.boss.begin('slam'); G.boss.t = G.boss.atk.windup - 0.05; });
await waitState(() => __game.G.boss.state !== 'windup');
results.practiceReceive = await ev(() => __game.G.boss.state);
await page.keyboard.press('KeyF');
await waitState(() => __game.G.boss.state !== 'gap');
results.practiceHap = await ev(() => __game.G.stats.hap);
await page.screenshot({ path: path.join(out, '2_practice_hap.png') });

// 3) 합 연출 보기: 자동으로 합과 완벽한 합이 나오는지, 완벽한 합 정지 화면, 기존 연출로 바꿔도 도는지
await page.keyboard.press('Escape');
await page.keyboard.press('Digit4');
await waitState(() => __game.G.mode === 'demo' && __game.G.running);
await ev(() => { __game.CFG.freezePerfect = 2.5; }); // 헤드리스는 느려서 정지 화면을 찍으려면 길게
await waitState(() => __game.G.stats.hap - __game.G.stats.perfect >= 1, 180000);
results.demoHap = await ev(() => __game.G.stats.hap);
await waitState(() => !!__game.G.release && __game.G.impact === 0, 180000);
await page.screenshot({ path: path.join(out, '3_demo_perfect_freeze.png') });
results.demoFreeze = await ev(() => ({ cine: document.body.classList.contains('cine'), stamp: document.getElementById('stamp').classList.contains('go') }));
await ev(() => { __game.CFG.freezePerfect = 0.3; });
await waitState(() => !__game.G.release && __game.G.slow, 60000);
await page.screenshot({ path: path.join(out, '4_demo_release.png') });
await waitState(() => __game.G.stats.perfect >= 2, 240000); // 'trust' (믿고 먼저) 순서까지
results.demoPerfect = await ev(() => __game.G.stats.perfect);
await page.click('#fxBtn');
const before = await ev(() => __game.G.stats.hap);
await page.waitForFunction(n => __game.G.stats.hap > n, before, { timeout: 180000 });
results.demoOldFx = await ev(() => __game.CFG.fx);

// 4) 모바일 폭에서 가로 스크롤이 없는지
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 400, height: 800 });
results.mobileOverflow = await ev(() => document.documentElement.scrollWidth > innerWidth);
await page.screenshot({ path: path.join(out, '5_mobile_title.png') });

await browser.close();
const ok = results.duoReceive === 'gap' && results.duoHap === 1 && results.practiceReceive === 'gap' && results.practiceHap === 1 && results.demoHap >= 1 && results.demoFreeze?.cine && results.demoFreeze?.stamp && results.demoPerfect >= 2 && results.demoOldFx === '기존'
  && !results.mobileOverflow && !errors.length;
console.log(JSON.stringify({ ok, results, errors }, null, 2));
process.exit(ok ? 0 : 1);
