// [알파] 스프링 송 룩: 자동 관람을 실제로 돌리며 순간별로 찍는다 (오라, 궤적, 파편, 충격파는 움직여야 보인다)
//
//   cd prototype/test && npm install && node springsong.mjs
//
// prototype/test/out/ss_*.png, ss_sheet.png
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
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
await page.evaluate(() => { __game.CFG.relicDraft = false; __game.CFG.style = '스프링 송'; __game.applyStyle(); });
const title = path.join(out, 'ss_0_title.png');
await page.waitForTimeout(1500);
await page.screenshot({ path: title });
await page.keyboard.press('Digit4'); // 합 연출 보기 (자동)
await page.waitForFunction(() => __game.G.mode === 'demo' && __game.G.running);
await page.evaluate(() => { document.getElementById('hud').hidden = true; document.getElementById('demoBar').hidden = true; __game.CFG.freezePerfect = 2.0; });
const shots = [];
const wait = (fn, t = 240000) => page.waitForFunction(fn, null, { timeout: t });
async function snap(name, file) { const f = path.join(out, file); await page.screenshot({ path: f }); shots.push({ name, f }); }

await wait(() => { const B = __game.G.boss; return B.state === 'windup' && B.t / B.atk.windup > 0.7; });
await snap('예비 동작 · 검은 오라와 붉은 맥', 'ss_1_windup.png');
await wait(() => __game.G.players.some(p => p.state === 'attack' && !p.hitDone && p.t > p.windup * 0.6));
await snap('휘두르는 중 · 빛의 궤적', 'ss_1b_swing.png');
await wait(() => __game.G.boss.state === 'gap' || __game.G.boss.state === 'stagger');
await page.waitForTimeout(250);
await snap('받아낸 순간 · 불꽃, 흙먼지, 충격파, 균열', 'ss_2_clash.png');
await wait(() => !!__game.G.release && __game.G.impact === 0);
await snap('완벽한 합 · 정지', 'ss_3_freeze.png');
await page.evaluate(() => { __game.CFG.freezePerfect = 0.3; });
await wait(() => !__game.G.release && !!__game.G.slow);
await page.waitForTimeout(200);
await snap('완벽한 합 · 해방 (슬로모션)', 'ss_4_release.png');
await wait(() => __game.G.boss.state === 'chase', 60000);
await wait(() => { const B = __game.G.boss; return B.state === 'windup' && B.t / B.atk.windup > 0.85; });
await snap('다음 예비 동작 · 역할 교대', 'ss_5_windup2.png');
await wait(() => __game.G.boss.state === 'stagger');
await snap('합 · 휘청임', 'ss_6_stagger.png');

const sheet = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const b64 = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
await sheet.setContent(`<style>body{margin:0;background:#07080c;color:#e8ecf6;font:600 18px sans-serif;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:8px}
figure{margin:0}img{width:100%;display:block;border-radius:3px}figcaption{padding:4px 2px}</style>${shots.map(s => `<figure><img src="${b64(s.f)}"><figcaption>${s.name}</figcaption></figure>`).join('')}`);
await sheet.screenshot({ path: path.join(out, 'ss_sheet.png'), fullPage: true });
await browser.close();
console.log(JSON.stringify({ ok: !errors.length, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
