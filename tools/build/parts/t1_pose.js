/* =============================================================================
 * 4단계 테마 1 — 자세 (t1_pose.js): 보이는 리그가 판정용 숨은 리그를 따라감 (화면만 · 판정과 무관)
 *   · 뿌리 위치 · 방향 = 숨은 리그 root (흔들림 포함)
 *   · 동작 = 숨은 리그의 지금 클립 이름 + 12fps 프레임 → T1.poses[클립]이 있으면 이 테마의 새 자세,
 *     없으면(임시) 숨은 리그 클립의 관절 회전 오프셋을 그대로 씀 (최종 보고에 목록)
 *   · 2차 움직임: 머리카락 · 코트 자락 · 꼬리 · 끈 체인을 뿌리 가속도로 흔드는 감쇠 스프링 (실제 시간)
 * ========================================================================== */
const T1P = (() => {
  const P = { stats: {} };
  let _e, _q, _v;
  function init(THREE) { if (_e) return; _e = new THREE.Euler(); _q = new THREE.Quaternion(); _v = new THREE.Vector3(); P.THREE = THREE; }
  /* 키 자세 표 평가: pose = { frames, keys: [[f, {뼈: [x,y,z 도]} , hold?]], body: [[f, [dx,dy,dz]]] } — 12fps 프레임 f에서 */
  function evalPose(pose, f) {
    const K = pose.keys; if (!K || !K.length) return null;
    let a = K[0], b = K[K.length - 1];
    for (let i = 0; i < K.length; i++) { if (K[i][0] <= f) a = K[i]; if (K[i][0] >= f) { b = K[i]; break; } }
    const span = b[0] - a[0], t = span > 0 ? (f - a[0]) / span : 0;
    const tt = a[2] === 'hold' ? 0 : a[2] === 'snap' ? (t < 0.5 ? 0 : 1) : t * t * (3 - 2 * t);   /* 핵심 자세 유지 · 끊어 넘기기 */
    const out = {}, names = new Set([...Object.keys(a[1]), ...Object.keys(b[1])]);
    for (const n of names) { const x = a[1][n] || [0, 0, 0], y = b[1][n] || [0, 0, 0]; out[n] = [x[0] + (y[0] - x[0]) * tt, x[1] + (y[1] - x[1]) * tt, x[2] + (y[2] - x[2]) * tt]; }
    return out;
  }
  P.evalPose = evalPose;
  /* 한 모델 자세: M (T1M 모델), ch (숨은 Character), o: { hipK(숨은 엉덩이 높이 대비 배율), map(클립 이름 바꿈) } */
  P.apply = (M, ch, o = {}) => {
    init(T1R_THREE);
    for (const n in M.bones) { const b = M.bones[n], r = M.rest[n]; b.position.copy(r.p); b.quaternion.copy(r.q); }
    const clip = ch && ch.clip; if (!clip) return;
    const name = clip.name, f = ch.frame !== undefined ? Math.min(clip.frames, Math.floor(ch.f + 1e-6)) : 0;
    const table = (o.poses || {})[name];
    if (table) {
      const E = evalPose(table, f); P.stats[name] = 'new';
      for (const n in E) { const b = M.bones[n]; if (!b) continue; const e = E[n]; b.quaternion.multiply(_q.setFromEuler(_e.set(e[0] * Math.PI / 180, e[1] * Math.PI / 180, e[2] * Math.PI / 180, 'YXZ'))); }
      if (table.body) { const B = evalPose({ keys: table.body.map(([ff, v]) => [ff, { b: v }]) }, f); if (B && B.b) M.bones.body.position.add(_v.set(B.b[0], B.b[1], B.b[2])); }
    } else {   /* 임시: 숨은 리그 클립의 관절 회전 오프셋 (3단계 자세 · 3순위 목록에 기록) */
      P.stats[name] = 'stage3';
      const S = ch.sample || {};
      for (const n of clip.names || []) {
        const v = S[n], b = M.bones[n]; if (!v || !b) continue;
        b.quaternion.multiply(_q.setFromEuler(_e.set(v.r[0], v.r[1], v.r[2], 'XYZ')));
        if (n === 'body' && o.hipK) b.position.add(_v.set(v.p[0] * o.hipK, v.p[1] * o.hipK, v.p[2] * o.hipK));
      }
    }
  };
  /* 2차 움직임: 체인 뼈마다 (x · z 각도 오프셋) 감쇠 스프링 — 입력 = 뿌리 가속도(모델 기준) · 아래로 처짐 · 숨쉬기 */
  P.secondary = (M, dt, pos, facing, t, o = {}) => {
    if (!M.chains) {
      M.chains = [];
      const groups = {};
      for (const n in M.bones) { const m = n.match(/^([a-zA-Z]+)(\d+)$/); if (!m || ['tl', 'hB', 'hL', 'hR', 'cFL', 'cFR', 'cBL', 'cBR', 'sa', 'pt'].indexOf(m[1]) < 0) continue; (groups[m[1]] = groups[m[1]] || []).push([+m[2], n]); }
      for (const g in groups) M.chains.push({ g, bones: groups[g].sort((a, b) => a[0] - b[0]).map(x => x[1]), ax: 0, az: 0, vx: 0, vz: 0 });
      M.prevPos = pos.clone(); M.prevVel = new (pos.constructor)(); M.prevFacing = facing;
    }
    if (dt <= 0) return;
    const vel = pos.clone().sub(M.prevPos).divideScalar(Math.max(dt, 1e-3)); M.prevPos.copy(pos);
    const acc = vel.clone().sub(M.prevVel).divideScalar(Math.max(dt, 1e-3)); M.prevVel.copy(vel);
    let dyaw = facing - M.prevFacing; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); M.prevFacing = facing;
    const c = Math.cos(facing), s = Math.sin(facing);
    const vf = vel.x * s + vel.z * c, vs = vel.x * c - vel.z * s;   /* 모델 기준 앞 · 옆 속도 */
    const af = acc.x * s + acc.z * c, as = acc.x * c - acc.z * s;
    const K = o.k || 60, Dm = o.d || 9;
    for (const ch of M.chains) {
      const tail = ch.g === 'tl', w = tail ? 0.35 : 1;
      const tx = Math.max(-1.1, Math.min(1.1, (vf * 0.09 + af * 0.004) * w + Math.sin(t * 1.7 + ch.bones.length) * 0.03));
      const tz = Math.max(-1.0, Math.min(1.0, (-vs * 0.07 - as * 0.003 + dyaw / Math.max(dt, 1e-3) * 0.025) * w + Math.sin(t * 1.3 + ch.g.length) * 0.02));
      ch.vx += (K * (tx - ch.ax) - Dm * ch.vx) * dt; ch.vz += (K * (tz - ch.az) - Dm * ch.vz) * dt;
      ch.ax += ch.vx * dt; ch.az += ch.vz * dt;
      /* 앞으로 달리면 머리카락 · 코트는 뒤로 (x 양수 = 뒤로 젖힘 · 아래 향한 뼈 기준) */
      ch.bones.forEach((n, i) => { const b = M.bones[n]; if (!b) return; const k = (i + 1) / ch.bones.length;
        b.quaternion.multiply(_q.setFromEuler(_e.set(ch.ax * 0.8 * k, 0, ch.az * 0.8 * k, 'XYZ'))); });
    }
  };
  return P;
})();
let T1R_THREE = null;   /* 자세 모듈이 쓰는 THREE (테마가 켤 때 넣음) */
