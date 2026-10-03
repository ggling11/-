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
results.impactAfter = await ev(() => __game.G.players[0].impact);
results.released = await ev(() => __game.G.stats.released);
await page.screenshot({ path: path.join(out, '4_release.png') });

// 5) [알파] 충격 한계에서 받으면 자세가 무너지고 틈이 안 열린다
await ev(() => {
  const { G } = __game; const B = G.boss, [P1] = G.players;
  B.state = 'chase'; B.pos.set(0, 0, 0); P1.state = 'free'; P1.pos.set(0, 0, 3); P1.impact = 3; P1.rcvCd = 0;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup - 0.12;
});
await page.keyboard.down('KeyG');
await waitState(() => __game.G.boss.state !== 'windup');
await page.keyboard.up('KeyG');
results.breakState = await ev(() => [__game.G.boss.state, __game.G.players[0].state, __game.G.stats.broken]);

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

// 7) [알파] 솔로 교대 받기: A가 범위 안에 있을 때 Q → B가 받기 자세로 들어와 틈을 연다
await page.keyboard.press('Escape');
await page.keyboard.press('Digit1');
await waitState(() => __game.G.mode === 'solo' && __game.G.running);
await ev(() => {
  const { G } = __game; const B = G.boss, [A] = G.players;
  B.pos.set(0, 0, 0); A.pos.set(0, 0, 3); B.target = A; B.begin('slam'); B.t = B.atk.windup - 0.1;
});
await page.keyboard.press('KeyQ');
await waitState(() => __game.G.active === 1);
results.tagCoverState = await ev(() => __game.G.players[1].state);
await waitState(() => __game.G.boss.state !== 'windup');
results.tagCover = await ev(() => [__game.G.boss.state, __game.G.stats.save, __game.G.players[1].impact]);

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

// 3) 모바일 폭에서 가로 스크롤이 없는지
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 400, height: 800 });
results.mobileOverflow = await ev(() => document.documentElement.scrollWidth > innerWidth);
await page.screenshot({ path: path.join(out, '3_mobile_title.png') });

await browser.close();
const alpha = results.impactFull === 3 && results.releaseDmg === (10 + 3 * 10) * 3 && results.impactAfter === 0 && results.released === 3
  && results.breakState[0] !== 'gap' && results.breakState[1] === 'hurt' && results.breakState[2] === 1
  && results.coverDash === 'cover' && results.cover[0] === 'gap' && results.cover[1] === 'free' && results.cover[2] === 1
  && results.tagCoverState === 'receive' && results.tagCover[0] === 'gap' && results.tagCover[1] === 1 && results.tagCover[2] >= 1;
const ok = alpha && results.duoReceive === 'gap' && results.duoHap === 1 && results.duoFinOpen && results.duoFin === 1
  && results.unison.n === 1 && results.soloReceive === 'gap' && results.soloHap === 1 && results.soloFin.fin === 1 && results.soloFin.active === 0
  && results.practiceReceive === 'gap' && results.practiceHap === 1 && results.practiceFin === 1 && results.aimHap === 1 && results.aimHapDamage >= 45 && results.aimClearedAfter === 0 && results.soloAimHap === 1
  && !results.mobileOverflow && !errors.length;
console.log(JSON.stringify({ ok, results, errors }, null, 2));
process.exit(ok ? 0 : 1);
