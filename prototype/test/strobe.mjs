// [알파] 사건 깜빡임 검사: 자동 관람(합·완벽한 합이 계속 나온다)을 60fps 간격으로 돌리며 화면 평균 밝기를 기록한다.
//   strobe = 밝기가 프레임 사이 크게(>18) 오르고 3프레임 안에 크게 내려가는 횟수 (번쩍-꺼짐 반복)
//   flashes = 큰 밝기 변화 횟수
// 기준: 10초 동안 strobe 0 (섬광은 부드럽게 사라져야 한다)
//   node strobe.mjs [룩 이름]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));
const look = process.argv[2] || '스프링 송', SECONDS = +(process.argv[3] || 10);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.route('http://local.test/hf.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.existsSync(path.join(here, '..', 'hf.js')) ? fs.readFileSync(path.join(here, '..', 'hf.js')) : 'export {}' }));
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
await page.evaluate(n => { __game.CFG.relicDraft = false; __game.CFG.style = n; __game.applyStyle(); }, look);
await page.keyboard.press('Digit4');
await page.waitForFunction(() => __game.G.mode === 'demo' && __game.G.running);
const r = await page.evaluate(sec => new Promise(done => {
  const { G } = __game; const means = []; let last = performance.now(), simT = 0;
  const flashEl = document.getElementById('flash');
  window.__afterFrame = renderer => {
    const now = performance.now(), d = Math.max(1, now - last); last = now;
    G.timeScale = Math.min(1, (1000 / 60) / Math.min(50, d)); simT += 1 / 60;
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let s = 0, n = 0; for (let i = 0; i < px.length; i += 4 * 16) { s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; n++; }
    // 화면 위에 덮이는 흰 섬광(DOM)도 실제 눈에 보이므로 더한다
    const fo = +(flashEl.style.opacity || 0); means.push(s / n * (1 - fo * 0.6) + 255 * fo * 0.6);
    if (simT >= sec) {
      window.__afterFrame = null; G.timeScale = 1;
      let strobe = 0, flashes = 0;
      for (let i = 1; i < means.length; i++) {
        const up = means[i] - means[i - 1];
        if (Math.abs(up) > 18) flashes++;
        if (up > 18) for (let k = i + 1; k <= Math.min(means.length - 1, i + 3); k++) if (means[k] - means[k - 1] < -18) { strobe++; break; }
      }
      done({ frames: means.length, strobe, flashes, min: Math.min(...means).toFixed(1), max: Math.max(...means).toFixed(1) });
    }
  };
}), SECONDS);
await browser.close();
console.log(JSON.stringify({ look, ...r, ok: r.strobe === 0 && !errors.length, errors }));
process.exit(r.strobe === 0 && !errors.length ? 0 : 1);
