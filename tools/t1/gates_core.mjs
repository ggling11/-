// 4단계 T1 모션 · 판정 맞춤 게이트 (Node · 렌더 없음): 공용 코어 (gates.mjs CLI · check15 --4t1 블록이 같이 씀)
//   M2: 세검 · 대검 1순위 공격마다 — 예비 구간(0..타격-1)에서 칼끝이 타격 방향 반대로 몸 키의 0.25 이상 · 타격 뒤 오버슈트(타격 방향으로 더 나감)
//   L1: 타격 프레임(히트 이벤트 프레임들)의 보이는 칼끝 ↔ 판정 부채꼴(중심 = 캐릭터, 반지름 reach, 반각 half) 거리 ≤ reach × 25%
//       워든 내려찍기: 충격 프레임의 보이는 오른 발톱 끝 ↔ SLAM_AT(숨은 리그가 잰 판정 지점) 거리 ≤ SLAM.r × 25%
//   숨은 리그 보존: 판정 리그를 레이어로 숨겼는지(.visible 그대로) · 새 자세 표를 쓰는 동작 목록
//   M1: 대기 정면 실루엣 폭 · 키 ↔ 판정 크기 ±15% · 삼각형 수
//   P: PIPE (테마 1을 헤드리스로 켜고 세팅을 바꿈 — 끝나면 테마는 그대로 둠, 부르는 쪽이 되돌림)
export function t1Gates(P) {
P.ART.headless = true; P.artSet(1, { noSave: true });
P.setup({ mode: 'duo', bots: [null, null], seed: 5, boss: 1, chars: ['rapier', 'great'] });
P.step(1 / 60, false); P.artFrame(1 / 60);
const S = P.t1, T1 = P.t1Data, V = S.models.rapier.root.position.constructor;
const hidden = kind => kind === 'warden' ? P.boss : P.fighters.find(f => (f.char === 'great') === (kind === 'great')).ch;
const fighter = kind => P.fighters.find(f => (f.char === 'great') === (kind === 'great'));
const poseAt = (kind, clip, f) => {
  const ch = hidden(kind), oe = ch.onEvent, sm = ch.smear; ch.onEvent = null; ch.smear = null; ch.play(clip, 0, f); ch.onEvent = oe; ch.smear = sm;
  const M = S.models[kind]; M.root.position.set(0, 0, 0); M.root.rotation.set(0, 0, 0); M.root.updateMatrixWorld(true);
  P.t1Pose.apply(M, ch, { poses: T1.poses[kind] }); M.root.updateMatrixWorld(true); return M;
};
const BL = { rapier: -1.05, great: -1.3 };
const tip = (kind, M) => new V(0, BL[kind] * M.k1, 0).applyMatrix4(M.bones.weapon.matrixWorld);
const res = { M2: [], L1: [], meta: {} };
const H = { rapier: T1.model.rapier.H, great: T1.model.great.H };
for (const kind of ['rapier', 'great']) {
  const f = fighter(kind), n = f.comboLen();
  for (let i = 1; i <= n; i++) {
    const atk = f.atk(i), clip = atk.clip, c = hidden(kind).clips[clip], s = atk.strike;
    const tips = []; for (let fr = 0; fr <= c.frames; fr++) tips.push(tip(kind, poseAt(kind, clip, fr)));
    const d = tips[s].clone().sub(tips[s - 1]); if (d.length() < 1e-3) d.copy(tips[s]).sub(tips[0]); d.normalize();
    let antic = 0; for (let fr = 1; fr < s; fr++) antic = Math.max(antic, -tips[fr].clone().sub(tips[0]).dot(d));
    let over = 0; for (let fr = s + 1; fr <= c.frames; fr++) over = Math.max(over, tips[fr].clone().sub(tips[s]).dot(d));
    const ok = antic >= 0.25 * H[kind] && over > 0.02 * H[kind];
    res.M2.push({ kind, clip, strike: s, anticipation: +(antic / H[kind]).toFixed(3), overshoot: +(over / H[kind]).toFixed(3), ok });
    /* L1: 히트 이벤트 프레임마다 칼끝과 부채꼴 거리 */
    const hitF = c.events.filter(e => e.type === 'hit').map(e => e.f), fr = hitF.length ? hitF : [s];
    let worst = 0;
    for (const h of fr) {
      const t = tips[Math.min(c.frames, h)], r = Math.hypot(t.x, t.z), ang = Math.atan2(t.x, t.z);
      let dist = 0;
      if (r > atk.reach) dist = r - atk.reach;
      if (Math.abs(ang) > atk.half) { const a = Math.abs(ang) - atk.half; dist = Math.max(dist, r * Math.sin(Math.min(Math.PI / 2, a))); }
      worst = Math.max(worst, dist);
    }
    res.L1.push({ kind, clip, frames: fr, reach: atk.reach, dist: +worst.toFixed(3), lim: +(0.25 * atk.reach).toFixed(3), ok: worst <= 0.25 * atk.reach });
  }
}
/* 워든 내려찍기: 보이는 오른 발톱 끝(손 뼈에서 손끝 쪽 0.4) ↔ SLAM_AT (보스 기준 좌표, 숨은 리그가 잰 값) */
{
  const M = poseAt('warden', 'slam', P.FIGHT.SLAM.hitF), claw = new V(0, -0.4 * M.k1, 0).applyMatrix4(M.bones.hdR.matrixWorld), at = P.SLAM_AT;
  const dist = Math.hypot(claw.x - at.x, claw.z - at.z);
  res.L1.push({ kind: 'warden', clip: 'slam', frames: [P.FIGHT.SLAM.hitF], reach: P.FIGHT.SLAM.r, claw: claw.toArray().map(v => +v.toFixed(2)), at: at.toArray().map(v => +v.toFixed(2)), dist: +dist.toFixed(3), lim: +(0.25 * P.FIGHT.SLAM.r).toFixed(3), ok: dist <= 0.25 * P.FIGHT.SLAM.r });
}
/* 워든 쏘기: 발사 프레임(9 · 13)의 보이는 발톱 끝 ↔ SHOT_AT (숨은 리그가 잰 발사 지점) ≤ SHOT.hitR × 25% */
for (const fr of [P.FIGHT.SHOT.fireF, P.FIGHT.SHOT.fire2F]) {
  const M = poseAt('warden', 'shot', fr), claw = new V(0, -0.4 * M.k1, 0).applyMatrix4(M.bones.hdR.matrixWorld), at = P.SHOT_AT;
  const dist = Math.hypot(claw.x - at.x, claw.z - at.z);
  res.L1.push({ kind: 'warden', clip: 'shot', frames: [fr], reach: P.FIGHT.SHOT.hitR, claw: claw.toArray().map(v => +v.toFixed(2)), at: at.toArray().map(v => +v.toFixed(2)), dist: +dist.toFixed(3), lim: +(0.25 * P.FIGHT.SHOT.hitR).toFixed(3), ok: dist <= 0.25 * P.FIGHT.SHOT.hitR });
}
/* M1 실루엣 크기: 대기 첫 프레임 · 정면에서 본 폭(x) · 키(y) — 무기 뼈 정점 제외 — 판정 크기(지름 2r · 숨은 리그 키) ±15% */
res.M1 = [];
for (const kind of ['rapier', 'great', 'warden']) {
  const ch = hidden(kind), M = poseAt(kind, 'idle', 0), v = new V(); ch.root.position.set(0, 0, 0); ch.root.rotation.set(0, 0, 0); ch.root.updateMatrixWorld(true); let x0 = 1e9, x1 = -1e9, y1 = -1e9, tris = 0;
  const wIdx = Object.keys(M.bones).indexOf('weapon');
  for (const key in M.meshes) { const me = M.meshes[key], g = me.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight; tris += g.index.count / 3;
    for (let i = 0; i < g.attributes.position.count; i++) {
      let wpn = 0; for (let j = 0; j < 4; j++) if (me.skeleton.bones[si.getComponent(i, j)].name === 'weapon') wpn += sw.getComponent(i, j);
      if (wpn > 0.5) continue;
      me.getVertexPosition(i, v); v.applyMatrix4(me.matrixWorld); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); } }
  /* 숨은 리그 키: 3단계 리그를 같은 자세로 재서 (머리 꼭대기) */
  /* 숨은 리그 키: 보이는 메쉬만 (리그에 붙은 안 보이는 궤적 · 이펙트 메쉬는 빼고) */
  const B3 = new S.R.THREE.Box3(), bb = new S.R.THREE.Box3(); ch.root.updateMatrixWorld(true);
  ch.root.traverse(o => { if (!o.isMesh || !o.geometry) return; for (let q = o; q; q = q.parent) if (!q.visible) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); B3.union(bb); });
  const hy = B3.max.y - ch.root.position.y;
  const r = kind === 'warden' ? P.boss.radius : fighter(kind).ch.radius, wid = x1 - x0, jw = 2 * r;
  res.M1.push({ kind, tris, width: +wid.toFixed(2), judgeWidth: +jw.toFixed(2), wRatio: +(wid / jw).toFixed(2), height: +y1.toFixed(2), judgeHeight: +hy.toFixed(2), hRatio: +(y1 / hy).toFixed(2) });
}
/* 숨은 리그: 레이어 31로 숨김 · visible 그대로 */
const roots = P.artRigRoots(); let onLayer = 0, vis = 0;
for (const r of roots) { let all = true; r.traverse(o => { if ((o.layers.mask >>> 0) !== 2 ** 31) all = false; }); if (all) onLayer++; if (r.visible) vis++; }
res.meta = { hiddenRoots: roots.length, onLayer31: onLayer, visibleKept: vis };
return res;
}
