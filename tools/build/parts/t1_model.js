/* =============================================================================
 * 4단계 테마 1 — 모델 빌더 (t1_model.js) · 3단계 메쉬 코드를 쓰지 않고 새로 짬
 *   '보이는 리그': 뼈 이름은 판정용 숨은 리그와 같게(body · spine · chest · neck · head · sh/el/hd L·R · th/kn/ft L·R · cape · weapon)
 *   + 화면 전용 뼈(머리카락 · 코트 자락 · 꼬리 · 끈 체인). 뼈 길이 · 비율 · 굵기는 이 테마 것.
 *   도형: 관(고리 이음, 타원 단면) · 타원체 · 리본 판 · 뾰족 다발 → 재질별로 한 SkinnedMesh로 합침 (드로우콜 적게)
 *   정점 속성: aPart(부품 ID — 외곽선 경계) · aBias(그림자 경향: 목 아래 · 겨드랑이 −, 볼 · 이마 +)
 *   법선 옮겨 쓰기: 머리 · 얼굴은 감싸는 구의 법선 → 그림자 경계가 매끈한 큰 덩어리
 * ========================================================================== */
const T1M = (() => {
  const V = (x, y, z) => [x, y, z];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  /* 모델 전용 시드 난수 (Math.random 안 씀 — ★1) */
  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function Kit(skel) {
    /* skel: { order: [이름...], parent: {이름: 부모}, pos: {이름: [x,y,z] 바인드 위치(모델 공간)} } */
    const K = { skel, idx: {}, B: {}, part: 0 };
    skel.order.forEach((n, i) => { K.idx[n] = i; });
    K.id = n => { let i = K.idx[n]; if (i === undefined) { i = skel.order.indexOf(n); if (i >= 0) K.idx[n] = i; else i = 0; } return i; };   /* 체인 뼈는 나중에 붙음 */
    const batch = m => (K.B[m] = K.B[m] || { p: [], n: [], si: [], sw: [], pa: [], bi: [], ix: [] });
    const W = w => { const o = (w || [['root', 1]]).slice(0, 4).map(([n, x]) => [K.id(n), x]); const s = o.reduce((a, q) => a + q[1], 0) || 1; while (o.length < 4) o.push([0, 0]); return o.map(q => [q[0], q[1] / s]); };
    K.vert = (m, p, n, w, part, bias) => {
      const b = batch(m), i = b.p.length / 3, ww = W(w);
      b.p.push(...p); b.n.push(...n); for (const [j, x] of ww) { b.si.push(j); b.sw.push(x); } b.pa.push(part ?? K.part); b.bi.push(bias ?? 0); return i;
    };
    K.tri = (m, a, b2, c) => { batch(m).ix.push(a, b2, c); };
    K.newPart = () => (K.part = (K.part + 1) % 200);
    /* 관: 고리 [{p, r: [rx, rz] | r, w, b(그림자 경향)}] — 단면 타원, up = 단면의 z축 기준(앞) */
    K.tube = (m, rings, o = {}) => {
      const seg = o.seg || 12, part = o.part ?? K.newPart(), up0 = o.up || [0, 0, 1];
      const base = [];
      for (let i = 0; i < rings.length; i++) {
        const R = rings[i], a = rings[Math.max(0, i - 1)].p, c = rings[Math.min(rings.length - 1, i + 1)].p;
        const t = norm(sub(c, a)); let u = sub(up0, mul(t, dot(up0, t)));
        if (len(u) < 1e-4) u = Math.abs(t[0]) < 0.9 ? cross(t, [1, 0, 0]) : cross(t, [0, 1, 0]);
        u = norm(u); const s = norm(cross(t, u));
        const rx = Array.isArray(R.r) ? R.r[0] : R.r, rz = Array.isArray(R.r) ? R.r[1] : R.r;
        const row = [];
        for (let k = 0; k < seg; k++) {
          const ang = (k / seg) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
          const d = add(mul(s, cs * rx), mul(u, sn * rz));
          const nn = norm(add(mul(s, cs / Math.max(rx, 1e-4)), mul(u, sn / Math.max(rz, 1e-4))));
          const bias = (R.b || 0) + (o.biasFn ? o.biasFn(ang, i, rings.length) : 0);
          row.push(K.vert(m, add(R.p, d), nn, R.w, part, bias));
        }
        base.push(row);
      }
      for (let i = 0; i + 1 < base.length; i++) for (let k = 0; k < seg; k++) {
        const a = base[i][k], b2 = base[i][(k + 1) % seg], c = base[i + 1][k], d = base[i + 1][(k + 1) % seg];
        K.tri(m, a, c, b2); K.tri(m, b2, c, d);
      }
      const cap = (row, R, flip) => {
        const t = norm(sub(rings[flip ? rings.length - 1 : 0].p, rings[flip ? rings.length - 2 : 1].p));
        const ci = K.vert(m, R.p, t, R.w, part, R.b || 0);
        for (let k = 0; k < seg; k++) flip ? K.tri(m, row[k], row[(k + 1) % seg], ci) : K.tri(m, row[(k + 1) % seg], row[k], ci);
      };
      if (o.cap0 !== false && rings.length > 1) cap(base[0], rings[0], false);
      if (o.cap1 !== false && rings.length > 1) cap(base[base.length - 1], rings[rings.length - 1], true);
      return part;
    };
    /* 타원체: c · r[3] · w · normC(법선 옮겨 쓰기 중심, 없으면 자기 모양) · shape(v)→v 변형 · biasFn(점, 법선) */
    K.ell = (m, c, r, w, o = {}) => {
      const sr = o.rings || 10, sg = o.seg || 16, part = o.part ?? K.newPart(), rows = [];
      for (let i = 0; i <= sr; i++) {
        const th = Math.PI * i / sr, row = [];
        for (let k = 0; k < sg; k++) {
          const ph = 2 * Math.PI * k / sg, u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
          let p = add(c, [u[0] * r[0], u[1] * r[1], u[2] * r[2]]);
          if (o.shape) p = o.shape(p, u);
          const n = o.normC ? norm(sub(p, o.normC)) : norm([u[0] / r[0], u[1] / r[1], u[2] / r[2]]);
          row.push(K.vert(m, p, n, typeof w === 'function' ? w(p) : w, part, o.biasFn ? o.biasFn(p, n, u) : (o.bias || 0)));
          if (i === 0 || i === sr) break;
        }
        rows.push(row);
      }
      for (let i = 0; i + 1 < rows.length; i++) {
        const A = rows[i], B = rows[i + 1];
        if (A.length === 1) { for (let k = 0; k < sg; k++) K.tri(m, A[0], B[(k + 1) % sg], B[k]); continue; }
        if (B.length === 1) { for (let k = 0; k < sg; k++) K.tri(m, A[k], A[(k + 1) % sg], B[0]); continue; }
        for (let k = 0; k < sg; k++) { const a = A[k], b2 = A[(k + 1) % sg], c2 = B[k], d = B[(k + 1) % sg]; K.tri(m, a, b2, c2); K.tri(m, b2, d, c2); }
      }
      return part;
    };
    /* 리본 판(양면): 중심선 pts · 폭 widths · 펼침 방향 side(월드) · 두께 thick(얇은 관으로) · 끝 뾰족 */
    K.strand = (m, pts, widths, ws, o = {}) => {
      if (ws.length && typeof ws[0][0] === 'string') ws = [ws];   /* 가중치 하나 = 모든 점 같은 뼈 */
      const rings = pts.map((p, i) => ({ p, r: [widths[i] / 2, (o.thick ?? 0.35) * widths[i] / 2], w: ws[Math.min(i, ws.length - 1)], b: o.b || 0 }));
      return K.tube(m, rings, { seg: o.seg || 6, up: o.up || [0, 0, 1], part: o.part, cap0: o.cap0, cap1: false });
    };
    /* 판(양면 1장): 정점 격자 rows × cols, w(행 i) */
    K.sheet = (m, grid, wrow, o = {}) => {
      const part = o.part ?? K.newPart(), R = grid.length, C = grid[0].length, id = [];
      for (let i = 0; i < R; i++) { const row = []; for (let j = 0; j < C; j++) {
        const a = grid[Math.max(0, i - 1)][j], b2 = grid[Math.min(R - 1, i + 1)][j], c = grid[i][Math.max(0, j - 1)], d = grid[i][Math.min(C - 1, j + 1)];
        let n = norm(cross(sub(d, c), sub(b2, a))); if (o.flipN) n = mul(n, -1);
        row.push(K.vert(m, grid[i][j], n, wrow(i, j), part, o.b || 0)); } id.push(row); }
      for (let i = 0; i + 1 < R; i++) for (let j = 0; j + 1 < C; j++) { K.tri(m, id[i][j], id[i + 1][j], id[i][j + 1]); K.tri(m, id[i][j + 1], id[i + 1][j], id[i + 1][j + 1]); }
      return part;
    };
    /* 뾰족 원뿔 (털 끝 · 발톱 · 머리 끝) */
    K.spike = (m, base, tip, r, w, o = {}) => K.tube(m, [{ p: base, r: o.r2 ? [r, o.r2] : r, w }, { p: lerp(base, tip, 0.55), r: o.r2 ? [r * 0.6, o.r2 * 0.6] : r * 0.6, w }, { p: tip, r: 0.0005, w }], { seg: o.seg || 6, part: o.part, up: o.up, cap1: false });
    /* 상자 (소품): 중심 c · 반지름 h[3] · y축 회전 ry · 위쪽 기울임 lean — 면마다 평평한 법선 */
    K.box = (m, c, h, w, o = {}) => {
      const part = o.part ?? K.newPart(), ry = o.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry), top = o.top || 1;
      const P = (x, y, z) => { const sx = y > 0 ? top : 1; x *= sx; z *= sx; return [c[0] + x * cs + z * sn, c[1] + y, c[2] - x * sn + z * cs]; };
      const F = [[[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]], [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
        [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]], [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
        [[0, 0, 1], [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]]], [[0, 0, -1], [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]]];
      for (const [n, q] of F) {
        const nn = [n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs];
        const id = q.map(v => K.vert(m, P(v[0] * h[0], v[1] * h[1], v[2] * h[2]), nn, w, part, o.b || 0));
        K.tri(m, id[0], id[1], id[2]); K.tri(m, id[0], id[2], id[3]);
      }
      return part;
    };
    /* 굳히기: 재질 이름 → { lit, shade, flat, line } → SkinnedMesh들 + 뼈대 */
    K.build = (THREE, mats, R) => {
      const bones = skel.order.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
      skel.order.forEach((n, i) => {
        const p = skel.parent[n], pp = skel.pos[n], b = bones[i];
        if (p) { const pq = skel.pos[p]; b.position.set(pp[0] - pq[0], pp[1] - pq[1], pp[2] - pq[2]); bones[K.id(p)].add(b); }
        else b.position.set(pp[0], pp[1], pp[2]);
      });
      const root = new THREE.Group(); root.add(bones[0]); root.updateMatrixWorld(true);
      const skeleton = new THREE.Skeleton(bones);
      const meshes = {}; let tris = 0;
      for (const key in K.B) {
        const b = K.B[key], g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(b.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(b.sw, 4));
        g.setAttribute('aPart', new THREE.Float32BufferAttribute(b.pa, 1)); g.setAttribute('aBias', new THREE.Float32BufferAttribute(b.bi, 1));
        g.setIndex(b.ix); g.computeBoundingSphere(); g.boundingSphere.radius += 3;
        const M = mats[key]; if (!M) continue;
        const mesh = new THREE.SkinnedMesh(g, M); mesh.frustumCulled = false; mesh.name = 't1_' + key;
        root.add(mesh); mesh.bind(skeleton, new THREE.Matrix4());
        meshes[key] = mesh; tris += b.ix.length / 3;
      }
      const byName = {}; bones.forEach(b => { byName[b.name] = b; });
      const rest = {}; bones.forEach(b => { rest[b.name] = { p: b.position.clone(), q: b.quaternion.clone() }; });
      return { root, bones: byName, list: bones, skeleton, meshes, tris, rest };
    };
    return K;
  }
  return { Kit, rng, V, add, sub, mul, lerp, norm, cross, dot, len };
})();
