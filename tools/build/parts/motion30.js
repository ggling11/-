// ---- 3단계 움직임 과장 (MOTION 표, 5절)
//      보이는 것만 바꾸는 것: 달리기 기울기 · 바운스, 동작 속 뛰어오름 높이, 대시 잔상 · 먼지 · 늘였다 찌그러뜨리기, 착지 충격파, 무기 궤적 두께
//      위치가 바뀌는 것(봇 테스트로 확인): 공중 · 무릎 마무리 도약 높이와 체공, 대시 거리, 전진 스텝 최대 길이, 피격 넉백
//      판정(맞는 범위 · 시간)은 그대로 — 평타 판정은 위치 · 방향 기준이라 몸 자세와 무관
const RUN3 = ['run', 'runB', 'runC', 'runS', 'runT'];
// 캐릭터를 만들기 전에 한 번: PLAYER_CLIPS 키 자세를 고침 (자세 객체는 복사해서 고침 — 같이 쓰는 기본 자세를 두 번 늘리지 않게)
function motionClips3() {
  if (!STYLE.on) return;
  const seen = new Set();
  for (const c of PLAYER_CLIPS) {
    const run = RUN3.includes(c.name);
    for (const k of c.keys) {
      const p = k[1]; if (!p || seen.has(p)) continue;
      seen.add(p);
      const by = p.body && p.body.p ? p.body.p[1] : 0;
      if (run) {
        if (p.spine) p.spine = [p.spine[0] * MOTION.runLean, p.spine[1], p.spine[2]];
        if (p.head) p.head = [p.head[0] * MOTION.runLean, p.head[1], p.head[2]];   // 머리는 반대로 세워 시선 유지
        if (p.body && p.body.p) p.body = { ...p.body, p: [p.body.p[0], by * MOTION.runBob, p.body.p[2]] };
      } else if (by > 0.05) p.body = { ...p.body, p: [p.body.p[0], by * MOTION.leapH, p.body.p[2]] };   // 뛰어오르는 동작
    }
  }
}
motionClips3();
// 마무리 도약 곡선(0 → m → e, 2차 베지어)의 가운데 점: 최고 높이가 예전의 MOTION.leapH 배가 되게
function leapMid3(m, e) {
  const A0 = m * m / Math.max(1e-3, 2 * m - e), A = A0 * MOTION.leapH;
  return A + Math.sqrt(Math.max(0, A * A - A * e));
}
const leapT3 = () => (STYLE.on ? MOTION.airT : 1);
// 도약 시간 u(0~1) → 곡선 위치: 꼭대기(곡선의 최고점 u*) 근처에서 느려지게 (올라갈 때 감속 · 내려갈 때 가속)
function leapEase3(u, m, e) {
  if (!STYLE.on) return u;
  const us = Math.min(0.95, Math.max(0.05, m / Math.max(1e-3, 2 * m - e))), a = MOTION.hang;
  return u < a ? us * (1 - (1 - u / a) ** 2) : us + (1 - us) * ((u - a) / (1 - a)) ** 2;
}
// 매 프레임(게임 갱신 뒤): 대시 잔상 · 먼지 · 늘였다 찌그러뜨리기 · 높이 뜬 뒤 착지 충격파 — 화면만 (Math.random 입자)
function styleMotion3(dt) {
  if (!STYLE.on || Game.mode !== 'fight') return;
  const U = Duo.stats.ui || (Duo.stats.ui = { max: 0, over: 0, frames: 0, hist: [0, 0, 0, 0, 0, 0] }), n = uiTexts3().total;   // U1: 화면 글자 동시 표시
  U.frames++; U.max = Math.max(U.max, n); if (n > UI.maxTexts) U.over++; U.hist[Math.min(5, n)]++;
  for (const f of fighters) {
    const ch = f.ch; if (!ch) continue;
    const M = f.m3 || (f.m3 = { st: f.state, y: 0, sq: 0, mode: '', gh: 0 });
    const s = STYLE.chr.scale, pos = ch.pos;
    if (f.active && f.onField !== false && f.char && CHARS[f.char]) {
      const kind = Slots.pk(Slots.color(f));
      if (f.state === 'dodge') {
        if (M.st !== 'dodge') { Particles.burst('dust', V3(pos.x, 0, pos.z), null, 10, 1.5); M.sq = 0.12; M.mode = 'dash'; M.gh = 0; }
        if (f.t < 0.22 && M.gh < MOTION.dashGhosts && f.t >= M.gh * 0.22 / MOTION.dashGhosts) {   // 잔상: 몸 높이를 따라 색 점 기둥
          M.gh++;
          for (let h = 0.25; h < 1.7; h += 0.28) Particles.burst(kind, V3(pos.x, h * s, pos.z), null, 2, 1);
          Particles.burst('trail', pos, null, 5);
        }
      } else if (M.st === 'dodge') { M.sq = 0.1; M.mode = 'land'; }
      if (MOTION.landFx && M.y > 1.2 && pos.y < 0.05) {          // 높이 뜬 뒤 착지
        Particles.burst('dust', V3(pos.x, 0, pos.z), null, 22, 2.2); Particles.burst(kind, V3(pos.x, 0.1, pos.z), null, 10, 1);
        CamRig.shake(3, 0.18); M.sq = 0.14; M.mode = 'land';
      }
    }
    if (M.sq > 0) {
      M.sq = Math.max(0, M.sq - dt); const u = M.sq / 0.12;
      if (M.mode === 'dash') ch.root.scale.set(s * (1 - 0.08 * u), s * (1 - 0.14 * u), s * (1 + 0.3 * u));   // 앞으로 늘림 (몸 기준 z = 앞)
      else ch.root.scale.set(s * (1 + 0.16 * u), s * (1 - 0.2 * u), s * (1 + 0.16 * u));                  // 납작하게
    } else if (ch.styled) ch.root.scale.setScalar(s);
    M.st = f.state; M.y = pos.y;
  }
}
// 카메라 틀용: 점 p(+높이 h)가 지금 카메라(원근)에서 초점면 몇 유닛 자리에 보이는지 [R, U] — 높이 뜬 사람은 카메라에 가까워 더 크게 · 더 위로 보임
function styleEye3(p, h) {
  const T = CamRig.target, R = CamRig.R, U = CamRig.U, B = CamRig.B, d = Style.dist || 20;
  const x = p.x - T.x, y = p.y + h - T.y, z = p.z - T.z;
  const s = d / Math.max(d * 0.3, d - (x * B.x + y * B.y + z * B.z));
  return [T.dot(R) + (x * R.x + y * R.y + z * R.z) * s, T.dot(U) + (x * U.x + y * U.y + z * U.z) * s];
}
