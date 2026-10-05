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
// 이전 시나리오들은 '받기 한 번 = 틈' 규칙을 전제로 한다. [알파] 그로기 시나리오에서만 켠다
await page.evaluate(() => { __game.CFG.groggyOn = false; __game.CFG.relicDraft = false; });
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
// 1-2) 받은 1P가 반동 중에 공격을 눌러 두면 반동이 풀릴 때 맺기
results.duoFinOpen = await ev(() => !!__game.G.fin);
await page.keyboard.press('KeyF');
await waitState(() => __game.G.stats.fin === 1 || !__game.G.fin);
results.duoFin = await ev(() => __game.G.stats.fin);
await page.screenshot({ path: path.join(out, '1b_duo_fin.png') });
// 1-3) 기세 가득 + 완벽한 합 → 합기
await waitState(() => __game.G.boss.state === 'chase');
await ev(() => {
  const { G, addMom } = __game; const B = G.boss, [P1, P2] = G.players;
  G.mom = 99; addMom(5);
  B.pos.set(0, 0, 0); P1.pos.set(0, 0, 3); P2.pos.set(0, 0, -3.2); P2.yaw = 0; P1.yaw = Math.PI;
  P1.state = P2.state = 'free';
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.12;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
await page.keyboard.press('KeyK');
await waitState(() => __game.G.stats.hap === 2);
results.unison = await ev(() => ({ n: __game.G.stats.unison, mom: __game.G.mom }));
await page.screenshot({ path: path.join(out, '1c_unison.png') });

// 1-4) 혼자 하기: 받기 → Q(합) → Q(맺기)
await page.keyboard.press('Escape');
await page.keyboard.press('Digit1');
await waitState(() => __game.G.mode === 'solo' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, A = G.players[0];
  B.pos.set(0, 0, 0); A.pos.set(0, 0, 3); A.yaw = Math.PI;
  B.target = A; B.begin('slam'); B.t = B.atk.windup - 0.12;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
results.soloReceive = await ev(() => __game.G.boss.state);
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.stats.hap === 1 || __game.G.boss.state !== 'gap');
results.soloHap = await ev(() => __game.G.stats.hap);
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.stats.fin === 1 || !__game.G.fin);
results.soloFin = await ev(() => ({ fin: __game.G.stats.fin, active: __game.G.active }));
await page.screenshot({ path: path.join(out, '1d_solo_fin.png') });

// 1-5) 캐릭터: 받기 상성 + 제비가 돌진을 흘리고(잘 맞는 받기) → Q 모루 낙하로 합
results.fit = await ev(() => { const { G, fit } = __game; const [m, j] = G.players; return [fit(m, 'slam'), fit(m, 'charge'), fit(j, 'slam'), fit(j, 'charge')].join(','); });
await waitState(() => __game.G.boss.state === 'chase');
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.active === 1);
await ev(() => {
  const { G } = __game; const B = G.boss, J = G.players[1];
  G.tagCd = 0; B.cd = 99; B.pos.set(0, 0, -2); J.pos.set(0, 0, 6); J.yaw = Math.PI; J.state = 'free';
  const M = G.players[0]; if (M.echo) { M.echo = false; M.root.visible = false; M.state = 'free'; } // [알파] 앞선 태그의 잔상이 돌진 길에 남지 않게
  B.target = J; B.begin('charge'); B.t = B.atk.windup - 0.02;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state === 'gap' || __game.G.boss.state === 'recover');
await page.keyboard.up('KeyG');
results.jebiCharge = await ev(() => ({ state: __game.G.boss.state, fit: __game.G.stats.fitReceive }));
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.stats.hap === 2 || __game.G.boss.state !== 'gap');
results.moruDropHap = await ev(() => ({ hap: __game.G.stats.hap, active: __game.G.active }));
await page.screenshot({ path: path.join(out, '1e_moru_drop.png') });

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
// 연습: Q로 받은 캐릭터 A로 넘겨서 맺기
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.active === 0);
await waitState(() => __game.G.players[0].state === 'free' || !__game.G.fin);
await page.keyboard.press('KeyF');
await waitState(() => __game.G.stats.fin === 1 || !__game.G.fin);
results.practiceFin = await ev(() => __game.G.stats.fin);

