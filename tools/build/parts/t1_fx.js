/* =============================================================================
 * 4단계 테마 1 — 이펙트 (t1_fx.js) · 반투명 없음, 딱 끊긴 면만
 *   베기 궤적 = 흰/검정 날카로운 평면(끝 뾰족) · 타격 = 검정 먹 튀김 + 작은 적·청 조각 · 피 = 검정/진홍 평면
 *   자파 = 진보라 먹 번짐 · 예고 = 검정 사선 빗금 + 굵은 테두리 · 스피드 라인 · 바닥 그림자(회색 평면 한 단)
 *   난수는 테마 전용 시드 난수(★1)
 * ========================================================================== */
const T1F = (() => {
  const { rng } = T1M;
  function create(R, D) {
    const THREE = R.THREE, F = { R, D, list: [], rand: rng(9091), group: new THREE.Group() };
    F.group.name = 't1_fx';
    const col = h => T1R.hex(THREE, h);
    /* 정점색 삼각형 묶음 → 메쉬 (aCol = rgb + 보임) */
    F.mesh = (tris, o = {}) => {
      const pos = [], cols = [];
      for (const t of tris) for (const p of t.p) { pos.push(p[0], p[1], p[2]); cols.push(t.c.r, t.c.g, t.c.b, 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(cols, 4));
      const m = new THREE.Mesh(g, R.fxMat({ line: o.line ?? 0, depthTest: o.depthTest, depthWrite: o.depthWrite })); m.frustumCulled = false; m.renderOrder = o.order || 0; return m;
    };
    F.add = (mesh, life, upd) => { F.group.add(mesh); const e = { mesh, t: 0, life, upd }; F.list.push(e); return e; };
    F.update = dt => {
      for (let i = F.list.length - 1; i >= 0; i--) {
        const e = F.list[i]; e.t += dt; if (e.upd) e.upd(e, dt);
        if (e.t >= e.life) { F.group.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); R.mats.splice(R.mats.indexOf(e.mesh.material), 1); F.list.splice(i, 1); }
      }
    };
    F.clear = () => { for (const e of F.list) { F.group.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); const k = R.mats.indexOf(e.mesh.material); if (k >= 0) R.mats.splice(k, 1); } F.list.length = 0; };
    /* 베기 궤적: 호 모양 날카로운 평면 (흰 몸 + 검정 가장자리 띠 · 끝 뾰족) — c 중심, r 반지름, a0→a1 각도(수평면), y 높이, tilt */
    F.smear = (c, r, a0, a1, y, o = {}) => {
      const n = 14, tris = [], W = o.w || 0.42, ink = col(D.pal.ink), paper = col(o.color || D.pal.paper);
      const P = (a, rr, yy) => [c[0] + Math.sin(a) * rr, yy, c[2] + Math.cos(a) * rr];
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, w0 = W * Math.sin(Math.PI * Math.pow(t0, 0.7)), w1 = W * Math.sin(Math.PI * Math.pow(t1, 0.7));
        const A0 = a0 + (a1 - a0) * t0, A1 = a0 + (a1 - a0) * t1, y0 = y + (o.dy || 0) * t0, y1 = y + (o.dy || 0) * t1;
        const p = [P(A0, r, y0), P(A1, r, y1), P(A1, r - w1, y1 - w1 * (o.tilt || 0)), P(A0, r - w0, y0 - w0 * (o.tilt || 0))];
        const q = [P(A0, r + 0.05, y0), P(A1, r + 0.05, y1), P(A1, r - w1 * 0.18, y1), P(A0, r - w0 * 0.18, y0)];
        tris.push({ p: [p[0], p[1], p[2]], c: paper }, { p: [p[0], p[2], p[3]], c: paper }, { p: [q[0], q[1], q[2]], c: ink }, { p: [q[0], q[2], q[3]], c: ink });
      }
      const m = F.mesh(tris, { line: 1 }); return F.add(m, o.life ?? D.fx.smearLife);
    };
    /* 먹 튀김: 불규칙한 검정 덩어리 + 방울 · 작은 적/청 조각 (화면을 향한 판) */
    F.ink = (p, cam, o = {}) => {
      const r = F.rand, tris = [], ink = col(o.color || D.pal.ink), N = o.n ?? D.fx.inkN, S = o.size || 1;
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const blob = (cx, cy, rad, k, cc) => { const pts = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2, rr = rad * (0.55 + r() * 0.7); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        for (let i = 0; i < k; i++) { const a = pts[i], b = pts[(i + 1) % k]; tris.push({ p: [[cx, cy], a, b].map(q => [p.x + right.x * q[0] + up.x * q[1], p.y + right.y * q[0] + up.y * q[1], p.z + right.z * q[0] + up.z * q[1]]), c: cc }); } };
      blob(0, 0, 0.32 * S, 11, ink);
      for (let i = 0; i < N; i++) { const a = r() * Math.PI * 2, d = (0.35 + r() * 0.75) * S; blob(Math.cos(a) * d, Math.sin(a) * d * 0.8, (0.04 + r() * 0.08) * S, 6, ink); }
      for (let i = 0; i < (o.accent ?? D.fx.accentN); i++) {
        const a = r() * Math.PI * 2, d = (0.4 + r() * 0.6) * S, cc = col(i % 2 ? D.pal.red : D.pal.blue), x = Math.cos(a) * d, y = Math.sin(a) * d, s = 0.09 * S;
        tris.push({ p: [[x, y], [x + s * Math.cos(a + 2.4), y + s * Math.sin(a + 2.4)], [x + s * 1.8 * Math.cos(a), y + s * 1.8 * Math.sin(a)]].map(q => [p.x + right.x * q[0] + up.x * q[1], p.y + right.y * q[0] + up.y * q[1], p.z + right.z * q[0] + up.z * q[1]]), c: cc });
      }
      const m = F.mesh(tris, { line: 0, order: 5 });
      return F.add(m, o.life ?? D.fx.inkLife, (e) => { const k = e.t / e.life; e.mesh.material.uniforms.uOpacity.value = k < 0.7 ? 1 : 0.0 + (Math.floor((1 - k) * 12) % 2); e.mesh.scale.setScalar(1 + k * 0.25); });
    };
    /* 눈 반짝임 (보스 예고 순간): 빨간 4갈래 별 · 화면을 향한 판 · 짧게 커졌다 사라짐 */
    F.glint = (p, cam, o = {}) => {
      const tris = [], red = col(o.color || D.pal.red), S = o.size || 0.5;
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const P2 = q => [p.x + right.x * q[0] + up.x * q[1], p.y + right.y * q[0] + up.y * q[1], p.z + right.z * q[0] + up.z * q[1]];
      for (const [ax, ay, L, w] of [[1, 0, 1, 0.09], [0, 1, 0.75, 0.09], [0.7, 0.7, 0.32, 0.06], [0.7, -0.7, 0.32, 0.06]])
        for (const sg of [1, -1]) tris.push({ p: [[sg * ax * L * S, sg * ay * L * S], [-ay * w * S, ax * w * S], [ay * w * S, -ax * w * S]].map(P2), c: red });
      const m = F.mesh(tris, { line: 0, depthTest: false, order: 21 });
      return F.add(m, o.life ?? 0.32, (e) => { const k = e.t / e.life; e.mesh.scale.setScalar(k < 0.25 ? 0.3 + k / 0.25 * 0.9 : 1.2 - (k - 0.25) * 1.4); });
    };
    /* 스피드 라인: 화면 가장자리에서 중심으로 모이는 검정 쐐기 (카메라 앞 판) */
    F.speed = (cam, o = {}) => {
      const r = F.rand, tris = [], ink = col(D.pal.ink), N = o.n ?? D.fx.speedLines, dist = cam.near + 0.5;
      const h = Math.tan(cam.fov * Math.PI / 360) * dist, w = h * cam.aspect;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + r() * 0.2, R0 = Math.hypot(w, h) * 1.1, R1 = R0 * (0.55 + r() * 0.25), wd = 0.012 * dist * (0.6 + r());
        const p0 = [Math.cos(a) * R0, Math.sin(a) * R0], p1 = [Math.cos(a) * R1, Math.sin(a) * R1], n = [-Math.sin(a) * wd, Math.cos(a) * wd];
        tris.push({ p: [[p0[0] + n[0], p0[1] + n[1], -dist], [p0[0] - n[0], p0[1] - n[1], -dist], [p1[0], p1[1], -dist]], c: ink });
      }
      const m = F.mesh(tris, { line: 0, depthTest: false, depthWrite: false, order: 20 }); cam.add(m);
      const e = { mesh: m, t: 0, life: o.life ?? 0.25 }; F.list.push(e); m.parent = cam; return e;
    };
    /* 예고 장판: 검정 사선 빗금 + 굵은 테두리 (원 · 부채꼴) — 바닥 바로 위 */
    F.tele = (c, o = {}) => {
      const tris = [], ink = col(D.pal.ink), R0 = o.r || 2, a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? Math.PI, y = 0.02 + (o.y || 0), n = 48;
      const P = (a, rr) => [c[0] + Math.sin(a) * rr, y, c[2] + Math.cos(a) * rr];
      const B = o.border || 0.16;
      for (let i = 0; i < n; i++) { const A0 = a0 + (a1 - a0) * i / n, A1 = a0 + (a1 - a0) * (i + 1) / n; const q = [P(A0, R0), P(A1, R0), P(A1, R0 - B), P(A0, R0 - B)]; tris.push({ p: [q[0], q[1], q[2]], c: ink }, { p: [q[0], q[2], q[3]], c: ink }); }
      if (a1 - a0 < Math.PI * 2 - 0.01) for (const A of [a0, a1]) { const d = [Math.cos(A) * B / 2, 0, -Math.sin(A) * B / 2]; const q = [[c[0] - d[0], y, c[2] - d[2]], [c[0] + d[0], y, c[2] + d[2]], P(A, R0).map((v, k) => v + d[k]), P(A, R0).map((v, k) => v - d[k])]; tris.push({ p: [q[0], q[1], q[2]], c: ink }, { p: [q[0], q[2], q[3]], c: ink }); }
      /* 사선 빗금 (45°) — 안쪽 원과 만나는 구간만 (부채꼴이면 각도 밖은 잘게 잘라 버림) */
      const st = o.step || 0.36, sw = o.sw || 0.14, Ri = R0 - B, full = a1 - a0 >= Math.PI * 2 - 0.01;
      const inSec = (x, z) => { if (full) return true; let da = Math.atan2(x - c[0], z - c[2]) - a0; while (da < 0) da += Math.PI * 2; while (da > Math.PI * 2) da -= Math.PI * 2; return da <= a1 - a0; };
      for (let t = -Ri; t <= Ri; t += st) {
        const h = Math.sqrt(Math.max(0, Ri * Ri - t * t)); if (h < 0.05) continue;
        const segs = full ? 1 : 16;
        for (let k = 0; k < segs; k++) {
          const s0 = -h + 2 * h * k / segs, s1 = s0 + 2 * h / segs;
          const pt = s => [c[0] + t * 0.7071 + s * 0.7071, c[2] - t * 0.7071 + s * 0.7071];
          const A = pt(s0), Bp = pt(s1); if (!inSec((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2)) continue;
          const nn = [sw / 2 * 0.7071, -sw / 2 * 0.7071];
          tris.push({ p: [[A[0] + nn[0], y, A[1] - nn[1]], [Bp[0] + nn[0], y, Bp[1] - nn[1]], [Bp[0] - nn[0], y, Bp[1] + nn[1]]], c: ink }, { p: [[A[0] + nn[0], y, A[1] - nn[1]], [Bp[0] - nn[0], y, Bp[1] + nn[1]], [A[0] - nn[0], y, A[1] + nn[1]]], c: ink });
        }
      }
      const m = F.mesh(tris, { line: 0, order: 1 }); return F.add(m, o.life ?? 1.0);
    };
    /* 바닥 그림자 (회색 평면 한 단 · 가장자리 딱) */
    F.shadowMesh = (rx, rz) => {
      const g = new THREE.CircleGeometry(1, 28); g.rotateX(-Math.PI / 2); g.scale(rx, 1, rz);
      const m = new THREE.Mesh(g, R.mat(D.pal.floorSh, D.pal.floorSh, { flat: true, line: 0, id: R.floorId })); m.position.y = 0.012; m.renderOrder = -1; return m;
    };
    return F;
  }
  return { create };
})();
