/* =============================================================================
 * 4단계 테마 1 — 자세 (t1_pose.js): 보이는 리그가 판정용 숨은 리그를 따라감 (화면만 · 판정과 무관)
 *   · 뿌리 위치 · 방향 = 숨은 리그 root (흔들림 포함)
 *   · 동작 = 숨은 리그의 지금 클립 이름 + 12fps 프레임 → T1.poses[모델][클립]이 있으면 이 테마의 새 자세,
 *     없으면(임시 · 3순위) 숨은 리그 클립의 관절 회전 오프셋을 그대로 씀 (최종 보고에 목록)
 *   · 새 자세 표: { keys: [[f, {채널: [x,y,z]}, 'hold'|'snap'|'lin'], ...], step8: [[f0, f1], ...] }
 *       채널 = 뼈 이름(회전, 도 · YXZ · 바인드 자세 기준) 또는 특수 채널 —
 *       $b = 엉덩이(body) 위치 이동(모델 공간 · 키 배율 k), $s = 몸 늘이기/찌그러뜨리기(배율 - 1),
 *       $fL · $fR = 발 목표(모델 공간 · 땅 기준, 있으면 다리 IK), ftL · ftR은 IK일 때 땅 기준 발 기울기,
 *       $hL · $hR = 손 목표(모델 공간, 있으면 팔 IK) · $pL · $pR = 팔꿈치가 향할 쪽,
 *       $wL · $wR = 손(무기 · 방패) 방향(모델 공간: 칼끝 쪽) · $nL · $nR = 칼 넓은 면이 볼 쪽(기본 위),
 *       $gL = [거리] 왼손으로 오른손 무기 손잡이를 같이 잡음 (오른손에서 칼끝 반대쪽으로 거리 · 키 배율)
 *     채널은 그 채널이 있는 앞뒤 키끼리 보간(없는 키는 건너뜀) → 키마다 모든 뼈를 적지 않아도 됨
 *     step8 구간 = 예비 · 회복을 초당 8번으로 더 끊음 (12fps 계단 위에 강약)
 *   · 2차 움직임: 머리카락 · 코트 자락 · 꼬리 · 끈 체인을 뿌리 가속도로 흔드는 감쇠 스프링 (실제 시간)
 * ========================================================================== */