// 4) [알파] 충격 해방: 1P 충격 2칸에서 정확한 받기(→3칸) → 2P 합 → 충격이 피해로 풀리고 0칸 (피해량을 정확히 보므로 노림은 끈다)
await page.keyboard.press('Escape');
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
await ev(() => {
  const { G, CFG } = __game; const B = G.boss, [P1, P2] = G.players; CFG.aimOn = false;
  B.pos.set(0, 0, 0); P1.pos.set(0, 0, 3); P2.pos.set(0, 0, -3.2); P2.yaw = 0; P1.yaw = Math.PI; P1.impact = 2;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.12;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
results.impactFull = await ev(() => __game.G.players[0].impact);
await page.keyboard.up('KeyG');
const hpBefore = await ev(() => __game.G.boss.hp);
await page.keyboard.press('KeyK');
await waitState(() => __game.G.boss.state !== 'gap');
results.releaseDmg = await page.evaluate(h => h - __game.G.boss.hp, hpBefore);
results.jebiDmg = await ev(() => __game.CHARS.jebi.dmg); // 2P는 제비: (제비 피해 + 충격 3칸 × 10) × 완벽한 합 배율
results.impactAfter = await ev(() => __game.G.players[0].impact);
results.released = await ev(() => __game.G.stats.released);
await page.screenshot({ path: path.join(out, '4_release.png') });

// 5) [알파] 충격 한계에서 버티기로 받으면 자세가 무너지고 틈이 안 열린다
await ev(() => {
  const { G } = __game; const B = G.boss, [P1] = G.players;
  B.state = 'chase'; B.pos.set(0, 0, 0); P1.state = 'free'; P1.pos.set(0, 0, 3); P1.impact = 3; P1.rcvCd = 0;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.6;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
results.breakState = await ev(() => [__game.G.boss.state, __game.G.players[0].state, __game.G.stats.broken]);

// 5b) [알파] 충격 한계여도 정확한 받기는 버틴다 (세키로처럼)
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.cd = 99; B.pos.set(0, 0, 0); P1.state = 'free'; P1.pos.set(0, 0, 3); P1.impact = 3; P1.rcvCd = 0;
  P2.state = 'free'; P2.pos.set(-9, 0, -6);
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.05;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
results.perfectAtFull = await ev(() => [__game.G.boss.state, __game.G.players[0].impact, __game.G.stats.broken]);

// 5c) [알파] 광역 공유 받기: 휩쓸기를 1P만 받아도 범위 안 2P는 안 맞는다
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.cd = 99; B.pos.set(0, 0, 0);
  for (const p of G.players) { p.state = 'free'; p.t = 0; p.rcvCd = 0; p.impact = 0; }
  P1.pos.set(0, 0, 3); P2.pos.set(0, 0, -3);
  B.target = P1; B.begin('sweep'); B.t = B.atk.windup - 0.05;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
results.shared = await ev(() => [__game.G.boss.state, __game.G.players[1].state, __game.G.stats.shield]);

// 5d) [알파] 끼어들기: 나도 범위 안이어도, 8m 떨어져 있어도 된다
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.cd = 99; B.pos.set(0, 0, 0);
  for (const p of G.players) { p.state = 'free'; p.t = 0; p.rcvCd = 0; p.impact = 0; }
  P1.pos.set(0, 0, 3.2); P2.pos.set(-7, 0, -1);
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.45;
});
results.helpRing = await ev(() => __game.G.players[1].canCover());
await page.keyboard.down('KeyL');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyL');
results.coverFar = await ev(() => [__game.G.boss.state, __game.G.players[0].state, __game.G.stats.save]);
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.cd = 99; B.pos.set(0, 0, 0);
  for (const p of G.players) { p.state = 'free'; p.t = 0; p.rcvCd = 0; p.impact = 0; }
  P1.pos.set(0, 0, 3.2); P2.pos.set(1.3, 0, 3.4);
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.45;
});
await page.keyboard.down('KeyL');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyL');
results.coverNear = await ev(() => [__game.G.boss.state, __game.G.players[0].state, __game.G.stats.save]);
await ev(() => { __game.G.stats.save = 0; });

