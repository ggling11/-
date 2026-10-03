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

// ── 보스 B: 오르덴 ──
// 4) 2막 삼연 내려찍기: 1P가 셋 다 받으면 마지막에 길어진 틈 → 2P 합
await page.keyboard.press('Escape');
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.phase = 2; B.pos.set(0, 0, 0); B.yaw = 0; P1.pos.set(0, 0, 4.5); P2.pos.set(0, 0, -3.4); P2.yaw = 0;
  B.target = P1; B.begin('combo');
});
await page.keyboard.down('KeyG');
await page.screenshot({ path: path.join(out, '4_combo_windup.png') });
await waitState(() => __game.G.boss.state !== 'windup', 30000);
results.comboState = await ev(() => ({ state: __game.G.boss.state, gapT: __game.G.boss.gapT, receive: __game.G.stats.receive }));
await page.keyboard.up('KeyG');
await ev(() => __game.G.players[1].startAttack());
await waitState(() => __game.G.boss.state !== 'gap');
results.comboHap = await ev(() => __game.G.stats.hap);

// 5) 3막 양손 맞내려찍기(듀오): 둘 다 받으면 맞받기 → 같이 치면 쌍합
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.phase = 3; B.state = 'chase'; B.hideOpen(); B.pos.set(0, 0, 0); B.yaw = 0;
  P1.reset(P1.pos.set(3.4, 0, 1), 0); P2.reset(P2.pos.set(-3.4, 0, 1), 0); P1.pos.set(3.4, 0, 1); P2.pos.set(-3.4, 0, 1);
  B.begin('twin');
});
await page.keyboard.down('KeyG'); await page.keyboard.down('KeyL');
await waitState(() => __game.G.boss.atk.strikes.every(s => s.tele || s.done) && __game.G.boss.t > 0.6);
await page.screenshot({ path: path.join(out, '5_twin_windup.png') });
await waitState(() => __game.G.boss.state !== 'windup', 30000);
results.twinGap = await ev(() => ({ state: __game.G.boss.state, mode: __game.G.boss.gapMode, mutual: __game.G.stats.mutual }));
await page.keyboard.up('KeyG'); await page.keyboard.up('KeyL');
await page.screenshot({ path: path.join(out, '6_mutual_gap.png') });
await waitState(() => __game.G.players.every(p => p.state === 'free'));
await ev(() => { __game.G.players.forEach(p => p.startAttack()); });
await waitState(() => __game.G.boss.state !== 'gap');
results.twinHap = await ev(() => __game.G.stats.twin);
await page.screenshot({ path: path.join(out, '7_twin_hap.png') });

// 6) 쓸어내기는 받기 불가: 받기 자세여도 맞는다
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.hp = B.maxHp; B.pendingPhase = 0; B.pos.set(0, 0, 0); B.yaw = 0;
  P1.reset(V0(P1), 0); P1.pos.set(0, 0, 4); P2.pos.set(0, 0, -6);
  function V0(p) { return p.pos.clone(); }
  B.target = P1; B.begin('sweep');
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup', 30000);
results.sweep = await ev(() => ({ state: __game.G.boss.state, p1: __game.G.players[0].state }));
await page.keyboard.up('KeyG');

// 7) 사이 뛰어들기: 두 사람 사이에 떨어진다. 1P만 받으면 틈은 2P 쪽으로
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.pos.set(0, 0, -9); P1.state = P2.state = 'free';
  P1.pos.set(-2.5, 0, 2); P2.pos.set(2.5, 0, 2);
  B.begin('midSlam');
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup', 30000);
results.leap = await ev(() => { const B = __game.G.boss; return { state: B.state, bx: +B.pos.x.toFixed(2), openX: +B.openDir.x.toFixed(2) }; });
await page.keyboard.up('KeyG');

// 8) 막 전환: 체력이 60% 아래로 내려가면 포효 → 2막
await ev(() => { const B = __game.G.boss; B.state = 'chase'; B.hideOpen(); B.phase = 1; B.hp = B.maxHp; B.damage(B.maxHp * 0.45); });
await waitState(() => __game.G.boss.phase === 2);
results.phase = await ev(() => __game.G.boss.state);
await page.screenshot({ path: path.join(out, '8_phase2.png') });

// 9) 혼자 하기 3막 양손 엇박: A 받기 → 태그 → B 받기 = 맞받기 → 치고 태그 = 쌍합
await page.keyboard.press('Escape');
await page.keyboard.press('Digit1');
await waitState(() => __game.G.mode === 'solo' && __game.G.running);
await ev(() => {
  const { G, ORD } = __game; const B = G.boss, A = G.players[0];
  ORD.twinSoloOffset = 1.0;   // 느린 헤드리스에서 태그할 시간
  B.phase = 3; B.pos.set(0, 0, 0); B.yaw = 0; A.pos.set(0, 0, 4); B.target = A; B.begin('twin');
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.atk.strikes[0].done, 30000);
results.soloFirstRecoil = await ev(() => __game.G.players[0].state);
await ev(() => { __game.G.tagCd = 0; });
await page.keyboard.press('KeyQ');   // G를 누른 채 태그 → B가 받기 자세로 들어온다
await waitState(() => __game.G.active === 1);
results.soloTagStance = await ev(() => __game.G.players[1].state);
await waitState(() => __game.G.boss.state !== 'windup', 30000);
results.soloTwinGap = await ev(() => ({ state: __game.G.boss.state, mode: __game.G.boss.gapMode }));
await page.keyboard.up('KeyG');
await waitState(() => __game.G.players[__game.G.active].state === 'free');
await ev(() => { const { G } = __game; G.players[G.active].startAttack(); });
await waitState(() => __game.G.boss.mutualHits.length === 1);
await ev(() => { __game.G.tagCd = 0; __game.tryTag(false); });
await waitState(() => __game.G.boss.state !== 'gap');
results.soloTwinHap = await ev(() => __game.G.stats.twin);

// 10) 기존 보스(문지기)도 그대로 동작
await page.keyboard.press('Escape');
await page.keyboard.press('KeyB');
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.pos.set(0, 0, 0); P1.pos.set(0, 0, 3); P2.pos.set(0, 0, -3.2); P2.yaw = 0; P1.yaw = Math.PI;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.12;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
await page.keyboard.press('KeyK');
await waitState(() => __game.G.boss.state !== 'gap');
results.gatekeeper = await ev(() => ({ name: __game.G.boss.name, hap: __game.G.stats.hap }));

// 3) 모바일 폭에서 가로 스크롤이 없는지
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 400, height: 800 });
results.mobileOverflow = await ev(() => document.documentElement.scrollWidth > innerWidth);
await page.screenshot({ path: path.join(out, '3_mobile_title.png') });

await browser.close();
const ok = results.duoReceive === 'gap' && results.duoHap === 1 && results.practiceReceive === 'gap' && results.practiceHap === 1 && !results.mobileOverflow && !errors.length
  && results.comboState.state === 'gap' && results.comboState.gapT > 2.0 && results.comboState.receive === 3 && results.comboHap === 1
  && results.twinGap.mode === 'mutual' && results.twinHap === 1
  && results.sweep.p1 === 'hurt' && results.leap.state === 'gap' && results.leap.openX > 0.5
  && results.phase === 'roar'
  && results.soloFirstRecoil === 'recoil' && results.soloTagStance === 'receive' && results.soloTwinGap.mode === 'mutual' && results.soloTwinHap === 1
  && results.gatekeeper.hap === 1 && results.gatekeeper.name.includes('문지기');
console.log(JSON.stringify({ ok, results, errors }, null, 2));
process.exit(ok ? 0 : 1);