const T1P = (() => {
  const P = { stats: {} };
  let _e, _q, _q2, _q3, _v, _v2, _v3, _v4, _v5, _m;
  function init(THREE) { if (_e) return; _e = new THREE.Euler(); _q = new THREE.Quaternion(); _q2 = new THREE.Quaternion(); _q3 = new THREE.Quaternion();
    _v = new THREE.Vector3(); _v2 = new THREE.Vector3(); _v3 = new THREE.Vector3(); _v4 = new THREE.Vector3(); _v5 = new THREE.Vector3(); _m = new THREE.Matrix4(); P.THREE = THREE; }
  /* 채널별 키 목록 (한 번 만들어 표에 붙여 둠) */
  function compile(pose) {
    if (pose._ch) return pose._ch;
    const ch = {};
    for (const [f, vals, mode] of pose.keys || []) for (const n in vals) (ch[n] = ch[n] || []).push([f, vals[n], mode]);
    for (const n in ch) ch[n].sort((a, b) => a[0] - b[0]);
    Object.defineProperty(pose, '_ch', { value: ch, enumerable: false });
    return ch;
  }
  const ease = (mode, t) => (mode === 'hold' ? 0 : mode === 'snap' ? (t < 0.5 ? 0 : 1) : mode === 'lin' ? t : t * t * (3 - 2 * t));
  /* 표 평가: 프레임 f (12fps) → { 채널: [x,y,z] } */
  function evalPose(pose, f) {
    for (const [a, b] of pose.step8 || []) if (f > a && f < b) { f = a + Math.floor((f - a) / 1.5) * 1.5; break; }   /* 초당 8번 계단 */
    const ch = compile(pose), out = {};
    for (const n in ch) {
      const L = ch[n]; let a = null, b = null;
      for (const k of L) { if (k[0] <= f) a = k; if (k[0] >= f) { b = k; break; } }
      if (a && a[1] === null) continue;   /* null = 이 키부터 채널 끔 (예: 두 손 잡기를 놓음) */
      if (!a) { if (b[1] !== null) out[n] = b[1].slice(); continue; } if (!b || b === a || b[1] === null) { out[n] = a[1].slice(); continue; }
      const t = ease(a[2], (f - a[0]) / (b[0] - a[0]));
      out[n] = [0, 1, 2].map(i => a[1][i] + (b[1][i] - a[1][i]) * t);
    }
    return out;
  }
  P.evalPose = evalPose;
  /* 뼈를 월드 방향 from → to로 돌림 (최소 회전) */
  function aimBone(b, from, to) {
    if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return;
    _q.setFromUnitVectors(_v4.copy(from).normalize(), _v5.copy(to).normalize());
    b.parent.getWorldQuaternion(_q2); _q3.copy(_q2).invert();
    b.quaternion.premultiply(_q2).premultiply(_q).premultiply(_q3);
    b.updateMatrixWorld(true);
  }
  /* 2관절 IK: A(위) · B(아래) · C(끝) 뼈, 목표 T(월드), 굽는 쪽 pole(월드 방향) */
  function twoBone(A, B, C, T, pole) {
    const pa = A.getWorldPosition(new P.THREE.Vector3()), pb = B.getWorldPosition(new P.THREE.Vector3()), pc = C.getWorldPosition(new P.THREE.Vector3());
    const a = pa.distanceTo(pb), b = pb.distanceTo(pc), toT = _v.copy(T).sub(pa), dRaw = toT.length();
    if (dRaw < 1e-5) return;
    const d = Math.max(Math.abs(a - b) + 1e-4, Math.min(a + b - 1e-4, dRaw)), u = toT.clone().divideScalar(dRaw);
    const v = pole.clone().addScaledVector(u, -pole.dot(u)); if (v.lengthSq() < 1e-8) v.set(0, 0, 1).addScaledVector(u, -u.z); v.normalize();
    const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))), sinA = Math.sqrt(1 - cosA * cosA);
    const K = pa.clone().addScaledVector(u, a * cosA).addScaledVector(v, a * sinA);
    aimBone(A, _v2.copy(pb).sub(pa), _v3.copy(K).sub(pa));
    const pb2 = B.getWorldPosition(new P.THREE.Vector3()), pc2 = C.getWorldPosition(new P.THREE.Vector3()), T2 = pa.clone().addScaledVector(u, d);
    aimBone(B, _v2.copy(pc2).sub(pb2), _v3.copy(T2).sub(pb2));
  }
  /* 끝 뼈(발)의 월드 회전 = 모델 회전 × 채널 기울기 */
  function setWorldRot(b, worldQ) { b.parent.getWorldQuaternion(_q2); b.quaternion.copy(_q2.invert().multiply(worldQ)); b.updateMatrixWorld(true); }
  const rad = Math.PI / 180;
  /* 한 모델 자세: M (T1M 모델), ch (숨은 Character 또는 { clip, f, sample }), o: { poses(이 모델의 표), hipK } */
  P.apply = (M, ch, o = {}) => {
    init(T1R_THREE);
    for (const n in M.bones) { const b = M.bones[n], r = M.rest[n]; b.position.copy(r.p); b.quaternion.copy(r.q); b.scale.set(1, 1, 1); }
    const clip = ch && ch.clip; if (!clip) { M.root.updateMatrixWorld(true); return; }
    const name = clip.name, f = Math.min(clip.frames, Math.max(0, ch.f || 0));
    const table = (o.poses || {})[name];
    const k1 = M.k1 || 1;
    if (table) {
      const E = evalPose(table, Math.floor(f + 1e-6)); P.stats[(M.kind || '') + ':' + name] = 'new';
      const ik = {};
      for (const n in E) {
        const e = E[n];
        if (n === '$b') { M.bones.body.position.add(_v.set(e[0] * k1, e[1] * k1, e[2] * k1)); continue; }
        if (n === '$s') { M.bones.body.scale.set(1 + e[0], 1 + e[1], 1 + e[2]); continue; }
        if (n[0] === '$') { ik[n] = e; continue; }
        const b = M.bones[n]; if (!b) continue;
        if ((n === 'ftL' && E.$fL) || (n === 'ftR' && E.$fR)) continue;   /* IK 발은 아래에서 땅 기준으로 */
        b.quaternion.multiply(_q.setFromEuler(_e.set(e[0] * rad, e[1] * rad, e[2] * rad, 'YXZ')));
      }
      M.root.updateMatrixWorld(true);
      if (ik.$fL || ik.$fR || ik.$hL || ik.$hR || ik.$wL || ik.$wR || ik.$gL) {
        const RW = M.root.matrixWorld, rq = M.root.getWorldQuaternion(new P.THREE.Quaternion());
        const fwd = new P.THREE.Vector3(0, 0, 1).applyQuaternion(M.bones.body.getWorldQuaternion(new P.THREE.Quaternion()));
        for (const s of ['L', 'R']) {
          const ft = ik['$f' + s]; if (!ft || !M.bones['th' + s]) continue;
          const T = new P.THREE.Vector3(ft[0] * k1, ft[1] * k1 + (M.footY || 0.085 * k1), ft[2] * k1).applyMatrix4(RW);
          twoBone(M.bones['th' + s], M.bones['kn' + s], M.bones['ft' + s], T, fwd);
          const tilt = E['ft' + s] || [0, 0, 0];
          setWorldRot(M.bones['ft' + s], rq.clone().multiply(_q.setFromEuler(_e.set(tilt[0] * rad, tilt[1] * rad, tilt[2] * rad, 'YXZ'))));
        }
        /* 손 방향 (모델 공간 칼끝 쪽 dir · 넓은 면 n) → 월드 회전: 손 뼈의 -y = dir */
        const handQ = (dir, nrm) => {
          const Y = new P.THREE.Vector3(-dir[0], -dir[1], -dir[2]).normalize();
          let N = nrm ? new P.THREE.Vector3(nrm[0], nrm[1], nrm[2]) : new P.THREE.Vector3(0, 1, 0);
          if (Math.abs(N.clone().normalize().dot(Y)) > 0.95) N = new P.THREE.Vector3(1, 0, 0);
          const Z = N.addScaledVector(Y, -N.dot(Y)).normalize(), X = new P.THREE.Vector3().crossVectors(Y, Z);
          return rq.clone().multiply(new P.THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(X, Y, Z)));
        };
        for (const s of ['R', 'L']) {
          if (!M.bones['sh' + s]) continue;
          const hd = ik['$h' + s], wd = ik['$w' + s];
          let T = hd ? new P.THREE.Vector3(hd[0] * k1, hd[1] * k1, hd[2] * k1).applyMatrix4(RW) : null;
          let hw = wd ? handQ(wd, ik['$n' + s]) : M.bones['hd' + s].getWorldQuaternion(new P.THREE.Quaternion());
          if (s === 'L' && ik.$gL && M.bones.hdR) {   /* 두 손 잡기: 오른손 위치에서 칼끝 반대로 */
            const pr = M.bones.hdR.getWorldPosition(new P.THREE.Vector3()), qr = M.bones.hdR.getWorldQuaternion(new P.THREE.Quaternion());
            const down = new P.THREE.Vector3(0, -1, 0).applyQuaternion(qr);   /* 칼끝 쪽 */
            T = pr.addScaledVector(down, -ik.$gL[0] * k1); hw = qr;
          }
          if (T) {
            const pp = ik['$p' + s], pole = pp ? new P.THREE.Vector3(pp[0], pp[1], pp[2]).applyQuaternion(rq) : new P.THREE.Vector3(s === 'L' ? 0.6 : -0.6, -0.3, -1).applyQuaternion(rq);   /* 팔꿈치 기본: 뒤 · 바깥 · 아래 */
            twoBone(M.bones['sh' + s], M.bones['el' + s], M.bones['hd' + s], T, pole);
          }
          if (T || wd) setWorldRot(M.bones['hd' + s], hw);
        }
      }
    } else {   /* 임시: 숨은 리그 클립의 관절 회전 오프셋 (3단계 자세 · 3순위 목록에 기록) */
      P.stats[(M.kind || '') + ':' + name] = 'stage3';
      const S = ch.sample || {};
      for (const n of clip.names || []) {
        const v = S[n], b = M.bones[n]; if (!v || !b) continue;
        b.quaternion.multiply(_q.setFromEuler(_e.set(v.r[0], v.r[1], v.r[2], 'XYZ')));
        if (n === 'body' && o.hipK) b.position.add(_v.set(v.p[0] * o.hipK, v.p[1] * o.hipK, v.p[2] * o.hipK));
      }
      M.root.updateMatrixWorld(true);
    }
  };
  /* 2차 움직임: 체인 뼈마다 (x · z 각도 오프셋) 감쇠 스프링 — 입력 = 뿌리 가속도(모델 기준) · 몸 회전 · 아래로 처짐 · 숨쉬기 */
  P.secondary = (M, dt, pos, facing, t, o = {}) => {
    if (!M.chains) {
      M.chains = [];
      const groups = {};
      for (const n in M.bones) { const m = n.match(/^([a-zA-Z]+)(\d+)$/); if (!m || ['tl', 'hB', 'hL', 'hR', 'cFL', 'cFR', 'cBL', 'cBR', 'sa', 'pt'].indexOf(m[1]) < 0) continue; (groups[m[1]] = groups[m[1]] || []).push([+m[2], n]); }
      for (const g in groups) M.chains.push({ g, bones: groups[g].sort((a, b) => a[0] - b[0]).map(x => x[1]), ax: 0, az: 0, vx: 0, vz: 0 });
      M.prevPos = pos.clone(); M.prevVel = new (pos.constructor)(); M.prevFacing = facing; M.prevBodyQ = null;
    }
    if (dt <= 0) return;
    const vel = pos.clone().sub(M.prevPos).divideScalar(Math.max(dt, 1e-3)); M.prevPos.copy(pos);
    const acc = vel.clone().sub(M.prevVel).divideScalar(Math.max(dt, 1e-3)); M.prevVel.copy(vel);
    let dyaw = facing - M.prevFacing; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); M.prevFacing = facing;
    /* 몸(상체) 회전 속도도 입력: 공격 회전 · 휘두름에서 머리카락 · 코트가 따라 넘어감 (오버슈트) */
    const bq = M.bones.chest ? M.bones.chest.getWorldQuaternion(new (M.root.quaternion.constructor)()) : null; let spin = 0, tilt = 0;
    if (bq && M.prevBodyQ) { const dq = M.prevBodyQ.clone().invert().multiply(bq); const ang = 2 * Math.acos(Math.min(1, Math.abs(dq.w))), sg = dq.y >= 0 ? 1 : -1; spin = sg * ang / Math.max(dt, 1e-3) * Math.min(1, Math.abs(dq.y) / Math.max(1e-4, Math.sqrt(dq.x * dq.x + dq.y * dq.y + dq.z * dq.z))); tilt = Math.sign(dq.x) * ang / Math.max(dt, 1e-3) * Math.min(1, Math.abs(dq.x) / Math.max(1e-4, Math.sqrt(dq.x * dq.x + dq.y * dq.y + dq.z * dq.z))); }
    if (bq) M.prevBodyQ = bq;
    const c = Math.cos(facing), s = Math.sin(facing);
    const vf = vel.x * s + vel.z * c, vs = vel.x * c - vel.z * s;   /* 모델 기준 앞 · 옆 속도 */
    const af = acc.x * s + acc.z * c, as = acc.x * c - acc.z * s;
    const K = o.k || 60, Dm = o.d || 8;
    for (const ch of M.chains) {
      const tail = ch.g === 'tl', w = tail ? 0.35 : 1;
      const tx = Math.max(-1.2, Math.min(1.2, (vf * 0.09 + af * 0.004 + tilt * 0.05) * w + Math.sin(t * 1.7 + ch.bones.length) * 0.03));
      const tz = Math.max(-1.1, Math.min(1.1, (-vs * 0.07 - as * 0.003 + (dyaw / Math.max(dt, 1e-3) + spin) * 0.03) * w + Math.sin(t * 1.3 + ch.g.length) * 0.02));
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