// 6) [알파] 끼어들기: 1P가 내려찍기 범위에 서 있고 받기 안 함 → 2P가 받기 → 뛰어들어 대신 받기 → 틈, 1P 무사
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.cd = 99; B.pos.set(0, 0, 0);
  for (const p of G.players) { p.state = 'free'; p.t = 0; p.rcvCd = 0; p.impact = 0; }
  P1.pos.set(0, 0, 3.2); P2.pos.set(4.5, 0, 3.2);
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.45;
});
await page.keyboard.down('KeyL');
await waitState(() => __game.G.players[1].state === 'cover' || __game.G.boss.state !== 'windup');
results.coverDash = await ev(() => __game.G.players[1].state);
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyL');
results.cover = await ev(() => [__game.G.boss.state, __game.G.players[0].state, __game.G.stats.save]);
await page.screenshot({ path: path.join(out, '5_cover.png') });

// 7) [알파] 솔로 잔상 받기: A가 내려찍기 범위에 있을 때 Q → A는 받기 자세 잔상으로 남고 B는 보스 반대편에 → 잔상이 받아 틈 → B가 바로 쳐서 합
await page.keyboard.press('Escape');
await page.keyboard.press('Digit1');
await waitState(() => __game.G.mode === 'solo' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, [A] = G.players;
  B.pos.set(0, 0, 0); A.pos.set(0, 0, 3); B.target = A; B.begin('slam'); B.t = B.atk.windup - 0.1;
});
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.active === 1);
results.echoStart = await ev(() => { const [A, Bc] = __game.G.players; return [A.echo, A.state, A.root.visible, Bc.pos.z < 0]; });
await waitState(() => __game.G.boss.state !== 'windup');
results.echoRcv = await ev(() => [__game.G.boss.state, __game.G.stats.echo, __game.G.players[0].impact]);
const hapBefore = await ev(() => __game.G.stats.hap);
await page.keyboard.press('KeyF');
await waitState(() => __game.G.boss.state !== 'gap');
results.echoHap = await page.evaluate(h => __game.G.stats.hap - h, hapBefore);
await waitState(() => !__game.G.players[0].echo);
results.echoGone = await ev(() => __game.G.players[0].root.visible);

// 8) 알파-2 시선과 노림 (듀오): 1P가 보스 정면에서 버티고 2P는 등 뒤에서 기다림 → 노림 가득 → 받기 → 노림 합
await page.keyboard.press('Escape');
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
await ev(() => {
  const { G, CFG } = __game; const B = G.boss, [P1, P2] = G.players; CFG.aimOn = true;
  B.cd = 99; B.pos.set(0, 0, 0); B.yaw = Math.PI; P1.pos.set(0, 0, -3); P2.pos.set(0, 0, 3.2); P2.yaw = Math.PI; B.target = P1;
});
await waitState(() => __game.G.players[1].aim >= 1, 30000);
results.aimFrontDot = await ev(() => { const { G } = __game; return +G.boss.forward().dot({ x: 0, y: 0, z: -1 }).toFixed(2); });
await page.screenshot({ path: path.join(out, '4_aim_full.png') });
const hp0 = await ev(() => __game.G.boss.hp);
await ev(() => { const { G } = __game; G.boss.begin('slam'); G.boss.t = G.boss.atk.windup - 0.12; });
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
await page.keyboard.press('KeyK');
await waitState(() => __game.G.boss.state !== 'gap');
results.aimHap = await ev(() => __game.G.stats.aimHap);
results.aimHapDamage = hp0 - await ev(() => __game.G.boss.hp);
results.aimClearedAfter = await ev(() => __game.G.players[1].aim);
await page.screenshot({ path: path.join(out, '4_aim_hap.png') });

// 9) 혼자 하기: A가 보스 코앞에서 버티는 동안 B 노림이 참 → 받기 → 태그 진입 노림 합. 틈 밖 태그는 노림을 날린다
await page.keyboard.press('Escape');
await page.keyboard.press('Digit1');
await waitState(() => __game.G.mode === 'solo' && __game.G.running);
await ev(() => { const { G } = __game; const B = G.boss, A = G.players[0]; B.cd = 99; B.pos.set(0, 0, 0); B.yaw = 0; A.pos.set(0, 0, 2.6); });
await waitState(() => __game.G.players[1].aim >= 1, 30000);
await ev(() => { const { G } = __game; G.boss.begin('slam'); G.boss.t = G.boss.atk.windup - 0.12; });
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.boss.state !== 'gap');
results.soloAimHap = await ev(() => __game.G.stats.aimHap);
results.soloBenchAimAfter = await ev(() => __game.G.players[0].aim);
await page.screenshot({ path: path.join(out, '5_solo_aim_hap.png') });

