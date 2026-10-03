/* =============================================================================
 * 4단계 테마 1 — 캐릭터 · 보스 모델 정의 (t1_chars.js) · T1M 빌더로 처음부터 새로 만듦
 *   세검(청) · 대검(적) · 애저 워든. 나머지 캐릭터 · 보스는 같은 빌더로 늘림.
 *   디자인 시트 평가에서 받은 고침: 가는 팔 · 좁은 어깨 · 긴 목 · 앞이 열린 코트로 긴 다리 · 콘트라포스토 ·
 *   천은 직선 면으로 꺾인 판 · 머리카락 덩어리 끝을 잔가닥으로 · 워든 = 목-몸통-꼬리가 한 S곡선인 흰 페럿
 * ========================================================================== */
const T1C = (() => {
  const { Kit, rng, add, sub, mul, lerp, norm, dot } = T1M;
  const HUMAN = ['root', 'body', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'hdL', 'shR', 'elR', 'hdR', 'weapon', 'thL', 'knL', 'ftL', 'thR', 'knR', 'ftR', 'cape'];
  const HPARENT = { body: 'root', spine: 'body', chest: 'spine', neck: 'chest', head: 'neck', shL: 'chest', elL: 'shL', hdL: 'elL', shR: 'chest', elR: 'shR', hdR: 'elR', weapon: 'hdR',
    thL: 'body', knL: 'thL', ftL: 'knL', thR: 'body', knR: 'thR', ftR: 'knR', cape: 'chest' };

  /* 사람 뼈대 (바인드 = 차렷에서 팔 조금 벌림) — H: 키 */
  function humanSkel(H, o = {}) {
    const k = H / 2.38, sh = (o.shoulder || 0.165) * k / (0.165 * k / 0.165 * 1) * 1;
    const P = {
      root: [0, 0, 0], body: [0, 1.16 * k, 0], spine: [0, 1.38 * k, 0.005], chest: [0, 1.62 * k, 0], neck: [0, 1.93 * k, -0.005], head: [0, 2.04 * k, 0.0],
      shL: [sh, 1.88 * k, -0.012], elL: [sh + 0.035 * k, 1.555 * k, -0.025], hdL: [sh + 0.055 * k, 1.255 * k, 0.0],
      shR: [-sh, 1.88 * k, -0.012], elR: [-sh - 0.035 * k, 1.555 * k, -0.025], hdR: [-sh - 0.055 * k, 1.255 * k, 0.0], weapon: [-sh - 0.06 * k, 1.17 * k, 0.03 * k],
      thL: [0.095 * k, 1.14 * k, 0], knL: [0.1 * k, 0.62 * k, 0.018 * k], ftL: [0.105 * k, 0.085 * k, -0.01 * k],
      thR: [-0.095 * k, 1.14 * k, 0], knR: [-0.1 * k, 0.62 * k, 0.018 * k], ftR: [-0.105 * k, 0.085 * k, -0.01 * k],
      cape: [0, 1.8 * k, -0.1 * k],
    };
    return { order: HUMAN.slice(), parent: { ...HPARENT }, pos: P, k };
  }
  function addChain(S, base, parent, pts) {   /* 화면 전용 체인 뼈 (머리카락 · 코트 자락 · 끈) */
    let p = parent; pts.forEach((q, i) => { const n = base + i; S.order.push(n); S.parent[n] = p; S.pos[n] = q; p = n; }); return pts.map((_, i) => base + i);
  }

  /* 다리: 허벅지 → 무릎 → 종아리 볼록 → 가는 발목 → 뾰족한 신발 */
  function leg(K, m, s, S, o = {}) {
    const k = S.k, th = S.pos['th' + s], kn = S.pos['kn' + s], ft = S.pos['ft' + s], T = o.thick || 1;
    const R = (a, b) => [a * T * k, b * T * k];
    K.tube(m, [
      { p: add(th, [0, 0.07 * k, 0]), r: R(0.088, 0.092), w: [['body', 0.6], ['th' + s, 0.4]] },
      { p: lerp(th, kn, 0.2), r: R(0.082, 0.086), w: [['th' + s, 1]] },
      { p: lerp(th, kn, 0.6), r: R(0.066, 0.07), w: [['th' + s, 1]] },
      { p: kn, r: R(0.05, 0.054), w: [['th' + s, 0.5], ['kn' + s, 0.5]] },
      { p: lerp(kn, ft, 0.28), r: R(0.054, 0.06), w: [['kn' + s, 1]] },
      { p: lerp(kn, ft, 0.7), r: R(0.038, 0.04), w: [['kn' + s, 1]] },
      { p: ft, r: R(0.032, 0.034), w: [['kn' + s, 0.4], ['ft' + s, 0.6]] },
    ], { seg: 12, cap0: false });
    const toe = add(ft, [0, -0.07 * k, (o.toe || 0.2) * k]);
    K.tube(m, [{ p: add(ft, [0, 0.02 * k, -0.03 * k]), r: [0.04 * T * k, 0.05 * T * k], w: [['ft' + s, 1]] }, { p: add(ft, [0, -0.04 * k, 0.07 * k]), r: [0.038 * T * k, 0.03 * T * k], w: [['ft' + s, 1]] },
      { p: toe, r: o.blunt ? [0.025 * k, 0.02 * k] : 0.003, w: [['ft' + s, 1]] }], { seg: 10, up: [0, 1, 0] });
  }
  /* 팔: 몸에 붙는 가는 팔 (손목에서만 살짝 넓은 소매) + 검정 장갑 손 · 긴 손가락 */
  function arm(K, mSleeve, mGlove, s, S, o = {}) {
    const k = S.k, sh = S.pos['sh' + s], el = S.pos['el' + s], hd = S.pos['hd' + s], T = o.thick || 1, cuff = o.cuff ?? 1.25;
    K.tube(mSleeve, [
      { p: add(sh, [0, 0.03 * k, 0]), r: [0.058 * T * k, 0.056 * T * k], w: [['chest', 0.5], ['sh' + s, 0.5]] },
      { p: lerp(sh, el, 0.3), r: [0.05 * T * k, 0.05 * T * k], w: [['sh' + s, 1]] },
      { p: el, r: [0.042 * T * k, 0.044 * T * k], w: [['sh' + s, 0.5], ['el' + s, 0.5]] },
      { p: lerp(el, hd, 0.5), r: [0.043 * T * k, 0.04 * T * k], w: [['el' + s, 1]] },
      { p: lerp(el, hd, 0.95), r: [0.05 * T * cuff * k, 0.047 * T * cuff * k], w: [['el' + s, 1]] },
    ], { seg: 10, cap1: false });
    const d = norm(sub(hd, el)), side = s === 'L' ? 1 : -1;
    const palm = add(hd, mul(d, 0.05 * k));
    K.ell(mGlove, palm, [0.03 * k, 0.05 * k, 0.022 * k], [['hd' + s, 1]], { rings: 6, seg: 10 });
    K.tube(mGlove, [{ p: add(hd, mul(d, -0.03 * k)), r: 0.03 * k, w: [['el' + s, 0.3], ['hd' + s, 0.7]] }, { p: add(hd, mul(d, 0.02 * k)), r: [0.032 * k, 0.024 * k], w: [['hd' + s, 1]] }], { seg: 8 });
    for (let f = 0; f < 4; f++) {
      const b = add(palm, add(mul(d, 0.04 * k), [0, 0, (f - 1.5) * 0.013 * k]));
      const tip = add(b, add(mul(d, (0.075 - Math.abs(f - 1.4) * 0.008) * k), [0, 0, (f - 1.5) * 0.006 * k]));
      K.spike(mGlove, b, tip, 0.009 * k, [['hd' + s, 1]], { seg: 5 });
    }
    K.spike(mGlove, add(palm, [side * 0.0 * k, 0.0, 0.025 * k]), add(palm, add(mul(d, 0.04 * k), [0, 0, 0.05 * k])), 0.01 * k, [['hd' + s, 1]], { seg: 5 });
  }
  /* 머리: 얼굴(피부, 법선은 감싸는 구에서) + 목 + 눈 · 강조 눈가 선 */
  function headFace(K, S, mSkin, mInk, mAccent, o = {}) {
    const k = S.k, c = add(S.pos.head, [0, 0.145 * k, 0.025 * k]), r = [0.098 * k, 0.132 * k, 0.11 * k];
    K.tube(mSkin, [{ p: add(S.pos.neck, [0, -0.04 * k, 0]), r: 0.05 * k, w: [['chest', 0.4], ['neck', 0.6]], b: -0.2 }, { p: lerp(S.pos.neck, S.pos.head, 0.5), r: 0.045 * k, w: [['neck', 1]], b: -0.3 },
      { p: add(S.pos.head, [0, 0.06 * k, 0.005 * k]), r: 0.044 * k, w: [['head', 1]], b: -0.6 }], { seg: 10 });
    K.ell(mSkin, c, r, [['head', 1]], {
      rings: 12, seg: 18, normC: add(c, [0, 0.02 * k, -0.02 * k]),
      shape: (p, u) => { if (u[1] < 0) { const t = -u[1]; p = [c[0] + (p[0] - c[0]) * (1 - 0.42 * t * t), p[1] - 0.012 * k * t, p[2] + (u[2] > 0 ? 0.018 * k * t : -0.03 * k * t)]; } return p; },
      biasFn: (p, n, u) => (u[1] < -0.55 ? -0.35 : 0) + (u[2] > 0.35 && u[1] > -0.4 ? 0.18 : 0),
    });
    const ey = c[1] - 0.005 * k, ez = c[2] + 0.104 * k;
    for (const sx of [-1, 1]) {   /* 눈: 굵은 윗눈꺼풀 한 획 (게임 거리에서는 점 하나) */
      K.strand(mInk, [[sx * 0.022 * k, ey + 0.004 * k, ez - 0.004 * k], [sx * 0.042 * k, ey + 0.006 * k, ez - 0.012 * k], [sx * 0.062 * k, ey + 0.002 * k, ez - 0.03 * k]], [0.012 * k, 0.014 * k, 0.004 * k], [['head', 1]], { thick: 0.5, up: [0, 1, 0] });
      if (o.accent && (o.accentBoth || sx > 0)) K.strand(mAccent, [[sx * 0.02 * k, ey - 0.022 * k, ez - 0.006 * k], [sx * 0.06 * k, ey - 0.02 * k, ez - 0.03 * k]], [0.007 * k, 0.005 * k], [['head', 1]], { thick: 0.5, up: [0, 1, 0] });
    }
    return { c, r };
  }
  /* 머리카락 덩어리: 두개골 덮개 + 가닥(끝 뾰족, 틈 없이 겹침) — 가닥 = [시작 방향(머리 중심 기준 단위벡터), 길이, 폭, 휨, 체인] */
  function hair(K, S, hc, m, strands, o = {}) {
    const k = S.k, R = o.R || [0.112 * k, 0.142 * k, 0.126 * k];
    K.ell(m, add(hc, [0, 0.012 * k, -0.012 * k]), R, [['head', 1]], { rings: 10, seg: 16, shape: (p, u) => (u[1] < -0.2 && u[2] > 0.1 ? add(p, [0, 0.0, -0.06 * k * (u[2])]) : p) });
    const r = rng(o.seed || 1);
    for (const st of strands) {
      const [dir, L, wd, bend, chain, mat] = st;
      const d = norm(dir), root = add(hc, [d[0] * R[0] * 0.92, d[1] * R[1] * 0.92, d[2] * R[2] * 0.92]);
      /* 두피를 따라 흘러내림: 중력을 두피 접선에 투영한 방향으로 시작 → 점점 아래로 · 살짝 바깥(덩어리 부피) */
      const g = [0, -1, 0], tang = norm(sub(g, mul(d, dot(g, d)) )), outv = norm([d[0], 0, d[2]]);
      const pts = [root];
      for (let i = 1; i <= 4; i++) {
        const t = i / 4, dirv = norm(add(add(mul(tang, 1 - t), mul(g, t)), mul(outv, 0.18 + 0.12 * t)));
        pts.push(add(pts[i - 1], add(mul(dirv, L / 4), mul(bend, t * 0.04 * k))));
      }
      const ws = pts.map((_, i) => chain ? [[chain[Math.min(chain.length - 1, Math.max(0, i - 1))], 1]] : [['head', 1]]);
      K.strand(mat || m, pts, [wd * k, wd * 0.95 * k, wd * 0.75 * k, wd * 0.45 * k, 0.002], ws, { thick: 0.42, up: d });
      if (st[6]) { /* 끝을 잔가닥으로 쪼갬 */
        for (let j = 0; j < 2; j++) { const tp = pts[3], ex = add(tp, add(mul(norm(sub(pts[4], pts[2])), L * (0.22 + r() * 0.1)), [(r() - 0.5) * 0.05 * k, 0, (r() - 0.5) * 0.04 * k]));
          K.strand(mat || m, [lerp(pts[2], tp, 0.6), tp, ex], [wd * 0.35 * k, wd * 0.22 * k, 0.002], ws.slice(2), { thick: 0.4, up: d }); }
      }
    }
  }
  /* 판형 코트(앞이 열림): 몸을 감싸는 고리 행 [{y, rx, rz, cz, gap(앞 틈 반각, 라디안)}] · 아랫단은 날카로운 끝 */
  function coat(K, m, rows, weightFn, o = {}) {
    const cols = o.cols || 22, grid = [], W = [];
    for (let i = 0; i < rows.length; i++) {
      const R = rows[i], row = [], wr = [];
      for (let j = 0; j < cols; j++) {
        const t = j / (cols - 1), a = Math.PI / 2 + R.gap + t * (Math.PI * 2 - 2 * R.gap);   /* +z(앞)에서 틈만큼 떨어져 뒤로 돌아감 */
        let y = R.y; if (i === rows.length - 1 && o.hem) y += o.hem(a, t);
        const fold = o.fold ? o.fold(a, i) : 0;   /* 직선 면으로 꺾인 판: 몇 군데만 바깥으로 꺾음 */
        row.push([Math.cos(a) * (R.rx + fold) + (R.cx || 0), y, Math.sin(a) * (R.rz + fold) + (R.cz || 0)]); wr.push(weightFn(i, a, t));
      }
      grid.push(row); W.push(wr);
    }
    return K.sheet(m, grid, (i, j) => W[i][j], { b: o.b || 0 });
  }

  /* --------------------------------------------------------------------------- 세검 (청) */
  function rapier(R, D) {
    const P = D.pal, S = humanSkel(D.model.rapier.H, D.model.rapier), k = S.k, K = Kit(S);
    /* 화면 전용 체인: 뒷머리 · 옆머리 · 코트 자락 4장 · 파랑 끈 */
    const hB = addChain(S, 'hB', 'head', [[0, 2.12 * k, -0.11 * k], [0, 1.95 * k, -0.14 * k], [0, 1.78 * k, -0.15 * k]]);
    const hL = addChain(S, 'hL', 'head', [[0.1 * k, 2.08 * k, 0.03 * k], [0.12 * k, 1.92 * k, 0.03 * k]]);
    const hR = addChain(S, 'hR', 'head', [[-0.1 * k, 2.08 * k, 0.03 * k], [-0.12 * k, 1.92 * k, 0.03 * k]]);
    const cFL = addChain(S, 'cFL', 'body', [[0.16 * k, 1.05 * k, 0.12 * k], [0.21 * k, 0.78 * k, 0.15 * k]]);
    const cFR = addChain(S, 'cFR', 'body', [[-0.16 * k, 1.05 * k, 0.12 * k], [-0.21 * k, 0.78 * k, 0.15 * k]]);
    const cBL = addChain(S, 'cBL', 'body', [[0.14 * k, 1.05 * k, -0.15 * k], [0.2 * k, 0.78 * k, -0.2 * k]]);
    const cBR = addChain(S, 'cBR', 'body', [[-0.14 * k, 1.05 * k, -0.15 * k], [-0.2 * k, 0.78 * k, -0.2 * k]]);
    const sa = addChain(S, 'sa', 'body', [[0.12 * k, 1.1 * k, 0.11 * k], [0.14 * k, 0.92 * k, 0.12 * k]]);
    /* 다리 (검정 하의 · 뾰족한 구두) */
    leg(K, 'ink', 'L', S); leg(K, 'ink', 'R', S);
    /* 셔츠 몸통 (흰): 좁은 어깨 · 잘록한 허리 · 골반 */
    K.tube('white', [
      { p: [0, 1.06 * k, 0.0], r: [0.15 * k, 0.11 * k], w: [['body', 1]] }, { p: [0, 1.2 * k, 0.0], r: [0.145 * k, 0.1 * k], w: [['body', 1]] },
      { p: [0, 1.38 * k, 0.005 * k], r: [0.112 * k, 0.082 * k], w: [['spine', 1]] }, { p: [0, 1.6 * k, 0.01 * k], r: [0.142 * k, 0.098 * k], w: [['spine', 0.3], ['chest', 0.7]] },
      { p: [0, 1.82 * k, 0.0], r: [0.16 * k, 0.09 * k], w: [['chest', 1]], b: 0.05 }, { p: [0, 1.92 * k, -0.005 * k], r: [0.07 * k, 0.06 * k], w: [['chest', 0.6], ['neck', 0.4]] },
    ], { seg: 16, biasFn: (a) => (Math.sin(a) < -0.6 ? -0.15 : 0) });
    K.strand('ink', [[0, 1.8 * k, 0.095 * k], [0, 1.5 * k, 0.1 * k], [0, 1.24 * k, 0.12 * k]], [0.006 * k, 0.006 * k, 0.006 * k], [['chest', 1], ['spine', 1], ['body', 1]], { thick: 1 });   /* 셔츠 앞 단추 선 (정해진 자리 안쪽 선) */
    /* 흰 세운 깃 (앞이 열림) */
    K.sheet('white', [0, 1].map(i => Array.from({ length: 12 }, (_, j) => { const a = Math.PI / 2 + 0.35 + j / 11 * (Math.PI * 2 - 0.7); return [Math.cos(a) * 0.072 * k, (1.9 + i * 0.1) * k, Math.sin(a) * 0.066 * k + (i ? 0.004 : 0)]; })), () => [['neck', 0.6], ['chest', 0.4]]);
    /* 벨트 + 파랑 장식 끈 */
    K.tube('ink', [{ p: [0, 1.17 * k, 0], r: [0.152 * k, 0.113 * k], w: [['body', 1]] }, { p: [0, 1.21 * k, 0], r: [0.15 * k, 0.111 * k], w: [['body', 1]] }], { seg: 16 });
    K.strand('blue', [[0.12 * k, 1.17 * k, 0.1 * k], ...S.order.filter(n => n.startsWith('sa')).map(n => S.pos[n]), [0.15 * k, 0.75 * k, 0.12 * k]], [0.03 * k, 0.026 * k, 0.02 * k, 0.003], [['body', 1], [sa[0], 1], [sa[1], 1], [sa[1], 1]], { thick: 0.5 });
    K.strand('blue', [[0.13 * k, 1.17 * k, 0.095 * k], [0.165 * k, 1.0 * k, 0.1 * k], [0.18 * k, 0.8 * k, 0.09 * k]], [0.022 * k, 0.018 * k, 0.003], [['body', 1], [sa[0], 1], [sa[1], 1]], { thick: 0.5 });
    /* 소매 없는 검정 롱코트: 어깨 → 무릎 (앞 열림 · 아랫단 날카로운 끝 3개 · 큰 꺾임 몇 군데) */
    const coatW = (i, a) => {
      if (i <= 1) return [['chest', 1]]; if (i === 2) return [['spine', 1]]; if (i === 3) return [['body', 1]];
      const front = Math.sin(a) > 0, left = Math.cos(a) > 0, ch = front ? (left ? cFL : cFR) : (left ? cBL : cBR);
      return [[ch[i >= 5 ? 1 : 0], 1]];
    };
    coat(K, 'ink', [
      { y: 1.9 * k, rx: 0.17 * k, rz: 0.1 * k, gap: 0.55 }, { y: 1.7 * k, rx: 0.165 * k, rz: 0.115 * k, gap: 0.48 }, { y: 1.42 * k, rx: 0.135 * k, rz: 0.1 * k, gap: 0.42 },
      { y: 1.16 * k, rx: 0.17 * k, rz: 0.13 * k, gap: 0.5 }, { y: 0.92 * k, rx: 0.23 * k, rz: 0.18 * k, gap: 0.62 }, { y: 0.66 * k, rx: 0.29 * k, rz: 0.23 * k, gap: 0.72 },
    ], coatW, { cols: 26, hem: (a, t) => { const s = [0.04, 0.22, 0.5, 0.78, 0.96]; let m = 0; for (const q of s) m = Math.max(m, 1 - Math.abs(t - q) / 0.11); return -m * 0.16 * k + (t < 0.04 || t > 0.96 ? 0.06 * k : 0); },
      fold: (a, i) => (i >= 4 ? 0.025 * k * Math.max(0, Math.cos(a * 3)) : 0) });
    /* 팔: 흰 셔츠 소매 (가늘게) + 검정 장갑 */
    arm(K, 'white', 'ink', 'L', S); arm(K, 'white', 'ink', 'R', S);
    /* 머리 · 얼굴 · 파랑 눈가 선 */
    const hf = headFace(K, S, 'skin', 'ink', 'blue', { accent: true });
    /* 머리카락: 등까지 흘러내리는 큰 덩어리 + 끝 잔가닥 + 얼굴을 가로지르는 한 가닥 + 파랑 브리지 */
    const hc = hf.c;
    hair(K, S, hc, 'ink', [
      [[0, 0.35, -1], 0.55 * k, 0.15, [0, 0, -1], hB, null, true], [[0.5, 0.3, -0.8], 0.5 * k, 0.13, [1, 0, -0.5], hB, null, true], [[-0.5, 0.3, -0.8], 0.5 * k, 0.13, [-1, 0, -0.5], hB, null, true],
      [[0.85, 0.2, -0.3], 0.42 * k, 0.11, [1, 0, 0], hL, null, true], [[-0.85, 0.2, -0.3], 0.42 * k, 0.11, [-1, 0, 0], hR, null, true],
      [[0.75, 0.25, 0.45], 0.3 * k, 0.08, [0.5, 0, 0.4], hL], [[-0.75, 0.25, 0.45], 0.3 * k, 0.08, [-0.5, 0, 0.4], hR],
      [[0.25, 0.65, 0.75], 0.17 * k, 0.07, [0.3, 0, 1], null], [[-0.2, 0.7, 0.72], 0.16 * k, 0.07, [-0.2, 0, 1], null], [[0.0, 0.78, 0.62], 0.15 * k, 0.065, [0, 0, 1], null],
      [[0.45, 0.55, 0.7], 0.15 * k, 0.06, [0.5, 0, 1], null], [[-0.12, 0.62, 0.8], 0.24 * k, 0.045, [-0.6, -0.2, 1], null],   /* 얼굴을 가로지르는 가닥 */
      [[0.6, 0.45, 0.3], 0.36 * k, 0.05, [0.6, 0, 0.2], hL, 'blue'], [[0.7, 0.35, -0.1], 0.4 * k, 0.04, [0.8, 0, -0.2], hL, 'blue'],
    ], { seed: D.model.rapier.seed });
    /* 흰 하이라이트 띠 (초승달 2줄, 선 없음) */
    for (const [y, w] of [[0.112, 0.07], [0.09, 0.05]]) K.strand('hi', [-1, -0.3, 0.3, 1].map(t => add(hc, [t * w * k, (y + 0.03 * (1 - t * t)) * k, (0.105 - 0.02 * t * t) * k])), [0.003, 0.012 * k, 0.012 * k, 0.003], [['head', 1]], { thick: 0.3, up: [0, 1, 0.4] });
    /* 세검: 가는 흰 칼날 + 금 고리 손잡이 + 파랑 감김 + 금 머리 / 왼허리 검정 칼집 (파랑 감김) */
    const wp = S.pos.weapon;
    K.tube('steel', [{ p: add(wp, [0, -0.06 * k, 0]), r: [0.012 * k, 0.004 * k], w: [['weapon', 1]] }, { p: add(wp, [0, -0.6 * k, 0]), r: [0.01 * k, 0.0035 * k], w: [['weapon', 1]] }, { p: add(wp, [0, -1.02 * k, 0]), r: 0.001, w: [['weapon', 1]] }], { seg: 6, up: [0, 0, 1] });
    K.tube('blue', [{ p: add(wp, [0, 0.07 * k, 0]), r: 0.014 * k, w: [['weapon', 1]] }, { p: add(wp, [0, -0.03 * k, 0]), r: 0.014 * k, w: [['weapon', 1]] }], { seg: 8 });
    K.ell('gold', add(wp, [0, 0.085 * k, 0]), [0.018 * k, 0.018 * k, 0.018 * k], [['weapon', 1]], { rings: 5, seg: 8 });
    const ring = n => Array.from({ length: n }, (_, i) => { const a = Math.PI * 0.15 + i / (n - 1) * Math.PI * 1.2; return add(wp, [Math.cos(a) * 0.05 * k, -0.05 * k - Math.sin(a) * 0.03 * k, Math.sin(a) * 0.045 * k]); });
    K.tube('gold', ring(9).map(p => ({ p, r: 0.0055 * k, w: [['weapon', 1]] })), { seg: 5 });
    K.tube('gold', [{ p: add(wp, [-0.05 * k, -0.06 * k, 0]), r: 0.006 * k, w: [['weapon', 1]] }, { p: add(wp, [0.05 * k, -0.06 * k, 0]), r: 0.006 * k, w: [['weapon', 1]] }], { seg: 5 });
    K.tube('ink', [{ p: [0.16 * k, 1.16 * k, 0.07 * k], r: 0.022 * k, w: [['body', 1]] }, { p: [0.3 * k, 0.86 * k, -0.12 * k], r: 0.02 * k, w: [['body', 1]] }, { p: [0.42 * k, 0.6 * k, -0.3 * k], r: 0.017 * k, w: [['body', 1]] }], { seg: 8 });
    K.tube('blue', [{ p: [0.18 * k, 1.12 * k, 0.05 * k], r: 0.025 * k, w: [['body', 1]] }, { p: [0.2 * k, 1.08 * k, 0.03 * k], r: 0.025 * k, w: [['body', 1]] }], { seg: 8 });
    return finish(R, D, K, 'rapier');
  }

  /* --------------------------------------------------------------------------- 대검 (적) */
  function great(R, D) {
    const P = D.pal, S = humanSkel(D.model.great.H, D.model.great), k = S.k, K = Kit(S);
    const pt = addChain(S, 'pt', 'head', [[0, 2.3 * k, -0.16 * k], [0, 2.12 * k, -0.24 * k], [0, 1.92 * k, -0.28 * k], [0, 1.7 * k, -0.28 * k]]);
    const cFL = addChain(S, 'cFL', 'body', [[0.17 * k, 1.05 * k, 0.12 * k], [0.24 * k, 0.6 * k, 0.15 * k]]);
    const cFR = addChain(S, 'cFR', 'body', [[-0.17 * k, 1.05 * k, 0.12 * k], [-0.24 * k, 0.6 * k, 0.15 * k]]);
    const cBL = addChain(S, 'cBL', 'body', [[0.15 * k, 1.05 * k, -0.16 * k], [0.24 * k, 0.6 * k, -0.24 * k]]);
    const cBR = addChain(S, 'cBR', 'body', [[-0.15 * k, 1.05 * k, -0.16 * k], [-0.24 * k, 0.6 * k, -0.24 * k]]);
    const sa = addChain(S, 'sa', 'body', [[0.12 * k, 1.12 * k, 0.12 * k], [0.15 * k, 0.86 * k, 0.13 * k]]);
    leg(K, 'ink', 'L', S, { thick: 1.3, toe: 0.16, blunt: true }); leg(K, 'ink', 'R', S, { thick: 1.3, toe: 0.16, blunt: true });
    /* 검정 속옷 (목 높음) */
    K.tube('ink', [
      { p: [0, 1.06 * k, 0.0], r: [0.155 * k, 0.115 * k], w: [['body', 1]] }, { p: [0, 1.38 * k, 0.0], r: [0.12 * k, 0.088 * k], w: [['spine', 1]] },
      { p: [0, 1.62 * k, 0.01 * k], r: [0.155 * k, 0.105 * k], w: [['chest', 1]] }, { p: [0, 1.84 * k, 0.0], r: [0.17 * k, 0.095 * k], w: [['chest', 1]] },
      { p: [0, 1.93 * k, -0.005 * k], r: [0.062 * k, 0.056 * k], w: [['neck', 1]] }, { p: [0, 2.03 * k, 0.0], r: [0.058 * k, 0.054 * k], w: [['neck', 1]] },
    ], { seg: 16 });
    /* 흰 긴 코트 (소매 있음 · 허리를 빨강 띠로 조임 · 아래가 4장으로 갈라짐 · 직선 면 꺾임) */
    const cw = (i, a) => {
      if (i <= 1) return [['chest', 1]]; if (i === 2) return [['spine', 1]]; if (i === 3) return [['body', 1]];
      const front = Math.sin(a) > 0, left = Math.cos(a) > 0, ch = front ? (left ? cFL : cFR) : (left ? cBL : cBR);
      return [[ch[i >= 5 ? 1 : 0], 1]];
    };
    coat(K, 'white', [
      { y: 1.92 * k, rx: 0.19 * k, rz: 0.11 * k, gap: 0.6 }, { y: 1.72 * k, rx: 0.18 * k, rz: 0.125 * k, gap: 0.55 }, { y: 1.42 * k, rx: 0.15 * k, rz: 0.11 * k, gap: 0.42 },
      { y: 1.14 * k, rx: 0.18 * k, rz: 0.14 * k, gap: 0.5 }, { y: 0.7 * k, rx: 0.27 * k, rz: 0.22 * k, gap: 0.72 }, { y: 0.2 * k, rx: 0.36 * k, rz: 0.3 * k, gap: 0.9 },
    ], cw, { cols: 28, hem: (a, t) => (Math.abs(Math.sin(a * 2)) > 0.92 ? 0.12 * k : 0) - (t * 7 % 1 < 0.5 ? 0.04 * k : 0), fold: (a, i) => (i >= 4 ? 0.03 * k * (Math.abs(Math.sin(a * 2.5)) > 0.7 ? 1 : 0) : 0) });
    /* 빨강 허리띠 + 늘어진 두 끝 */
    K.tube('red', [{ p: [0, 1.12 * k, 0], r: [0.185 * k, 0.145 * k], w: [['body', 1]] }, { p: [0, 1.2 * k, 0], r: [0.18 * k, 0.142 * k], w: [['body', 1]] }], { seg: 18 });
    K.strand('red', [[0.12 * k, 1.13 * k, 0.13 * k], S.pos[sa[0]], S.pos[sa[1]], [0.17 * k, 0.62 * k, 0.12 * k]], [0.05 * k, 0.045 * k, 0.04 * k, 0.003], [['body', 1], [sa[0], 1], [sa[1], 1], [sa[1], 1]], { thick: 0.3 });
    K.strand('red', [[0.09 * k, 1.13 * k, 0.14 * k], [0.1 * k, 0.94 * k, 0.15 * k], [0.09 * k, 0.7 * k, 0.15 * k]], [0.045 * k, 0.04 * k, 0.003], [['body', 1], [sa[0], 1], [sa[1], 1]], { thick: 0.3 });
    /* 흰 소매 (판형: 손목에서 넓어짐) + 검정 장갑 */
    arm(K, 'white', 'ink', 'L', S, { thick: 1.3, cuff: 1.7 }); arm(K, 'white', 'ink', 'R', S, { thick: 1.3, cuff: 1.7 });
    const hf = headFace(K, S, 'skin', 'ink', 'red', { accent: true, accentBoth: true });
    const hc = hf.c;
    /* 넘긴 머리 + 높게 묶은 긴 꼬리머리 (끝 잔가닥 · 빨강 한 가닥) */
    hair(K, S, hc, 'ink', [
      [[0.0, 0.8, 0.6], 0.12 * k, 0.07, [0, 0.4, -1], null], [[0.35, 0.7, 0.6], 0.13 * k, 0.06, [0.5, 0.2, -0.6], null], [[-0.35, 0.7, 0.6], 0.13 * k, 0.06, [-0.5, 0.2, -0.6], null],
      [[0.15, 0.6, 0.78], 0.22 * k, 0.035, [0.2, 0, 1], null], [[-0.25, 0.55, 0.78], 0.2 * k, 0.035, [-0.3, 0, 1], null],
      [[0.85, 0.3, 0.2], 0.2 * k, 0.07, [1, 0, 0], null], [[-0.85, 0.3, 0.2], 0.2 * k, 0.07, [-1, 0, 0], null],
    ], { seed: D.model.great.seed, R: [0.11 * k, 0.138 * k, 0.124 * k] });
    const ptp = [add(hc, [0, 0.13 * k, -0.08 * k]), ...pt.map(n => S.pos[n]), [0, 1.48 * k, -0.27 * k]];
    K.strand('ink', ptp, [0.06 * k, 0.13 * k, 0.14 * k, 0.13 * k, 0.09 * k, 0.003], [['head', 1], [pt[0], 1], [pt[1], 1], [pt[2], 1], [pt[3], 1], [pt[3], 1]], { thick: 0.55, up: [1, 0, 0] });
    for (const dx of [-1, 1]) K.strand('ink', [S.pos[pt[2]], S.pos[pt[3]], [dx * 0.06 * k, 1.44 * k, -0.24 * k]], [0.06 * k, 0.04 * k, 0.002], [[pt[2], 1], [pt[3], 1], [pt[3], 1]], { thick: 0.5, up: [1, 0, 0] });
    K.strand('red', [add(ptp[1], [0.03 * k, 0, -0.01 * k]), add(ptp[2], [0.04 * k, 0, -0.02 * k]), add(ptp[3], [0.045 * k, 0, -0.02 * k]), add(ptp[4], [0.03 * k, 0, -0.01 * k])], [0.03 * k, 0.035 * k, 0.03 * k, 0.003], [[pt[0], 1], [pt[1], 1], [pt[2], 1], [pt[3], 1]], { thick: 0.6, up: [1, 0, 0] });
    K.tube('red', [{ p: add(hc, [0, 0.14 * k, -0.1 * k]), r: 0.03 * k, w: [['head', 1]] }, { p: add(hc, [0, 0.1 * k, -0.15 * k]), r: 0.03 * k, w: [['head', 1]] }], { seg: 8 });
    for (const [y, w] of [[0.118, 0.07]]) K.strand('hi', [-1, -0.3, 0.3, 1].map(t => add(hc, [t * w * k, (y + 0.025 * (1 - t * t)) * k, (0.09 - 0.02 * t * t) * k])), [0.003, 0.013 * k, 0.013 * k, 0.003], [['head', 1]], { thick: 0.3, up: [0, 1, 0.4] });
    /* 대검: 곧은 큰 검정 날(끝 비스듬) + 흰 날 선 + 금 코등이 + 빨강 손잡이 · 술 — 바인드에서 칼끝이 아래 */
    const wp = S.pos.weapon, L = 1.25 * k, bw = 0.075 * k;
    K.tube('ink', [{ p: add(wp, [0, -0.09 * k, 0]), r: [bw, 0.016 * k], w: [['weapon', 1]] }, { p: add(wp, [0, -0.09 * k - L * 0.85, 0]), r: [bw, 0.016 * k], w: [['weapon', 1]] },
      { p: add(wp, [bw * 0.5, -0.09 * k - L, 0]), r: [bw * 0.35, 0.01 * k], w: [['weapon', 1]] }], { seg: 4, up: [0, 0, 1] });
    K.tube('steel', [{ p: add(wp, [-bw * 0.95, -0.12 * k, 0]), r: [0.012 * k, 0.018 * k], w: [['weapon', 1]] }, { p: add(wp, [-bw * 0.95, -0.09 * k - L * 0.86, 0]), r: [0.012 * k, 0.018 * k], w: [['weapon', 1]] }], { seg: 4, up: [0, 0, 1] });
    K.tube('gold', [{ p: add(wp, [-0.11 * k, -0.08 * k, 0]), r: [0.022 * k, 0.03 * k], w: [['weapon', 1]] }, { p: add(wp, [0.11 * k, -0.08 * k, 0]), r: [0.022 * k, 0.03 * k], w: [['weapon', 1]] }], { seg: 4 });
    K.tube('red', [{ p: add(wp, [0, -0.06 * k, 0]), r: 0.02 * k, w: [['weapon', 1]] }, { p: add(wp, [0, 0.2 * k, 0]), r: 0.018 * k, w: [['weapon', 1]] }], { seg: 8 });
    K.ell('gold', add(wp, [0, 0.22 * k, 0]), [0.024 * k, 0.024 * k, 0.024 * k], [['weapon', 1]], { rings: 5, seg: 8 });
    K.strand('red', [add(wp, [0, 0.22 * k, 0]), add(wp, [0.03 * k, 0.12 * k, 0.03 * k]), add(wp, [0.04 * k, 0.0, 0.05 * k])], [0.03 * k, 0.025 * k, 0.003], [['weapon', 1]], { thick: 0.6 });
    return finish(R, D, K, 'great');
  }

  /* --------------------------------------------------------------------------- 애저 워든: 흰 페럿형 수호자 */
  function warden(R, D) {
    const P = D.pal, H = D.model.warden.H, k = H / 3.9;
    const S = { order: [], parent: {}, pos: {}, k };
    const B = (n, p, q) => { S.order.push(n); S.parent[n] = p; S.pos[n] = q.map(v => v * k); };
    B('root', null, [0, 0, 0]); B('body', 'root', [0, 1.05, -0.1]); B('spine', 'body', [0, 1.55, 0.02]); B('chest', 'spine', [0, 2.15, 0.0]);
    B('neck', 'chest', [0, 2.6, 0.08]); B('head', 'neck', [0, 3.15, 0.3]);
    B('shL', 'chest', [0.42, 2.45, 0.08]); B('elL', 'shL', [0.62, 2.0, 0.12]); B('hdL', 'elL', [0.6, 1.58, 0.32]);
    B('shR', 'chest', [-0.42, 2.45, 0.08]); B('elR', 'shR', [-0.62, 2.0, 0.12]); B('hdR', 'elR', [-0.6, 1.58, 0.32]); B('weapon', 'hdR', [-0.6, 1.45, 0.4]);
    B('thL', 'body', [0.38, 0.95, -0.05]); B('knL', 'thL', [0.44, 0.55, 0.3]); B('ftL', 'knL', [0.42, 0.14, -0.05]);
    B('thR', 'body', [-0.38, 0.95, -0.05]); B('knR', 'thR', [-0.44, 0.55, 0.3]); B('ftR', 'knR', [-0.42, 0.14, -0.05]);
    B('cape', 'chest', [0, 2.5, -0.2]);
    const tl = []; let tp = 'body'; [[0, 0.85, -0.55], [0, 0.5, -1.0], [0, 0.32, -1.5], [0.25, 0.4, -1.95], [0.55, 0.65, -2.25], [0.72, 1.0, -2.4]].forEach((q, i) => { B('tl' + i, tp, q); tp = 'tl' + i; tl.push('tl' + i); });
    const K = Kit(S), r = rng(D.model.warden.seed);
    const fur = (amp) => () => (r() - 0.5) * amp;   /* 털뭉치 모양 그림자 경계: 정점마다 그림자 경향을 흔듦 */
    /* 몸통: 엉덩이 → 배 → 가슴 → 목 → 머리 (하나의 S곡선 관) */
    K.tube('white', [
      { p: [0, 0.7 * k, -0.2 * k], r: [0.42 * k, 0.4 * k], w: [['body', 1]] }, { p: [0, 1.0 * k, -0.1 * k], r: [0.62 * k, 0.56 * k], w: [['body', 1]] },
      { p: [0, 1.45 * k, 0.05 * k], r: [0.66 * k, 0.6 * k], w: [['body', 0.4], ['spine', 0.6]] }, { p: [0, 1.95 * k, 0.04 * k], r: [0.56 * k, 0.5 * k], w: [['spine', 0.5], ['chest', 0.5]] },
      { p: [0, 2.35 * k, 0.02 * k], r: [0.44 * k, 0.4 * k], w: [['chest', 1]] }, { p: [0, 2.7 * k, 0.12 * k], r: [0.3 * k, 0.3 * k], w: [['chest', 0.3], ['neck', 0.7]] },
      { p: [0, 3.0 * k, 0.24 * k], r: [0.24 * k, 0.24 * k], w: [['neck', 1]] }, { p: [0, 3.18 * k, 0.34 * k], r: [0.2 * k, 0.21 * k], w: [['neck', 0.4], ['head', 0.6]] },
    ], { seg: 22, biasFn: fur(0.5) });
    /* 털 끝 뾰족 실루엣: 큰 뭉치 몇 개 (어깨 · 가슴 털깃 · 엉덩이 · 팔꿈치) */
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, y = [1.0, 1.4, 2.35, 2.55][i % 4] * k, rr = (y > 2.2 * k ? 0.44 : 0.62) * k;
      const base = [Math.cos(a) * rr * 0.92, y + (r() - 0.5) * 0.15 * k, Math.sin(a) * rr * 0.86 + (y > 2.2 * k ? 0.02 * k : 0)];
      const tip = add(base, [Math.cos(a) * (0.1 + r() * 0.12) * k, -(0.06 + r() * 0.12) * k, Math.sin(a) * (0.1 + r() * 0.1) * k]);
      K.spike('white', base, tip, (0.05 + r() * 0.04) * k, [[y > 2.2 * k ? 'chest' : y > 1.3 * k ? 'spine' : 'body', 1]], { seg: 5 });
    }
    /* 머리: 작게 · 긴 주둥이 앞으로 · 분홍 코 · 작은 둥근 귀 · 붉은 실눈 */
    const hc = [0, 3.28 * k, 0.4 * k];
    K.ell('white', hc, [0.22 * k, 0.19 * k, 0.24 * k], [['head', 1]], { rings: 10, seg: 16, normC: hc, biasFn: fur(0.3) });
    K.tube('white', [{ p: add(hc, [0, -0.02 * k, 0.12 * k]), r: [0.16 * k, 0.13 * k], w: [['head', 1]] }, { p: add(hc, [0, -0.06 * k, 0.3 * k]), r: [0.1 * k, 0.08 * k], w: [['head', 1]] },
      { p: add(hc, [0, -0.08 * k, 0.4 * k]), r: [0.05 * k, 0.04 * k], w: [['head', 1]] }], { seg: 12, cap0: false });
    K.ell('pink', add(hc, [0, -0.07 * k, 0.42 * k]), [0.04 * k, 0.03 * k, 0.03 * k], [['head', 1]], { rings: 4, seg: 8 });
    for (const sx of [-1, 1]) {
      K.ell('white', add(hc, [sx * 0.17 * k, 0.15 * k, -0.05 * k]), [0.075 * k, 0.07 * k, 0.03 * k], [['head', 1]], { rings: 5, seg: 10 });
      K.ell('pink', add(hc, [sx * 0.17 * k, 0.15 * k, -0.025 * k]), [0.045 * k, 0.042 * k, 0.012 * k], [['head', 1]], { rings: 4, seg: 8 });
      K.strand('eye', [add(hc, [sx * 0.07 * k, 0.03 * k, 0.21 * k]), add(hc, [sx * 0.12 * k, 0.045 * k, 0.17 * k]), add(hc, [sx * 0.17 * k, 0.07 * k, 0.1 * k])], [0.012 * k, 0.022 * k, 0.003], [['head', 1]], { thick: 0.5, up: [0, 1, 0.3] });
    }
    K.strand('ink', [add(hc, [-0.06 * k, -0.13 * k, 0.33 * k]), add(hc, [0, -0.15 * k, 0.36 * k]), add(hc, [0.06 * k, -0.13 * k, 0.33 * k])], [0.006 * k, 0.008 * k, 0.006 * k], [['head', 1]], { thick: 1 });
    /* 앞발: 오른쪽 = 긴 검정 발톱 · 왼쪽 = 검정 방패 */
    for (const s of ['L', 'R']) {
      const sh = S.pos['sh' + s], el = S.pos['el' + s], hd = S.pos['hd' + s];
      K.tube('white', [{ p: sh, r: 0.2 * k, w: [['chest', 0.5], ['sh' + s, 0.5]] }, { p: lerp(sh, el, 0.5), r: 0.17 * k, w: [['sh' + s, 1]] }, { p: el, r: 0.145 * k, w: [['sh' + s, 0.5], ['el' + s, 0.5]] },
        { p: lerp(el, hd, 0.6), r: 0.14 * k, w: [['el' + s, 1]] }, { p: hd, r: 0.13 * k, w: [['el' + s, 0.3], ['hd' + s, 0.7]] }], { seg: 14, biasFn: fur(0.4) });
      K.ell('white', add(hd, [0, -0.08 * k, 0.06 * k]), [0.16 * k, 0.12 * k, 0.15 * k], [['hd' + s, 1]], { rings: 7, seg: 12, biasFn: fur(0.3) });
      K.spike('white', add(el, [(s === 'L' ? 1 : -1) * 0.1 * k, 0, -0.08 * k]), add(el, [(s === 'L' ? 1 : -1) * 0.24 * k, -0.06 * k, -0.2 * k]), 0.07 * k, [['el' + s, 1]], { seg: 5 });
      for (let f = 0; f < 4; f++) {
        const b = add(hd, [(f - 1.5) * 0.06 * k, -0.15 * k, 0.15 * k]);
        K.spike('ink', b, add(b, [(f - 1.5) * 0.02 * k, -0.2 * k, 0.12 * k]), 0.025 * k, [['hd' + s, 1]], { seg: 5 });
      }
    }
    const sc = add(S.pos.hdL, [0.12 * k, -0.05 * k, 0.28 * k]);
    K.ell('ink', sc, [0.5 * k, 0.72 * k, 0.07 * k], [['hdL', 1]], { rings: 8, seg: 20, shape: (p, u) => add(p, [0, 0, -0.12 * k * (u[0] * u[0] + u[1] * u[1])]) });
    K.ell('red', add(sc, [0, 0.05 * k, 0.065 * k]), [0.2 * k, 0.2 * k, 0.012 * k], [['hdL', 1]], { rings: 4, seg: 18 });
    for (const [x0, y0, x1, y1] of [[-0.3, 0.4, -0.05, 0.5], [-0.32, -0.3, -0.1, -0.42], [0.18, -0.4, 0.3, -0.18]])
      K.strand('steel', [add(sc, [x0 * k, y0 * k, 0.07 * k]), add(sc, [(x0 + x1) / 2 * k, (y0 + y1) / 2 * k + 0.04 * k, 0.075 * k]), add(sc, [x1 * k, y1 * k, 0.07 * k])], [0.04 * k, 0.05 * k, 0.005], [['hdL', 1]], { thick: 0.3, up: [0, 0, 1] });
    /* 뒷다리: 큰 엉덩이 덩어리 + 역관절 + 큰 발 · 검정 발톱 */
    for (const s of ['L', 'R']) {
      const th = S.pos['th' + s], kn = S.pos['kn' + s], ft = S.pos['ft' + s], sx = s === 'L' ? 1 : -1;
      K.ell('white', add(th, [sx * 0.04 * k, -0.08 * k, 0.12 * k]), [0.3 * k, 0.36 * k, 0.36 * k], [['body', 0.4], ['th' + s, 0.6]], { rings: 8, seg: 14, biasFn: fur(0.5) });
      K.tube('white', [{ p: lerp(th, kn, 0.4), r: 0.2 * k, w: [['th' + s, 1]] }, { p: kn, r: 0.15 * k, w: [['th' + s, 0.5], ['kn' + s, 0.5]] }, { p: lerp(kn, ft, 0.5), r: 0.11 * k, w: [['kn' + s, 1]] }, { p: ft, r: 0.1 * k, w: [['kn' + s, 0.3], ['ft' + s, 0.7]] }], { seg: 12, biasFn: fur(0.4) });
      K.ell('white', add(ft, [0, -0.07 * k, 0.16 * k]), [0.14 * k, 0.08 * k, 0.24 * k], [['ft' + s, 1]], { rings: 6, seg: 12 });
      for (let f = 0; f < 4; f++) { const b = add(ft, [(f - 1.5) * 0.06 * k, -0.1 * k, 0.36 * k]); K.spike('ink', b, add(b, [0, -0.04 * k, 0.12 * k]), 0.022 * k, [['ft' + s, 1]], { seg: 5 }); }
    }
    /* 꼬리: 굵고 긴 관 · 끝 검정 */
    const tpts = [[0, 0.75 * k, -0.4 * k], ...tl.map(n => S.pos[n])];
    const tr = [0.26, 0.26, 0.25, 0.23, 0.21, 0.19, 0.06];
    K.tube('white', tpts.slice(0, 5).map((p, i) => ({ p, r: tr[i] * k, w: [[i ? tl[i - 1] : 'body', 1]] })), { seg: 14, biasFn: fur(0.5) });
    K.tube('ink', tpts.slice(4).map((p, i) => ({ p, r: tr[4 + i] * k, w: [[tl[3 + i] || tl[tl.length - 1], 1]] })).concat([{ p: add(tpts[tpts.length - 1], [0.08 * k, 0.25 * k, -0.02 * k]), r: 0.002, w: [[tl[tl.length - 1], 1]] }]), { seg: 14, cap0: false });
    /* 검정 망토: 어깨를 덮는 한 덩어리 (찢긴 끝 3개) */
    coat(K, 'ink', [{ y: 2.72 * k, rx: 0.34 * k, rz: 0.32 * k, cz: 0.08 * k, gap: 0.9 }, { y: 2.45 * k, rx: 0.56 * k, rz: 0.5 * k, cz: 0.04 * k, gap: 0.75 }, { y: 2.1 * k, rx: 0.66 * k, rz: 0.58 * k, cz: 0.0, gap: 0.6 }],
      (i, a) => (i === 0 ? [['chest', 0.5], ['neck', 0.5]] : [['chest', 1]]), { cols: 24, hem: (a, t) => { let m = 0; for (const q of [0.2, 0.5, 0.8]) m = Math.max(m, 1 - Math.abs(t - q) / 0.12); return -m * 0.38 * k; } });
    /* 붓글씨 문신 획 (배 · 왼쪽 옆구리) */
    for (let i = 0; i < 6; i++) {
      const y = (1.25 + i * 0.13) * k, a = Math.PI * 0.62 + (r() - 0.5) * 0.1, rr = 0.645 * k - Math.abs(y - 1.45 * k) * 0.15;
      const p0 = [Math.cos(a) * rr, y, Math.sin(a) * rr], p1 = [Math.cos(a + 0.12) * rr, y - 0.05 * k, Math.sin(a + 0.12) * rr], p2 = [Math.cos(a + 0.05) * rr, y - 0.1 * k, Math.sin(a + 0.05) * rr];
      K.strand('ink', [p0, p1, p2], [0.02 * k, 0.03 * k, 0.004], [['spine', 1]], { thick: 0.6, up: norm([Math.cos(a), 0, Math.sin(a)]) });
    }
    return finish(R, D, K, 'warden');
  }

  /* 재질 표 → 메쉬 */
  function finish(R, D, K, kind) {
    const P = D.pal, T = R.THREE;
    const mats = {
      white: R.mat(P.paper, P.shadeW), ink: R.mat(P.ink, P.ink, { flat: true, side: T.DoubleSide }), skin: R.mat(P.skin, P.skinSh),
      blue: R.mat(P.blue, P.blueSh, { flat: true, side: T.DoubleSide }), red: R.mat(P.red, P.redSh, { flat: true, side: T.DoubleSide }), gold: R.mat(P.gold, P.goldSh),
      steel: R.mat(P.steel, P.steelSh, { side: T.DoubleSide }), hi: R.mat('#e6dfe0', '#e6dfe0', { flat: true, line: 0, side: T.DoubleSide }), pink: R.mat(P.pink, P.pink, { flat: true }),
      eye: R.mat(P.eye, P.eye, { flat: true, side: T.DoubleSide }),
    };
    mats.white.side = T.DoubleSide;   /* 판형 옷(코트 · 깃)은 양면 */
    const M = K.build(T, mats, R); M.kind = kind; M.mats = mats;
    return M;
  }
  return { rapier, great, warden, humanSkel };
})();
