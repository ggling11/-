/* =============================================================================
 * 4단계 테마 1 — 아레나 (t1_arena.js) · 워든: 연회색 바닥 + 사선 빗금 많이(띠 · 구역) · 검정 실루엣 소품 + 흰 덩어리
 *   3단계 아레나 소품 · 네온 · 도시 소품을 쓰지 않음
 * ========================================================================== */
const T1A = (() => {
  const { Kit, rng } = T1M;
  /* 바닥 텍스처: 연회색 바탕 + 사선 빗금 띠(가장자리 고리 · 대각 구역) + 얇은 안쪽 원 — 캔버스로 그림 (헤드리스면 단색) */
  function floorTex(THREE, D, headless) {
    if (headless || typeof document === 'undefined' || !document.createElement) return null;
    const A = D.arena, P = D.pal, N = 2048, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); if (!g || !g.fillRect) return null;
    const S = N / (A.R * 2 + 4), cx = N / 2, cy = N / 2;   /* 텍스처 1px = 1/S 유닛 */
    g.fillStyle = P.sky; g.fillRect(0, 0, N, N);
    const hatch = (clip, w, gap, ang, col) => { g.save(); clip(); g.clip(); g.strokeStyle = col; g.lineWidth = w * S; g.beginPath();
      const d = Math.max(4, (w + gap) * S); for (let t = -N * 1.5; t < N * 1.5; t += d) { const x = cx + Math.cos(ang) * t, y = cy + Math.sin(ang) * t; g.moveTo(x - Math.sin(ang) * N * 2, y + Math.cos(ang) * N * 2); g.lineTo(x + Math.sin(ang) * N * 2, y - Math.cos(ang) * N * 2); }
      g.stroke(); g.restore(); };
    /* 바닥 원판 */
    g.fillStyle = P.floor; g.beginPath(); g.arc(cx, cy, A.R * S, 0, Math.PI * 2); g.fill();
    /* 가장자리 고리: 빗금 띠 */
    hatch(() => { g.beginPath(); g.arc(cx, cy, A.R * S, 0, Math.PI * 2); g.arc(cx, cy, (A.R - A.ring) * S, 0, Math.PI * 2, true); }, A.hatchW, A.hatchGap, Math.PI / 4, P.hatch);
    /* 대각 구역 띠 (UI의 빗금 띠와 같은 언어) */
    const r = rng(A.seed);
    for (let i = 0; i < A.bands; i++) {
      const off = (i - (A.bands - 1) / 2) * A.R * 0.62 + (r() - 0.5) * 1.2, wd = (0.9 + r() * 0.8);
      hatch(() => { g.beginPath(); g.arc(cx, cy, (A.R - A.ring - 0.05) * S, 0, Math.PI * 2); g.clip(); g.translate(cx, cy); g.rotate(-Math.PI / 5); g.beginPath(); g.rect(-N, off * S - wd * S / 2, N * 2, wd * S); g.setTransform(1, 0, 0, 1, 0, 0); },
        A.hatchW * 0.8, A.hatchGap * 1.1, Math.PI / 4, P.hatch);
    }
    /* 안쪽 원 선 2개 (얇은 검정 · 연한) */
    g.strokeStyle = P.ink; g.lineWidth = 0.05 * S; g.beginPath(); g.arc(cx, cy, (A.R - A.ring) * S, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#bfb4b8'; g.lineWidth = 0.035 * S; g.beginPath(); g.arc(cx, cy, A.R * 0.42 * S, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;   /* sRGB 숫자 그대로 (렌더 경로와 같게) */ t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }
  function build(R, D, o = {}) {
    const THREE = R.THREE, A = D.arena, P = D.pal, group = new THREE.Group(); group.name = 't1_arena';
    /* 바닥 */
    const tex = floorTex(THREE, D, o.headless);
    const fm = R.texMat(tex, P.floor, { line: 1 }); R.floorId = fm.uniforms.uId.value;   /* 바닥 ID: 장판 · 그림자가 같은 ID를 써서 외곽선이 안 생김 */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(A.R * 2 + 4, A.R * 2 + 4), fm); floor.rotation.x = -Math.PI / 2; floor.name = 't1_floor'; group.add(floor);
    /* 소품: 검정 실루엣(부서진 기둥 · 문 · 깃발) + 흰 덩어리(석등 · 바위) — 같은 재질은 한 메쉬로 */
    const S = { order: ['root'], parent: {}, pos: { root: [0, 0, 0] } }, K = Kit(S), r = rng(A.seed * 7 + 1), w = [['root', 1]];
    /* 뒤쪽 큰 문 실루엣 */
    const gz = -A.R - 1.2;
    for (const sx of [-1, 1]) { K.box('ink', [sx * 3.2, 3.2, gz], [0.32, 3.2, 0.32], w); K.box('ink', [sx * 3.2, 0.25, gz], [0.5, 0.25, 0.5], w); }
    K.box('ink', [0, 6.5, gz], [4.6, 0.28, 0.4], w); K.box('ink', [0, 5.7, gz], [3.7, 0.16, 0.25], w);
    for (const sx of [-1.6, 1.6]) {   /* 문에 걸린 검정 깃발 + 빨강 원 */
      K.sheet('ink', [0, 1, 2, 3].map(i => [-0.55, 0.55].map(x => [sx + x + (i === 3 ? (x > 0 ? -0.2 : 0.2) : 0), 5.55 - i * 0.9, gz + 0.3])), () => w);
      K.ell('red', [sx, 4.4, gz + 0.33], [0.32, 0.32, 0.02], w, { rings: 4, seg: 14 });
    }
    /* 둘레: 검정 부서진 기둥(육각 · 윗부분이 뾰족하게 깨짐) · 검정 깃발(빨강 원) · 흰 둥근 바위(회보라 그림자 · 털뭉치처럼 끊긴 경계) */
    const T1fur = amp => () => (r() - 0.5) * amp;
    for (let i = 0; i < A.props; i++) {
      const a = (i / A.props) * Math.PI * 2 + r() * 0.25, rr = A.R + 1.0 + r() * 1.6;
      if (Math.cos(a - 0.62) > 0.5) continue;   /* 카메라 쪽(앞)은 비움 */
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, kind = i % 4;
      if (kind === 0) {   /* 흰 바위 */
        K.ell('white', [x, 0.55, z], [0.9 + r() * 0.5, 0.75 + r() * 0.4, 0.8 + r() * 0.4], w, { rings: 7, seg: 12, biasFn: T1fur(0.45) });
      } else if (kind === 3) {   /* 검정 깃발 */
        const h = 4.2 + r() * 1.5;
        K.tube('ink', [{ p: [x, 0, z], r: 0.07, w }, { p: [x, h, z], r: 0.06, w }], { seg: 6 });
        const n = [-Math.sin(a), 0, Math.cos(a)], c0 = [x + n[0] * 0.08, h - 0.15, z + n[2] * 0.08];
        K.sheet('ink', [0, 1, 2, 3].map(j => [0, 1].map(q => [c0[0] + n[0] * (0.1 + q * 1.1) + (j === 3 && q ? n[0] * -0.3 : 0), c0[1] - j * 0.9 - (q && j === 3 ? 0.3 : 0), c0[2] + n[2] * (0.1 + q * 1.1)])), () => w);
        K.ell('red', [c0[0] + n[0] * 0.65 - Math.cos(a) * 0.02, c0[1] - 1.3, c0[2] + n[2] * 0.65 - Math.sin(a) * 0.02], [0.34 * Math.abs(n[0]) + 0.02, 0.34, 0.34 * Math.abs(n[2]) + 0.02], w, { rings: 4, seg: 14 });
      } else {   /* 검정 부서진 기둥 */
        const h = 1.6 + r() * 3.4, rad = 0.32 + r() * 0.18, tw = r() * 2;
        K.tube('ink', [{ p: [x, 0, z], r: rad * 1.15, w }, { p: [x, 0.3, z], r: rad, w }, { p: [x, h, z], r: rad * 0.9, w }], { seg: 6, up: [Math.cos(tw), 0, Math.sin(tw)] });
        K.spike('ink', [x + (r() - 0.5) * 0.2, h - 0.05, z + (r() - 0.5) * 0.2], [x + (r() - 0.5) * 0.5, h + 0.5 + r() * 0.8, z + (r() - 0.5) * 0.5], rad * 0.8, w, { seg: 6 });
        if (r() < 0.6) K.box('ink', [x + (r() - 0.5) * 1.6, 0.18, z + (r() - 0.5) * 1.6], [0.35, 0.18, 0.25], w, { ry: r() * 3, top: 0.6 });   /* 무너진 조각 */
      }
    }
    const mats = { ink: R.mat(P.ink, P.ink, { flat: true, side: THREE.DoubleSide, line: 1.2 }), white: R.mat(P.paper, P.shadeW, { line: 1.2 }), red: R.mat(P.red, P.red, { flat: true, side: THREE.DoubleSide }) };
    const M = K.build(THREE, mats, R); group.add(M.root);
    /* 먼 배경 연회색 계단 (가장자리로 갈수록 어두움 — 그라데이션 대신 2단) */
    for (const [rr, col] of [[A.R + 6, '#ece6e6'], [A.R + 14, '#e2dbdc']]) {
      const ringG = new THREE.RingGeometry(rr, rr + 40, 64); const m = new THREE.Mesh(ringG, R.mat(col, col, { flat: true, line: 0 })); m.rotation.x = -Math.PI / 2; m.position.y = -0.02; group.add(m);
    }
    group.userData.floor = floor; group.userData.props = M;
    return group;
  }
  return { build, floorTex };
})();
