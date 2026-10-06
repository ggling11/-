// [알파] 깜빡임 검사: 매 프레임 그린 직후 픽셀을 읽어 휘도 변화를 잰다 (60fps와 같은 시간 간격).
//
//   cd prototype/test && npm install && node flicker.mjs [룩 이름...]
//
// 재는 것 (휘도 0~255)
//   glob  = 프레임별 평균 휘도의 표준편차 (화면 전체가 출렁이는 정도)
//   jump  = 연속 프레임 사이 12 넘게 바뀐 픽셀 비율 %
//   back  = 밝아졌다가 바로 어두워진(또는 반대) 픽셀 비율 % — 움직임이 아닌 깜빡임
// 통과 기준 (docs/실험/알파-스프링송-프롬프트.md 단계 1): glob < 0.6, jump < 1.5, back < 0.5
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const mod = p => fs.readFileSync(path.join(here, 'node_modules', p));
const LOOKS = process.argv.slice(2).length ? process.argv.slice(2) : ['기본 툰', '하데스', '퓨리', '하이파이 러시', '데스 도어', '하이퍼 라이트', '디 어센트', '스프링 송'];
const LIMIT = { glob: 0.6, jump: 1.5, back: 0.5 };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('three/build/three.module.js') }));
await page.route('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/dist/lil-gui.esm.min.js', r => r.fulfill({ contentType: 'application/javascript', body: mod('lil-gui/dist/lil-gui.esm.min.js') }));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.route('http://local.test/hf.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.existsSync(path.join(here, '..', 'hf.js')) ? fs.readFileSync(path.join(here, '..', 'hf.js')) : 'export {}' }));
await page.route('http://local.test/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>' }));
await page.goto('http://local.test/');
await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
await page.evaluate(() => { __game.CFG.groggyOn = false; __game.CFG.relicDraft = false; });
await page.keyboard.press('Digit2');
await page.waitForFunction(() => __game.G.running);
await page.evaluate(() => {
  const { G } = __game; const B = G.boss, [P1, P2] = G.players;
  B.cd = 999; B.pos.set(0, 0, 0); P1.pos.set(0.4, 0, 3.4); P1.yaw = Math.PI; P2.pos.set(3.6, 0, -1.4); P2.yaw = -Math.PI / 2;
  B.target = P1; B.begin('slam'); B.t = B.atk.windup * 0.6;
  G.running = false; // 판정은 멈추고, 장식 애니메이션(입자·불빛·안개)은 그대로 돈다
  document.getElementById('hud').hidden = true;
});

async function measure(name) {
  await page.evaluate(n => { __game.CFG.style = n; __game.applyStyle(); __game.G.timeScale = 1; }, name);
  if (process.env.FLK_EVAL) await page.evaluate(new Function(process.env.FLK_EVAL)); // 원인 가르기용 (예: FLK_EVAL='__game.G.boss.setModel(false)')
  await page.waitForTimeout(1500); // 셰이더 컴파일과 입자 자리 잡기
  // 멈춘 뒤 카메라가 다시 자리 잡는 이동은 깜빡임이 아니다 → 카메라가 완전히 설 때까지 기다린다
  // 카메라를 빨리 자리 잡게 한 뒤(시간 배율 40), 정말 멈췄는지 확인한다 (측정 중 카메라가 움직이면 모든 모서리가 깜빡임으로 잡힌다)
  await page.evaluate(() => { __game.G.timeScale = 40; });
  for (let i = 0; i < 10; i++) await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => { __game.G.timeScale = 1; });
  await page.waitForFunction(() => new Promise(ok => { const c = __game.camera.position.clone(); requestAnimationFrame(() => requestAnimationFrame(() => ok(c.distanceTo(__game.camera.position) < 1e-4))); }), null, { timeout: 120000, polling: 200 });
  return page.evaluate(() => new Promise(done => {
    const frames = [], N = 24, step = 6;
    const { G } = __game, cam0 = __game.camera.position.clone(); let camMove = 0;
    let last = performance.now();
    window.__afterFrame = renderer => {
      // 실제 프레임 간격과 상관없이 매 프레임 1/60초가 흐르게 (timeScale로 맞춘다)
      const now = performance.now(), d = Math.max(1, now - last); last = now;
      G.timeScale = Math.min(1, (1000 / 60) / Math.min(50, d));
      const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const L = [];
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) { const i = (y * w + x) * 4; L.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]); }
      frames.push(L); camMove = Math.max(camMove, __game.camera.position.distanceTo(cam0));
      if (frames.length >= N) {
        window.__afterFrame = null; G.timeScale = 1;
        const means = frames.map(f => f.reduce((a, b) => a + b, 0) / f.length), mu = means.reduce((a, b) => a + b, 0) / N;
        const glob = Math.sqrt(means.reduce((a, b) => a + (b - mu) ** 2, 0) / N);
        let jump = 0, back = 0, cnt = 0, cnt3 = 0;
        for (let k = 1; k < N; k++) for (let i = 0; i < frames[k].length; i++) { cnt++; if (Math.abs(frames[k][i] - frames[k - 1][i]) > 12) jump++; }
        for (let k = 2; k < N; k++) for (let i = 0; i < frames[k].length; i++) {
          cnt3++; const d1 = frames[k - 1][i] - frames[k - 2][i], d2 = frames[k][i] - frames[k - 1][i];
          if ((d1 > 8 && d2 < -8) || (d1 < -8 && d2 > 8)) back++;
        }
        // 어디서 바뀌는지 지도 (밝을수록 자주 크게 바뀜)
        const W = Math.ceil(w / step), Hh = Math.ceil(h / step), cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
        const cx = cv.getContext('2d'), img = cx.createImageData(W, Hh);
        for (let i = 0; i < frames[0].length; i++) {
          let c = 0; for (let k = 1; k < N; k++) if (Math.abs(frames[k][i] - frames[k - 1][i]) > 12) c++;
          const x = i % W, y = Hh - 1 - Math.floor(i / W), o = (y * W + x) * 4, base = frames[0][i] * 0.35;
          img.data[o] = Math.min(255, base + c * 30); img.data[o + 1] = base; img.data[o + 2] = base; img.data[o + 3] = 255;
        }
        cx.putImageData(img, 0, 0);
        done({ glob: +glob.toFixed(3), jump: +(jump / cnt * 100).toFixed(3), back: +(back / cnt3 * 100).toFixed(3), mean: +mu.toFixed(1), camMove: +camMove.toExponential(1), map: cv.toDataURL() });
      }
    };
  }));
}
const rows = [];
for (const n of LOOKS) {
  const r = await measure(n);
  const pass = r.glob < LIMIT.glob && r.jump < LIMIT.jump && r.back < LIMIT.back && r.camMove < 1e-3; // 카메라가 움직였으면 측정 자체가 무효
  fs.writeFileSync(path.join(here, 'out', `flicker_${LOOKS.indexOf(n)}.png`), Buffer.from(r.map.split(',')[1], 'base64')); delete r.map;
  rows.push({ look: n, ...r, pass });
  console.log(`${pass ? '통과' : '실패'}  ${n.padEnd(8)}  glob ${r.glob}  jump ${r.jump}%  back ${r.back}%  (평균 휘도 ${r.mean}, 측정 중 카메라 이동 ${r.camMove})`);
}
await browser.close();
const ok = rows.every(r => r.pass) && !errors.length;
console.log(JSON.stringify({ ok, errors }, null, 2));
process.exit(ok ? 0 : 1);