// 10) [A] 합 연출 보기: 자동으로 합과 완벽한 합이 나오는지, 완벽한 합 정지 화면, 기존 연출로 바꿔도 도는지
await page.keyboard.press('Escape');
await page.keyboard.press('Digit4');
await waitState(() => __game.G.mode === 'demo' && __game.G.running);
await ev(() => { __game.CFG.freezePerfect = 2.5; }); // 헤드리스는 느려서 정지 화면을 찍으려면 길게
await waitState(() => __game.G.stats.hap - __game.G.stats.perfect >= 1, 180000);
results.demoHap = await ev(() => __game.G.stats.hap);
await waitState(() => !!__game.G.release && __game.G.impact === 0, 180000);
await page.screenshot({ path: path.join(out, 'A1_demo_perfect_freeze.png') });
results.demoFreeze = await ev(() => ({ cine: document.body.classList.contains('cine'), stamp: document.getElementById('stamp').classList.contains('go') }));
await ev(() => { __game.CFG.freezePerfect = 0.3; });
await waitState(() => !__game.G.release && __game.G.slow, 60000);
await page.screenshot({ path: path.join(out, 'A2_demo_release.png') });
await waitState(() => __game.G.stats.perfect >= 2, 240000); // 'trust' (믿고 먼저) 순서까지
results.demoPerfect = await ev(() => __game.G.stats.perfect);
await page.click('#fxBtn');
const before = await ev(() => __game.G.stats.hap);
await page.waitForFunction(n => __game.G.stats.hap > n, before, { timeout: 180000 });
results.demoOldFx = await ev(() => __game.CFG.fx);


// 12) [알파] 그로기: 정확한 받기 두 번은 튕겨 낼 뿐(틈 없음), 세 번째에 그로기가 꽉 차며 틈
await page.keyboard.press('Escape');
await ev(() => { __game.CFG.groggyOn = true; __game.CFG.charDiff = false; });
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
results.groggy = [];
for (let i = 0; i < 3; i++) {
  await ev(() => {
    const { G } = __game; const B = G.boss, [P1, P2] = G.players;
    B.state = 'chase'; B.pos.set(0, 0, 0); P1.state = 'free'; P1.rcvCd = 0; P1.pos.set(0, 0, 3); P2.pos.set(0, 0, -3.2);
    B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.05;
  });
  await page.keyboard.down('KeyG');
  await waitState(() => __game.G.boss.state !== 'windup');
  await page.keyboard.up('KeyG');
  results.groggy.push(await ev(() => [__game.G.boss.state, Math.round(__game.G.boss.groggy)]));
}
await ev(() => { __game.CFG.groggyOn = false; __game.CFG.charDiff = true; });

