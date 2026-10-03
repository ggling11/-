/* =============================================================================
 * 4단계 테마 1 — HUD · UI (t1_hud.js) · 3단계 HUD 모양 · 배치 · 글꼴을 쓰지 않고 새로 그림
 *   디자인 언어: 흰 패널 · 연회색 사선 빗금 띠 · 검정 사선 판 · 큰 굵은 영문(Archivo Black) + 굵은 한글(Black Han / Noto KR)
 *   · 점/막대 장식 · 빨간 원 도장 · 여백 · 잉크 초상(Path2D)
 *   좌표: 1920×1080 설계 좌표 → 기기 픽셀 (u = 화면 세로/1080, 가로 남는 폭은 가운데 정렬)
 * ========================================================================== */
const T1H = (() => {
  const H = { ready: false, faces: [], por: {}, t: 0 };
  const F_EN = "'T1 Archivo', 'Arial Black', sans-serif", F_KO = "'T1 Noto KR', sans-serif", F_KB = "'T1 Black Han', 'T1 Noto KR', sans-serif";
  H.init = (D) => {
    H.D = D;
    if (typeof FontFace !== 'undefined' && typeof document !== 'undefined' && document.fonts && typeof FONTS !== 'undefined' && FONTS.t1) {
      for (const f of FONTS.t1) {
        try { const bin = Uint8Array.from(atob(f.b64), c => c.charCodeAt(0)); const ff = new FontFace(f.family, bin.buffer, { weight: String(f.weight) }); document.fonts.add(ff); H.faces.push(ff.load()); } catch (e) { /* 글꼴 실패 = 대체 글꼴 */ }
      }
      Promise.all(H.faces).then(() => { H.ready = true; }, () => { H.ready = true; });
    } else H.ready = true;
    if (typeof Path2D !== 'undefined' && typeof T1_PORTRAITS !== 'undefined') for (const k in T1_PORTRAITS) H.por[k] = T1_PORTRAITS[k].map(([d, f, w, s]) => [new Path2D(d), f, w, s]);
  };
  /* 좌표 변환: 설계 좌표(1920×1080) → 기기 픽셀 */
  H.frame = (ctx, W, Hh) => { const u = Hh / 1080, ox = (W - 1920 * u) / 2; H.u = u; H.ox = ox; H.W = W; H.Hh = Hh; ctx.setTransform(u, 0, 0, u, ox, 0); return u; };
  H.left = () => -H.ox / H.u; H.right = () => (H.W - H.ox) / H.u;   /* 화면 가장자리 (넓은 화면에서 패널을 끝에 붙임) */
  const P = () => H.D.pal;
  H.text = (ctx, s, x, y, size, col, o = {}) => {
    ctx.font = `${o.weight || 400} ${size}px ${o.ko ? (o.big ? F_KB : F_KO) : F_EN}`; ctx.textAlign = o.al || 'left'; ctx.textBaseline = 'alphabetic';
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.stroke; ctx.strokeStyle = o.sc || P().paper; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    return ctx.measureText(s).width;
  };
  H.poly = (ctx, pts, fill, stroke, lw) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 4; ctx.lineJoin = 'miter'; ctx.stroke(); } };
  /* 사선 빗금 띠 */
  H.hatch = (ctx, x, y, w, h, col, gap = 14, lw = 5) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    for (let t = -h; t < w + h; t += gap) { ctx.moveTo(x + t, y + h); ctx.lineTo(x + t + h, y); } ctx.stroke(); ctx.restore();
  };
  H.dots = (ctx, x, y, n, gap, r, col) => { ctx.fillStyle = col; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x, y + i * gap, r, 0, Math.PI * 2); ctx.fill(); } };
  /* 빨간 원 도장 (찍힐 때 크게 → 제자리, k = 0..1 등장) */
  H.stamp = (ctx, x, y, r, s, size, k = 1, sub = null) => {
    const sc = k < 1 ? 1 + (1 - k) * 0.8 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(-0.08 * (1 - k));
    ctx.fillStyle = P().red; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    H.text(ctx, s, 0, size * 0.36, size, P().paper, { al: 'center' }); ctx.restore();
    if (sub) H.text(ctx, sub, x, y + r + 30, 24, P().ink, { al: 'center' });
  };
  /* 잉크 초상 (Path2D) */
  H.portrait = (ctx, name, x, y, sc, flip = false, frame = true, skew = -0.17) => {
    const L = H.por[name]; if (!L) return;
    ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, skew, 1, 0, 0); ctx.scale(sc, sc);
    ctx.fillStyle = '#fefefe'; ctx.fillRect(0, 0, 200, 240);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 200, 240); ctx.clip(); ctx.transform(1, 0, -skew, 1, 0, 0);
    if (flip) { ctx.translate(200, 0); ctx.scale(-1, 1); }
    for (const [p, f, w, s] of L) { if (f) { ctx.fillStyle = f; ctx.fill(p); } if (w) { ctx.lineWidth = w; ctx.strokeStyle = s; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(p); } }
    ctx.restore();
    if (frame) { ctx.lineWidth = 4 / sc; ctx.strokeStyle = P().ink; ctx.strokeRect(0, 0, 200, 240); }
    ctx.restore();
  };
  /* 보스 이름 + 체력 막대 (검정 사선 판 · 흰 글자 · 회색 칩 · 페이즈 칸 · 그로기 빗금) */
  H.bossBar = (ctx, o) => {
    const p = P(), cx = 960;
    ctx.font = `400 46px ${F_EN}`; const tw = Math.max(380, ctx.measureText(o.name).width + 70);
    H.poly(ctx, [[cx - tw / 2 + 18, 22], [cx + tw / 2 + 18, 22], [cx + tw / 2, 86], [cx - tw / 2, 86]], p.ink);
    H.text(ctx, o.name, cx + 8, 72, 46, p.paper, { al: 'center' });
    if (o.ko) H.text(ctx, o.ko, cx + tw / 2 + 30, 72, 26, p.ink, { ko: true, big: true });
    const bx = 510, by = 102, bw = 900, bh = 22;
    ctx.fillStyle = o.flash ? p.ink : '#fefefe'; ctx.fillRect(bx, by, bw, bh); ctx.lineWidth = 4; ctx.strokeStyle = p.ink; ctx.strokeRect(bx, by, bw, bh);
    const f = Math.max(0, Math.min(1, o.hp)), c = Math.max(f, Math.min(1, o.chip ?? f));
    ctx.fillStyle = p.red; ctx.fillRect(bx + 4 + (bw - 8) * f, by + 4, (bw - 8) * (c - f), bh - 8);
    ctx.fillStyle = o.flash ? '#fefefe' : p.ink; ctx.fillRect(bx + 4, by + 4, (bw - 8) * f, bh - 8);
    for (let i = 0; i < (o.phases || 3); i++) { const x = bx + bw + 18 + i * 26; H.poly(ctx, [[x + 4, by], [x + 18, by], [x + 14, by + bh], [x, by + bh]], i < (o.phase || 1) ? p.ink : '#fefefe', p.ink, 3); }
    if (o.groggy > 0) { ctx.save(); ctx.beginPath(); ctx.rect(bx, by + bh + 6, bw * Math.min(1, o.groggy), 8); ctx.clip(); ctx.fillStyle = p.ink; ctx.fillRect(bx, by + bh + 6, bw, 8); H.hatch(ctx, bx, by + bh + 6, bw, 8, '#fefefe', 12, 4); ctx.restore(); }
  };
  /* 기술명: 굵은 영문 한 줄 + 작은 한글 부제 · '탁' 찍히듯 등장 (0.1초) — 늘 같은 자리 */
  H.techName = (ctx, o) => {
    const p = P(), age = (H.D.ui.nameT - o.t), k = Math.min(1, age / 0.1), sc = 1 + (1 - k) * 0.6;
    ctx.save(); ctx.translate(960, 230); ctx.scale(sc, sc);
    const w = H.text(ctx, o.s, 0, 0, 78, p.ink, { al: 'center', stroke: 10, sc: '#fefefe' });
    ctx.fillStyle = o.col || p.ink; ctx.fillRect(-w / 2 + 40, 16, w - 80, 9);
    if (o.ko) H.text(ctx, o.ko, 0, 60, 30, p.ink, { al: 'center', ko: true, big: true, stroke: 8, sc: '#fefefe' });
    ctx.restore();
  };
  return H;
})();
