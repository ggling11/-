// 아트 스타일 랩 테스트: 오류 없이 그려지는지, 폰 폭에서 가로 스크롤이 없는지, 순간별 스크린샷.
//
//   cd prototype/test && npm install && node art.mjs
//
// 스크린샷은 prototype/test/out/art_*.png 에 저장된다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'art-lab.html'), 'utf8');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function open(viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
  await page.goto('http://local.test/');
  await page.waitForFunction(() => window.__lab, null, { timeout: 20000 });
  return page;
}
const shot = async (page, name, opts) => {
  await page.evaluate(o => window.__lab.set(o), opts);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, `art_${name}.png`) });
};
const results = {};

// 데스크톱: 모아 보기 세 순간 + 검사 모드
const desk = await open({ width: 1280, height: 760 });
await shot(desk, 'grid_windup', { playing: false, tau: 1.3 });
await shot(desk, 'grid_hap', { playing: false, tau: 1.78 });
await shot(desk, 'grid_shock', { playing: false, tau: 4.8 });
await shot(desk, 'grid_hap_shape', { playing: false, tau: 1.78, shape: 1 });
await shot(desk, 'grid_value', { playing: false, tau: 1.3, shape: 0, check: 1 });
await shot(desk, 'grid_sil', { playing: false, tau: 1.3, shape: 1, check: 2 });
results.desktopTiles = await desk.evaluate(() => [...document.querySelectorAll('.tile')].filter(t => !t.hidden).length);
await shot(desk, 'single_night_shape', { playing: false, tau: 1.3, shape: 1, check: 0, view: 'single', single: 1 });
await shot(desk, 'single_ink', { playing: false, tau: 1.78, shape: 1, check: 0, view: 'single', single: 3 });

// 폰 세로: 모아 보기 + 하나씩
const phone = await open({ width: 390, height: 844 });
await shot(phone, 'phone_grid', { playing: false, tau: 1.78 });
results.phoneOverflow = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth);
await shot(phone, 'phone_single', { playing: false, tau: 1.78, view: 'single', single: 1 });
results.phoneOverflowSingle = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth);
// 재생 중에도 오류 없이 몇 프레임 진행
await phone.evaluate(() => window.__lab.set({ playing: true }));
await phone.waitForTimeout(800);

await browser.close();
const ok = results.desktopTiles === 7 && !results.phoneOverflow && !results.phoneOverflowSingle && !errors.length;
console.log(JSON.stringify({ ok, results, errors }, null, 2));
process.exit(ok ? 0 : 1);