// 13) [알파] 늙은 중 탈 번갈아 받기: 1P, 2P가 박자마다 번갈아 받으면 네 번째 박자에 틈.
//     1P가 연달아 받으려 하면 반동 때문에 못 받는다 (반동 중엔 받기 자세가 안 됨)
await page.keyboard.press('Escape');
await ev(() => { __game.CFG.boss = 'monk'; });
await page.keyboard.press('Digit2');
await waitState(() => __game.G.mode === 'duo' && __game.G.running);
results.monkName = await ev(() => document.getElementById('bossName').textContent);
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.cd = 99; B.pos.set(0, 0, 0); P1.pos.set(-1.2, 0, 3.5); P2.pos.set(1.2, 0, 3.5);
  B.target = P1; B.begin('chain');
});
results.chainBeats = [];
for (let i = 0; i < 4; i++) {
  // 박자 사이 시간은 그대로 흘려보낸다 (반동이 실제로 풀리는지가 핵심). 박자가 떨어지기 직전에 받기 자세
  if (i === 0) await ev(() => { const B = __game.G.boss; B.t = B.atk.windup - 0.3; });
  await page.waitForFunction(i => { const B = __game.G.boss; return B.state !== 'windup' || (B.atk.i === i && B.t > B.atk.windup - 0.12); }, i, { timeout: 15000 });
  await page.evaluate(i => {
    const { G } = __game; const p = G.players[i % 2];
    if (p.state === 'free') { p.state = 'receive'; p.receiveStart = G.now; p.forceRcv = 0.3; }
  }, i);
  await page.waitForFunction(i => __game.G.boss.state !== 'windup' || __game.G.boss.atk.i > i, i, { timeout: 15000 });
  results.chainBeats.push(await ev(() => [__game.G.boss.state, __game.G.boss.atk.i, __game.G.boss.atk.got]));
}
results.chain = await ev(() => [__game.G.boss.state, __game.G.stats.chain]);
// 같은 사람이 연달아: 1P만 받기 시도 → 두 번째 박자에서 1P는 반동 중이라 못 받고 끊김
await ev(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.state = 'chase'; B.cd = 99; B.pos.set(0, 0, 0);
  for (const p of G.players) { p.state = 'free'; p.t = 0; p.rcvCd = 0; p.impact = 0; }
  P1.pos.set(-1.2, 0, 3.5); P2.pos.set(1.2, 0, 3.5);
  B.target = P1; B.begin('chain');
});
results.chainSame = [];
for (let i = 0; i < 2; i++) {
  await ev(() => {
    const { G } = __game; const B = G.boss, p = G.players[0];
    B.t = B.atk.windup - 0.05;
    if (p.state === 'free') { p.state = 'receive'; p.receiveStart = G.now; p.forceRcv = 0.3; }
  });
  await waitState(() => __game.G.boss.state !== 'windup' || __game.G.boss.t < 0.2);
  results.chainSame.push(await ev(() => [__game.G.boss.state, __game.G.players[0].state]));
}
await ev(() => { __game.CFG.boss = 'gate'; });

// 14) [알파] 원정과 유물: 마당 1 유물 고르기 → 규칙이 바뀐 채 싸움 → 격파 → 다음 마당 → 유물 하나 더 → 상대가 바뀜 → 나가면 원래 설정
await page.keyboard.press('Escape');
await ev(() => { __game.CFG.relicDraft = true; __game.CFG.boss = 'gate'; });
const base = await ev(() => JSON.stringify(__game.CFG));
await page.keyboard.press('Digit2');
results.draftShown = await ev(() => !document.getElementById('draft').hidden && !__game.G.running && __game.G.run.offer.length === 3);
await ev(() => { __game.G.run.offer[0] = 'heavy'; });
await page.keyboard.press('Digit1');
await waitState(() => __game.G.running);
results.relic1 = await ev(() => [__game.G.run.relics.join(), __game.CFG.impactMax, document.getElementById('relicRow').textContent]);
await ev(() => __game.G.boss.damage(99999));
await waitState(() => !document.getElementById('result').hidden, 60000);
results.nextShown = await ev(() => !document.getElementById('nextBtn').hidden);
await page.keyboard.press('KeyN');
await waitState(() => !document.getElementById('draft').hidden);
await ev(() => { __game.G.run.offer[1] = 'thin'; });
await page.keyboard.press('Digit2');
await waitState(() => __game.G.running);
results.relic2 = await ev(() => [__game.G.run.relics.join(), __game.CFG.boss, __game.CFG.impactMax, document.getElementById('bossName').textContent.includes('늙은 중')]);
await ev(() => __game.G.boss.damage(99999));
await waitState(() => !document.getElementById('result').hidden, 60000);
results.runDone = await ev(() => [document.getElementById('resultTitle').textContent, document.getElementById('nextBtn').hidden]);
await page.keyboard.press('Escape');
results.restored = await page.evaluate(b => JSON.stringify(__game.CFG) === b, base);
await ev(() => { __game.CFG.relicDraft = false; });

