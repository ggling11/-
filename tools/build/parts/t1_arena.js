/* =============================================================================
 * 4단계 테마 1 — 아레나 (t1_arena.js) · 워든: 연회색 바닥 + 사선 빗금 많이(띠 · 구역) · 검정 실루엣 소품 + 흰 덩어리
 *   3단계 아레나 소품 · 네온 · 도시 소품을 쓰지 않음
 * ========================================================================== */
const T1A = (() => {
  const { Kit, rng } = T1M;
  /* 바닥 텍스처 (라운드 5): 연회색 바탕 + 붓 빗금(끝이 가늘어지는 획 · 간격 · 길이 흔들림) — 가장자리 고리 띠 + 구역 2개만, 가운데는 비움(여백)
   *   획 방향 = 캔버스 세로 = 월드 z → 게임 카메라(yaw 45°)에서 화면 사선으로 보임. 균일한 줄무늬(덮은 무늬처럼 읽힘)는 쓰지 않음 */
  function floorTex(THREE, D, headless) {
    if (headless || typeof document === 'undefined' || !document.createElement) return null;
    const A = D.arena, P = D.pal, N = 2048, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); if (!g || !g.fillRect) return null;
    const S = N / (A.R * 2 + 4), cx = N / 2, cy = N / 2, r = rng(A.seed);   /* 텍스처 1px = 1/S 유닛 */
    g.fillStyle = P.sky; g.fillRect(0, 0, N, N);
    /* 붓 획 하나: (x, y) 시작 · 길이 L · 굵기 w (px) — 가운데 굵고 양 끝 뾰족, 살짝 휨 */
    const stroke = (x, y, L, w, col, bend) => {
      const n = 8, left = [], right = [];
      for (let i = 0; i <= n; i++) { const t = i / n, yy = y + t * L, xx = x + Math.sin(t * Math.PI) * bend, ww = w * (0.15 + 0.85 * Math.pow(Math.sin(t * Math.PI), 0.6)) * (t < 0.5 ? 1 : 0.85 + 0.15 * (1 - t));
        left.push([xx - ww / 2, yy]); right.push([xx + ww / 2, yy]); }
      g.fillStyle = col; g.beginPath(); left.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); right.reverse().forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fill();
    };
    const hatchZone = (clip, x0, x1, y0, y1, gap, w, col, Lk = 1) => {
      g.save(); clip(); g.clip();
      for (let x = x0; x < x1; x += gap * (0.75 + r() * 0.5)) { const L = (y1 - y0) * (0.55 + r() * 0.45) * Lk, y = y0 + r() * (y1 - y0 - L); stroke(x, y, L, w * (0.7 + r() * 0.6), col, (r() - 0.5) * w * 1.5); }
      g.restore();
    };
    /* 바닥 원판 */
    g.fillStyle = P.floor; g.beginPath(); g.arc(cx, cy, A.R * S, 0, Math.PI * 2); g.fill();
    /* 가장자리 고리: 붓 빗금 띠 (짧은 획을 둘레로 촘촘히) */
    const ringClip = () => { g.beginPath(); g.arc(cx, cy, A.R * S, 0, Math.PI * 2); g.arc(cx, cy, (A.R - A.ring) * S, 0, Math.PI * 2, true); };
    hatchZone(ringClip, cx - A.R * S, cx + A.R * S, cy - A.R * S, cy + A.R * S, A.hatchGap * S * 1.6, A.hatchW * S * 0.9, P.hatch, 1);
    /* 구역 2개: 사선 평행사변형 안의 붓 빗금 (UI 빗금 띠와 같은 언어) — 가장자리 쪽에만 */
    for (const [ax, ay, wd, ht] of [[-0.62, -0.5, 0.42, 0.34], [0.38, 0.42, 0.36, 0.3]]) {
      const zx = cx + ax * A.R * S, zy = cy + ay * A.R * S, W = wd * A.R * S, Hh = ht * A.R * S, sk = Hh * 0.45;
      const clip = () => { g.beginPath(); g.arc(cx, cy, (A.R - A.ring - 0.1) * S, 0, Math.PI * 2); g.clip(); g.beginPath(); g.moveTo(zx + sk, zy); g.lineTo(zx + W + sk, zy); g.lineTo(zx + W, zy + Hh); g.lineTo(zx, zy + Hh); g.closePath(); };
      hatchZone(clip, zx - 10, zx + W + sk + 10, zy - 10, zy + Hh + 10, A.hatchGap * S * 1.25, A.hatchW * S * 0.8, P.hatch, 1);
    }
    /* 마른 붓 자국 몇 개 (흩어진 짧은 획 · 가장자리 근처) */
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rr = (A.R - A.ring - 0.4 - r() * 2.2) * S; if (Math.cos(a - 0.785) > 0.6) continue; stroke(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, (0.5 + r() * 0.9) * S, A.hatchW * S * (0.5 + r() * 0.4), '#ddd4d6', (r() - 0.5) * 8); }
    /* 안쪽 원 선: 고리 경계 검정 한 줄(붓처럼 굵기 변화) · 가운데 원은 연하게 반만 */
    g.strokeStyle = P.ink; for (let i = 0; i < 64; i++) { const a0 = i / 64 * Math.PI * 2, a1 = (i + 1.05) / 64 * Math.PI * 2; g.lineWidth = (0.035 + 0.025 * (0.5 + 0.5 * Math.sin(i * 0.7))) * S; g.beginPath(); g.arc(cx, cy, (A.R - A.ring) * S, a0, a1); g.stroke(); }
    g.strokeStyle = '#c9bfc2'; g.lineWidth = 0.03 * S; g.beginPath(); g.arc(cx, cy, A.R * 0.42 * S, Math.PI * 0.85, Math.PI * 1.9); g.stroke();
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
    const gz = -A.R - 4.5;   /* 라운드 5: 문을 낮추고 뒤로 (화면 위를 검정이 채우지 않게) */
    for (const sx of [-1, 1]) { K.box('ink', [sx * 3.2, 2.2, gz], [0.28, 2.2, 0.28], w); K.box('ink', [sx * 3.2, 0.22, gz], [0.45, 0.22, 0.45], w); }
    K.box('ink', [0, 4.55, gz], [4.4, 0.24, 0.36], w); K.box('ink', [0, 3.9, gz], [3.5, 0.13, 0.22], w);
    for (const sx of [-1.6, 1.6]) {   /* 문에 걸린 검정 깃발 + 빨강 원 */
      K.sheet('ink', [0, 1, 2, 3].map(i => [-0.5, 0.5].map(x => [sx + x + (i === 3 ? (x > 0 ? -0.18 : 0.18) : 0), 3.75 - i * 0.62, gz + 0.3])), () => w);
      K.ell('red', [sx, 2.95, gz + 0.33], [0.26, 0.26, 0.02], w, { rings: 4, seg: 14 });
    }
    /* 둘레: 검정 부서진 기둥(육각 · 윗부분이 뾰족하게 깨짐) · 검정 깃발(빨강 원) · 흰 둥근 바위(회보라 그림자 · 털뭉치처럼 끊긴 경계) */
    const T1fur = amp => () => (r() - 0.5) * amp;
    for (let i = 0; i < A.props; i++) {
      const a = (i / A.props) * Math.PI * 2 + r() * 0.25, rr = A.R + 1.0 + r() * 1.6;
      if (Math.cos(a - 0.785) > 0.25) continue;   /* 카메라 쪽(앞 · yaw 45°)은 넓게 비움 */
      const side = Math.abs(Math.sin(a - 0.785)) > 0.82;   /* 화면 좌우 끝(카메라 기준 옆) — 키 큰 깃발은 여기만 (화면 위를 검정이 채우지 않게) */
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, kind = side && i % 2 ? 3 : (i % 5 === 3 ? 1 : i % 5);
      if (kind === 0) {   /* 흰 낮은 돌 (라운드 5: 큰 흰 바위 → 낮고 납작하게 · 털뭉치 경계) */
        K.ell('white', [x, 0.22, z], [0.55 + r() * 0.3, 0.3 + r() * 0.15, 0.5 + r() * 0.25], w, { rings: 6, seg: 12, biasFn: T1fur(0.45) });
      } else if (kind === 3) {   /* 검정 깃발 */
        const h = 3.0 + r() * 0.8;
        K.tube('ink', [{ p: [x, 0, z], r: 0.07, w }, { p: [x, h, z], r: 0.06, w }], { seg: 6 });
        const n = [-Math.sin(a), 0, Math.cos(a)], c0 = [x + n[0] * 0.08, h - 0.15, z + n[2] * 0.08];
        K.sheet('ink', [0, 1, 2, 3].map(j => [0, 1].map(q => [c0[0] + n[0] * (0.1 + q * 1.1) + (j === 3 && q ? n[0] * -0.3 : 0), c0[1] - j * 0.6 - (q && j === 3 ? 0.22 : 0), c0[2] + n[2] * (0.1 + q * 1.1)])), () => w);
        K.ell('red', [c0[0] + n[0] * 0.65 - Math.cos(a) * 0.02, c0[1] - 0.9, c0[2] + n[2] * 0.65 - Math.sin(a) * 0.02], [0.34 * Math.abs(n[0]) + 0.02, 0.34, 0.34 * Math.abs(n[2]) + 0.02], w, { rings: 4, seg: 14 });
      } else {   /* 검정 부서진 기둥 */
        /* 라운드 9: 뾰족한 검정 기둥(화면을 어지럽힘 — 패널) → 낮고 평평한 검정 석판 하나 */
        const h = 0.18 + r() * 0.35, tw = r() * 3;
        K.box('ink', [x, h, z], [0.5 + r() * 0.4, h, 0.32 + r() * 0.2], w, { ry: tw, top: 0.85 });

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
