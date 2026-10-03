// ---- 3단계 HUD (STYLE.on): THE SEGMENT TWINS-style layout on the 480x270 overlay
//      bottom-left 1P block (comic portrait card · name · wave circles · segmented HP bar · halftone skill tiles),
//      bottom-right 2P (mirrored) · top-centre boss name + segmented bar · top corners label/value pairs ·
//      right-middle RALLY bar (the reference's combo bar) · one technique-name slot · chunky 6x7 outlined font
const F7 = {
  A: ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'], B: ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '#####.'],
  C: ['.#####', '##....', '##....', '##....', '##....', '##....', '.#####'], D: ['#####.', '##..##', '##..##', '##..##', '##..##', '##..##', '#####.'],
  E: ['######', '##....', '##....', '#####.', '##....', '##....', '######'], F: ['######', '##....', '##....', '#####.', '##....', '##....', '##....'],
  G: ['.#####', '##....', '##....', '##.###', '##..##', '##..##', '.#####'], H: ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  I: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '######'], J: ['...###', '....##', '....##', '....##', '##..##', '##..##', '.####.'],
  K: ['##..##', '##.##.', '####..', '###...', '####..', '##.##.', '##..##'], L: ['##....', '##....', '##....', '##....', '##....', '##....', '######'],
  M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##'], N: ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##'],   // (M · N · W 7칸: 6칸에선 H로 읽혔음)
  O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'], P: ['#####.', '##..##', '##..##', '#####.', '##....', '##....', '##....'],
  Q: ['.####.', '##..##', '##..##', '##..##', '##.###', '##..##', '.###.#'], R: ['#####.', '##..##', '##..##', '#####.', '####..', '##.##.', '##..##'],
  S: ['.#####', '##....', '##....', '.####.', '....##', '....##', '#####.'], T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  U: ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'], V: ['##..##', '##..##', '##..##', '##..##', '##..##', '.####.', '..##..'],
  W: ['##...##', '##...##', '##...##', '##.#.##', '#######', '###.###', '##...##'], X: ['##..##', '##..##', '.####.', '..##..', '.####.', '##..##', '##..##'],
  Y: ['##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..'], Z: ['######', '....##', '...##.', '..##..', '.##...', '##....', '######'],
  0: ['.####.', '##..##', '##.###', '######', '###.##', '##..##', '.####.'], 1: ['..##..', '.###..', '..##..', '..##..', '..##..', '..##..', '######'],
  2: ['.####.', '##..##', '....##', '..###.', '.##...', '##....', '######'], 3: ['#####.', '....##', '....##', '.####.', '....##', '....##', '#####.'],
  4: ['##..##', '##..##', '##..##', '######', '....##', '....##', '....##'], 5: ['######', '##....', '#####.', '....##', '....##', '##..##', '.####.'],
  6: ['.####.', '##....', '##....', '#####.', '##..##', '##..##', '.####.'], 7: ['######', '....##', '...##.', '..##..', '..##..', '..##..', '..##..'],
  8: ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '.####.'], 9: ['.####.', '##..##', '##..##', '.#####', '....##', '....##', '.####.'],
  '/': ['....##', '...##.', '...##.', '..##..', '.##...', '.##...', '##....'], ':': ['..', '##', '##', '..', '##', '##', '..'],
  '-': ['....', '....', '....', '####', '....', '....', '....'], '!': ['##', '##', '##', '##', '##', '..', '##'], '.': ['..', '..', '..', '..', '..', '##', '##'],
  '+': ['......', '..##..', '..##..', '######', '..##..', '..##..', '......'], '?': ['.####.', '##..##', '....##', '..###.', '..##..', '......', '..##..'],
  "'": ['##', '##', '..', '..', '..', '..', '..'],
  '<': ['...##', '..##.', '.##..', '##...', '.##..', '..##.', '...##'], '>': ['##...', '.##..', '..##.', '...##', '..##.', '.##..', '##...'],
  '[': ['####', '##..', '##..', '##..', '##..', '##..', '####'], ']': ['####', '..##', '..##', '..##', '..##', '..##', '####'],
  '(': ['.##', '##.', '##.', '##.', '##.', '##.', '.##'], ')': ['##.', '.##', '.##', '.##', '.##', '.##', '##.'],
  ',': ['..', '..', '..', '..', '##', '##', '#.'], ';': ['..', '##', '##', '..', '##', '##', '#.'],
  '=': ['......', '......', '######', '......', '######', '......', '......'], '_': ['......', '......', '......', '......', '......', '......', '######'], '%': ['##...#', '##..#.', '...#..', '..#...', '.#....', '#...##', '....##'],
};
const F7W = ch => (ch === ' ' ? 3 : F7[ch] ? F7[ch][0].length : 0);
function t7w(s, sc = 1) { let w = 0; for (const ch of String(s).toUpperCase()) w += (F7W(ch) + 1) * sc; return Math.max(0, w - sc); }
// chunky outlined text · o: { sc, ol (outline colour, null = none), al: 'l' | 'c' | 'r', sh (drop shadow colour) }
// ---- 글자 캐시 (성능): 같은 글자 · 색 · 크기는 화면 해상도로 한 번만 그려 두고 drawImage (프레임당 fillRect 수천 개 → 수십 개)
const TXC = { map: new Map(), scale: 0, max: 700 };
const txt3ok = () => typeof document !== 'undefined' && typeof document.createElement === 'function';
function txCache(key, wDev, hDev, draw) {
  if (TXC.scale !== Pipe.scale) { TXC.map.clear(); TXC.scale = Pipe.scale; }
  let c = TXC.map.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(wDev)); c.height = Math.max(1, Math.ceil(hDev));
    draw(c.getContext('2d'));
    if (TXC.map.size >= TXC.max) TXC.map.delete(TXC.map.keys().next().value);
    TXC.map.set(key, c);
  }
  return c;
}
// 창을 꽉 채울 때(STYLE.fit 'fill', 소수 배율): HUD는 화면 픽셀 좌표로 두고 모든 칸(fillRect)을 화면 픽셀 경계에 맞춤 — 칸 사이 틈 · 번짐 없음
const HUDK = { k: 1, on: false };
if (STYLE.on && txt3ok() && typeof CanvasRenderingContext2D !== 'undefined') {
  const fr = CanvasRenderingContext2D.prototype.fillRect;
  hctx.fillRect = function (x, y, w, h) {
    if (!HUDK.on) return fr.call(this, x, y, w, h);
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    const k = HUDK.k, x0 = Math.round(x * k), y0 = Math.round(y * k), x1 = Math.round((x + w) * k), y1 = Math.round((y + h) * k);
    if (x1 > x0 && y1 > y0) fr.call(this, x0, y0, x1 - x0, y1 - y0);
  };
}
function blitDev(c, xDev, yDev) { hctx.save(); hctx.setTransform(1, 0, 0, 1, 0, 0); hctx.drawImage(c, Math.round(xDev), Math.round(yDev)); hctx.restore(); }
// F7 글자를 장치 픽셀 단위 u로 g에 그림 (x, y 장치 픽셀)
function f7draw(g, S, x, y, u, col) {
  g.fillStyle = col; let cx = x;
  for (const ch of S) { const gl = F7[ch]; if (gl) for (let r = 0; r < 7; r++) for (let q = 0; q < gl[r].length; q++) if (gl[r][q] === '#') g.fillRect(cx + q * u, y + r * u, u, u); cx += (F7W(ch) + 1) * u; }
}
// 작은 글자 (2단계 3×5 글꼴 대신 — M · W · N이 안 읽히던 것): F7 모양을 장치 픽셀 u(≈ 화면 배율 × 4/7)로, 칸 폭은 예전(글자당 4)과 거의 같게
const smallU = (sc = 1) => Math.max(1, Math.round(Pipe.scale * sc * 4 / 7));
function tw3(s, sc = 1) { const u = smallU(sc); let w = 0; for (const ch of String(s).toUpperCase()) w += (F7W(ch) + 1) * u; return Math.max(0, w - u) / Pipe.scale; }
function txt3(s, x, y, col, sc = 1, shadow = null) {
  const S = String(s).toUpperCase(), u = smallU(sc), k = Pipe.scale, wDev = tw3(S, sc) * k;
  if (!S.trim()) return x + wDev / k + u / k;
  const o = Math.max(1, Math.floor(u / 2));         // 그림자 = 오른쪽 아래 얇게 (예전 1칸 그림자는 새 글자에선 겹쳐 보여서)
  const c = txCache(`s|${S}|${col}|${u}|${shadow || ''}`, wDev + 2 * o + 1, 7 * u + 2 * o + 1, g => {
    if (shadow) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) f7draw(g, S, o + dx * o, o + dy * o, u, shadow);   // 오른쪽 아래 얇은 그림자 (사방 테두리는 글자 사이를 메워서)
    f7draw(g, S, o, o, u, col);
  });
  blitDev(c, x * k - o, y * k + (5 * sc * k - 7 * u) / 2 - o);
  return x + (wDev + u) / k;
}
function t7(s, x, y, col, o = {}) {
  const sc = o.sc || 1, S = String(s).toUpperCase(), w = t7w(S, sc);
  let x0 = Math.round(o.al === 'c' ? x - w / 2 : o.al === 'r' ? x - w : x);
  const ol = o.ol === undefined ? '#150720' : o.ol;
  if (STYLE.on && txt3ok() && S.trim()) {          // 캐시: 외곽선 8방향 + 그림자 + 본 글자를 한 장으로 (글자 칸 = 화면 픽셀 정수)
    const k = Pipe.scale, u = Math.max(1, Math.round(sc * k)), e = Math.max(1, Math.round(k)), Wg = w / sc, sh = o.sh ? u + e : 0;
    const c = txCache(`t|${S}|${col}|${u}|${e}|${ol}|${o.sh || ''}`, Wg * u + 2 * e + sh + 1, 7 * u + 2 * e + sh + 1, g => {
      const pass = (dx, dy, cc) => f7draw(g, S, e + dx, e + dy, u, cc);
      if (o.sh) pass(sh, sh, o.sh);
      if (ol) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) pass(dx * e, dy * e, ol);
      pass(0, 0, col);
    });
    const ax = x * k, wd = Wg * u, xd = o.al === 'c' ? ax - wd / 2 : o.al === 'r' ? ax - wd : ax;
    blitDev(c, Math.round(xd) - e, Math.round(y * k) - e);
    return w;
  }
  const pass = (dx, dy, c) => {
    hctx.fillStyle = c; let cx = x0 + dx;
    for (const ch of S) {
      const g = F7[ch];
      if (g) for (let r = 0; r < 7; r++) for (let q = 0; q < g[r].length; q++) if (g[r][q] === '#') hctx.fillRect(cx + q * sc, y + dy + r * sc, sc, sc);
      cx += (F7W(ch) + 1) * sc;
    }
  };
  if (o.sh) pass(sc + 1, sc + 1, o.sh);
  if (ol) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) pass(dx, dy, ol);
  pass(0, 0, col);
  return w;
}
const HEXC = i => PAL_HEX[i];
const S3COL = { ink: '#150720', paper: '#fff7ef', orange: '#ff9a3a', yellow: '#ffca5c', red: '#e42a6e', dark: '#24102f', mid: '#4a2a5a' };
const charHex = f => (f && f.char ? STYLE.outline.cols[styleCharCat(f.char)] : '#ffffff');
// halftone dots inside a rect (1px dots on a diagonal grid)
const HTP = new Map();
function htRect(x, y, w, h, col, step = 3) {
  if (txt3ok() && hctx.createPattern) {             // (성능) 점 하나하나 fillRect 대신 무늬 한 장
    const d = HUDK.on ? Math.max(1, Math.round(HUDK.k)) : 1, key = col + step + '|' + d;   // (창 꽉 채움: 점도 화면 픽셀 정수 크기)
    let p = HTP.get(key);
    if (!p) { const c = document.createElement('canvas'); c.width = c.height = step * 2 * d; const g = c.getContext('2d'); g.fillStyle = col;
      for (let yy = 0; yy < step * 2; yy += step) for (let xx = (yy % (step * 2) < step ? 0 : Math.floor(step / 2)); xx < step * 2; xx += step) g.fillRect(xx * d, yy * d, d, d);
      p = hctx.createPattern(c, 'repeat'); HTP.set(key, p); }
    hctx.fillStyle = p; hctx.fillRect(x, y, w, h); return;
  }
  hctx.fillStyle = col;
  for (let yy = 0; yy < h; yy++) for (let xx = (yy % (step * 2) < step ? 0 : Math.floor(step / 2)); xx < w; xx += step) if (yy % step === 0) hctx.fillRect(x + xx, y + yy, 1, 1);
}
function inkRect(x, y, w, h, fill, edge = S3COL.ink) { hctx.fillStyle = edge; hctx.fillRect(x - 1, y - 1, w + 2, h + 2); hctx.fillStyle = fill; hctx.fillRect(x, y, w, h); }
// comic portrait card: character colour + halftone + the pixel face (2x) + white rule + ink border
function portraitCard(x, y, f, w = 28, h = 36, small = false) {
  const down = f.state === 'down', c = down ? '#5a3a66' : charHex(f);
  inkRect(x, y, w, h, c);
  htRect(x + 1, y + 1, w - 2, h - 2, 'rgba(255,255,255,0.35)', 3);
  portraitInk(x, y, w, h, f, down);
  hctx.fillStyle = S3COL.paper; hctx.fillRect(x, y + h - 1, w, 1);
  if (f.flashHud > 0) { hctx.fillStyle = 'rgba(255,255,255,0.7)'; hctx.fillRect(x, y, w, h); }
}
// manga-ink bust (the reference's portrait cards): white face · ink hair (light-haired characters: white hair, ink lines) · eyes in the card colour
const HAIR3 = { rapier: 'long', great: 'short', chain: 'hood', shield: 'bob', twin: 'tails' };
function portraitInk(x, y, w, h, f, down) {
  if (HUDK.on) { HUDK.on = false; hctx.save(); hctx.setTransform(HUDK.k, 0, 0, HUDK.k, 0, 0); try { portraitInk(x, y, w, h, f, down); } finally { hctx.restore(); HUDK.on = true; } return; }   // (창 꽉 채움: 선 그림은 배율 변환으로)
  const c = hctx, ink = S3COL.ink, paper = '#fff8f2', col = down ? '#5a3a66' : charHex(f), st = HAIR3[f.char] || 'short';
  const hp = facePal(f), lightHair = PAL_LAB[hp.H] && PAL_LAB[hp.H].x > 0.72, hairF = lightHair ? paper : ink;
  const cx = x + w * 0.5, cy = y + h * 0.55, s = w / 28;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = ink; c.lineWidth = 0.55 * s;
  const shape = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
  const P = (dx, dy) => [cx + dx * s, cy + dy * s];
  // shoulders + collar
  c.fillStyle = ink; c.beginPath(); c.moveTo(x - 2, y + h + 2); c.quadraticCurveTo(...P(-10, 8), ...P(0, 7.5)); c.quadraticCurveTo(...P(10, 8), x + w + 2, y + h + 2); c.fill();
  c.fillStyle = col; shape([P(-5, 9.5), P(0, 14), P(5, 9.5), P(3, 8), P(0, 10), P(-3, 8)]); c.fill();
  // hair behind the head
  c.fillStyle = hairF;
  if (st === 'long') { shape([P(-8.5, -5), P(-10, 6), P(-9, 13), P(-4, 9), P(4, 9), P(9, 13), P(10, 6), P(8.5, -5), P(0, -12)]); c.fill(); c.stroke(); }
  else if (st === 'tails') { for (const sx of [-1, 1]) { shape([P(sx * 6, -6), P(sx * 13, -2), P(sx * 12.5, 10), P(sx * 9, 14), P(sx * 8.5, 4)]); c.fill(); c.stroke(); } }
  else if (st === 'bob') { shape([P(-8.5, -4), P(-9, 5), P(-6, 7), P(6, 7), P(9, 5), P(8.5, -4), P(0, -11.5)]); c.fill(); c.stroke(); }
  else if (st === 'hood') { c.fillStyle = col; shape([P(-10, 9), P(-10.5, -4), P(-6, -11), P(0, -13), P(6, -11), P(10.5, -4), P(10, 9)]); c.fill(); c.stroke(); c.fillStyle = ink; shape([P(-8, 7), P(-8.5, -3), P(0, -11), P(8.5, -3), P(8, 7)]); c.fill(); }
  // neck + face
  c.fillStyle = paper; c.beginPath(); c.rect(cx - 2 * s, cy + 2.5 * s, 4 * s, 5.5 * s); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(...P(-6.4, -3)); c.quadraticCurveTo(...P(-6.6, 4.5), ...P(0, 6.8)); c.quadraticCurveTo(...P(6.6, 4.5), ...P(6.4, -3)); c.quadraticCurveTo(...P(0, -10.5), ...P(-6.4, -3)); c.fill(); c.stroke();
  // eyes: ink almond + iris in the card colour + highlight · brows · mouth · blush lines
  for (const sx of [-1, 1]) {
    c.fillStyle = ink; c.beginPath(); c.ellipse(cx + sx * 3 * s, cy + 0.6 * s, 1.35 * s, 2.0 * s, 0, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(cx + sx * 3 * s, cy + 1.3 * s, 0.85 * s, 1.15 * s, 0, 0, TAU); c.fill();
    c.fillStyle = paper; c.beginPath(); c.arc(cx + sx * 3 * s - 0.55 * s, cy - 0.35 * s, 0.5 * s, 0, TAU); c.fill();
    c.lineWidth = 0.75 * s; c.beginPath(); c.moveTo(...P(sx * 1.4, -1.6)); c.lineTo(...P(sx * 4.8, -1.9)); c.stroke();
    c.lineWidth = 0.35 * s; c.beginPath(); c.moveTo(...P(sx * 3.3, 3.4)); c.lineTo(...P(sx * 4.6, 3.0)); c.stroke();
  }
  c.lineWidth = 0.5 * s; c.beginPath(); c.moveTo(...P(-0.9, 4.6)); c.lineTo(...P(0.9, 4.6)); c.stroke();
  // bangs: a jagged fringe over the brow
  if (st !== 'hood') {
    c.fillStyle = hairF; c.lineWidth = 0.55 * s;
    shape([P(-7.6, -0.5), P(-7.8, -7), P(-3, -11.8), P(3, -11.8), P(7.8, -7), P(7.6, -0.5), P(6, -3.5), P(4.6, -1.5), P(3.2, -4.5), P(1, -2.2), P(-0.6, -5), P(-2.6, -2.4), P(-4, -4.6), P(-5.6, -2)]);
    c.fill(); c.stroke();
    c.strokeStyle = lightHair ? col : 'rgba(255,255,255,0.55)'; c.lineWidth = 0.45 * s;
    c.beginPath(); c.moveTo(...P(-4, -9.5)); c.quadraticCurveTo(...P(-1, -11), ...P(2.5, -9.8)); c.stroke();
  } else { c.fillStyle = ink; shape([P(-6.4, -3), P(-3, -6.5), P(0, -4), P(3, -6.5), P(6.4, -3), P(5, -8.5), P(0, -9.6), P(-5, -8.5)]); c.fill(); }
  c.restore();
}
// segmented bar (n cells) · frac / chip 0..1
function segBar(x, y, w, h, frac, chip, col, n = 10, right = false) {
  const cw = Math.max(1, Math.floor((w - (n - 1)) / n)), ww = n * cw + (n - 1);
  if (right) x += w - ww;
  inkRect(x, y, ww, h, S3COL.dark);
  for (let i = 0; i < n; i++) {
    const k = right ? n - 1 - i : i, a = k / n, b = (k + 1) / n, xi = x + i * (cw + 1), wi = cw;
    const fill = Math.max(0, Math.min(1, (frac - a) / (b - a))), ch = Math.max(0, Math.min(1, (chip - a) / (b - a)));
    if (ch > 0) { hctx.fillStyle = S3COL.paper; const cwid = Math.round(wi * ch); hctx.fillRect(right ? xi + wi - cwid : xi, y, cwid, h); }
    if (fill > 0) { hctx.fillStyle = col; const fw = Math.round(wi * fill); hctx.fillRect(right ? xi + wi - fw : xi, y, fw, h); hctx.fillStyle = 'rgba(255,255,255,0.35)'; hctx.fillRect(right ? xi + wi - fw : xi, y, fw, 1); }
  }
}
// halftone skill tile: colour + dots + ink border, the status glyph, key letter in the corner, cooldown curtain
function skillTile(x, y, sz, f, sl, showKey, offer) {
  const kind = f.skillKind(sl), cd = f.cd[sl - 1], ready = cd <= 0, c = charHex(f), fl = Math.floor(clock.t * 10) % 2 === 0;
  const bg = offer ? (fl ? S3COL.yellow : S3COL.orange) : ready ? c : '#3d2449';
  inkRect(x, y, sz, sz, bg);
  htRect(x + 1, y + 1, sz - 2, sz - 2, ready || offer ? 'rgba(20,6,30,0.35)' : 'rgba(255,255,255,0.12)', 3);
  if (!ready && !offer) { const h = Math.round(sz * cd / FEEL.SKILLS[kind].cd); hctx.fillStyle = 'rgba(12,4,22,0.55)'; hctx.fillRect(x, y, sz, h); }
  skillGlyph(kind, x + (sz >> 1), y + (sz >> 1) - 1, offer ? S3COL.ink : ready ? S3COL.paper : '#9a7ba8');
  const K = keyNames(f);
  if (offer) t7('FIN', x + sz / 2, y + sz - 6, S3COL.paper, { al: 'c', ol: S3COL.ink }).valueOf();
  else if (!ready) txtC(String(Math.ceil(cd)), x + sz / 2, y + sz - 7, S3COL.paper, 1, S3COL.ink);
  else if (showKey) { hctx.fillStyle = S3COL.ink; hctx.fillRect(x + sz - 7, y + sz - 7, 7, 7); txt(K[`s${sl}`].slice(0, 1), x + sz - 5, y + sz - 6, S3COL.paper); }
}
function smallTile(x, y, sz, label, on, col, key) {
  inkRect(x, y, sz, sz, on ? col : '#2f1a3b');
  txtC(label, x + sz / 2, y + 2, on ? S3COL.ink : '#8a6a98', 1, null);
  if (key) txtC(key, x + sz / 2, y + sz - 6, on ? S3COL.paper : '#6a4a78', 1, null);
}
function playerBlock(f, right, solo = false) {
  const W = CFG.BASE_W, pw = 28, ph = 36, px = right ? W - 8 - pw : 8, py = 206;
  portraitCard(px, py, f, pw, ph);
  const showKey = !right || UI.keys2P || solo;
  const ix = right ? px - 6 : px + pw + 6, al = right ? 'r' : 'l';
  const ai = Game.botFor(f), nm = CHARS[f.char].label + (ai ? ' AI' : '');
  t7(nm, ix, py + 1, charHex(f), { al });
  if (f.state === 'down') t7('DOWN', right ? ix - t7w(nm) - 6 : ix + t7w(nm) + 6, py + 1, S3COL.red, { al });
  if (Dk.watching(f) && fighters.filter(o => o.onField).length > 1 && Math.floor(clock.t * 4) % 2) txt('TARGET', right ? ix - t7w(nm) - 30 : ix + t7w(nm) + 6, py + 2, S3COL.orange);
  drawRelicIcons(f, right ? ix - 4 : ix + 4, py + 15, right);
  if (!Game.tagMode) drawSlots(f, right ? ix - 38 : ix + 38, py + 15, false);
  segBar(right ? ix - 104 : ix, py + 22, 104, 5, f.hp / FIGHT.PLAYER_HP, f.chip / FIGHT.PLAYER_HP, charHex(f), 10, right);
  const offer = finOffer(f), sz = 18, ty = py + 31;
  for (const sl of [1, 2]) {
    const tx = right ? ix - sz - (sl - 1) * (sz + 3) : ix + (sl - 1) * (sz + 3);
    skillTile(tx, ty, sz, f, sl, showKey, !!offer);
  }
  const K = keyNames(f), pOpen = f.state === 'parry' && f.t <= Waves.parryWindow(f), rdy = f.sinceRoll >= FEEL.DODGE_MIN_GAP;
  const sx = right ? ix - 2 * (sz + 3) - 15 : ix + 2 * (sz + 3);
  smallTile(sx, ty + 5, 13, 'P', pOpen, S3COL.paper, showKey ? K.parry.slice(0, 3) : '');
  smallTile(right ? sx - 16 : sx + 16, ty + 5, 13, 'D', rdy, S3COL.paper, showKey ? (K.dodge === 'SPC' ? 'SP' : K.dodge.slice(0, 2)) : '');
  if (offer) {                                    // the finisher names over the block, in the receiver's colour
    offer.names.forEach((n, i) => t7(`${showKey ? K[`s${i + 1}`] + ' ' : ''}${finLabel(n)}`, right ? W - 8 : 8, py - 22 + i * 10, Math.floor(clock.t * 8) % 2 ? S3COL.yellow : S3COL.paper, { al }));
  }
}
// top-centre boss bar (the reference's red segmented bar under the name)
function bossBar3(dt) {
  const W = CFG.BASE_W;
  if (!boss.root.visible) return;
  if (Dk.on) { dkBars3(dt); return; }
  const bw = 236, bx = (W - bw) >> 1, by = 18;
  t7(Rush.boss.name.replace('THE ', ''), W / 2, 6, S3COL.paper, { al: 'c' });
  segBar(bx, by, bw, 6, AI.hp / AI.maxHp, AI.chip / AI.maxHp, AI.phase >= 3 ? S3COL.orange : '#e01828', 24);
  for (const k of FIGHT.PHASE_AT) { hctx.fillStyle = S3COL.paper; hctx.fillRect(bx + Math.round(bw * k), by - 2, 1, 10); }
  if (AI.brk > 0 || AI.state === 'groggy') {
    const g = AI.state === 'groggy' ? 1 : AI.brk / FIGHT.BREAK_MAX;
    hctx.fillStyle = S3COL.dark; hctx.fillRect(bx, by + 8, bw, 2);
    hctx.fillStyle = AI.state === 'groggy' ? S3COL.paper : S3COL.yellow; hctx.fillRect(bx, by + 8, Math.round(bw * g), 2);
  }
  if (AI.phaseNoteT > 0) { t7(AI.phase >= 3 ? 'PHASE III' : 'PHASE II', W / 2, 46, AI.phase >= 3 ? S3COL.orange : S3COL.red, { al: 'c', sc: 2 }); AI.phaseNoteT -= dt; }
}
// boss 4: two segmented bars side by side under the name (down / reviving / groggy on the bar's label)
function dkBars3(dt) {
  const W = CFG.BASE_W, bw = 112, gap = 12, by = 18, x0 = W / 2 - bw - gap / 2, blink = Math.floor(clock.t * 6) % 2 === 0;
  const ph = Math.max(Dk.get(0, 'phase'), Dk.get(1, 'phase'));
  t7(Rush.boss.name.replace('THE ', ''), W / 2, 6, S3COL.paper, { al: 'c' });
  for (let i = 0; i < 2; i++) {
    const x = x0 + i * (bw + gap), hp = Dk.get(i, 'hp'), mx = Math.max(1, Dk.get(i, 'maxHp')), st = Dk.get(i, 'state'), brk = Dk.get(i, 'brk');
    const c = STYLE.outline.cols[6 + i];
    segBar(x, by, bw, 6, hp / mx, Dk.get(i, 'chip') / mx, c, 12, i === 0);
    const lab = st === 'dead' ? (Dk.rv ? 'REVIVING' : 'DOWN') : st === 'groggy' ? 'GROGGY' : '';
    if (lab) txt(lab, i ? x + bw - tw(lab) : x, by + 9, blink ? S3COL.yellow : S3COL.paper);
    if (brk > 0 || st === 'groggy') { const k = st === 'groggy' ? 1 : brk / FIGHT.BREAK_MAX; hctx.fillStyle = S3COL.yellow; hctx.fillRect(i ? x : x + bw - Math.round(bw * k), by + 7, Math.round(bw * k), 1); }
    if (st === 'dead' && Dk.down && Dk.down.i === i) {
      const D = FEEL.DK.revive, rv = Dk.rv, k = rv && rv.ph === 'chan' ? rv.t / D.t : Math.min(1, Dk.down.t / D.wait);
      hctx.fillStyle = S3COL.dark; hctx.fillRect(x, by + 15, bw, 2); hctx.fillStyle = rv && rv.ph === 'chan' ? S3COL.orange : '#9a7ba8'; hctx.fillRect(x, by + 15, Math.round(bw * k), 2);
    }
  }
  const pnT = Math.max(Dk.get(0, 'phaseNoteT') || 0, Dk.get(1, 'phaseNoteT') || 0);
  if (pnT > 0) { t7(ph >= 3 ? 'PHASE III' : 'PHASE II', W / 2, 46, ph >= 3 ? S3COL.orange : S3COL.red, { al: 'c', sc: 2 }); for (let i = 0; i < 2; i++) Dk.set(i, 'phaseNoteT', Math.max(0, (Dk.get(i, 'phaseNoteT') || 0) - dt)); }
}
// corner labels (SCORE / RUPEE · ACT / TIMER in the reference) → TIME · BOSS / PHASE
function corners3() {
  const W = CFG.BASE_W, s = Math.floor(Game.t), t = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  t7('TIME', 8, 5, S3COL.orange); t7(t, 8, 14, S3COL.paper);
  t7('BOSS', 50, 5, S3COL.orange); t7(`${Rush.idx + 1}/${Rush.count}`, 50, 14, S3COL.paper);
  if (Dk.anyAlive()) { t7('PHASE', W - 8, 5, S3COL.orange, { al: 'r' }); t7(['I', 'II', 'III'][AI.phase - 1], W - 8, 14, AI.phase >= 3 ? S3COL.orange : S3COL.paper, { al: 'r' }); }
  txt('ESC MENU', W - 8 - tw('ESC MENU'), 25, '#8a6a98');
}
// right-middle rally bar (the reference's COMBO bar): big number on a black slanted band
function rally3() {
  const r = Duo.rally || 0; if (r <= 0) return;
  const W = CFG.BASE_W, y = 110;
  hctx.fillStyle = S3COL.ink;
  for (let i = 0; i < 18; i++) hctx.fillRect(W - 96 + Math.round(i * 0.3), y + i, 96, 1);
  const full = r >= FEEL.RALLY_MAX;
  t7(String(r), W - 60, y + 2, full ? S3COL.yellow : S3COL.paper, { sc: 2, ol: null, al: 'r' });
  t7(full ? 'MAX' : 'RALLY', W - 56, y + 8, full ? S3COL.yellow : S3COL.paper, { ol: null });
  if (Duo.buffT > 0) { hctx.fillStyle = S3COL.yellow; hctx.fillRect(W - 92, y + 20, Math.round(84 * Duo.buffT / FEEL.RALLY_BUFF_T), 2); txt('DMG X1.3  SPD X1.15', W - 8 - tw('DMG X1.3  SPD X1.15'), y + 24, S3COL.yellow); }
}
// the one name slot: a starter's or finisher's name, in the user's colour (violet finisher = violet)
function techNameSet(s, f, violet) { if (!STYLE.on) return; Game.techName = { s: String(s), col: violet ? '#c78dff' : charHex(f), t: UI.nameT }; }
// the one technique-name slot (4절): newest name only, in the user's colour
// 화면 글자 수 (4절 · U1): 기술명 · 큰 배너 · 상태 알림 + 팝업 — 팝업은 UI.maxTexts에서 남는 만큼만 (새 것부터)
function uiTexts3() {
  const name = Game.techName && Game.techName.t > 0 ? 1 : 0, ban = Game.bannerT > 0 ? 1 : 0, note = Game.noteT > 0 && !Menu3.on ? 1 : 0;
  const room = Math.max(0, UI.maxTexts - name - ban - note), pops = Math.min(room, Game.popups.length);
  return { name, ban, note, pops, room, total: name + ban + note + pops };
}
function techName3(dt) {
  const T = Game.techName; if (!T || T.t <= 0) return;
  const W = CFG.BASE_W, a = Math.min(1, T.t / 0.15);
  if (a <= 0) return;
  const w = t7w(T.s, 1) + 16, y = UI.nameY;
  hctx.fillStyle = 'rgba(21,7,32,0.85)';
  for (let i = 0; i < 11; i++) hctx.fillRect(Math.round(W / 2 - w / 2 - 4 + i * 0.4), y - 2 + i, w, 1);
  t7(T.s, W / 2, y, T.col, { al: 'c' });
}
// 1-bit boss card (the reference's "FIRST BOSS CRAB")
function bossCard3() {
  if (Style.monoT <= 0 || !Style.card) return;
  const W = CFG.BASE_W, H = CFG.BASE_H, k = Math.min(1, (Style.monoDur - Style.monoT) / 0.15);
  hctx.fillStyle = S3COL.ink;
  for (let i = 0; i < 44; i++) hctx.fillRect(Math.round(-20 + i * 0.5 - (1 - k) * 200), H / 2 + 6 + i, W * 0.75, 1);
  t7(Style.card.a, 34 - (1 - k) * 200, H / 2 + 12, S3COL.paper, { sc: 2, ol: S3COL.ink });
  t7(Style.card.b, 34 - (1 - k) * 260, H / 2 + 30, S3COL.paper, { sc: 3, ol: S3COL.ink });
}
function drawFightHud3(dt) {
  if (Game.state === 'title') { Title3.draw(dt); if (Menu3.on) Menu3.draw(); return; }
  if (Game.state === 'select') { Select.draw(); joinHint3(); if (Menu3.on) Menu3.draw(); return; }
  const duo = !Game.tagMode, W = CFG.BASE_W;
  if (duo) { playerBlock(fighters[0], false); playerBlock(fighters[1], true); }
  else {
    const f = fighters.find(o => o.onField) || fighters[0], b = fighters.find(o => o !== f);
    playerBlock(f, false, true);
    if (b) portraitCard(8 + 28 - 12, 206 - 16, b, 14, 16, true);
  }
  corners3();
  bossBar3(dt);
  rally3();
  qteHud3();                                       // 3단계 QTE 칸 줄
  Bell.drawArrows();
  Dk.drawHud();
  if (Rush.state === 'rest') {
    const left = Math.max(0, Math.ceil(FEEL.RUSH.restT - Rush.t)), nx = BOSSES[Rush.idx + 1];
    if (!Relics.open) {                              // (유물 카드가 떠 있으면 카드 밑에 비치지 않게)
      t7('REST', W / 2, 118, S3COL.paper, { al: 'c', sc: 3 });
      t7(`NEXT ${nx ? nx.name.replace('THE ', '') : ''}  ${left}`, W / 2, 146, S3COL.orange, { al: 'c' });
    }
    Relics.draw();
  }
  for (const f of fighters) {
    if (!f.onField) continue;
    const p = f.ch.pos;
    if (f.state === 'down' && duo) {
      const [x, y] = toHud(p.x, 0.9, p.z), k = f.reviveT / FEEL.REVIVE_T;
      hctx.fillStyle = S3COL.ink; hctx.fillRect(Math.round(x) - 11, Math.round(y) - 17, 22, 4);
      hctx.fillStyle = S3COL.paper; hctx.fillRect(Math.round(x) - 10, Math.round(y) - 16, Math.round(20 * k), 2);
      const near = fighters.find(o => o !== f && o.alive && o.ch.pos.distanceTo(p) < FEEL.REVIVE_R + 0.6);
      const reviving = fighters.some(o => o.state === 'revive' && o.reviveOf === f);
      t7(reviving ? 'REVIVING' : near && !near.bot ? `HOLD ${keyNames(near).interact}` : 'HELP!', x, Math.round(y) - 28, reviving ? S3COL.yellow : S3COL.red, { al: 'c' });
    }
    const [ax, ay] = toHud(p.x, 0.9, p.z);
    edgeArrow(ax, ay, charHex(f));
  }
  if (Dk.on) { for (let i = 0; i < 2; i++) { const r = Dk.rigs[i]; if (r.root.visible && Dk.alive(i)) { const [x, y] = toHud(r.pos.x, 1.4, r.pos.z); edgeArrow(x, y, STYLE.outline.cols[6 + i]); } } }
  else if (boss.root.visible && AI.state !== 'dead') { const [x, y] = toHud(boss.pos.x, 1.4, boss.pos.z); edgeArrow(x, y, S3COL.orange); }
  // pop-ups: only the newest few (UI.maxTexts − the name slot), small and boxed
  const placed = [], room = uiTexts3().room; let shown = 0;
  for (let i = Game.popups.length - 1; i >= 0 && shown < room; i--) {
    const p = Game.popups[i], v = p.p.clone().project(camera);
    const x = Math.round((v.x * 0.5 + 0.5) * W), w = tw(p.text) + 4, h = 8;
    let y = Math.round((1 - (v.y * 0.5 + 0.5)) * CFG.BASE_H - Math.min(10, p.t * 24));
    for (let k = 0; k < 6; k++) { const r = placed.find(o => Math.abs(o.x - x) * 2 < o.w + w + 4 && y < o.y + o.h && y + h > o.y); if (!r) break; y = r.y - h - 1; }
    placed.push({ x, y, w, h }); shown++;
    hctx.fillStyle = S3COL.ink; hctx.fillRect(x - (w >> 1), y - 1, w, h);
    txt(p.text, x - (w >> 1) + 2, y + 1, PAL_HEX[p.col]);
  }
  techName3(dt);
  drawSystemsHud(dt);
  if (UI.cutins) Stage.drawCut();
  if (Game.rHold > 0.12 && Game.state === 'play') {
    const k = Math.min(1, Game.rHold / FEEL.RESTART_HOLD);
    t7('HOLD R  RESTART', W / 2, 62, S3COL.paper, { al: 'c' });
    hctx.fillStyle = S3COL.ink; hctx.fillRect(W / 2 - 25, 72, 50, 4);
    hctx.fillStyle = S3COL.yellow; hctx.fillRect(W / 2 - 24, 73, Math.round(48 * k), 2);
  }
  bossCard3();
  joinHint3();
  const end = Game.state === 'won' ? 2.2 : Game.state === 'lost' ? 1.6 : -1;
  if (end > 0 && Game.endT > end) {
    const won = Game.state === 'won';
    hctx.fillStyle = S3COL.ink;
    for (let i = 0; i < 70; i++) hctx.fillRect(Math.round(-10 + i * 0.3), 100 + i, W + 20, 1);
    t7(won ? 'VICTORY' : 'DEFEAT', W / 2, 108, won ? S3COL.yellow : S3COL.red, { al: 'c', sc: 4 });
    const S = Duo.stats;
    const mmss = v => { const s = Math.floor(v); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    if (won) txtC(`TIME ${mmss(Game.winTime)}   ` + S.bossT.map((v, i) => `BOSS ${i + 1} ${mmss(v)}`).join('   '), W / 2, 142, S3COL.paper);
    else txtC(`REACHED BOSS ${Rush.idx + 1}/${Rush.count}`, W / 2, 142, S3COL.paper);
    txtC(`FINISHERS ${S.finN}   COVERS ${S.covers}   PERFECT RALLIES ${S.fullRally}`, W / 2, 152, '#c9a4d8');
    txtC(Input.padOn ? 'START MENU     Y CHARACTERS' : 'R RETRY     C CHARACTERS     ESC MENU', W / 2, 162, '#c9a4d8');
  }
  if (Menu3.on) Menu3.draw();
}
// ---- 3단계 QTE 칸 줄 (화면 아래 가운데): 칸 색 = 누를 사람 · 글자 = 누를 키 · 지금 칸은 크게 + 줄어드는 박자 테두리 · 깨진 칸 / 실패 칸
const QKEY = { attack: 'attack', parry: 'parry', skill1: 's1', skill2: 's2', tag: 'tag', dodge: 'dodge' };
function qteHud3() {
  const Q = Qte3; if (!Q.on || !Q.cells.length) return;
  const W = CFG.BASE_W, n = Q.cells.length, gap = 24, x0 = Math.round(W / 2 - (n - 1) * gap / 2), y = 196;
  const colHex = c => STYLE.outline.cols[c === 'red' ? 2 : 1];
  t7(Q.D.name, W / 2, y - 30, S3COL.orange, { al: 'c' });
  const cur = Q.cells.findIndex(c => !c.res);
  let onCol = Game.tagMode ? Q.col(fighters.find(f => f.onField) || fighters[0]) : null;
  Q.cells.forEach((c, k) => {
    const x = x0 + k * gap, now = k === cur, s = now ? 22 : 16, h = Math.floor(s / 2);
    let key = c.key;
    if (Game.tagMode) { if (!c.res && c.col !== onCol) key = 'tag'; if (!c.res) onCol = c.col; }
    const own = Game.tagMode ? fighters.find(f => f.onField) || fighters[0] : Q.owner(c) || fighters[0];
    if (c.res === 'ok') {                          // 깨진 칸: 흰 번쩍 → 흰 바탕에 그 색 칸 + 금(사선)
      const fl = Q.t - c.at < 0.15;
      inkRect(x - 8, y - 8, 16, 16, S3COL.paper);
      if (!fl) { hctx.fillStyle = colHex(c.col); hctx.fillRect(x - 5, y - 5, 10, 10); hctx.fillStyle = S3COL.paper; for (let i = 0; i < 12; i++) hctx.fillRect(x - 6 + i, y + 5 - i, 2, 1); }
      return;
    }
    if (c.res === 'fail') { inkRect(x - 8, y - 8, 16, 16, S3COL.dark); t7('X', x, y - 3, S3COL.red, { al: 'c' }); return; }
    if (now) {                                     // 박자 테두리: 판정 시각까지 남은 만큼 크게 → 창 안이면 노랑
      const dtT = Q.T(k) - Q.t, kk = Math.max(0, Math.min(1, dtT / QTE.beat)), r = h + 2 + Math.round(10 * kk), inWin = Math.abs(dtT) <= QTE.win;
      hctx.fillStyle = inWin ? S3COL.yellow : S3COL.paper;
      hctx.fillRect(x - r, y - r, r * 2, 1); hctx.fillRect(x - r, y + r - 1, r * 2, 1); hctx.fillRect(x - r, y - r, 1, r * 2); hctx.fillRect(x + r - 1, y - r, 1, r * 2);
    }
    inkRect(x - h, y - h, s, s, colHex(c.col)); htRect(x - h, y - h, s, s, 'rgba(21,7,32,0.35)', 3);
    const K = keyNames(own), lab = String(K[QKEY[key]] || key).slice(0, 3);
    t7(lab, x, y - 3, S3COL.paper, { al: 'c' });
  });
}