// 15) [알파] 최고의 합 다시 보기: 합을 낸 뒤 보스를 쓰러뜨리면 결과 전에 다시 보기 → 키로 넘기면 결과 → V로 다시 보기
await page.keyboard.press('Escape');
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
await waitState(() => __game.G.stats.hap >= 1);
await ev(() => __game.G.boss.damage(99999));
await waitState(() => !!__game.G.replay, 60000);
results.replay = await ev(() => [__game.G.replay.c.frames.length, __game.G.replay.c.label, !document.getElementById('replayCap').hidden]);
await waitState(() => __game.G.replay.fired, 60000);
await page.screenshot({ path: path.join(out, '6_replay.png') });
await page.keyboard.press('Space');
await waitState(() => !document.getElementById('result').hidden);
results.replayAgain = await ev(() => !document.getElementById('replayBtn').hidden);
await page.keyboard.press('KeyV');
results.replayAgainOn = await ev(() => !!__game.G.replay);
await page.mouse.click(300, 300);
await waitState(() => !document.getElementById('result').hidden);

// 11) 모바일 폭에서 가로 스크롤이 없는지
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 400, height: 800 });
results.mobileOverflow = await ev(() => document.documentElement.scrollWidth > innerWidth);
await page.screenshot({ path: path.join(out, '5_mobile_title.png') });

await browser.close();
const grog = results.groggy.map(g => g[0]).join() === 'recover,recover,gap' && results.groggy[1][1] > results.groggy[0][1] && results.groggy[2][1] === 0;
const monk = results.monkName.includes('늙은 중') && results.chain[0] === 'gap' && results.chain[1] === 1
  && results.chainSame[0][0] === 'windup' && results.chainSame[1][0] === 'recover';
const relic = results.draftShown && results.relic1[0] === 'heavy' && results.relic1[1] === 4 && results.relic1[2].includes('무거운 어깨')
  && results.nextShown && results.relic2[0] === 'heavy,thin' && results.relic2[1] === 'monk' && results.relic2[2] === 4 && results.relic2[3]
  && results.runDone[0] === '원정 완료' && results.runDone[1] && results.restored;
const replay = results.replay[0] > 5 && results.replay[1].includes('합') && results.replay[2] && results.replayAgain && results.replayAgainOn;
const alpha = grog && monk && relic && replay && results.impactFull === 3 && results.releaseDmg === (results.jebiDmg + 3 * 10) * 3 && results.impactAfter === 0 && results.released === 3
  && results.breakState[0] !== 'gap' && results.breakState[1] === 'hurt' && results.breakState[2] === 1
  && results.coverDash === 'cover' && results.cover[0] === 'gap' && results.cover[1] === 'free' && results.cover[2] === 1
  && results.perfectAtFull[0] === 'gap' && results.perfectAtFull[1] === 3 && results.perfectAtFull[2] === 1
  && results.shared[0] === 'gap' && results.shared[1] !== 'hurt' && results.shared[2] === 1
  && results.helpRing === true && results.coverFar[0] === 'gap' && results.coverFar[1] !== 'hurt' && results.coverFar[2] === 1
  && results.coverNear[0] === 'gap' && results.coverNear[1] !== 'hurt' && results.coverNear[2] === 2
  && results.echoStart.join() === 'true,receive,true,true' && results.echoRcv[0] === 'gap' && results.echoRcv[1] === 1 && results.echoRcv[2] >= 1
  && results.echoHap === 1 && results.echoGone === false;
const ok = alpha && results.duoReceive === 'gap' && results.duoHap === 1 && results.duoFinOpen && results.duoFin === 1
  && results.unison.n === 1 && results.soloReceive === 'gap' && results.soloHap === 1 && results.soloFin.fin === 1 && results.soloFin.active === 0
  && results.fit === 'strong,weak,weak,strong' && results.jebiCharge.state === 'gap' && results.jebiCharge.fit === 2
  && results.moruDropHap.hap === 2 && results.moruDropHap.active === 0
  && results.practiceReceive === 'gap' && results.practiceHap === 1 && results.practiceFin === 1 && results.aimHap === 1 && results.aimHapDamage >= 45 && results.aimClearedAfter === 0 && results.soloAimHap === 1
  && !results.mobileOverflow && !errors.length
  && results.demoHap >= 1 && results.demoFreeze?.cine && results.demoFreeze?.stamp && results.demoPerfect >= 2 && results.demoOldFx === '기존';
console.log(JSON.stringify({ ok, results, errors }, null, 2));
process.exit(ok ? 0 : 1);
