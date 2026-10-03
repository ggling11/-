// ---- 2단계 보스 4 THE TWIN DOKKAEBI (쌍둥이 도깨비): 청 도깨비 · 적 도깨비 — 플레이어 리그 1.7배 + 뿔 · 방망이 · 도깨비불
//      두 마리가 같은 보스 AI를 각자 돌린다: AI의 상태값(체력 · 페이즈 · 패턴 …)을 도깨비마다 따로 저장해 두고, 그 도깨비 차례에
//      AI · boss로 바꿔 끼움 (Dk.with). 플레이어 쪽 판정(평타 · 시동 · 마무리)은 '그 사람이 상대하는 도깨비'를 끼운 채 돈다 (Dk.forF)
//      각자 자기 색 공격만 (waves 'self') · 체력 따로, 둘 다 쓰러뜨려야 · 한 마리가 쓰러지면 남은 하나가 되살리러 감 (끊을 수 있음)
//      합동기 5: 도깨비 연계(합 끊기) · 도깨비불 자리 바꾸기 · 씨름 던지기 · 금 나와라 뚝딱 · 합동 필살(3페이즈, 동시 패리 → 합 대 합)
// stance: legs wide, back hunched, the club hanging from the right fist (its head toward the floor in front)
const PSD = {
  body: { p: [0, -0.1, 0] },
  spine: [0.3, 0.12, 0], chest: [0.12, 0.05, 0], neck: [0.1, 0, 0], head: [-0.28, -0.12, 0],
  shR: [-0.25, 0, -0.32], elR: [-0.55, 0, 0], hdR: [0.75, 0, 0],
  shL: [-0.15, 0, 0.5], elL: [-0.8, 0, 0], hdL: [0, 0, 0],
  thR: [-0.15, 0, -0.3], knR: [0.55, 0, 0], ftR: [0.05, 0, 0],
  thL: [0.1, 0, 0.3], knL: [0.55, 0, 0], ftL: [0.05, 0, 0],
};
const PD_ = (o = {}) => ({ ...PSD, ...o });
// shared key poses (club overhead · club in the floor · deep crouch)
const DKP = {
  up: { body: { p: [0, 0.08, -0.12] }, spine: [-0.35, 0.1, 0], chest: [-0.2, 0, 0], head: [-0.45, 0, 0],
        shR: [-3.0, 0.1, -0.2], elR: [-0.9, 0, 0], hdR: [0.7, 0, 0], shL: [-1.4, 0, 0.6], elL: [-0.4, 0, 0],
        thR: [-0.3, 0, -0.3], knR: [0.35, 0, 0], thL: [0.25, 0, 0.3], knL: [0.4, 0, 0] },
  down: { body: { p: [0, -0.32, 0.2] }, spine: [0.75, 0.05, 0], chest: [0.3, 0, 0], head: [-0.3, 0, 0],
          shR: [-1.15, 0.05, -0.1], elR: [-0.1, 0, 0], hdR: [1.1, 0, 0], shL: [-0.2, 0, 0.7], elL: [-0.5, 0, 0],
          thR: [-0.9, 0, -0.3], knR: [1.0, 0, 0], ftR: [0.1, 0, 0], thL: [0.55, 0, 0.3], knL: [0.6, 0, 0], ftL: [0.2, 0, 0] },
  crouch: { body: { p: [0, -0.55, -0.05] }, spine: [0.6, 0, 0], chest: [0.15, 0, 0], head: [-0.4, 0, 0],
            shR: [0.3, 0, -0.4], elR: [-0.6, 0, 0], hdR: [1.6, 0, 0], shL: [0.3, 0, 0.5], elL: [-0.5, 0, 0],
            thR: [-1.25, 0, -0.3], knR: [1.7, 0, 0], ftR: [0.3, 0, 0], thL: [-1.15, 0, 0.3], knL: [1.7, 0, 0], ftL: [0.3, 0, 0] },
};
const DK_SWEEP_KEYS = [
  [0, PD_()],
  [6, PD_({ body: { p: [0, -0.2, -0.08] }, spine: [0.3, -1.0, 0], chest: [0.1, -0.35, 0], head: [-0.1, 1.0, 0],
            shR: [0.35, 0.45, -0.9], elR: [-0.5, 0, 0], hdR: [1.9, 0, 0], shL: [-0.6, 0, 0.6], elL: [-0.7, 0, 0],
            thR: [0.25, 0, -0.3], knR: [0.6, 0, 0], thL: [-0.4, 0, 0.3], knL: [0.65, 0, 0] }), 'out'],
  [10, PD_({ body: { p: [0, -0.22, -0.1] }, spine: [0.32, -1.1, 0], chest: [0.1, -0.38, 0], head: [-0.1, 1.1, 0],
             shR: [0.4, 0.5, -0.95], elR: [-0.45, 0, 0], hdR: [1.95, 0, 0], shL: [-0.65, 0, 0.6], elL: [-0.7, 0, 0],
             thR: [0.27, 0, -0.3], knR: [0.65, 0, 0], thL: [-0.42, 0, 0.3], knL: [0.7, 0, 0] }), 'io', 1.3],
  [11, PD_({ body: { p: [0, -0.18, 0.15] }, spine: [0.4, 0.9, 0], chest: [0.12, 0.35, 0], head: [-0.1, -0.95, 0],
             shR: [-1.5, 1.0, -0.2], elR: [-0.05, 0, 0], hdR: [1.35, 0, 0], shL: [0.4, 0, 0.7], elL: [-0.4, 0, 0],
             thR: [-0.7, 0, -0.3], knR: [0.7, 0, 0], thL: [0.5, 0, 0.3], knL: [0.35, 0, 0] }), 'snap', 1.7],
  [14, PD_({ body: { p: [0, -0.2, 0.18] }, spine: [0.38, 1.2, 0], chest: [0.12, 0.42, 0], head: [-0.1, -1.1, 0],
             shR: [-1.35, 1.3, -0.1], elR: [-0.15, 0, 0], hdR: [1.3, 0, 0], shL: [0.45, 0, 0.7], elL: [-0.4, 0, 0],
             thR: [-0.7, 0, -0.3], knR: [0.7, 0, 0], thL: [0.5, 0, 0.3], knL: [0.35, 0, 0] }), 'out', 1.2],
  [22, PD_()],
];
const DK_CLIPS = [
  { name: 'dkIdle', label: 'DK IDLE', frames: 24, loop: true, keys: [
    [0, PD_()],
    [12, PD_({ body: { p: [0, -0.13, 0] }, spine: [0.34, 0.08, 0], chest: [0.16, 0.05, 0], head: [-0.22, -0.05, 0], shL: [-0.2, 0, 0.56], elL: [-0.9, 0, 0], hdR: [0.65, 0, 0] }), 'io', 1.3],
    [24, PD_()],
  ] },
  // WALK: a heavy stomping run, the club swinging low
  { name: 'dkWalk', label: 'DK WALK', frames: 8, loop: true, keys: [
    [0, PD_({ body: { p: [0, -0.14, 0], r: [0, 0, 0.06] }, spine: [0.42, -0.15, 0], thR: [-0.75, 0, -0.25], knR: [0.3, 0, 0], ftR: [-0.15, 0, 0], thL: [0.45, 0, 0.25], knL: [0.85, 0, 0], ftL: [0.3, 0, 0],
              shL: [-0.65, 0, 0.5], elL: [-0.9, 0, 0], shR: [0.3, 0, -0.35] })],
    [2, PD_({ body: { p: [0, -0.02, 0], r: [0, 0, 0.02] }, spine: [0.38, 0, 0], thR: [-0.1, 0, -0.25], knR: [0.25, 0, 0], ftR: [0, 0, 0], thL: [-0.25, 0, 0.25], knL: [1.35, 0, 0], ftL: [0.2, 0, 0],
              shL: [-0.25, 0, 0.5], shR: [0.1, 0, -0.35] })],
    [4, PD_({ body: { p: [0, -0.14, 0], r: [0, 0, -0.06] }, spine: [0.42, 0.15, 0], thL: [-0.75, 0, 0.25], knL: [0.3, 0, 0], ftL: [-0.15, 0, 0], thR: [0.45, 0, -0.25], knR: [0.85, 0, 0], ftR: [0.3, 0, 0],
              shL: [0.3, 0, 0.5], elL: [-0.6, 0, 0], shR: [-0.5, 0, -0.35] })],
    [6, PD_({ body: { p: [0, -0.02, 0], r: [0, 0, -0.02] }, spine: [0.38, 0, 0], thL: [-0.1, 0, 0.25], knL: [0.25, 0, 0], ftL: [0, 0, 0], thR: [-0.25, 0, -0.25], knR: [1.35, 0, 0], ftR: [0.2, 0, 0],
              shL: [-0.1, 0, 0.5], shR: [-0.15, 0, -0.35] })],
    [8, PD_({ body: { p: [0, -0.14, 0], r: [0, 0, 0.06] }, spine: [0.42, -0.15, 0], thR: [-0.75, 0, -0.25], knR: [0.3, 0, 0], ftR: [-0.15, 0, 0], thL: [0.45, 0, 0.25], knL: [0.85, 0, 0], ftL: [0.3, 0, 0],
              shL: [-0.65, 0, 0.5], elL: [-0.9, 0, 0], shR: [0.3, 0, -0.35] })],
  ], events: [{ f: 0, type: 'stomp' }, { f: 4, type: 'stomp' }] },
  // CLUB 1 (방망이 1타 · 'sweep'): coiled back past the right hip, a flat swing across the whole front (lock f6 · hit f11)
  { name: 'dkClub1', label: 'CLUB SWEEP', frames: 22, keys: DK_SWEEP_KEYS, events: [{ f: 11, type: 'sweep' }, { f: 12, type: 'sweep' }],
    smears: [{ f: 11, frames: 3, type: 'arc', pos: [0, 1.0, 0.05], rot: [Math.PI / 2 + 0.1, 0, 0], R: 1.75, W: 0.85, a0: 4.1, a1: 0.1 }] },
  // SWAT: the same swing without its own hit (씨름 던지기: the catcher's swing is judged by the joint code)
  { name: 'dkSwat', label: 'CATCH SWING', frames: 22, keys: DK_SWEEP_KEYS, events: [{ f: 11, type: 'jab' }],
    smears: [{ f: 11, frames: 3, type: 'arc', pos: [0, 1.0, 0.05], rot: [Math.PI / 2 + 0.1, 0, 0], R: 1.75, W: 0.85, a0: 4.1, a1: 0.1 }] },
  // CLUB 2 (방망이 2타 · 연타 'jab'): a short overhead rap — the ghost fire erupts under the marked spot (impact f6)
  { name: 'dkFire', label: 'GHOST FIRE', frames: 10, keys: [
    [0, PD_()],
    [4, PD_({ body: { p: [0, -0.02, -0.06] }, spine: [0.05, 0.2, 0], head: [-0.4, -0.2, 0], shR: [-2.4, 0, -0.35], elR: [-0.9, 0, 0], hdR: [0.6, 0, 0],
              shL: [-1.6, 0, 0.3], elL: [-0.2, 0, 0], hdL: [0, 0, 0] }), 'out', 1.3],
    [6, PD_({ body: { p: [0, -0.22, 0.12] }, spine: [0.6, -0.1, 0], chest: [0.2, 0, 0], shR: [-1.2, 0, -0.2], elR: [-0.1, 0, 0], hdR: [1.3, 0, 0],
              shL: [-1.3, 0, 0.3], elL: [-0.1, 0, 0], thR: [-0.6, 0, -0.3], knR: [0.8, 0, 0], thL: [0.4, 0, 0.3], knL: [0.5, 0, 0] }), 'snap', 1.8],
    [10, PD_()],
  ], events: [{ f: 6, type: 'jab' }] },
  // CLUB 3 (방망이 3타 · 'slam'): the club swung up behind the head, held, then driven into the floor (lock f7 · hit f12)
  { name: 'dkClub3', label: 'CLUB SMASH', frames: 22, keys: [
    [0, PD_()],
    [4, PD_({ body: { p: [0, -0.05, -0.05] }, spine: [0.1, 0.1, 0], head: [-0.35, 0, 0], shR: [-1.8, 0.1, -0.3], elR: [-1.2, 0, 0], hdR: [0.8, 0, 0], shL: [-0.8, 0, 0.5], elL: [-0.5, 0, 0] }), 'io', 1.2],
    [7, PD_(DKP.up), 'out', 1.4],
    [11, PD_({ ...DKP.up, body: { p: [0, 0.12, -0.14] }, shR: [-3.1, 0.1, -0.2], spine: [-0.4, 0.1, 0] }), 'io', 1.8],
    [12, PD_(DKP.down), 'snap', 2.2],
    [16, PD_({ ...DKP.down, body: { p: [0, -0.3, 0.2] }, spine: [0.72, 0.05, 0] }), 'out', 1.4],
    [22, PD_()],
  ], events: [{ f: 12, type: 'dkImpact' }],
    smears: [{ f: 12, frames: 3, type: 'arc', pos: [-0.12, 1.3, 0.1], rot: [0, -Math.PI / 2, 0], R: 1.4, W: 0.8, a0: 2.2, a1: -0.55 }] },
  // RUSH (돌진 'charge' · 연계의 받아치기 돌진): coil with the club cocked, then a lunging overhead blow (lock f5 · rush f6–9)
  { name: 'dkRush', label: 'RUSH STRIKE', frames: 16, keys: [
    [0, PD_()],
    [3, PD_({ body: { p: [0, -0.3, -0.15] }, spine: [0.3, 0.4, 0], chest: [0.1, 0.15, 0], head: [-0.15, -0.4, 0], shR: [-2.6, 0.1, -0.3], elR: [-1.0, 0, 0], hdR: [0.7, 0, 0],
              shL: [-0.6, 0, 0.7], elL: [-0.3, 0, 0], thL: [-0.7, 0, 0.3], knL: [1.0, 0, 0], thR: [0.45, 0, -0.3], knR: [0.9, 0, 0] }), 'out', 1.4],
    [5, PD_({ body: { p: [0, -0.36, -0.18] }, spine: [0.34, 0.45, 0], chest: [0.12, 0.17, 0], head: [-0.15, -0.45, 0], shR: [-2.7, 0.1, -0.3], elR: [-1.05, 0, 0], hdR: [0.7, 0, 0],
              shL: [-0.65, 0, 0.7], elL: [-0.3, 0, 0], thL: [-0.8, 0, 0.3], knL: [1.15, 0, 0], thR: [0.5, 0, -0.3], knR: [1.0, 0, 0] }), 'io', 1.8],
    [6, PD_({ body: { p: [0, -0.1, 0.3] }, spine: [0.8, -0.1, 0], chest: [0.3, 0, 0], head: [-0.6, 0.1, 0], shR: [-1.3, 0, -0.15], elR: [-0.05, 0, 0], hdR: [1.0, 0, 0],
              shL: [0.6, 0, 0.6], elL: [-0.3, 0, 0], thL: [-1.1, 0, 0.3], knL: [0.5, 0, 0], ftL: [0.2, 0, 0], thR: [0.7, 0, -0.3], knR: [0.3, 0, 0], ftR: [0.4, 0, 0] }), 'snap', 2.0],
    [9, PD_({ body: { p: [0, -0.12, 0.32] }, spine: [0.82, -0.12, 0], chest: [0.3, 0, 0], head: [-0.6, 0.1, 0], shR: [-1.25, 0, -0.15], elR: [-0.05, 0, 0], hdR: [1.05, 0, 0],
              shL: [0.6, 0, 0.6], elL: [-0.3, 0, 0], thL: [-1.15, 0, 0.3], knL: [0.55, 0, 0], ftL: [0.2, 0, 0], thR: [0.75, 0, -0.3], knR: [0.3, 0, 0], ftR: [0.4, 0, 0] }), 'lin', 1.6],
    [11, PD_({ body: { p: [0, -0.25, 0.2] }, spine: [0.55, 0, 0], chest: [0.15, 0, 0], shR: [-0.9, 0, -0.2], elR: [-0.3, 0, 0], hdR: [1.2, 0, 0], thL: [-0.6, 0, 0.3], knL: [0.8, 0, 0], thR: [0.3, 0, -0.3], knR: [0.7, 0, 0] }), 'out', 1.2],
    [16, PD_()],
  ], smears: [{ f: 6, frames: 3, type: 'streak', pos: [-0.2, 1.2, 0.3], z0: -1.5, z1: 1.5, W: 0.6 }] },
  // LEAP ('leap'): deep crouch, up with the club overhead, crash down club-first (lock f5 · up f6 · land f12)
  { name: 'dkLeap', label: 'JUMP SMASH', frames: 23, keys: [
    [0, PD_()],
    [3, PD_(DKP.crouch), 'out', 1.3],
    [5, PD_({ ...DKP.crouch, body: { p: [0, -0.6, -0.05] } }), 'io', 1.6],
    [6, PD_({ ...DKP.up, body: { p: [0, 0.2, 0] }, thL: [0.3, 0, 0.3], knL: [0.3, 0, 0], ftL: [0.5, 0, 0], thR: [0.4, 0, -0.3], knR: [0.2, 0, 0], ftR: [0.5, 0, 0] }), 'snap', 1.8],
    [9, PD_({ ...DKP.up, body: { p: [0, 0.1, 0] }, thL: [-1.0, 0, 0.3], knL: [1.6, 0, 0], thR: [-0.8, 0, -0.3], knR: [1.7, 0, 0] }), 'io', 2.0],
    [11, PD_({ ...DKP.up, shR: [-3.15, 0.1, -0.2] }), 'in', 2.2],
    [12, PD_(DKP.down), 'snap', 2.4],
    [17, PD_(DKP.down), 'out', 1.4],
    [23, PD_()],
  ] },
  // LIFT (띄우기 · 도깨비 연계 1): a dragging uppercut that throws a person into the air (lock f6 · lift f9)
  { name: 'dkLift', label: 'UPPERCUT', frames: 18, keys: [
    [0, PD_()],
    [5, PD_({ body: { p: [0, -0.32, -0.1] }, spine: [0.45, -1.0, 0], chest: [0.12, -0.38, 0], head: [-0.05, 1.0, 0], shR: [0.8, 0, -0.4], elR: [-0.3, 0, 0], hdR: [2.0, 0, 0],
              shL: [-0.4, 0, 0.6], elL: [-0.6, 0, 0], thR: [-0.7, 0, -0.3], knR: [1.1, 0, 0], thL: [0.55, 0, 0.3], knL: [1.0, 0, 0] }), 'out', 1.3],
    [8, PD_({ body: { p: [0, -0.36, -0.12] }, spine: [0.48, -1.1, 0], chest: [0.13, -0.4, 0], head: [-0.05, 1.1, 0], shR: [0.9, 0, -0.42], elR: [-0.25, 0, 0], hdR: [2.05, 0, 0],
              shL: [-0.45, 0, 0.6], elL: [-0.6, 0, 0], thR: [-0.75, 0, -0.3], knR: [1.2, 0, 0], thL: [0.6, 0, 0.3], knL: [1.1, 0, 0] }), 'io', 1.7],
    [9, PD_({ body: { p: [0, 0.1, 0.15] }, spine: [-0.3, 0.55, 0], chest: [-0.15, 0.2, 0], head: [-0.45, -0.55, 0], shR: [-2.85, 0, -0.25], elR: [-0.1, 0, 0], hdR: [1.0, 0, 0],
              shL: [-0.5, 0, 0.8], elL: [-0.3, 0, 0], thR: [-0.25, 0, -0.3], knR: [0.15, 0, 0], ftR: [0.35, 0, 0], thL: [0.45, 0, 0.3], knL: [0.25, 0, 0], ftL: [0.5, 0, 0] }), 'snap', 2.0],
    [12, PD_({ body: { p: [0, 0.07, 0.15] }, spine: [-0.26, 0.58, 0], chest: [-0.13, 0.22, 0], head: [-0.4, -0.58, 0], shR: [-2.75, 0, -0.25], elR: [-0.15, 0, 0], hdR: [1.05, 0, 0],
               shL: [-0.45, 0, 0.8], elL: [-0.35, 0, 0], thR: [-0.25, 0, -0.3], knR: [0.2, 0, 0], thL: [0.45, 0, 0.3], knL: [0.3, 0, 0] }), 'out', 1.4],
    [18, PD_()],
  ], events: [{ f: 9, type: 'jab' }],
    smears: [{ f: 9, frames: 3, type: 'arc', pos: [-0.22, 1.2, 0.25], rot: [0, -Math.PI / 2, 0], R: 1.3, W: 0.8, a0: -1.3, a1: 1.9 }] },
  // GRAB (씨름 던지기 1): the left hand lunges for a person (lock f6 · the hand closes f9)
  { name: 'dkGrab', label: 'GRAB', frames: 16, keys: [
    [0, PD_()],
    [5, PD_({ body: { p: [0, -0.2, -0.1] }, spine: [0.25, -0.5, 0], chest: [0.1, -0.2, 0], head: [-0.2, 0.5, 0], shL: [0.4, 0.2, 0.7], elL: [-1.0, 0, 0], hdL: [0.4, 0, 0],
              thL: [0.4, 0, 0.3], knL: [0.6, 0, 0], thR: [-0.3, 0, -0.3], knR: [0.7, 0, 0] }), 'out', 1.2],
    [8, PD_({ body: { p: [0, -0.24, -0.12] }, spine: [0.28, -0.55, 0], chest: [0.1, -0.22, 0], head: [-0.2, 0.55, 0], shL: [0.45, 0.2, 0.72], elL: [-1.05, 0, 0], hdL: [0.4, 0, 0],
              thL: [0.42, 0, 0.3], knL: [0.65, 0, 0], thR: [-0.32, 0, -0.3], knR: [0.75, 0, 0] }), 'io', 1.4],
    [9, PD_({ body: { p: [0, -0.25, 0.3] }, spine: [0.65, 0.35, 0], chest: [0.2, 0.15, 0], head: [-0.5, -0.4, 0], shL: [-1.55, -0.2, 0.1], elL: [-0.1, 0, 0], hdL: [0.2, 0, 0],
              thL: [-1.0, 0, 0.3], knL: [0.6, 0, 0], ftL: [0.2, 0, 0], thR: [0.6, 0, -0.3], knR: [0.4, 0, 0], ftR: [0.3, 0, 0] }), 'snap', 1.5],
    [12, PD_({ body: { p: [0, -0.24, 0.3] }, spine: [0.6, 0.3, 0], chest: [0.2, 0.12, 0], head: [-0.45, -0.35, 0], shL: [-1.5, -0.2, 0.1], elL: [-0.25, 0, 0], hdL: [0.2, 0, 0],
               thL: [-0.9, 0, 0.3], knL: [0.65, 0, 0], thR: [0.55, 0, -0.3], knR: [0.45, 0, 0] }), 'out'],
    [16, PD_()],
  ] },
  // HOLD: the caught person held high in the left fist, the club cocked (loops until the throw)
  { name: 'dkHold', label: 'HOLD', frames: 8, loop: true, keys: [
    [0, PD_({ spine: [0.05, -0.2, 0], chest: [-0.05, -0.1, 0], head: [-0.45, 0.2, 0], shL: [-2.7, 0, 0.35], elL: [-0.35, 0, 0], hdL: [0.3, 0, 0], shR: [-0.4, 0, -0.5], elR: [-1.2, 0, 0] })],
    [4, PD_({ body: { p: [0, -0.12, 0] }, spine: [0.08, -0.25, 0], chest: [-0.04, -0.12, 0], head: [-0.45, 0.25, 0], shL: [-2.8, 0, 0.32], elL: [-0.3, 0, 0], hdL: [0.3, 0, 0], shR: [-0.45, 0, -0.5], elR: [-1.25, 0, 0] })],
    [8, PD_({ spine: [0.05, -0.2, 0], chest: [-0.05, -0.1, 0], head: [-0.45, 0.2, 0], shL: [-2.7, 0, 0.35], elL: [-0.35, 0, 0], hdL: [0.3, 0, 0], shR: [-0.4, 0, -0.5], elR: [-1.2, 0, 0] })],
  ] },
  // THROW (씨름 던지기 2): wound back, then the left arm hurls the person at the other dokkaebi (release f6)
  { name: 'dkThrow', label: 'THROW', frames: 14, keys: [
    [0, PD_({ spine: [0.05, -0.2, 0], head: [-0.45, 0.2, 0], shL: [-2.7, 0, 0.35], elL: [-0.35, 0, 0], shR: [-0.4, 0, -0.5], elR: [-1.2, 0, 0] })],
    [4, PD_({ body: { p: [0, -0.15, -0.15] }, spine: [-0.25, -0.7, 0], chest: [-0.1, -0.3, 0], head: [-0.4, 0.7, 0], shL: [-3.0, 0.3, 0.6], elL: [-0.5, 0, 0], shR: [-0.2, 0, -0.6], elR: [-0.8, 0, 0],
              thL: [0.4, 0, 0.3], knL: [0.5, 0, 0], thR: [-0.4, 0, -0.3], knR: [0.6, 0, 0] }), 'out', 1.3],
    [6, PD_({ body: { p: [0, -0.2, 0.25] }, spine: [0.6, 0.6, 0], chest: [0.2, 0.25, 0], head: [-0.4, -0.6, 0], shL: [-1.4, -0.3, 0.2], elL: [-0.05, 0, 0], shR: [0.4, 0, -0.5], elR: [-0.6, 0, 0],
              thL: [-0.9, 0, 0.3], knL: [0.6, 0, 0], thR: [0.6, 0, -0.3], knR: [0.4, 0, 0] }), 'snap', 1.6],
    [9, PD_({ body: { p: [0, -0.22, 0.25] }, spine: [0.62, 0.7, 0], chest: [0.2, 0.28, 0], head: [-0.4, -0.65, 0], shL: [-1.2, -0.35, 0.3], elL: [-0.2, 0, 0], thL: [-0.9, 0, 0.3], knL: [0.65, 0, 0], thR: [0.6, 0, -0.3], knR: [0.45, 0, 0] }), 'out'],
    [14, PD_()],
  ], events: [{ f: 6, type: 'stomp' }] },
  // BASH (금 나와라 뚝딱): a hop, the club high over the head, then a smash into the floor that spills gold (impact f8)
  { name: 'dkBash', label: 'GOLD SMASH', frames: 18, keys: [
    [0, PD_()],
    [3, PD_(DKP.crouch), 'out', 1.3],
    [5, PD_({ ...DKP.up, body: { p: [0, 0.18, -0.1] }, shL: [-2.6, 0, 0.4], elL: [-0.5, 0, 0] }), 'out', 1.8],
    [7, PD_({ ...DKP.up, body: { p: [0, 0.22, -0.12] }, shR: [-3.15, 0.1, -0.2], shL: [-2.7, 0, 0.4], elL: [-0.5, 0, 0] }), 'io', 2.1],
    [8, PD_({ ...DKP.down, body: { p: [0, -0.42, 0.2] }, shL: [-1.1, 0, 0.3], elL: [-0.1, 0, 0], spine: [0.85, 0.05, 0] }), 'snap', 2.6],
    [12, PD_({ ...DKP.down, body: { p: [0, -0.4, 0.2] }, shL: [-1.05, 0, 0.3], elL: [-0.15, 0, 0], spine: [0.82, 0.05, 0] }), 'out', 1.5],
    [18, PD_()],
  ], events: [{ f: 8, type: 'dkCoin' }],
    smears: [{ f: 8, frames: 3, type: 'arc', pos: [-0.12, 1.3, 0.1], rot: [0, -Math.PI / 2, 0], R: 1.4, W: 0.8, a0: 2.2, a1: -0.55 }] },
  // SWAP (도깨비불 자리 바꾸기): crouch into a ball of ghost fire, gone (f4), back up somewhere else
  { name: 'dkSwap', label: 'FIRE SWAP', frames: 12, keys: [
    [0, PD_()],
    [3, PD_({ ...DKP.crouch, shR: [-0.8, 0, 0.2], elR: [-2.0, 0, 0], shL: [-0.8, 0, -0.2], elL: [-2.0, 0, 0] }), 'out', 2.0],
    [5, PD_({ ...DKP.crouch, body: { p: [0, -0.6, -0.05] }, shR: [-0.85, 0, 0.25], elR: [-2.1, 0, 0], shL: [-0.85, 0, -0.25], elL: [-2.1, 0, 0] }), 'io', 2.6],
    [7, PD_({ body: { p: [0, 0.05, 0] }, spine: [-0.2, 0, 0], head: [-0.5, 0, 0], shR: [-0.4, 0, -1.3], elR: [-0.2, 0, 0], shL: [-0.4, 0, 1.3], elL: [-0.2, 0, 0] }), 'snap', 2.0],
    [12, PD_()],
  ] },
  // ULT (합동 필살): the deep crouch, then up with the club overhead — held while the code flies it in (the smash itself = CLUB 3 from f10)
  { name: 'dkUlt', label: 'TWIN STRIKE', frames: 12, keys: [
    [0, PD_()],
    [4, PD_(DKP.crouch), 'out', 1.8],
    [6, PD_({ ...DKP.up, body: { p: [0, 0.2, 0] }, shL: [-2.7, 0, 0.45], elL: [-0.4, 0, 0], thL: [-0.9, 0, 0.3], knL: [1.5, 0, 0], thR: [-0.7, 0, -0.3], knR: [1.6, 0, 0] }), 'snap', 2.4],
    [12, PD_({ ...DKP.up, body: { p: [0, 0.15, 0] }, shR: [-3.15, 0.1, -0.2], shL: [-2.8, 0, 0.45], elL: [-0.4, 0, 0], thL: [-1.0, 0, 0.3], knL: [1.6, 0, 0], thR: [-0.8, 0, -0.3], knR: [1.7, 0, 0] }), 'io', 2.6],
  ] },
  // CAST (바닥 · 페이즈 전환): club raised to the sky, a roar (loops)
  { name: 'dkCast', label: 'ROAR', frames: 16, loop: true, keys: [
    [0, PD_({ body: { p: [0, 0.05, -0.1] }, spine: [-0.35, 0, 0], chest: [-0.2, 0, 0], head: [-0.6, 0, 0], shR: [-2.9, 0, -0.35], elR: [-0.3, 0, 0], hdR: [0.4, 0, 0], shL: [-0.3, 0, 1.0], elL: [-0.6, 0, 0] }), 'io', 1.6],
    [8, PD_({ body: { p: [0, 0.08, -0.12] }, spine: [-0.4, 0.05, 0], chest: [-0.22, 0, 0], head: [-0.68, 0, 0], shR: [-3.0, 0, -0.3], elR: [-0.25, 0, 0], hdR: [0.4, 0, 0], shL: [-0.35, 0, 1.1], elL: [-0.55, 0, 0] }), 'io', 2.1],
    [16, PD_({ body: { p: [0, 0.05, -0.1] }, spine: [-0.35, 0, 0], chest: [-0.2, 0, 0], head: [-0.6, 0, 0], shR: [-2.9, 0, -0.35], elR: [-0.3, 0, 0], hdR: [0.4, 0, 0], shL: [-0.3, 0, 1.0], elL: [-0.6, 0, 0] }), 'io', 1.6],
  ] },
  // GROGGY: down on the backside, legs out, the head lolling (loops)
  { name: 'dkGroggy', label: 'GROGGY', frames: 24, loop: true, keys: [
    [0, { body: { p: [0, -0.62, -0.05], r: [-0.25, 0, 0] }, spine: [0.5, 0, 0], chest: [0.2, 0, 0], neck: [0.2, 0, 0], head: [0.4, 0, 0.25], shR: [0.2, 0, -0.5], elR: [-0.3, 0, 0], hdR: [0.6, 0, 0],
          shL: [0.2, 0, 0.5], elL: [-0.3, 0, 0], hdL: [0, 0, 0], thR: [-1.4, 0, -0.35], knR: [0.5, 0, 0], ftR: [0.2, 0, 0], thL: [-1.3, 0, 0.35], knL: [0.6, 0, 0], ftL: [0.2, 0, 0] }, 'io', 0.5],
    [12, { body: { p: [0, -0.64, -0.05], r: [-0.22, 0, 0.05] }, spine: [0.55, 0, 0.05], chest: [0.22, 0, 0], head: [0.45, 0, -0.25] }, 'io', 0.8],
    [24, { body: { p: [0, -0.62, -0.05], r: [-0.25, 0, 0] }, spine: [0.5, 0, 0], chest: [0.2, 0, 0], head: [0.4, 0, 0.25] }, 'io', 0.5],
  ] },
  // REEL (휘청 · 돌아섬 · 받아친 뒤): rocked back, catches itself (non-loop, holds the last pose)
  { name: 'dkReel', label: 'REEL', frames: 14, keys: [
    [0, PD_()],
    [2, PD_({ body: { p: [0, -0.05, -0.12], r: [-0.3, 0, 0] }, spine: [-0.3, 0.2, 0], chest: [-0.2, 0, 0], head: [-0.6, -0.2, 0], shL: [-0.3, 0, 1.0], elL: [-0.2, 0, 0], shR: [-0.6, 0, -1.0], elR: [-0.3, 0, 0],
              thR: [-0.3, 0, -0.3], knR: [0.3, 0, 0], thL: [0.35, 0, 0.3], knL: [0.2, 0, 0] }), 'snap'],
    [6, PD_({ body: { p: [0, -0.2, -0.1], r: [0.1, 0, 0] }, spine: [0.5, 0.2, 0], chest: [0.15, 0, 0], head: [0.2, -0.2, 0], thR: [-0.4, 0, -0.3], knR: [0.6, 0, 0], thL: [0.2, 0, 0.3], knL: [0.6, 0, 0] }), 'io'],
    [14, PD_({ body: { p: [0, -0.16, -0.05] }, spine: [0.4, 0.15, 0] }), 'io'],
  ], root: [[0, 0], [2, -0.35], [5, -0.5]] },
  // LAND (뜸 · 무릎에서 일어남 · 놓기): a heavy landing crouch, back up
  { name: 'dkLand', label: 'LAND', frames: 12, keys: [
    [0, PD_({ ...DKP.crouch, body: { p: [0, -0.45, -0.05] } })],
    [3, PD_({ ...DKP.crouch, body: { p: [0, -0.5, -0.05] } }), 'out'],
    [8, PD_({ body: { p: [0, -0.15, 0] } }), 'io'],
    [12, PD_()],
  ], events: [{ f: 1, type: 'land' }] },
  // RISE (되살아남): from flat on the back (the end of 'death') to the stance
  { name: 'dkRise', label: 'RISE', frames: 16, keys: [
    [0, { body: { p: [0, -0.75, 0.35], r: [1.45, 0, 0.2] }, spine: [0.15, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [-0.3, 0.6, 0], thL: [0.1, 0, 0.1], knL: [0.35, 0, 0], ftL: [0.3, 0, 0],
          thR: [0.2, 0, -0.06], knR: [0.6, 0, 0], ftR: [0.3, 0, 0], shL: [-2.6, 0, 0.35], elL: [-0.3, 0, 0], hdL: [0, 0, 0], shR: [-2.2, 0, -0.6], elR: [-0.2, 0, 0], hdR: [0.4, 0, 0] }],
    [5, { body: { p: [0, -0.62, 0.1], r: [0.6, 0, 0.1] }, spine: [0.5, 0, 0], head: [0.1, 0.2, 0], shL: [0.4, 0, 0.6], elL: [-0.4, 0, 0], shR: [0.4, 0, -0.6], elR: [-0.4, 0, 0],
          thL: [-1.4, 0, 0.3], knL: [1.9, 0, 0], thR: [-1.0, 0, -0.3], knR: [1.6, 0, 0] }, 'out', 1.6],
    [10, PD_({ ...DKP.crouch }), 'io', 2.0],
    [16, PD_(), 'io', 1.2],
  ], events: [{ f: 10, type: 'stomp' }] },
];
// golem clip names the shared AI plays → the dokkaebi's own (reused player clips: held = 뜸 · kneel = 무릎 / 되살리기 · death)
const DK_REMAP = { idle: 'dkIdle', walk: 'dkWalk', run: 'dkWalk', slam: 'dkClub3', sweep: 'dkClub1', jabL: 'dkFire', jabR: 'dkFire', charge: 'dkRush', leap: 'dkLeap',
                   grab: 'dkGrab', hold: 'dkHold', grabSlam: 'dkThrow', grabRelease: 'dkLand', cast: 'dkCast', groggy: 'dkGroggy', lifted: 'held', liftDrop: 'dkLand',
                   kneelDown: 'kneel', staggered: 'dkReel', turned: 'dkReel', reel: 'dkReel', death: 'death' };
const DK_COL = ['blue', 'red'], DK_NAME = ['BLUE DOKKAEBI', 'RED DOKKAEBI'];
// looks: skin · rage skin (3페이즈 분노 색) · hair · pants (호피) · eyes · ghost-fire emission
const DK_LOOK = [
  { skin: [C.SLATE0, C.SLATE1, C.SLATE2, C.SLATE3], rage: [C.SLATE1, C.SLATE2, C.CYAN, C.CYAN], hair: [C.VOID, C.ABYSS, C.DEEP, C.SLATE0],
    pants: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], eye: [C.SLATE2, C.CYAN, C.CYAN, C.BONE2], emit: [0.3, 0.75, 1.1], fire: RAMP.crystalB, pk: 'auraB' },
  { skin: [C.BLOOD1, C.BLOOD2, C.CRIM0, C.CRIM1], rage: [C.BLOOD2, C.CRIM0, C.CRIM2, C.EMBER], hair: [C.VOID, C.ABYSS, C.DEEP, C.BLOOD0],
    pants: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], eye: [C.CRIM2, C.EMBER, C.HOT, C.HOTW], emit: [1.1, 0.35, 0.18], fire: RAMP.crystal, pk: 'auraR' },
];
function buildDokkaebi(k) {
  const D = FEEL.DK, L = DK_LOOK[k];
  const ch = buildPlayer({ skin: L.skin, hair: L.hair, cloak: L.skin, blade: 'club', name: DK_NAME[k], clips: PLAYER_CLIPS.concat(DK_CLIPS) });
  const root = ch.root, mats = ch.mats;                         // mats: skin · hair · cloak · vest · cloth · steel · brass · eye
  for (const n of ['cape', 'tail1', 'lockL', 'lockR']) { const o = root.getObjectByName(n); if (o) o.visible = false; }
  ch.springs = [];
  mats[3].uniforms.uRamp.value.set(...L.skin);                  // bare torso / hands (the vest takes the skin colour)
  mats[4].uniforms.uRamp.value.set(...L.pants);                 // tiger-skin trousers
  mats[7].uniforms.uRamp.value.set(...L.eye); mats[7].uniforms.uEmit.value.set(...L.emit);
  const horn = toon({ chr: true, ramp: RAMP.bone, rim: C.SLATE1, outline: 0.5, pl: 0.5 });
  const fire = toon({ chr: true, ramp: L.fire, emit: L.emit, pl: 0, bias: 0.06 });
  const head = root.getObjectByName('head'), chest = root.getObjectByName('chest');
  // horns (one each side, curving up and out) · a ghost-fire bead on the brow
  const att = { horns: new THREE.Group(), wings: new THREE.Group(), shield: new THREE.Group() };
  for (const s of [-1, 1]) {
    const h1 = mesh(new THREE.ConeGeometry(0.042, 0.13, 6), horn); h1.position.set(0.075 * s, 0.215, 0.02); h1.rotation.z = -0.5 * s; att.horns.add(h1);
    const h2 = mesh(new THREE.ConeGeometry(0.026, 0.1, 5), horn); h2.position.set(0.12 * s, 0.3, 0.02); h2.rotation.z = -0.15 * s; att.horns.add(h2);
  }
  const brow = mesh(new THREE.SphereGeometry(0.022, 6, 4), fire); brow.position.set(0, 0.19, 0.11); att.horns.add(brow);
  head.add(att.horns);
  // weak points: a ghost-fire charm on the chest (front) · the gourd on the back (the back crystal of the old bosses)
  const charm = mesh(new THREE.SphereGeometry(0.04, 6, 5), fire); charm.position.set(0, 0.14, 0.12); chest.add(charm);
  const gourd = mesh(new THREE.SphereGeometry(0.075, 8, 6), fire); gourd.position.set(0.04, 0.1, -0.17); gourd.scale.set(0.85, 1.1, 0.85); chest.add(gourd);
  const gn = mesh(new THREE.SphereGeometry(0.045, 6, 5), fire); gn.position.set(0.04, 0.2, -0.17); chest.add(gn);
  // ghost fire: three wisps circling the waist (5 in the rage of phase 3 = att.wings)
  const wisps = [];
  for (let i = 0; i < 5; i++) { const w = mesh(new THREE.SphereGeometry(i < 3 ? 0.035 : 0.05, 6, 4), fire, false); (i < 3 ? root : att.wings).add(w); wisps.push(w); }
  root.add(att.wings);
  att.wings.visible = att.shield.visible = false;
  root.remove(ch.smear.mesh); tagIdsByMaterial(root); root.add(ch.smear.mesh);   // (the smear's empty mesh has no vertices to tag)
  root.scale.setScalar(D.scale);
  ch.remap = DK_REMAP; ch.order = DK_CLIPS.map(c => c.name);
  ch.radius = D.radius; ch.focus = 1.0 * D.scale; ch.turnRate = ch.baseTurn = 1.6;
  ch.M = { core: fire }; ch.coreMat = fire; ch.att = att; ch.dkLook = L; ch.dkEmit = L.emit.slice(); ch.dk = k;
  ch.glowMats = [{ mat: fire, base: L.emit.slice(), bias: 0.06 }];
  ch.mats.push(horn, fire);
  ch.weak = [{ name: 'CHARM', obj: charm }, { name: 'HORN', obj: brow }, { name: 'GOURD', obj: gourd }];
  const sm = ch.smear.mat.uniforms; sm.uA.value = PAL_RGB[k ? C.EMBER : C.CYAN]; sm.uB.value = PAL_RGB[k ? C.CRIM1 : C.SLATE2]; sm.uEmit.value.set(...L.emit.map(v => v * 0.6));
  for (const m of ch.mats) { if (!m.uniforms) continue; m.uniforms.uCutOn = CUT.on; m.uniforms.uCut = CUT.p; m.uniforms.uCutZ = CUT.z; m.uniforms.uCutStr = CUT.str; }
  ch.post = c => {                                                // the wisps bob round the waist (look only: real time)
    const t = clock.t * 2.2 + k * 1.3;
    wisps.forEach((w, i) => { const a = t + i * TAU / (i < 3 ? 3 : 2) + (i < 3 ? 0 : 0.6), r = i < 3 ? 0.42 : 0.55; w.position.set(Math.sin(a) * r, 1.0 + Math.sin(t * 1.7 + i) * 0.12 + (i < 3 ? 0 : 0.35), Math.cos(a) * r); });
    void c;
  };
  return ch;
}
// ---- two dokkaebi, one shared boss AI: per-dokkaebi state swapped in and out ----------------------------------------------
const Dk = {
  on: false, rigs: [], ctx: [{}, {}], ci: 0, golem: null, bg: [0, 0], J: null, jointCd: 0, down: null, rv: null, fnKeys: null,
  ensure() {
    if (this.rigs.length) return;
    for (let k = 0; k < 2; k++) { const r = buildDokkaebi(k); r.root.visible = false; scene.add(r.root); this.rigs.push(r); }
  },
  // the rush's boss is the pair (Rush.apply): rig 0 = `boss` while nothing is swapped, rig 1 rides along in Rigs.bodies (collision)
  use(on) {
    if (!!on === this.on) return;
    if (on) {
      this.ensure();
      if (!this.golem) this.golem = boss;
      const p = boss.pos.clone(), f = boss.facing, vis = boss.root.visible;
      boss.root.visible = false;
      Rigs.bodies = Rigs.bodies.filter(b => b !== boss && b !== this.golem); Rigs.bodies.push(this.rigs[0], this.rigs[1]);
      boss = this.rigs[0]; boss.place(p.x, p.z, f);
      for (const r of this.rigs) { r.root.visible = vis; r.play('idle'); }
      this.on = true; this.ci = 0; this.ctx = [{}, {}]; this.J = null; this.down = null; this.rv = null;
    } else {
      const r0 = this.rigs[this.ci] || this.rigs[0], p = r0.pos.clone(), f = r0.facing, vis = r0.root.visible;
      for (const r of this.rigs) r.root.visible = false;
      Rigs.bodies = Rigs.bodies.filter(b => !this.rigs.includes(b)); Rigs.bodies.push(this.golem);
      boss = this.golem; boss.place(p.x, p.z, f); boss.root.visible = vis; boss.play('idle');
      this.on = false; this.ci = 0; this.J = null; this.down = null; this.rv = null;
    }
  },
  // size + measured reach (Rush.apply): both rigs alike · SLAM_AT = where the club head lands on CLUB 3's impact frame
  apply() {
    const D = FEEL.DK;
    for (const r of this.rigs) { r.root.scale.setScalar(D.scale); r.radius = D.radius; r.tintW = undefined; r.glowMats[0].base = r.dkEmit.slice(); this.lookOf(r, 1); }
    const r = this.rigs[0], px = r.pos.x, pz = r.pos.z, pf = r.facing;
    measureJoint(r, 'dkClub3', FIGHT.SLAM.hitF, 'hdR');
    const tip = r.root.getObjectByName('dkTip').getWorldPosition(V3()); tip.y = 0; SLAM_AT.copy(tip);
    r.place(px, pz, pf); r.play('idle');
    FIGHT.SWEEP.r = D.sweepR; FIGHT.REACH_H = D.reachH;
  },
  dataKeys() {
    if (!this.fnKeys) { this.fnKeys = new Set(); for (const k of Object.keys(AI)) { const d = Object.getOwnPropertyDescriptor(AI, k); if (!('value' in d) || typeof d.value === 'function') this.fnKeys.add(k); } }
    return Object.keys(AI).filter(k => !this.fnKeys.has(k));
  },
  save(i) { const c = this.ctx[i]; for (const k of this.dataKeys()) c[k] = AI[k]; },
  load(i) { const c = this.ctx[i]; for (const k of this.dataKeys()) if (!(k in c)) AI[k] = undefined; Object.assign(AI, c); boss = this.rigs[i]; this.ci = i; },
  // run fn with dokkaebi i swapped into AI / boss (nests; always swaps back)
  with(i, fn) {
    if (!this.on || i === undefined || i === null || i < 0 || i === this.ci) return fn();
    const prev = this.ci; this.save(prev); this.load(i);
    try { return fn(); } finally { this.save(i); this.load(prev); }
  },
  each(fn) { if (!this.on) { fn(0); return; } for (let i = 0; i < 2; i++) this.with(i, () => fn(i)); },
  get(i, k) { return !this.on || i === this.ci ? AI[k] : this.ctx[i][k]; },
  set(i, k, v) { if (!this.on || i === this.ci) AI[k] = v; else this.ctx[i][k] = v; },
  col(i = this.ci) { return DK_COL[i]; },
  alive(i) { const s = this.get(i, 'state'); return s !== 'dead' && s !== 'away'; },
  anyAlive() { return this.on ? this.alive(0) || this.alive(1) : AI.targetable(); },
  anyState(pred) { return this.on ? pred(this.get(0, 'state')) || pred(this.get(1, 'state')) : pred(AI.state); },
  frac() { if (!this.on) return AI.hp / AI.maxHp; const m = this.get(0, 'maxHp') + this.get(1, 'maxHp'); return m > 0 ? (this.get(0, 'hp') + this.get(1, 'hp')) / m : 1; },
  stats() { const S = Duo.stats; return S.dk || (S.dk = { link: 0, linkLift: 0, linkMiss: 0, linkBreak: 0, linkHit: 0, swap: 0, throwN: 0, throwGrab: 0, throwMiss: 0, throwFree: 0, counter: 0, throwHit: 0,
    coin: 0, coinN: 0, coinGot: 0, coinHit: 0, ult: 0, ultSync: 0, ultBlock: 0, down: 0, revive: 0, reviveTry: 0, reviveBreak: 0, swapN: 0 }); },
  // ---- a fresh fight (Game.reset · Rush.enter): AI.reset has just made dokkaebi 0; dokkaebi 1 gets its own; both stand apart
  reset(entering = false) {
    if (!this.on) return;
    const D = FEEL.DK;
    this.J = null; this.jointCd = D.jointCd0; this.coinCd = D.coin.cd * 0.5; this.down = null; this.rv = null;
    if (this.ci !== 0) { this.load(0); }
    const r0 = this.rigs[0], r1 = this.rigs[1], f = r0.facing, c = V3(r0.pos.x, 0, r0.pos.z), sx = Math.cos(f) * D.spawn, sz = -Math.sin(f) * D.spawn;
    r0.place(c.x + sx, c.z + sz, f); r1.place(c.x - sx, c.z - sz, f); r1.root.visible = r0.root.visible;
    this.ctx = [{}, {}]; this.save(0);
    this.with(1, () => AI.reset());
    this.each(i => {                                        // first targets by colour: the blue one hunts the blue player (the twin: whoever is left)
      const want = fighters.filter(q => q.alive).find(q => Slots.color(q) === DK_COL[i]) || fighters.filter(q => q.alive).find(q => Slots.color(q) === 'both');
      if (want && !Game.tagMode) { AI.aggro = null; AI.setAggro(want, 'auto', true); }
      AI.t = 1.4 + i * D.offset;
      if (entering) { AI.state = 'away'; boss.pos.y = 6; }
    });
  },
  // ---- the main loop's boss step (two AIs, each with its own local hit-stop) ----
  updateAI(bgdt0, bgdt, dt) {
    if (!this.on) { AI.update(bgdt, dt); return; }
    this.jointCd = Math.max(0, this.jointCd - bgdt0); this.coinCd = Math.max(0, (this.coinCd || 0) - bgdt0);
    if (this.down) this.down.t += bgdt0;
    for (let i = 0; i < 2; i++) this.with(i, () => {
      const b = AI.hs > 0 ? 0 : bgdt0; AI.hs = Math.max(0, AI.hs - dt); this.bg[i] = b;
      if (b > 0 && this.down && this.down.i !== i && !this.rv && this.down.t >= FEEL.DK.revive.wait && (AI.state === 'idle' || AI.state === 'walk') && Game.state === 'play') this.startRevive();
      AI.update(b, dt);
    });
  },
  updateRigs() { if (!this.on) return false; for (let i = 0; i < 2; i++) this.with(i, () => boss.update(this.bg[i], collide)); return true; },
  flash(dt) { if (!this.on) { boss.updateFlash(dt, CamRig.R); return; } for (const r of this.rigs) r.updateFlash(dt, CamRig.R); },
  // ---- which dokkaebi a fighter's own actions (hits · starters · finishers · aim) refer to this frame
  forF(f) {
    if (!this.on) return this.ci;
    const ok = i => this.alive(i), J = this.J;
    if (f.fin && f.fin.dk !== undefined) return f.fin.dk;
    if (Duo.st && Duo.st.dk !== undefined) return Duo.st.dk;          // a status is up: everyone's U / I and hits go to it
    if (J && J.v === f) return J.lead;
    if (J && J.name === 'dkThrow' && J.ph === 'hold' && ok(J.lead)) return J.lead;   // free the held one: hit the thrower
    if (!ok(0) && !ok(1)) return this.ci;
    if (!ok(0)) return 1; if (!ok(1)) return 0;
    if (Game.botFor(f)) return this.botPick(f);
    let best = 0, bs = 1e9; const p = f.ch.pos, a0 = f.ch.facing;   // a person: whichever is most in front of them (distance + turning)
    for (let i = 0; i < 2; i++) {
      const r = this.rigs[i].pos, d = Math.hypot(r.x - p.x, r.z - p.z), s = d + 2.2 * Math.abs(angDiff(Math.atan2(r.x - p.x, r.z - p.z), a0)) / Math.PI;
      if (s < bs) { bs = s; best = i; }
    }
    return best;
  },
  own(f) {                                                // a fighter's colour partner: blue → the blue one · the twin → the colour its partner isn't
    const c = Slots.color(f); if (c === 'blue') return 0; if (c === 'red') return 1;
    const o = fighters.find(q => q !== f && q.onField), oc = o ? Slots.color(o) : 'both';
    return oc === 'blue' ? 1 : oc === 'red' ? 0 : f.idx % 2;
  },
  botPick(f) {
    const partner = Game.tagMode ? null : fighters.find(o => o !== f && o.onField);
    let bi = -1, be = 1.2;                                // the most urgent parryable hit on me (or on the partner I'd cover)
    for (let i = 0; i < 2; i++) {
      const e = this.with(i, () => { const a = AI.etaFor(f), b = partner && partner.alive ? AI.etaFor(partner) : null; return Math.min(a ?? 9, b ?? 9); });
      if (e < be) { be = e; bi = i; }
    }
    if (bi >= 0) return bi;
    if (this.rv && this.alive(this.rv.by)) return this.rv.by;   // stop the revive
    const mine = this.own(f), other = 1 - mine, fr = i => this.get(i, 'hp') / Math.max(1, this.get(i, 'maxHp'));
    return fr(mine) + FEEL.DK.botEven < fr(other) ? other : mine;   // keep the two even (the survivor revives the other)
  },
  // the dokkaebi the shared systems refer to between fighters (status · finishers · echoes)
  main() {
    if (!this.on) return this.ci;
    if (Duo.st && Duo.st.dk !== undefined) return Duo.st.dk;
    const L = Duo.fins.find(q => q.dk !== undefined); if (L) return L.dk;
    return this.alive(0) || !this.alive(1) ? 0 : 1;
  },
  stIdx() { return this.on && Duo.st && Duo.st.dk !== undefined ? Duo.st.dk : this.ci; },
  stState() { return this.with(this.stIdx(), () => AI.state); },
  stMine() { return !this.on || !Duo.st || Duo.st.dk === undefined || Duo.st.dk === this.ci; },
  st() { return this.stMine() ? Duo.st : null; },
  tagSt() { if (this.on && Duo.st) Duo.st.dk = this.ci; },
  // ---- hooks inside the shared AI (called with the dokkaebi in question swapped in)
  hold() {                                                // decide(): the other one is mid-attack → usually wait a beat (overlap = both at once)
    if (!this.on) return false;
    const s = this.get(1 - this.ci, 'state');
    if (s !== 'attack' && s !== 'cast') return false;
    return SR() >= FEEL.DK.overlap;
  },
  fireK() { return this.on ? FEEL.DK.fireMul[AI.phase - 1] : 1; },   // 도깨비불(연타 불기둥) 피해 배율: 70 %부터 강해짐
  tint(w) {                                               // Rush.tint for the pair: the attacking one's ghost fire flares (each its own colour)
    const r = boss; if (r.tintW === w) return; r.tintW = w;
    r.glowMats[0].base = w ? r.dkEmit.map(v => v * 1.7) : r.dkEmit.slice();
  },
  lookOf(r, ph) {
    const L = r.dkLook, rage = ph >= 3;
    r.mats[0].uniforms.uRamp.value.set(...(rage ? L.rage : L.skin)); r.mats[3].uniforms.uRamp.value.set(...(rage ? L.rage : L.skin));
    r.dkEmit = rage ? L.emit.map(v => v * 1.35) : L.emit.slice(); r.glowMats[0].base = r.dkEmit.slice(); r.tintW = undefined;
  },
  look(ph) { if (this.on && boss.dkLook) this.lookOf(boss, ph); },   // AI.setLook: 3페이즈 = 분노 색 (+ att.wings 도깨비불 다섯)
  phaseUp(next) {                                         // a phase change on one = both (the phase is the pair's: combined health)
    if (!this.on) return;
    this.with(1 - this.ci, () => { if (AI.phase < next) { AI.phase = next; AI.setLook(next); } });
  },
  onHurt(total, F) {
    if (!this.on) return;
    const i = this.ci, rv = this.rv, J = this.J;
    if (rv && rv.by === i) {                              // reviving: enough damage breaks it off
      rv.dmg += total;
      if (rv.dmg >= FEEL.DK.revive.brk) this.breakRevive();
    }
    if (J && J.name === 'dkThrow' && J.lead === i && J.ph === 'hold' && F && F !== J.v) this.releaseThrow();   // a hit frees the held one
  },
  // interrupted (status · groggy · phase change · down): its joint attack / revive stops
  cut(why) {
    if (!this.on) return;
    const i = this.ci, J = this.J;
    if (J && (J.lead === i || J.part === i)) this.endJoint(J, why, i);
    if (this.rv && this.rv.by === i && why !== 'revived') this.breakRevive(true);
  },
  onDie() {                                               // AI.die: one down → the other will revive it · both down → the boss is beaten
    if (!this.on) return false;
    const i = this.ci, j = 1 - i, S = this.stats();
    this.cut('dead');
    if (!this.alive(j)) { this.down = null; this.rv = null; return false; }
    this.down = { i, t: 0 }; S.down++;
    Game.banner(`${DK_NAME[i]} DOWN`, 1.6);
    return true;
  },
  // ---- revive: after revive.wait s the survivor walks over and kneels for revive.t s (revive.brk damage / a status / groggy breaks it)
  startRevive() {
    const A = AI;
    A.state = 'attack'; A.cur = 'dkRevive'; A.clearTele(); A.atkSeq++; A.hitId = A.atkSeq; A.curWave = null; A.cmb = null;
    this.rv = { by: this.ci, ph: 'go', t: 0, dmg: 0 }; this.stats().reviveTry++;
    boss.play('walk', 2.0); Game.banner('REVIVING!', 1.2); Sfx.play('warn');
  },
  updateRevive(gdt) {
    const A = AI, rv = this.rv, D = FEEL.DK.revive;
    if (!rv || rv.by !== this.ci || !this.down) { this.rest(0.4); return; }
    const body = this.rigs[this.down.i], dx = body.pos.x - boss.pos.x, dz = body.pos.z - boss.pos.z, d = Math.hypot(dx, dz) || 1e-6;
    boss.facingTo = Math.atan2(dx, dz); boss.turnRate = 6;
    if (rv.ph === 'go') {
      const reach = boss.radius + body.radius + 0.3;
      if (d > reach + 0.05) { const v = Math.min(d - reach, FIGHT.WALK[A.phase - 1] * D.walk * gdt); boss.pos.x += dx / d * v; boss.pos.z += dz / d * v; if (!boss.is('walk')) boss.play('walk', 2.0); }
      else { rv.ph = 'chan'; rv.t = 0; boss.play('kneel'); Sfx.play('p2charge'); }
      return;
    }
    rv.t += gdt;
    if (gdt > 0 && Math.random() < 0.7) {                 // ghost fire drifting from the hands into the fallen one (look only)
      const h = boss.root.getObjectByName('hdL').getWorldPosition(V3()), q = body.pos;
      Particles.spawn(h.x, h.y, h.z, (q.x - h.x) * 1.5, rnd(0.2, 0.8), (q.z - h.z) * 1.5, rnd(0.4, 0.7), 2, PK[DK_LOOK[this.ci].pk]);
    }
    if (rv.t >= D.t) this.reviveDone();
  },
  reviveDone() {
    const i = this.down.i, S = this.stats();
    this.rv = null; this.down = null; S.revive++;
    this.with(i, () => {
      AI.hp = AI.chip = Math.round(AI.maxHp * FEEL.DK.revive.hp); AI.state = 'recover'; AI.cur = 'recover'; AI.recoverRest = 0.6; AI.liftCd = Math.max(AI.liftCd, 2);
      boss.rootOn = true; boss.turnRate = 0; boss.play('dkRise');
      Particles.burst(DK_LOOK[i].pk, V3(boss.pos.x, 0.6, boss.pos.z), null, 30, 2.0); Game.popup('REVIVED', V3(boss.pos.x, 3.4, boss.pos.z), i ? C.HOT : C.CYAN, 2);
    });
    Sfx.play('revive'); CamRig.shake(3, 0.3);
    this.rest(0.6);
  },
  breakRevive(quiet = false) {
    const rv = this.rv; if (!rv) return;
    this.rv = null; if (this.down) this.down.t = 0;          // (★ broken: the wait starts over)
    this.stats().reviveBreak++;
    if (quiet) return;
    this.with(rv.by, () => {
      Game.popup('REVIVE BROKEN', V3(boss.pos.x, 3.4, boss.pos.z), C.HOTW, 2); Sfx.play('brk');
      AI.clearTele(); AI.state = 'recover'; AI.cur = 'recover'; AI.recoverRest = 0.8; boss.play('dkReel'); boss.turnRate = 0;
    });
  },
  // back to idle after the running clip ends (a looping / frozen clip: at once)
  rest(t) {
    const A = AI; boss.pos.y = 0; boss.rootOn = true; if (!boss.speed) boss.speed = 1;
    if (!boss.clip || boss.clip.loop || boss.done) { A.toIdle(t); return; }
    A.clearTele(); A.state = 'recover'; A.cur = 'recover'; A.recoverRest = t; Rush.tint(null);
  },
};
// ---- joint attacks (합동기) ----------------------------------------------------------------------------------------------
Object.assign(Dk, {
  owns(n) { return n === 'dkLink' || n === 'dkThrow' || n === 'dkSwap' || n === 'dkCoin' || n === 'dkUlt' || n === 'dkRevive'; },
  coinBusy() { return Hazards.list.some(h => h.coin); },
  // decide(): may dokkaebi ci open this pattern now? (joint ones need the other free; one joint at a time; jointCd between)
  can(n, d, last) {
    if (!this.on) return false;
    const i = this.ci, j = 1 - i, D = FEEL.DK;
    if (n === 'dkCoin') return last !== n && !this.coinBusy() && this.coinCd <= 0;
    if (this.J || this.rv || this.down || this.jointCd > 0) return false;
    const ps = this.get(j, 'state'); if (ps !== 'idle' && ps !== 'walk') return false;
    const sep = Math.hypot(this.rigs[0].pos.x - this.rigs[1].pos.x, this.rigs[0].pos.z - this.rigs[1].pos.z);
    const two = Game.tagMode || fighters.filter(f => f.alive).length > 1;
    switch (n) {
      case 'dkLink': return i === 0 && d < D.link.liftR + boss.radius + 0.4;     // 청 도깨비가 띄우고 적 도깨비가 받아침
      case 'dkThrow': return d < FEEL.GRAB.reach + boss.radius + 0.3 && sep > 3.0;
      case 'dkSwap': return sep > 3.5 && last !== n;
      case 'dkUlt': return AI.phase >= 3 && two && last !== n;
    }
    return false;
  },
  // AI.start hands these over (state = 'attack', cur = name already set)
  start(name) {
    const i = this.ci, j = 1 - i, A = AI, S = this.stats();
    if (name === 'dkCoin') { boss.play('dkBash', A.speed); Sfx.play('warn'); Game.banner('GOLD COINS', 1.0); S.coin++; this.coinCd = FEEL.DK.coin.cd; return true; }
    if (name === 'dkRevive') return false;
    const J = this.J = { name, lead: i, part: j, t: 0, ph: 'a', id: A.atkSeq * 64 + 40 };
    this.with(j, () => { AI.state = 'attack'; AI.cur = name; AI.clearTele(); AI.swingHit = new Set(); AI.atkSeq++; AI.hitId = AI.atkSeq; AI.curWave = null; AI.cmb = null; AI.chained = false; AI.rushing = AI.airborne = false; });
    this['s_' + name](J);
    return true;
  },
  updateAttack(a, gdt) {
    const A = AI, i = this.ci;
    if (A.cur === 'dkRevive') { this.updateRevive(gdt); return; }
    if (A.cur === 'dkCoin') { boss.turnRate = 0; if (boss.done) A.finish(); return; }
    const J = this.J;
    if (!J || J.name !== A.cur) { this.rest(0.4); return; }          // its joint ended elsewhere
    if (i !== J.lead) return;                                         // the lead runs the joint's clock (and moves the other)
    J.t += gdt;
    this['j_' + J.name](J, gdt, a);
  },
  endJoint(J, why, skip = -1) {
    if (this.J !== J) return;
    this.J = null; this.jointCd = FEEL.DK.jointCd;
    if (J.v && J.v.state === 'juggled') this.unjuggle(J.v);
    for (const k of [J.lead, J.part]) {
      if (k === skip) continue;
      this.with(k, () => {
        AI.clearTele(); if (!boss.speed) boss.speed = 1;
        if (AI.state !== 'attack' || AI.cur !== J.name) return;
        if (why === 'break' || why === 'hap') { boss.pos.y = 0; return; }   // (the caller puts both in groggy)
        this.rest(srnd(...FIGHT.GAP[AI.phase - 1]) * (Rush.boss.gapMul || 1));
      });
    }
  },
  juggle(v, pose = 'held') {                              // a person thrown about by a joint attack: no control, out of other hits' way
    v.state = 'juggled'; v.t = 0; v.pending = null; v.vel.set(0, 0, 0); v.clearBufs();
    v.ch.rootOn = false; v.ch.turnRate = 0; v.ch.play(pose);
  },
  unjuggle(v, state = 'hit') {
    if (v.state !== 'juggled') return;
    v.ch.pos.y = 0; collide(v.ch); v.state = state; v.t = 0; v.invuln = 0; v.ch.rootOn = true; v.ch.turnRate = 16;
    v.ch.play(state === 'hit' ? 'hit' : 'idle');
  },
  inSector(rig, R, half, pred, prefer) {
    const hit = q => { if (!q || !pred(q)) return false; const dx = q.ch.pos.x - rig.pos.x, dz = q.ch.pos.z - rig.pos.z;
      return Math.hypot(dx, dz) - q.ch.radius <= R && Math.abs(angDiff(Math.atan2(dx, dz), rig.facing)) <= half; };
    return hit(prefer) ? prefer : fighters.find(hit) || null;
  },
  catchable(q) { return q.alive && q.state !== 'juggled' && q.state !== 'finish' && q.state !== 'link' && !q.iframes(); },
  // ---- 1. 도깨비 연계: the blue one throws a person up (dodge it) → the red one rushes in and strikes as they come down.
  //         The partner covering that strike = 합 끊기: both dokkaebi stagger (a big opening) + rally +2 · tag solo: a tag parry does it
  s_dkLink(J) {
    const A = AI, D = FEEL.DK.link;
    J.tgt = A.target; J.ph = 'lift'; this.stats().link++;
    boss.play('dkLift', 1); Sfx.play('warn'); Game.banner('DOKKAEBI LINK', 0.9);
    A.tele.push(Decals.add(1, { R: D.liftR + boss.radius, half: D.liftHalf, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: 3 }));
    this.with(J.part, () => { boss.play('idle'); });
  },
  j_dkLink(J, gdt) {
    const A = AI, D = FEEL.DK.link, S = this.stats();
    if (J.ph === 'lift') {
      const t = A.tele[0], f = boss.f, tg = J.tgt;
      if (f < D.lockF && tg && tg.alive) { boss.turnRate = 6; boss.facingTo = Math.atan2(tg.ch.pos.x - boss.pos.x, tg.ch.pos.z - boss.pos.z); } else { boss.turnRate = 0; boss.facingTo = boss.facing; }
      if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; A.setTele(t, f, D.lockF, D.liftF); }
      if (f < D.liftF) return;
      A.clearTele();
      const v = this.inSector(boss, D.liftR + boss.radius, D.liftHalf, q => this.catchable(q), tg);
      if (!v) { S.linkMiss++; this.endJoint(J, 'miss'); return; }
      Game.hurtPlayer(v, D.liftDmg, boss.pos.clone(), false, null, true, 'melee', false, J.id);
      if (!v.alive) { this.endJoint(J, 'miss'); return; }
      this.juggle(v); J.v = v; J.ph = 'air'; J.t0 = J.t; J.air = D.air[A.phase - 1]; J.p = v.ch.pos.clone(); S.linkLift++;
      Particles.burst('dust', V3(J.p.x, 0, J.p.z), null, 18, 1.6); Particles.burst(DK_LOOK[0].pk, V3(J.p.x, 1.0, J.p.z), V3(0, 1, 0), 18, 1.8);
      CamRig.shake(3, 0.25); Sfx.play('lift'); Game.popup('LIFTED', V3(J.p.x, 3.2, J.p.z), C.CYAN, 2);
      this.with(J.part, () => {                          // the red one sets off: a lane from it to the spot the person comes down on
        const dx = J.p.x - boss.pos.x, dz = J.p.z - boss.pos.z;
        boss.play('dkRush', 1); boss.turnRate = 8; boss.facingTo = Math.atan2(dx, dz); AI.curWave = DK_COL[J.part]; Rush.tint(AI.curWave);
        AI.tele.push(Decals.add(2, { L: D.laneL, W: D.laneW, x: boss.pos.x, z: boss.pos.z, rot: Math.atan2(dx, dz), wave: Waves.code(DK_COL[J.part]) }));
        J.rs = boss.pos.clone();
      });
      return;
    }
    if (J.ph !== 'air') return;
    const v = J.v, u = Math.min(1, (J.t - J.t0) / J.air), fromT = J.t0 + J.air - D.rushT;
    if (v.onField && v.state === 'juggled') { v.ch.pos.set(J.p.x, D.h * 4 * u * (1 - u), J.p.z); v.ch.root.position.copy(v.ch.pos); }
    const tp = v.onField ? v.ch.pos : (fighters.find(q => q.onField) || v).ch.pos;
    this.with(J.part, () => {
      const t = AI.tele[0], dx = tp.x - boss.pos.x, dz = tp.z - boss.pos.z, dd = Math.hypot(dx, dz);
      if (J.t < fromT) {                                  // coiled (the clip held on its wind-up), aiming the lane
        if (boss.f >= 5 && boss.speed) boss.speed = 0;
        boss.turnRate = 8; boss.facingTo = Math.atan2(dx, dz); J.rs = boss.pos.clone(); J.rl = Math.max(0, dd - boss.radius - 0.5);
        if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = Math.atan2(dx, dz); t.m.scale.z = Math.max(0.15, dd / D.laneL);
                 const k = Math.min(1, (J.t - J.t0) / Math.max(0.05, fromT - J.t0)); t.mat.uniforms.uLock.value = k > 0.6 ? 1 : 0; t.mat.uniforms.uProg.value = k; }
      } else {                                            // the rush: arrives as the person lands
        if (!J.rushing) { J.rushing = true; boss.play('dkRush', 1.2, 6); Sfx.play('sweep'); }
        const k = Math.min(1, (J.t - fromT) / D.rushT), e = 1 - (1 - k) * (1 - k);
        boss.turnRate = 0; boss.pos.x = J.rs.x + Math.sin(boss.facing) * J.rl * e; boss.pos.z = J.rs.z + Math.cos(boss.facing) * J.rl * e;
        if (gdt > 0) Particles.burst('dust', boss.pos, null, 2, 1.2);
      }
    });
    if (u >= 1) this.linkStrike(J);
  },
  linkStrike(J) {
    const D = FEEL.DK.link, v = J.v, S = this.stats();
    if (v.state === 'juggled') this.unjuggle(v);
    const tgt = v.onField ? v : fighters.find(q => q.onField && q.alive);
    let r = false;
    if (tgt && tgt.alive) r = this.with(J.part, () => {
      AI.clearTele(); const c = tgt.ch.pos;
      Particles.burst('dust', V3(c.x, 0, c.z), null, 22, 1.8); Particles.burst(DK_LOOK[J.part].pk, V3(c.x, 1.0, c.z), null, 20, 2.0); CamRig.shake(4, 0.3); Sfx.play('slam');
      return Game.hurtPlayer(tgt, D.dmg, boss.pos.clone(), true, DK_COL[J.part], false, 'melee', true, J.id);
    });
    if (r === 'cover' || r === 'absorb') { S.linkBreak++; this.linkBreak(J, r, tgt); return; }
    if (r === true) S.linkHit++;
    this.endJoint(J, 'done');
  },
  linkBreak(J, r, tgt) {                                  // 합 끊기: both dokkaebi reel (a long groggy) · the rally gets +2 in all
    const D = FEEL.DK.link;
    this.endJoint(J, 'break');
    const extra = D.rally - (r === 'cover' ? FEEL.COVER_RALLY : 1);
    if (extra > 0) Duo.rallyUp(extra, tgt);
    const p = tgt ? tgt.ch.pos : boss.pos;
    Game.popup('LINK BROKEN', V3(p.x, 3.6, p.z), C.HOTW, 3); Game.edgeFlash = { t: 0.2, col: C.HOTW }; CamRig.shake(5, 0.45); Sfx.play('fullRally');
    this.each(i => { if (this.alive(i)) { AI.toGroggy('REEL'); AI.t = D.stagger; } });
  },
  // ---- 2. 도깨비불 자리 바꾸기: both crouch into ghost fire and trade places (and targets) — the colour split has to be redone
  s_dkSwap(J) {
    J.ph = 'swap'; this.stats().swap++;
    for (const k of [0, 1]) this.with(k, () => { boss.play('dkSwap', 1); boss.turnRate = 0; });
    Game.banner('FIRE SWAP', 1.0); Sfx.play('warn');
  },
  j_dkSwap(J) {
    const D = FEEL.DK.swap;
    if (J.ph === 'swap' && J.t >= D.at) {
      J.ph = 'post'; this.stats().swapN++;
      const a = this.rigs[0], b = this.rigs[1], pa = a.pos.clone(), pb = b.pos.clone(), fa = a.facing, fb = b.facing;
      for (const [p, k] of [[pa, 0], [pb, 1]]) { Particles.burst(DK_LOOK[k].pk, V3(p.x, 0.8, p.z), null, 30, 2.2); Particles.burst('flame', V3(p.x, 0.2, p.z), null, 14, 1.4); }
      a.place(pb.x, pb.z, fb); b.place(pa.x, pa.z, fa);
      for (const [p, k] of [[pb, 0], [pa, 1]]) Particles.burst(DK_LOOK[k].pk, V3(p.x, 0.8, p.z), null, 24, 1.8);
      const ga = this.get(0, 'aggro'), gb = this.get(1, 'aggro');
      this.set(0, 'aggro', gb); this.set(1, 'aggro', ga); this.set(0, 'aggroT', 0); this.set(1, 'aggroT', 0);
      CamRig.shake(3, 0.25); Sfx.play('tag'); Game.popup('SWAP', V3((pa.x + pb.x) / 2, 3.0, (pa.z + pb.z) / 2), C.PURP1, 2);
    }
    if (J.t >= D.t) this.endJoint(J, 'done');
  },
  // ---- 3. 씨름 던지기: one grabs a person (dodge it) and hurls them at the other, whose swing meets them as they land.
  //         The thrown one parrying in front of the catcher = a counter (big damage to the catcher) · the partner can still cover
  s_dkThrow(J) {
    const A = AI, G = FEEL.GRAB, F = FIGHT.GRAB;
    J.tgt = A.target; J.ph = 'grab'; this.stats().throwN++;
    boss.play('dkGrab', 1); Sfx.play('warn'); Game.banner('SSIREUM', 0.9);
    A.tele.push(Decals.add(1, { R: G.reach + boss.radius, half: F.half, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: 3 }));
  },
  holdAt(v) { const h = boss.root.getObjectByName('hdL').getWorldPosition(V3()); v.ch.pos.set(h.x, Math.max(0, h.y - 1.05), h.z); v.ch.root.position.copy(v.ch.pos); v.ch.face(boss.facing + Math.PI); },
  j_dkThrow(J, gdt) {
    const A = AI, D = FEEL.DK.throw, G = FEEL.GRAB, F = FIGHT.GRAB, S = this.stats(), rec = this.rigs[J.part], v = J.v;
    if (J.ph === 'grab') {
      const f = boss.f, t = A.tele[0], tg = J.tgt;
      if (f < F.lockF && tg && tg.alive) { boss.turnRate = 5; boss.facingTo = Math.atan2(tg.ch.pos.x - boss.pos.x, tg.ch.pos.z - boss.pos.z); } else { boss.turnRate = 0; boss.facingTo = boss.facing; }
      if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; A.setTele(t, f, F.lockF, F.hitF); }
      if (f < F.hitF) return;
      A.clearTele();
      const q = this.inSector(boss, G.reach + boss.radius, F.half + 0.15, p => this.catchable(p), tg);
      if (!q) { S.throwMiss++; this.endJoint(J, 'miss'); return; }
      this.juggle(q); J.v = q; J.ph = 'hold'; J.t0 = J.t; S.throwGrab++;
      boss.play('dkHold', 1); A.setAggro(q, 'auto', true);
      const p = q.ch.pos; Particles.burst('dust', p, null, 12, 1.4); CamRig.shake(3, 0.25); Sfx.play('grab'); Game.popup('GRABBED', V3(p.x, 3.1, p.z), C.CRIM2, 2);
      this.holdAt(q);
      return;
    }
    if (!v || !v.onField || (v.state !== 'juggled' && (J.ph === 'hold' || J.ph === 'wind' || J.ph === 'fly'))) { this.endJoint(J, 'lost'); return; }
    if (J.ph === 'hold' || J.ph === 'wind') {
      this.holdAt(v);
      boss.turnRate = 5; boss.facingTo = Math.atan2(rec.pos.x - boss.pos.x, rec.pos.z - boss.pos.z);
      this.with(J.part, () => { boss.turnRate = 5; boss.facingTo = Math.atan2(v.ch.pos.x - boss.pos.x, v.ch.pos.z - boss.pos.z); });
      if (J.ph === 'hold' && J.t - J.t0 >= D.hold) { J.ph = 'wind'; J.t0 = J.t; boss.play('dkThrow', 1); }
      if (J.ph === 'wind' && J.t - J.t0 >= D.release) {   // the throw: to a spot just in front of the catcher, on the thrower's side
        const dx = boss.pos.x - rec.pos.x, dz = boss.pos.z - rec.pos.z, dd = Math.hypot(dx, dz) || 1, gap = rec.radius + D.gap;
        let lx = rec.pos.x + dx / dd * gap, lz = rec.pos.z + dz / dd * gap; const rr = Math.hypot(lx, lz); if (rr > 6.6) { lx *= 6.6 / rr; lz *= 6.6 / rr; }
        J.from = v.ch.pos.clone(); J.to = V3(lx, 0, lz); J.ph = 'fly'; J.t0 = J.t; Sfx.play('sweep');
        this.with(J.part, () => {                         // the catcher winds up so its swing meets the landing + strikeAt
          const a = Math.atan2(lx - boss.pos.x, lz - boss.pos.z);
          boss.turnRate = 10; boss.facingTo = a; boss.play('dkSwat', 11 * ANIM_DT / (D.fly + D.strikeAt)); AI.curWave = DK_COL[J.part]; Rush.tint(AI.curWave);
          AI.tele.push(Decals.add(1, { R: D.swatR, half: D.swatHalf, x: boss.pos.x, z: boss.pos.z, rot: a, wave: Waves.code(DK_COL[J.part]) }));
        });
      }
      return;
    }
    const total = D.fly + D.strikeAt;
    this.with(J.part, () => { const t = AI.tele[0]; if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; const k = Math.min(1, (J.t - J.t0 + (J.ph === 'swat' ? D.fly : 0)) / total); t.mat.uniforms.uLock.value = 1; t.mat.uniforms.uProg.value = k; } });
    if (J.ph === 'fly') {
      const u = Math.min(1, (J.t - J.t0) / D.fly);
      v.ch.pos.set(J.from.x + (J.to.x - J.from.x) * u, J.from.y * (1 - u) + D.h * 4 * u * (1 - u), J.from.z + (J.to.z - J.from.z) * u); v.ch.root.position.copy(v.ch.pos);
      if (u >= 1) {                                      // lands on its feet: control back (parry now = the counter)
        v.ch.pos.set(J.to.x, 0, J.to.z); this.unjuggle(v, 'move'); v.ch.face(Math.atan2(rec.pos.x - v.ch.pos.x, rec.pos.z - v.ch.pos.z));
        J.ph = 'swat'; J.t0 = J.t; Particles.burst('dust', v.ch.pos, null, 12, 1.2); Sfx.play('land');
      }
      return;
    }
    if (J.ph === 'swat' && J.t - J.t0 >= D.strikeAt) this.throwStrike(J);
  },
  throwStrike(J) {
    const v = J.v, D = FEEL.DK.throw, S = this.stats(), rec = this.rigs[J.part];
    this.with(J.part, () => AI.clearTele());
    const near = v.alive && Math.hypot(v.ch.pos.x - rec.pos.x, v.ch.pos.z - rec.pos.z) < rec.radius + D.swatR;
    if (near && Bell.parrying(v)) {                       // the counter: parried in front of the catcher → its own swing goes back into it
      S.counter++;
      if (!v.parried) { v.parried = true; v.parriedAt = v.t; }
      this.with(J.part, () => {
        const n = V3(boss.pos.x - v.ch.pos.x, 0, boss.pos.z - v.ch.pos.z).normalize();
        Duo.hitBoss(v, D.counterDmg, D.counterBrk, v.ch.pos.clone(), V3(n.x, 0.4, n.z).normalize(), { hitstop: 0.16, kick: 4, fx: 3 }, { global: true, fin: true });
        Game.popup('COUNTER!', V3(boss.pos.x, 3.6, boss.pos.z), C.HOTW, 3); Sfx.play('perfect'); CamRig.shake(5, 0.4);
        Particles.burst('spark', V3(v.ch.pos.x, 1.2, v.ch.pos.z), n, 30, 2.0);
      });
      Duo.rallyUp(1, v);
      this.endJoint(J, 'counter');
      this.with(J.part, () => { if (AI.state === 'recover' || AI.state === 'idle') { AI.state = 'recover'; AI.cur = 'recover'; AI.recoverRest = 0.9; boss.play('dkReel'); } });
      return;
    }
    if (near) { const r = this.with(J.part, () => Game.hurtPlayer(v, D.dmg, rec.pos.clone(), true, DK_COL[J.part], false, 'melee', true, J.id)); if (r === true) S.throwHit++; }
    this.endJoint(J, 'done');
  },
  releaseThrow() {                                        // a hit on the thrower (or the chain's snatch) frees the held one
    const J = this.J; if (!J || J.name !== 'dkThrow') return;
    const v = J.v;
    if (v && v.state === 'juggled') this.with(J.lead, () => {
      const r = boss.radius + v.ch.radius + 0.35; v.ch.pos.set(boss.pos.x + Math.sin(boss.facing) * r, 0, boss.pos.z + Math.cos(boss.facing) * r);
      this.unjuggle(v); v.invuln = Math.max(v.invuln, 1.0); Game.popup('FREED', V3(v.ch.pos.x, 2.8, v.ch.pos.z), C.BONE2); Sfx.play('cover');
    });
    this.stats().throwFree++;
    this.endJoint(J, 'freed');
  },
  // ---- 4. 금 나와라 뚝딱: the club hits the floor and coins rain down, blue and red mixed. A coin of your colour is picked up
  //         (into your wave slots), the other colour bursts (floor damage). The coin under each person is the other colour (★)
  spawnCoins() {
    const D = FEEL.DK.coin, n = D.n[AI.phase - 1], S = this.stats(), pts = [];
    for (const q of fighters) if (q.alive) { const c = Slots.color(q); pts.push([q.ch.pos.x, q.ch.pos.z, c === 'blue' ? 'red' : c === 'red' ? 'blue' : (SR() < 0.5 ? 'blue' : 'red')]); }
    while (pts.length < n) { const a = SR() * TAU, r = srnd(1.2, 6.2); pts.push([Math.sin(a) * r, Math.cos(a) * r, pts.length % 2 ? 'red' : 'blue']); }
    pts.slice(0, n).forEach(([x, z, col], k) => {
      Hazards.add({ shape: 'circle', x, z, r: D.r, tele: D.tele + k * D.gap, dmg: D.dmg, coin: col, wave: col, id: AI.atkSeq * 64 + k });
    });
    S.coinN += Math.min(n, pts.length);
  },
  coinFire(h) {                                           // Hazards.fire: a coin lands
    if (!h.coin) return false;
    const c = V3(h.x, 0, h.z), S = this.stats();
    Particles.burst(h.coin === 'blue' ? 'sparkB' : 'spark', V3(c.x, 0.3, c.z), null, 12, 1.3); Particles.burst('flame', V3(c.x, 0.1, c.z), null, 5, 0.8);
    CamRig.shake(1, 0.1); Sfx.play('floor');
    for (const f of fighters) if (f.alive && Hazards.hits(h, f)) {
      if (Bell.mine(f, h.coin)) { Slots.absorb(f, h.coin, h.id); Game.popup('COIN', V3(f.ch.pos.x, 2.4, f.ch.pos.z), h.coin === 'blue' ? C.CYAN : C.HOT); S.coinGot++; }
      else if (Game.hurtPlayer(f, h.dmg, c, false, null, false, 'floor') === true) { Hazards.stats.hits++; S.coinHit++; }
    }
    return true;
  },
  // ---- 5. 합동 필살 (3페이즈): both leap and smash at once — each at the person of its colour (the twin: whichever is left).
  //         Both blocked by their own-colour parry (presses within ult.sync s) = 합 대 합 (cut-in, both groggy) · otherwise big damage.
  //         Tag solo (★): the two blows come ult.tagGap apart on the one on the field — parry the first, tag in for the second
  ultTargets() {
    const on = fighters.filter(q => q.alive);
    if (Game.tagMode || on.length < 2) { const q = on[0] || fighters[0]; return [q, q]; }
    const [a, b] = on, ca = Slots.color(a), cb = Slots.color(b);
    if (ca === 'blue' || cb === 'red') return [a, b];
    if (ca === 'red' || cb === 'blue') return [b, a];
    return [a, b];
  },
  s_dkUlt(J) {
    const D = FEEL.DK.ult, tg = this.ultTargets(), S = this.stats();
    J.tg = tg; J.tag = tg[0] === tg[1]; J.ph = 'go'; J.done = [false, false]; J.res = [null, null]; J.anim = [false, false]; S.ult++;
    const c0 = Slots.color(tg[0]); J.first = J.tag ? (c0 === 'red' ? 1 : 0) : 0;
    J.T = [D.lead, D.lead]; if (J.tag) J.T[1 - J.first] = D.lead + D.tagGap;
    J.c = tg.map(q => V3(q.ch.pos.x, 0, q.ch.pos.z)); J.from = this.rigs.map(r => r.pos.clone());
    for (const k of [0, 1]) this.with(k, () => {
      boss.play('dkUlt', 1); boss.turnRate = 0;
      AI.tele.push(Decals.add(0, { R: D.r, x: J.c[k].x, z: J.c[k].z, wave: Waves.code(DK_COL[k]) }));
    });
    Game.banner('TWIN STRIKE', 1.2); Sfx.play('p2charge'); Game.edgeFlash = { t: 0.16, col: C.PURP1 };
  },
  j_dkUlt(J, gdt) {
    const D = FEEL.DK.ult;
    for (const k of [0, 1]) {
      if (J.done[k]) continue;
      this.with(k, () => {
        const T = J.T[k], q = J.tg[k], t = AI.tele[0];
        if (J.t < T - D.lock && q.alive) { J.c[k].set(q.ch.pos.x, 0, q.ch.pos.z); const r = Math.hypot(J.c[k].x, J.c[k].z); if (r > 6.6) J.c[k].multiplyScalar(6.6 / r); }
        const c = J.c[k];
        if (t) { t.m.position.set(c.x, 0.022, c.z); t.mat.uniforms.uLock.value = J.t >= T - D.lock ? 1 : 0; t.mat.uniforms.uProg.value = Math.max(0, Math.min(1, (J.t - (T - D.lock)) / D.lock)); }
        // the leap: up from where it stood, down at the edge of its circle (facing it) as the blow lands
        const s = Math.min(1, Math.max(0, (J.t - D.jump) / (T - D.jump))), dx = c.x - J.from[k].x, dz = c.z - J.from[k].z, dd = Math.hypot(dx, dz) || 1e-6;
        const stop = Math.max(0, dd - D.r * 0.55 - boss.radius), lx = J.from[k].x + dx / dd * stop, lz = J.from[k].z + dz / dd * stop;
        boss.facingTo = Math.atan2(dx, dz); boss.turnRate = 10; boss.rootOn = false;
        boss.pos.x = J.from[k].x + (lx - J.from[k].x) * s; boss.pos.z = J.from[k].z + (lz - J.from[k].z) * s; boss.pos.y = D.h * 4 * s * (1 - s);
        if (gdt > 0 && Math.random() < 0.6) Particles.burst('sparkP', V3(boss.pos.x, boss.pos.y + 1.6, boss.pos.z), null, 2, 1.0);
        if (!J.anim[k] && J.t >= T - 2 * ANIM_DT) { J.anim[k] = true; boss.play('dkClub3', 1, 10); }
        if (J.t >= T) { J.done[k] = true; boss.pos.y = 0; J.res[k] = this.ultStrike(J, k); }
      });
    }
    if (!J.done[0] || !J.done[1]) return;
    const [a, b] = J.res;
    const ok = a.blocked && b.blocked && (J.tag || (a.who !== b.who && Math.abs(a.at - b.at) <= D.sync));
    if (ok) this.hapDaeHap(J); else this.endJoint(J, 'done');
  },
  ultStrike(J, k) {
    const c = J.c[k], col = DK_COL[k], D = FEEL.DK.ult, S = this.stats();
    AI.clearTele();
    Decals.add(3, { R: D.r + 0.2, x: c.x, z: c.z, rot: Math.random() * TAU, life: 6, fadeIn: 0.01, fadeOut: 1.5 });
    Particles.burst('dust', c, null, 30, 2.2); Particles.burst('sparkP', V3(c.x, 0.6, c.z), null, 24, 2.2); Particles.burst(DK_LOOK[k].pk, V3(c.x, 0.4, c.z), null, 16, 1.8);
    CamRig.shake(4, 0.35); Sfx.play('slam');
    const inside = fighters.filter(q => q.alive && Math.hypot(q.ch.pos.x - c.x, q.ch.pos.z - c.z) < D.r + q.ch.radius);
    const blk = inside.find(q => Bell.parrying(q) && Bell.mine(q, col));
    if (blk) {
      if (!blk.parried) { blk.parried = true; blk.parriedAt = blk.t; }
      S.ultBlock++; Slots.absorb(blk, col, J.id + k);
      const p = blk.ch.pos; Particles.burst(col === 'blue' ? 'sparkB' : 'spark', V3(p.x, 1.2, p.z), null, 24, 1.8);
      Game.popup('BLOCK', V3(p.x, 2.9, p.z), col === 'blue' ? C.CYAN : C.HOT, 2); Sfx.play('parry'); Game.stop(FEEL.PARRY_HITSTOP, [blk]);
      return { blocked: true, who: blk, at: Game.t - blk.t };
    }
    for (const q of inside) Game.hurtPlayer(q, D.dmg, V3(c.x, 0, c.z), true, null, true, 'blast', false, J.id + k);
    return { blocked: false, who: null, at: 0 };
  },
  hapDaeHap(J) {                                          // 합 대 합: the cut-in · both dokkaebi groggy · rally
    const D = FEEL.DK.ult, S = this.stats(), [a, b] = J.res;
    S.ultSync++;
    this.endJoint(J, 'hap');
    Stage.cut = { hap: true, L: { violet: true, name: 'HAP', byCol: 'blue', kind: 'lift' }, by: a.who, f: b.who === a.who ? (fighters.find(q => q !== a.who && q.active) || b.who) : b.who, t: 0 };
    Stage.slowT = FEEL.STAGE.cutT; Stage.lastCut = Game.t; Sfx.play('cutin'); Sfx.play('violet');
    Game.edgeFlash = { t: 0.3, col: C.PURP1 }; CamRig.shake(6, 0.5);
    Duo.rallyUp(D.rally, a.who);
    this.each(i => { if (this.alive(i)) { AI.toGroggy('HAP DAE HAP'); AI.t = D.groggy; } });
  },
  // ---- clip events of the dokkaebi (the rig's own update: that dokkaebi is swapped in)
  tipOf(ch) { const p = ch.root.getObjectByName('dkTip').getWorldPosition(V3()); p.y = 0; return p; },
  onEvent(ch, e) {
    const fight = Game.mode === 'fight' && this.on;
    if (e.type === 'dkImpact') {                          // CLUB 3 lands (the slam pattern's hit; the joint smashes only look)
      const c = this.tipOf(ch);
      Decals.add(3, { R: FIGHT.SLAM.r, x: c.x, z: c.z, rot: Math.random() * TAU, life: 6, fadeIn: 0.01, fadeOut: 1.5 });
      Particles.burst('dust', c, null, 26, 2.0); Particles.burst('debris', c, null, 12); CamRig.shake(3, 0.3); Sfx.play('slam');
      if (!fight || AI.state !== 'attack' || AI.cur !== 'slam') return;
      AI.clearTele();
      for (const f of fighters) if (f.alive && Math.hypot(f.ch.pos.x - c.x, f.ch.pos.z - c.z) < FIGHT.SLAM.r + f.ch.radius)
        Game.hurtPlayer(f, FIGHT.SLAM.dmg, c, true, AI.waveOf('slam'), false, 'melee');
    } else if (e.type === 'dkCoin') {
      const c = this.tipOf(ch);
      Particles.burst('dust', c, null, 30, 2.4); Particles.burst('flame', V3(c.x, 0.3, c.z), null, 20, 2.0); Particles.burst('spark', V3(c.x, 0.6, c.z), V3(0, 1, 0), 20, 2.4);
      CamRig.shake(4, 0.35); Sfx.play('slam'); Sfx.play('boom', 0.6);
      if (fight && AI.state === 'attack' && AI.cur === 'dkCoin') this.spawnCoins();
    }
  },
});
// ---- timing for parry cues / tag / bots · camera · HUD ---------------------------------------------------------------------
Object.assign(Dk, {
  // seconds until a joint blow lands on f (link: f = the one in the air · throw: the thrown one · ult: its target) — null: none
  jointEta(f) {
    const J = this.J; if (!this.on || !J) return null;
    if (J.name === 'dkLink' && J.ph === 'air' && J.v === f) return J.t0 + J.air - J.t;
    if (J.name === 'dkThrow' && J.v === f && (J.ph === 'fly' || J.ph === 'swat')) { const D = FEEL.DK.throw; return J.t0 + (J.ph === 'fly' ? D.fly + D.strikeAt : D.strikeAt) - J.t; }
    if (J.name === 'dkUlt' && J.tg) { let e = null; for (const k of [0, 1]) if (J.tg[k] === f && !J.done[k]) { const x = J.T[k] - J.t; if (e === null || x < e) e = x; } return e; }
    return null;
  },
  coverEta(f) {                                           // the partner of the one in the air: when its cover is due
    const J = this.J; if (!this.on || !J || Game.tagMode || J.name !== 'dkLink' || J.ph !== 'air' || !J.v || J.v === f) return null;
    return Math.hypot(J.v.ch.pos.x - f.ch.pos.x, J.v.ch.pos.z - f.ch.pos.z) <= Unique.coverR(f) + 1.2 ? J.t0 + J.air - J.t : null;
  },
  // the soonest parryable hit on f from either dokkaebi (+ its colour) — the parry ring · tag parry
  minEta(f) {
    if (!this.on) return AI.etaFor(f);
    let e = null;
    for (let i = 0; i < 2; i++) { const x = this.with(i, () => AI.etaFor(f)); if (x !== null && (e === null || x < e)) e = x; }
    const j = this.jointEta(f); if (j !== null && (e === null || j < e)) e = j;
    return e;
  },
  etaCol(f) {
    const cc = w => (w === 'blue' ? C.CYAN : C.CRIM2);
    if (!this.on) return { eta: AI.etaFor(f), col: cc(AI.etaWave()) };
    let eta = null, col = C.CRIM2;
    for (let i = 0; i < 2; i++) this.with(i, () => { const x = AI.etaFor(f); if (x !== null && (eta === null || x < eta)) { eta = x; col = cc(AI.etaWave()); } });
    const J = this.J;
    if (J && !(J.name === 'dkLink' && J.v === f)) {       // (the one in the air can't parry: the ring goes to the partner's cover)
      const j = this.jointEta(f), c = this.coverEta(f), x = j !== null ? j : c;
      if (x !== null && (eta === null || x < eta)) { eta = x; col = cc(J.name === 'dkUlt' ? DK_COL[J.tg[0] === f && !J.done[0] ? 0 : 1] : DK_COL[J.part]); }
    }
    return { eta, col };
  },
  // ---- the coop / tag bot during a joint attack (deliberate misses: FEEL.DK.bot, rolled once per blow)
  botStep(f, bot, inp, toV, canTag) {
    const J = this.J; if (!this.on || !J) return false;
    const mode = bot.mode, me = f.ch.pos, K = FEEL.DK.bot;
    if (mode !== 'coop' && mode !== 'tag') return false;
    const roll = (key, p) => { const id = `${J.id}:${key}`; if (bot.dkId !== id) { bot.dkId = id; bot.dkV = Math.random() < p; } return bot.dkV; };
    const ready = f.state === 'move' || (f.state === 'parry' && f.parried) || ['attack', 'dodge', 'hit'].includes(f.state);
    if (J.name === 'dkLink' && J.ph === 'air' && J.v) {
      const e = J.t0 + J.air - J.t, v = J.v;
      if (v === f) { if (Game.tagMode && canTag && e < 0.2 && e > 0.03 && roll('tag', K.link)) inp.pressed.add('tag'); return true; }
      if (Game.tagMode || !v.onField) return false;
      const d = Math.hypot(v.ch.pos.x - me.x, v.ch.pos.z - me.z);
      if (d > Unique.coverR(f) - 0.5 && f.state === 'move') {
        inp.d = toV(V3(v.ch.pos.x, 0, v.ch.pos.z));
        if (d > 3 && f.sinceRoll >= FEEL.DODGE_MIN_GAP && e < d / FEEL.MOVE_SPEED + 0.15) inp.pressed.add('dodge');
      }
      if (e < 0.12 && e > -0.05 && ready && roll('cover', K.link)) inp.pressed.add('parry');
      return true;
    }
    if (J.name === 'dkThrow' && J.v && (J.ph === 'fly' || J.ph === 'swat')) {
      const e = this.jointEta(J.v);
      if (J.v === f) { if (J.ph === 'swat' && e < 0.12 && ready && roll('counter', K.throw)) inp.pressed.add('parry'); return f.state === 'move' || f.state === 'parry'; }
      if (Game.tagMode) return false;
      const d = Math.hypot(J.to.x - me.x, J.to.z - me.z);
      if (d > Unique.coverR(f) - 0.5 && f.state === 'move') inp.d = toV(J.to);
      if (e < 0.12 && e > -0.05 && ready && d <= Unique.coverR(f) && roll('cover', K.link * K.throwCover)) inp.pressed.add('parry');
      return true;
    }
    if (J.name === 'dkThrow' && J.ph === 'hold' && J.v && J.v !== f && !Game.tagMode) {   // free the held one: hit the thrower
      const r = this.rigs[J.lead], d = Math.hypot(r.pos.x - me.x, r.pos.z - me.z) - r.radius;
      if (d > 1.6) inp.d = toV(r.pos); else if (bot.tick % 6 === 0) inp.pressed.add('attack');
      return true;
    }
    if (J.name === 'dkUlt' && J.tg) {
      const D = FEEL.DK.ult;
      for (const k of [0, 1]) {
        if (J.tg[k] !== f || J.done[k]) continue;
        const e = J.T[k] - J.t, c = J.c[k], d = Math.hypot(c.x - me.x, c.z - me.z), col = DK_COL[k];
        if (J.tag && !Bell.mine(f, col)) {                // tag solo: the blow for the benched colour → tag in just before it
          if (canTag && e < 0.2 && e > 0.03 && roll('tag' + k, K.ult)) { inp.pressed.add('tag'); return true; }
          if (e < 0.6) return true;
          continue;
        }
        if (e < 0.1 && e > -0.05 && ready && roll('ult' + k, K.ult)) { inp.pressed.add('parry'); return true; }
        if (e > D.lock && d > 0.4 && f.state === 'move') inp.d = toV(c);
        return true;
      }
    }
    return false;
  },
  // ---- camera: the screen-space span of every dokkaebi on the field (the framing keeps both in when it can)
  extent(R, U, crown) {
    if (!this.on) { const br = boss.pos.dot(R), bu = boss.pos.dot(U); return { r0: br - 1.9, r1: br + 1.9, u0: bu - 1.3, u1: bu + crown * U.y }; }
    const E = { r0: 1e9, r1: -1e9, u0: 1e9, u1: -1e9 };
    for (let i = 0; i < 2; i++) {
      const r = this.rigs[i]; if (!r.root.visible) continue;
      const br = r.pos.dot(R), bu = r.pos.dot(U), cr = (this.alive(i) ? 5.4 : 2.2) * Rush.scale();
      E.r0 = Math.min(E.r0, br - 1.5); E.r1 = Math.max(E.r1, br + 1.5); E.u0 = Math.min(E.u0, bu - 1.0); E.u1 = Math.max(E.u1, bu + cr * U.y);
    }
    return E.r0 > E.r1 ? { r0: 0, r1: 0, u0: 0, u1: 0 } : E;
  },
  watching(f) { return this.on ? [0, 1].some(i => this.alive(i) && this.get(i, 'aggro') === f) : AI.aggro === f && AI.targetable(); },
  hash() {
    if (!this.on) return [];
    const out = [];
    for (let i = 0; i < 2; i++) { const r = this.rigs[i]; out.push(this.get(i, 'hp'), this.get(i, 'state'), this.get(i, 'brk'), r.pos.x, r.pos.z, r.facing); }
    out.push(this.J ? this.J.name + ':' + this.J.ph : '-', this.down ? this.down.i : '-');
    return out;
  },
  // ---- HUD: two health bars side by side · aggro lines in each one's colour · the joint prompts
  drawBars(dt) {
    const W = CFG.BASE_W, bw = 116, gap = 12, by = 254, x0 = W / 2 - bw - gap / 2, blink = Math.floor(clock.t * 6) % 2 === 0;
    const name = Rush.boss.name, ph = Math.max(this.get(0, 'phase'), this.get(1, 'phase'));
    txt(name, x0 + 1, by - 18, PAL_HEX[C.VOID]); txt(name, x0, by - 19, PAL_HEX[C.BONE1]);
    const bn = `BOSS ${Rush.idx + 1}/${Rush.count}`; txt(bn, x0 + 2 * bw + gap - tw(bn), by - 19, PAL_HEX[C.STONE3]);
    const pn = ['I', 'II', 'III'][ph - 1]; txtC(pn, W / 2 + 34, by - 19, PAL_HEX[ph >= 3 ? C.EMBER : C.STONE3]);
    for (let i = 0; i < 2; i++) {
      const x = x0 + i * (bw + gap), hp = this.get(i, 'hp'), mx = Math.max(1, this.get(i, 'maxHp')), st = this.get(i, 'state'), brk = this.get(i, 'brk');
      const cm = i ? C.CRIM2 : C.CYAN;
      txt(i ? 'RED' : 'BLUE', x, by - 10, PAL_HEX[cm]);
      if (st === 'dead') { const s = this.rv ? 'REVIVING' : 'DOWN'; txt(s, x + bw - tw(s), by - 10, PAL_HEX[blink ? C.HOT : C.STONE2]); }
      else if (st === 'groggy') { const s = 'GROGGY'; txt(s, x + bw - tw(s), by - 10, PAL_HEX[C.HOTW]); }
      bar(x, by, bw, 3, hp / mx, this.get(i, 'chip') / mx, i ? (ph >= 3 ? C.EMBER : C.CRIM1) : (ph >= 3 ? C.CYAN : C.SLATE2), C.HOT, C.BONE0);
      if (brk > 0 || st === 'groggy') {
        const k = st === 'groggy' ? 1 : brk / FIGHT.BREAK_MAX;
        hctx.fillStyle = PAL_HEX[C.DEEP]; hctx.fillRect(x, by + 5, bw, 1);
        hctx.fillStyle = PAL_HEX[st === 'groggy' ? C.HOTW : C.EMBER]; hctx.fillRect(x, by + 5, Math.round(bw * k), 1);
      }
      if (st === 'dead' && this.down && this.down.i === i) {   // the revive clock: the wait, then the kneel
        const D = FEEL.DK.revive, rv = this.rv, k = rv && rv.ph === 'chan' ? rv.t / D.t : Math.min(1, this.down.t / D.wait);
        hctx.fillStyle = PAL_HEX[C.DEEP]; hctx.fillRect(x, by + 7, bw, 1);
        hctx.fillStyle = PAL_HEX[rv && rv.ph === 'chan' ? C.HOT : C.STONE2]; hctx.fillRect(x, by + 7, Math.round(bw * k), 1);
      }
    }
    const pnT = Math.max(this.get(0, 'phaseNoteT') || 0, this.get(1, 'phaseNoteT') || 0);
    if (pnT > 0) { txtC(ph >= 3 ? 'PHASE III' : 'PHASE II', W / 2, by - 30, PAL_HEX[ph >= 3 ? C.EMBER : C.CRIM2]); for (let i = 0; i < 2; i++) this.set(i, 'phaseNoteT', Math.max(0, (this.get(i, 'phaseNoteT') || 0) - dt)); }
  },
  drawAggro(onF) {
    if (onF.length < 2) return;
    for (let i = 0; i < 2; i++) {
      const tgt = this.get(i, 'aggro'), r = this.rigs[i];
      if (!this.alive(i) || !r.root.visible || !tgt || !tgt.alive) continue;
      const [ax, ay] = toHud(r.pos.x, r.pos.y + 3.2, r.pos.z), [bx, by] = toHud(tgt.ch.pos.x, tgt.ch.pos.y + 2.25, tgt.ch.pos.z);
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4)), ph = Math.floor(clock.t * 10) % 2;
      for (let k = ph; k <= n; k += 2) { hctx.fillStyle = PAL_HEX[i ? C.CRIM0 : C.SLATE2]; hctx.fillRect(Math.round(ax + (bx - ax) * k / n), Math.round(ay + (by - ay) * k / n), 1, 1); }
    }
  },
  drawHud() {
    if (!this.on) return;
    const J = this.J, blink = Math.floor(clock.t * 8) % 2 === 0;
    if (J && J.name === 'dkLink' && J.ph === 'air' && J.v && J.v.onField) {
      const p = J.v.ch.pos, [x, y] = toHud(p.x, p.y + 2.4, p.z);
      txtC(Game.tagMode ? `${keyNames(J.v).tag} TAG` : 'COVER!', x, Math.round(y) - 8, PAL_HEX[blink ? C.HOTW : C.HOT], 2);
    }
    if (J && J.name === 'dkThrow' && J.v && J.v.onField && (J.ph === 'fly' || J.ph === 'swat')) {
      const p = J.v.ch.pos, [x, y] = toHud(p.x, p.y + 2.4, p.z);
      txtC('PARRY = COUNTER', x, Math.round(y) - 8, PAL_HEX[blink ? C.HOTW : C.HOT]);
    }
    if (J && J.name === 'dkThrow' && J.ph === 'hold' && J.v && J.v.onField) {
      const p = J.v.ch.pos, [x, y] = toHud(p.x, p.y + 2.4, p.z);
      txtC(Game.tagMode ? 'GRABBED' : 'HIT IT!', x, Math.round(y) - 8, PAL_HEX[blink ? C.HOTW : C.CRIM2]);
    }
    if (J && J.name === 'dkUlt' && J.tg && !J.done[0]) {
      txtC(J.tag ? 'PARRY  THEN TAG' : 'PARRY YOUR COLOUR  TOGETHER', CFG.BASE_W / 2, 64, PAL_HEX[blink ? C.HOTW : C.PURP1]);
    }
    if (this.down && this.rv && this.rv.ph === 'chan') {
      const b = this.rigs[this.down.i].pos, [x, y] = toHud(b.x, 1.4, b.z);
      txtC('STOP THE REVIVE', x, Math.round(y) - 12, PAL_HEX[blink ? C.HOTW : C.HOT]);
    }
  },
});
