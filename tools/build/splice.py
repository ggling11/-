# Builds the duo prototype index.html from parts/base.html (index_v1.html + first tuning/RNG/input edits) + parts/*.js
# (string anchors only, never line numbers; every anchor must match exactly once)
import re, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # the game folder (index.html)
S = open(os.path.join(HERE, 'parts', 'base.html'), encoding='utf8').read()   # = index_v1.html + the first FEEL/FIGHT/RNG/input edits
part = lambda n: open(os.path.join(HERE, 'parts', n), encoding='utf8').read()

def rep(a, b, cnt=1):
    global S
    n = S.count(a)
    if n != cnt: sys.exit(f'anchor x{n} (want {cnt}): {a[:90]!r}')
    S = S.replace(a, b)

def region(start, end, new, keep_end=True):
    """replace S[start .. end) (end kept) — both anchors unique"""
    global S
    i = S.find(start); j = S.find(end, i + 1)
    if i < 0 or j < 0 or S.count(start) != 1: sys.exit(f'region anchors not found/unique: {start[:60]!r} .. {end[:60]!r}')
    S = S[:i] + new + (S[j:] if keep_end else S[j + len(end):])

# ---------------------------------------------------------------- head / title
rep('<title>Crimson Arena · Boss Rush</title>', '<title>Crimson Arena · Duo</title>')

# ---------------------------------------------------------------- FEEL
region("  // ── 패링 = 파장 흡수 (1P K · 2P 숫자패드 2 · 패드 B) ─────", "  // ── 2페이즈 진입 ", """  // ── 패리 (1P K · 2P 숫자패드 2 · 패드 B) ────────────────
  //  붉게 표시된 보스 공격(근접 내려찍기·휩쓸기·돌진·도약·번갈아 치기, 붉은 수정탄)은 패리 판정 중에 닿으면 막음: 피해 0
  //  바닥 패턴(장판)·원형탄·붙잡기는 패리 불가(중립 경고색) → 피해야 함. 대시는 순수 회피(무적)만
  PARRY_WINDOW: 0.25,       // 누른 순간부터 이 시간(초) 동안 패리 판정 (연타로 덮지 못하게)
  PARRY_REACH: 1.0,         // 패리 중에는 붉은 탄이 이 거리(유닛)만 더 가까워도 막음 (탄을 맞으러 갈 필요 없음)
  PARRY_RECOVER: 0.3,       // 헛패리면 판정 뒤 이 시간(초) 동안 무방비 (성공하면 0.1초 뒤 바로 행동 가능)
  PARRY_LATE: 2 / 12,       // 늦은 패리: 공격이 몸에 닿은 뒤 이 시간(초) 안에 눌러도 막음 = 애니메이션 2프레임(12fps).
                            //   닿는 순간 맞은 사람과 보스만 이 시간만큼 멈추고(임팩트 정지), 그 사이 K를 누르면 패리 · 헛패리 회복 중에는 인정 안 함
  PARRY_RING_LEAD: 0.9,     // 패리 가능한 공격이 닿기 이 시간(초) 전부터 내 발밑 타이밍 링이 줄어듦 (흰색 = 지금 K)
""")
rep("""  P2_CHARGE: 1.8,           // 기 모으는 시간(초)""", """  // ── 페이즈 전환 (2페이즈 · 3페이즈 공통) ────────────────
  P2_CHARGE: 1.8,           // 기 모으는 시간(초)""")
rep("  // ── 2페이즈 진입 ────────────────────────────────────────\n", "")
region("  ABSORB_SLOW: 0.2,", "  // ── 듀오 1단계:", """  ABSORB_TIMESCALE: 0.3,    // PERFECT 슬로 동안 게임 속도 배율
  WAVE_SHARD_SCALE: 1.6,    // 붉은(패리 가능) 탄 크기 배율 (보스 기본 수정보다 크고 밝게, 판정 반경도 함께 키움)
  WAVE_TRAIL_HZ: 40,        // 붉은 탄이 바닥에 남기는 궤적 점 (초당 개수)
  WAVE_AURA: 2,             // 패리 가능한 근접 공격 준비 중 보스 손/검에 모이는 붉은 입자 (프레임당 개수)

""")
rep("  LAUNCH: { dmg: 40, brk: 10, cd: 6, reach: 2.9, half: 1.1, hitstop: 0.1 },   // U: 해머 올려치기. 적중하면 보스가 '들림'",
    "  LAUNCH: { dmg: 40, brk: 10, cd: 6, reach: 2.9, half: 1.1, hitstop: 0.1, lock: 0.62 },   // U: 해머 올려치기(판정 0.5초). 적중하면 보스가 '들림' · lock: 이 시간 뒤 캔슬 가능")
rep("  LIFT_H: 0.5,              // 들림 중 보스가 떠오르는 높이(유닛, 보스 크기 비례)",
    "  LIFT_H: 0.9,              // 들림 중 보스가 떠오르는 높이 (보스 크기 1 기준 유닛 → 보스 크기 배율을 곱함)\n  LIFT_IMMUNE: 6.0,         // 들림이 끝난 뒤 이 시간(초) 동안 다시 띄울 수 없음 (보스가 계속 떠 있지 않게)")
rep("  LINK: { dmg: 180, brk: 35, speed: 20, maxD: 10, hitstop: 0.2 },            // 연계기: 보스에게 날아가 들이받음 (이동 중 무적)",
    "  LINK: { dmg: 180, brk: 35, speed: 20, maxD: 10, hitstop: 0.2, wind: 0.12, maxT: 0.7, lock: 0.4, rest: 0.9 },   // 연계기: 보스에게 날아가 들이받음 (이동 중 무적)\n"
    "                            //   wind: 도약 전 웅크림(초) · maxT: 최대 비행 시간 · lock: 되튕김 뒤 캔슬까지 · rest: 연계기 뒤 보스가 쉬는 시간")
rep("  RALLY_BUFF_T: 6,          // 버프 지속(초)",
    "  RALLY_BUFF_T: 6,          // 버프 지속(초)\n  RALLY_FULL_STOP: 0.22,    // 완벽 랠리(5) 순간 전체 정지(초)\n"
    "  RALLY_HIT_RESET: true,    // 패리 가능한 공격에 누가 맞으면 랠리가 0으로 (배드민턴에서 셔틀이 떨어진 것) · false = 시간 감소만")
rep("  GRAB: { reach: 3.0, hold: 2.5, dmg: 35, relDmg: 30 },   // 붙잡기: 어그로 대상을 잡아 hold초 뒤 내리침. 파트너가 보스를 때리면 풀림",
    "  GRAB: { reach: 2.3, hold: 2.5, dmg: 35 },   // 붙잡기: 어그로 대상을 잡아 hold초 뒤 내리침 (보스 표면에서 reach 유닛까지). 파트너가 보스를 때리거나 커버하면 풀림")
region("  // ── 파장 방출 = 흡수한 파장을 다시 내보냄", "  HAZ_DMG: 1.0,", "  // ── 바닥 패턴 ───────────────────────────────────────────\n")
region("  JUDGE_SHARE_R: 1.8,", "};\nCFG.PITCH", "")
region("  // ── 포션 (1P O · 2P 숫자패드 6 · 패드 Y) ──", "  REVIVE_HP: 0.4,", "")
rep("  REVIVE_R: 1.4,            // 쓰러진 동료 옆 이 거리 안에서 상호작용 키(1P F · 2P 숫자패드 3 · 패드 Y)를 꾹 누르면 부활 게이지가 참",
    "  REVIVE_R: 1.4,            // 쓰러진 동료 옆 이 거리 안에서 상호작용 키(1P F · 2P 숫자패드 3 · 패드 Y)를 꾹 누르면 부활 게이지가 참 (2인만)")
rep("  // ── 대시 (구르기 대체, K / Space) ───────────────────────", "  // ── 대시 (구르기 대체, Space) ───────────────────────────")

# ---------------------------------------------------------------- boss data
rep("waves: { slam: 'red', sweep: 'red', charge: 'red', leap: 'red', shot: 'red', nova: 'red', spiral: 'red', combo: 'red' }, floorWave: 'red',",
    "waves: { slam: 'red', sweep: 'red', charge: 'red', leap: 'red', shot: 'red', combo: 'red', nova: null, spiral: null, grab: null }, floorWave: null,")
region("// 애드온: 보스를 잡을 때마다 각자 3개 중 1개 선택 (tag = HP바 옆 약자)", "function hexToVec3(h)",
       "const ADDONS = [];   // 듀오 1단계: 애드온 없음 (2단계에서 보스 처치 보상 '유물'로 대체 · Rush.relics 자리)\n\n")

# ---------------------------------------------------------------- FIGHT
rep("  NOVA: { dmg: 12, n: [18, 22], speed: [5.2, 6.0],", "  NOVA: { dmg: 12, n: [18, 22, 24], speed: [5.2, 6.0, 6.4],")
rep("  SPIRAL: { dmg: 10, arms: [3, 4], speed: [4.0, 4.8], step: [0.35, -0.3],", "  SPIRAL: { dmg: 10, arms: [3, 4, 4], speed: [4.0, 4.8, 5.2], step: [0.35, -0.3, 0.32],")
rep("  COMBO: { hits: [4, 4, 6], gap: [0.8, 0.7, 0.6], lead: 0.8, lock: 0.3, r: 1.35, dmg: 18, sweepAfter: [false, false, true] },   // 번갈아 치기: 매 타 타깃 교대",
    "  COMBO: { hits: [4, 4, 6], gap: [0.8, 0.7, 0.6], lead: 0.8, lock: 0.3, r: 1.35, dmg: 18, sweepAfter: [false, false, true],   // 번갈아 치기: 매 타 타깃 교대\n"
    "           jabF: 6, recover: 0.5, soloGap: 1.1 },   // jabF: 타격 클립의 임팩트 프레임 · recover: 마지막 타 뒤 여운(초) · soloGap: 태그 솔로 타 간격 최소(교대 쿨타임 1초 + 여유)\n"
    "  WEIGHTS: { combo: 3.5, slam: 3, sweep: 3, grab: 2, nova: 1.5, charge: 2.2, leap: 2, shot: 1.2, spiral: 1, walk: 2 },   // 패턴 선택 가중치 (거리 조건을 만족하는 것 중에서)\n"
    "  LEAP_MIN_D: 3.4,                          // 도약은 이 거리 이상일 때만\n"
    "  GRAB: { lockF: 6, hitF: 9, half: 0.55 },   // 붙잡기 클립: 조준 고정 프레임 · 손이 닫히는 프레임 · 판정 부채꼴 반각(라디안)")
rep("  P1_POOL: ['slam', 'sweep', 'charge', 'nova', 'combo', 'grab'],   // (호환용) 1페이즈 패턴\n", "")

# ---------------------------------------------------------------- decals: second safe hole + neutral warning colour
rep("uniform float uWave; uniform float uAlly; uniform float uR0; uniform float uR1; uniform float uInv; uniform vec3 uHole;",
    "uniform float uWave; uniform float uAlly; uniform float uR0; uniform float uR1; uniform float uInv; uniform vec3 uHole; uniform vec3 uHole2;")
rep("      if (uHole.z > 0.0) { float hd = length(vL - uHole.xy) - uHole.z; if (hd < 0.0) inside = false; edge = min(edge, hd); }",
    "      if (uHole.z > 0.0) { float hd = length(vL - uHole.xy) - uHole.z; if (hd < 0.0) inside = false; edge = min(edge, hd); }\n"
    "      if (uHole2.z > 0.0) { float hd = length(vL - uHole2.xy) - uHole2.z; if (hd < 0.0) inside = false; edge = min(edge, hd); }")
rep("    // Danger rims stay crimson; the FILL shows the wave: 적파 dots · 청파 diagonal hatching (cyan) · 자파 violet",
    "    // Parryable (uWave 0): crimson rim + ember dots · unparryable (uWave 3): bone rim + stone dots — read at a glance")
rep("      idx = uAlly > 0.5 ? (uWave > 1.5 ? 31 : uWave > 0.5 ? 29 : 23) : (uLock < 0.5 ? 20 : 21);",
    "      idx = uAlly > 0.5 ? (uWave > 1.5 ? 31 : uWave > 0.5 ? 29 : 23) : uWave > 2.5 ? (uLock < 0.5 ? 8 : 10) : (uLock < 0.5 ? 20 : 21);")
rep("      idx = uWave > 0.5 && uWave < 1.5 ? 29 : 22;", "      idx = uWave > 2.5 ? 7 : uWave > 0.5 && uWave < 1.5 ? 29 : 22;")
rep("      idx = uWave > 1.5 ? (front ? 31 : 30) : blue ? (front ? 29 : 14) : (front ? 22 : 19);",
    "      idx = uWave > 2.5 ? (front ? 8 : 6) : uWave > 1.5 ? (front ? 31 : 30) : blue ? (front ? 29 : 14) : (front ? 22 : 19);")
rep("uInv: { value: o.inv ?? 0 }, uHole: { value: o.hole ? V3(...o.hole) : V3(0, 0, 0) },",
    "uInv: { value: o.inv ?? 0 }, uHole: { value: o.hole ? V3(...o.hole) : V3(0, 0, 0) }, uHole2: { value: o.hole2 ? V3(...o.hole2) : V3(0, 0, 0) },")

# ---------------------------------------------------------------- shots: one hit id per shard (rally counts once per boss hit)
rep("const Shots = {\n  list: [],", "const Shots = {\n  list: [], seq: 0,")
rep("this.list.push({ m, v: dir.clone().multiplyScalar(speed), life: o.life || 1.6, dmg, hitR: o.hitR || FIGHT.SHOT.hitR, wave: w });",
    "this.list.push({ m, v: dir.clone().multiplyScalar(speed), life: o.life || 1.6, dmg, hitR: o.hitR || FIGHT.SHOT.hitR, wave: w, id: ++this.seq });")
rep("  clear() { while (this.list.length) this.kill(0); },\n  update(dt) {\n    if (dt <= 0) return;",
    "  clear() { while (this.list.length) this.kill(0); this.seq = 0; },\n  update(dt) {\n    if (dt <= 0) return;")
rep("if (Math.hypot(p.x - q.x, p.z - q.z) < reach && Game.hurtPlayer(f, s.dmg, V3(p.x - s.v.x, 0, p.z - s.v.z), false, s.wave, false, 'shot')) { dead = true; break; }",
    "if (Math.hypot(p.x - q.x, p.z - q.z) < reach && Game.hurtPlayer(f, s.dmg, V3(p.x - s.v.x, 0, p.z - s.v.z), false, s.wave, false, 'shot', false, 100000 + s.id)) { dead = true; break; }")

# ---------------------------------------------------------------- input
region(" * 11. INPUT — 1P/2P split keyboard", "const keys = new Set();",
       """ * 11. INPUT — 1P/2P split keyboard + gamepads (connection order: 1st pad → 1P, 2nd → 2P)
 *     1P  WASD 이동 · J 공격 · K 패리 · Space 회피(대시) · U 띄우기/연계기 · L 교대(태그 솔로) · F(꾹) 동료 부활
 *     2P  방향키 · 숫자패드 1 공격 · 2 패리 · 0 회피 · 7 띄우기/연계기 · 3(꾹) 부활  (숫자패드 없으면 . / 오른Shift [ \\\\)
 *     패드 X 공격 · B 패리 · A 회피 · RT(또는 LB) 띄우기/연계기 · RB 교대 · Y(꾹) 부활 · START 재시작 · SELECT 쇼케이스
 *     F3 AI 2P 켜기/끄기 · F4 태그 솔로로 돌아가기 · 2P 키를 누르면 2인 참가
 * ========================================================================== */
""")
rep("const GKEYS = { KeyR: 'restart', KeyT: 'restartAll', F1: 'show', Tab: 'switch', F3: 'ai2' };",
    "const GKEYS = { KeyR: 'restart', KeyT: 'restartAll', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo' };")
rep("['Space', 'Tab', 'F1', 'F2', 'F3', 'Quote', 'Slash'].includes(e.code)", "['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'Quote', 'Slash'].includes(e.code)")
rep("const global = act === 'restart' || act === 'show' || act === 'prev' || act === 'next' || act === 'switch';",
    "const global = act === 'restart' || act === 'show' || act === 'prev' || act === 'next' || act === 'switch';\n          if (s === 1 && act === 'tag') continue;   // RB on the 2nd pad: no tag in duo")

# ---------------------------------------------------------------- sound: new cues for the duo verbs
rep("    fizzle(t, r) {", """    lift(t, r) {                                 // the launch connects: rising boom + whoosh upward
      this.tn(t, { f0: r(90), f1: r(260), w: 'triangle', a: 0.01, d: 0.3, g: 0.45 }); this.nz(t, { f0: r(300), f1: r(4200), q: 1.1, a: 0.02, d: 0.28, g: 0.45 });
      this.bank.hit.call(this, t, r, 1.3);
    },
    link(t, r) {                                 // the link lands: crunch + deep boom + ringing
      this.bank.boom.call(this, t, r, 1.1); this.nz(t, { f0: r(5000), f1: r(300), q: 0.7, d: 0.35, g: 0.6 });
      for (const f of [880, 1320, 1760]) this.tn(t + 0.02, { f0: r(f), f1: r(f) * 0.98, w: 'triangle', a: 0.002, d: 0.5, g: 0.06 });
    },
    rally(t, r, k) {                             // a rising step per rally level
      const b = [523, 587, 659, 784, 1047][Math.max(0, Math.min(4, k - 1))];
      this.tn(t, { f0: b, f1: b * 1.01, w: 'square', a: 0.002, d: 0.12, g: 0.07 }); this.tn(t + 0.05, { f0: b * 1.5, f1: b * 1.5, w: 'triangle', a: 0.002, d: 0.22, g: 0.08 });
    },
    fullRally(t) {
      [[523, 0], [659, 0.05], [784, 0.1], [1047, 0.15], [1319, 0.2]].forEach(([f, d]) => this.tn(t + d, { f0: f, w: 'square', a: 0.002, d: 0.25, g: 0.07 }));
      this.tn(t + 0.2, { f0: 70, f1: 28, d: 0.9, g: 0.6 }); this.nz(t + 0.2, { f0: 3000, f1: 200, q: 0.6, d: 0.6, g: 0.4 });
    },
    cover(t, r) {                                // taking a hit for the partner: clang + a bright chord
      this.bank.parry.call(this, t, r);
      [[784, 0], [988, 0.04], [1175, 0.08]].forEach(([f, d]) => this.tn(t + d, { f0: r(f), w: 'triangle', a: 0.003, d: 0.3, g: 0.08 }));
    },
    perfect(t, r) { for (const [f, d] of [[2637, 0], [3520, 0.04]]) this.tn(t + d, { f0: r(f), f1: r(f) * 1.01, w: 'triangle', a: 0.001, d: 0.28, g: 0.09 }); this.nz(t, { f0: 7000, f1: 4000, type: 'highpass', d: 0.1, g: 0.25 }); },
    tag(t, r) { this.nz(t, { f0: r(600), f1: r(3600), q: 1.3, a: 0.01, d: 0.12, g: 0.4 }); this.tn(t + 0.03, { f0: r(660), f1: r(990), w: 'square', a: 0.002, d: 0.07, g: 0.06 }); },
    grab(t, r) { this.tn(t, { f0: r(120), f1: 50, d: 0.2, g: 0.45 }); this.nz(t, { f0: r(900), f1: 200, type: 'lowpass', d: 0.25, g: 0.5 }); this.nz(t, { f0: 2500, f1: 1200, q: 3, d: 0.1, g: 0.2 }); },
    fizzle(t, r) {""")

# ---------------------------------------------------------------- HUD
region("// one wave counter: coloured diamond + the whole-cell count", "// ---- F2 developer overlay", part('hud.js') + "\n")
rep("  const pal = { H: C.BONE2, h: C.STONE3, s: C.BONE0, r: C.CRIM2, d: C.STONE2, c: f.idx ? C.LEATH2 : C.SLATE2 };",
    "  const pal = { H: f.idx ? C.LEATH2 : C.BONE2, h: f.idx ? C.LEATH1 : C.STONE3, s: C.BONE0, r: C.CRIM2, d: C.STONE2, c: f.idx ? C.BRONZE : C.SLATE2 };")
rep("  if (Game.noteT > 0) { txtC(Game.noteText, CFG.BASE_W / 2, 60, PAL_HEX[C.BONE1]); Game.noteT -= dt; }",
    "  if (Game.noteT > 0) { txtC(Game.noteText, CFG.BASE_W / 2, 70, PAL_HEX[C.BONE1]); Game.noteT -= dt; }")
rep("//      skill cross bottom-left (2P bottom-right: 적파 / 청파 counts, parry, dash), run clock top-right",
    "//      skill cross bottom-left (2P bottom-right: launch / link, parry, dash), rally top-centre")

# ---------------------------------------------------------------- 2P look: copper hair + a broad blade
rep("    hair:  toon({ chr: true, ramp: RAMP.hair, rim: C.SLATE2, outline: 0.5, pl: 0.5, side: THREE.DoubleSide }),",
    "    hair:  toon({ chr: true, ramp: opt.hair || RAMP.hair, rim: C.SLATE2, outline: 0.5, pl: 0.5, side: THREE.DoubleSide }),")
rep("""  const guard = mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10), M.brass); guard.position.y = 0.07; guard.rotation.y = Math.PI / 2; weapon.add(guard);
  const bar = mesh(flat(new THREE.BoxGeometry(0.17, 0.022, 0.024)), M.brass); bar.position.y = 0.09; weapon.add(bar);
  const pommel = mesh(new THREE.SphereGeometry(0.028, 6, 4), M.brass); pommel.position.y = -0.085; weapon.add(pommel);
  // blade: square-section taper so it stays a 1-2 px line from every angle
  const blade = mesh(flat(new THREE.CylinderGeometry(0.004, 0.034, 0.96, 4)), M.steel); blade.position.y = 0.58; weapon.add(blade);""",
"""  const broad = opt.blade === 'broad';            // 2P: a broad falchion with a straight cross-guard (reads apart from the 1P rapier)
  if (!broad) { const guard = mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10), M.brass); guard.position.y = 0.07; guard.rotation.y = Math.PI / 2; weapon.add(guard); }
  const bar = mesh(flat(new THREE.BoxGeometry(broad ? 0.3 : 0.17, broad ? 0.034 : 0.022, 0.03)), M.brass); bar.position.y = 0.09; weapon.add(bar);
  const pommel = mesh(new THREE.SphereGeometry(broad ? 0.036 : 0.028, 6, 4), M.brass); pommel.position.y = -0.085; weapon.add(pommel);
  // blade: square-section taper so it stays a 1-2 px line from every angle (2P: wide, flat, shorter)
  const blade = mesh(flat(new THREE.CylinderGeometry(broad ? 0.012 : 0.004, broad ? 0.07 : 0.034, broad ? 0.84 : 0.96, 4)), M.steel);
  blade.position.y = broad ? 0.52 : 0.58; if (broad) blade.scale.z = 0.35; weapon.add(blade);""")
rep("const player2 = buildPlayer({ cloak: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], name: 'PLAYER 2' });   // 2P: bronze cloak",
    "const player2 = buildPlayer({ cloak: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], hair: [C.BLOOD1, C.LEATH1, C.LEATH2, C.BRONZE], blade: 'broad', name: 'PLAYER 2' });   // 2P: bronze cloak · copper hair · broad blade")
rep("    order: ['idle', 'run', 'combo1', 'combo2', 'combo3', 'dash', 'parry', 'castR', 'castB', 'drink', 'kneel', 'dodge', 'hit', 'death'],",
    "    order: ['idle', 'run', 'combo1', 'combo2', 'combo3', 'dash', 'parry', 'launch', 'link', 'linkEnd', 'held', 'kneel', 'hit', 'death'],")
rep("    order: ['idle', 'walk', 'slam', 'sweep', 'charge', 'leap', 'shot', 'nova', 'spiral', 'cast', 'groggy', 'death'],",
    "    order: ['idle', 'walk', 'jabR', 'jabL', 'grab', 'hold', 'grabSlam', 'grabRelease', 'lifted', 'liftDrop', 'slam', 'sweep', 'charge', 'leap', 'shot', 'nova', 'spiral', 'cast', 'groggy', 'death'],")

# ---------------------------------------------------------------- clips (appended to the clip lists)
rep("  ], root: [[0, 0], [3, -0.3], [8, -0.35]], events: [{ f: 15, type: 'land' }] },\n];",
    "  ], root: [[0, 0], [3, -0.3], [8, -0.35]], events: [{ f: 15, type: 'land' }] },\n" + part('clips_player.js') + "];")
rep("  ], events: [{ f: 16, type: 'kneel' }, { f: 29, type: 'fall' }] },\n];",
    "  ], events: [{ f: 16, type: 'kneel' }, { f: 29, type: 'fall' }] },\n" + part('clips_boss.js') + "];")

# ---------------------------------------------------------------- fighters + companion
orig = S
i0 = S.find("class BotInput {"); i1 = S.find("  // hold a colour for the judgement"); i2 = S.find("\n\nconst fighters = [")
head = S[S.find("// ---- AI companion: plays 2P"):i1]
head = head.replace("// ---- AI companion: plays 2P when toggled with F3 (also used for solo testing of co-op)",
                    "// ---- AI companion: plays 2P (F3) · drives both characters in tag solo when testing · test bots for the 4 duo verbs")
S = S[:i0] + part('fighter.js') + "\n" + head + part('companion_tail.js') + S[i2:]

# ---------------------------------------------------------------- systems / AI / game
region("/* =============================================================================\n * 15b. WAVES", "/* =============================================================================\n * 16. BOSS AI", part('systems.js') + "\n")
region("/* =============================================================================\n * 16. BOSS AI", "/* =============================================================================\n * 17. GAME", part('ai.js') + "\n")
i = S.find("/* =============================================================================\n * 17. GAME"); j = S.find("</script>\n</body>")
S = S[:i] + part('game.js') + S[j:]

# ---------------------------------------------------------------- tuning (values only)
rep("  WEAK_MUL: 1.75, WEAK_BRK: 12, WEAK_BRK3: 18, REACH_H: 3.35 * FEEL.BOSS_SCALE,   // (이전 18 · 27)",
    "  WEAK_MUL: 1.75, WEAK_BRK: 5, WEAK_BRK3: 8, REACH_H: 3.35 * FEEL.BOSS_SCALE,   // 약점 결정 그로기 (이전 18 · 27 → 듀오: 등 뒤에서 자주 열리므로 낮춤, 등 뒤 ×1.5가 따로 붙음)")
rep("  LIFT_IMMUNE: 6.0,         // 들림이 끝난 뒤 이 시간(초) 동안 다시 띄울 수 없음 (보스가 계속 떠 있지 않게)",
    "  LIFT_IMMUNE: 12.0,        // 들림이 끝난 뒤 이 시간(초) 동안 다시 띄울 수 없음 (보스가 계속 떠 있지 않게)")
rep("wind: 0.12, maxT: 0.7, lock: 0.4, rest: 0.9 }", "wind: 0.12, maxT: 0.7, lock: 0.4, rest: 0.5 }")

rep("WEAK_BRK: 5, WEAK_BRK3: 8,", "WEAK_BRK: 3, WEAK_BRK3: 5,")
rep("reach: 2.6, half: 1.6, dmg: 16, brk: 2,", "reach: 2.6, half: 1.6, dmg: 16, brk: 1,")
rep("reach: 2.6, half: 1.6, dmg: 18, brk: 2,", "reach: 2.6, half: 1.6, dmg: 18, brk: 1,")
rep("reach: 4.0, half: 1.2, dmg: 30, brk: 3,", "reach: 4.0, half: 1.2, dmg: 30, brk: 1.5,")
rep("  LAUNCH: { dmg: 40, brk: 10,", "  LAUNCH: { dmg: 40, brk: 6,")
rep("  //  hitstop: 적중 시 멈춤(초) · kick: 카메라 반동(픽셀) · fx: 이펙트 양 배율",
    "  //  hitstop: 적중 시 멈춤(초) · kick: 카메라 반동(픽셀) · fx: 이펙트 양 배율\n  //  brk: 그로기 게이지 (듀오 1단계: 1·1·1.5 — 그로기는 주로 패리·랠리·연계기로 쌓이게)")

rep("reach: 2.6, half: 1.6, dmg: 16, brk: 1,", "reach: 2.6, half: 1.6, dmg: 16, brk: 0.5,")
rep("reach: 2.6, half: 1.6, dmg: 18, brk: 1,", "reach: 2.6, half: 1.6, dmg: 18, brk: 0.5,")
rep("reach: 4.0, half: 1.2, dmg: 30, brk: 1.5,", "reach: 4.0, half: 1.2, dmg: 30, brk: 1,")
rep("(듀오 1단계: 1·1·1.5 —", "(듀오 1단계: 0.5·0.5·1 —")
rep("  TEMPO: 0.8,                               // 보스 템포 배율: 행동+휴식 한 사이클이 1/0.8배 길어짐(분당 행동 −20%) · 걷기/선회 속도 ×0.8",
    "  TEMPO: 0.9,                               // 보스 템포 배율 (이전 0.8): 행동+휴식 한 사이클이 1/0.9배 길어짐(분당 행동 −10%) · 걷기/선회 속도 ×0.9")

rep("WEAK_BRK: 3, WEAK_BRK3: 5,", "WEAK_BRK: 2, WEAK_BRK3: 3.5,")
rep("  LAUNCH: { dmg: 40, brk: 6,", "  LAUNCH: { dmg: 40, brk: 4,")
rep("  GROGGY_T: [3.2, 2.8, 2.5], GROGGY_MUL: 1.25,   // 페이즈 1/2/3",
    "  GROGGY_T: [3.2, 2.8, 2.5], GROGGY_MUL: 1.25,   // 페이즈 1/2/3\n  BREAK_MAX: 140,                    // 그로기 게이지 크기 (이전 100 → 듀오: 두 사람이 쌓으므로 키움)")
rep("  LOCAL_HITSTOP: true,      // 2인일 때 기본 공격·스킬 적중 정지는 때린 사람과 보스에만 (동료는 계속 움직임). 큰 순간만 전체 정지",
    "  LOCAL_HITSTOP: true,      // 2인일 때 기본 공격·스킬 적중 정지는 때린 사람과 보스에만 (동료는 계속 움직임). 큰 순간만 전체 정지\n"
    "  LOCAL_BOSS_STOP: 0.5,     // 그 국소 정지를 보스에는 이 배율만 (두 사람이 번갈아 때려도 보스가 계속 굳지 않게)")

rep("  NOVA: { dmg: 12, n: [18, 22, 24], speed: [5.2, 6.0, 6.4],", "  NOVA: { dmg: 12, n: [12, 14, 16], speed: [5.2, 6.0, 6.4],")
rep("  //  NOVA: ring burst (phase 2: a second, offset ring)   SPIRAL: rotating arms while channelling",
    "  //  NOVA: ring burst (phase 2+: a second, offset ring) · 듀오 1단계: 패리 불가(중립)가 되어 탄 수를 줄임 (18/22 → 12/14/16: 보스 곁에서도 틈이 생김)\n"
    "  //  SPIRAL: rotating arms while channelling")

rep("  GRAB: { reach: 2.3, hold: 2.5, dmg: 35 },", "  GRAB: { reach: 2.3, hold: 2.5, dmg: 35, handR: 1.8 },")
rep("파트너가 보스를 때리거나 커버하면 풀림", "파트너가 보스 등(뒤 120°)이나 손(handR 유닛 안)을 때리거나 커버하면 풀림")
rep("  LIFT_IMMUNE: 12.0,", "  LIFT_HIT_MUL: 0.5,        // 들림 중인 보스에 연계기가 아닌 공격은 이 배율만 (공중이라 칼끝만 스침 → 혼자 띄우면 가벼운 이득)\n  LIFT_IMMUNE: 12.0,")
rep("  RALLY_HIT_RESET: true,", "  RALLY_WHIFF_T: 1.0,       // 헛패리(아무것도 못 막음) 뒤 이 시간(초) 안의 패리는 랠리를 올리지 않음 ('OFF BEAT' = 연타 방지)\n  RALLY_HIT_RESET: true,")
rep("  WEAK_MUL: 1.75, WEAK_BRK: 2,", "  WEAK_MUL: 2.2, WEAK_BRK: 2,")

rep("  HAZ_DMG: 1.0,", "  BOSS_DMG: 0.8,            // 보스가 주는 모든 피해 배율 (포션이 없어진 4~7분 보스전에 맞춤)\n  HAZ_DMG: 1.0,")
rep("  WEAK_MUL: 2.2, WEAK_BRK: 2,", "  WEAK_MUL: 3.0, WEAK_BRK: 2,")
rep("  LIFT_IMMUNE: 12.0,", "  LIFT_IMMUNE: 8.0,")

rep("  BOSS_DMG: 0.8,", "  BOSS_DMG: 0.6,")
rep("  PLAYER_HP: 100, BOSS_HP: 16000, HP_PER_EXTRA: 0.8,", "  PLAYER_HP: 100, BOSS_HP: 24000, HP_PER_EXTRA: 0.8,")

rep("  RALLY_WHIFF_T: 1.0,", "  COMBO_POISE: true,        // 번갈아 치기 도중에는 보스가 그로기에 빠지지 않음 (랠리가 5까지 갈 여지) · 게이지가 차 있으면 연타가 끝나는 순간 그로기\n  RALLY_WHIFF_T: 1.0,")

# removed systems' animation clips (wave release red / blue · potion): one contiguous block before the revive clip
region("  // SKILL 적파: blade raised overhead", "  // KNEEL: down on one knee", "")

# ================================================================ 1.5단계 (무기가 다른 두 캐릭터 · 8가지 연계 · 보스 2체 러시)
exec(open(os.path.join(HERE, 'splice15.py'), encoding='utf8').read())
# ================================================================ 1.6단계 (한 키보드 2인 · 청파·적파 3칸 · 연계 연출)
exec(open(os.path.join(HERE, 'splice16.py'), encoding='utf8').read())
# ================================================================ 2단계 (캐릭터 5명 · 스킬 3개 중 2개 · 공통 호응 마무리 · 유물 · 보스 4체)
exec(open(os.path.join(HERE, 'splice20.py'), encoding='utf8').read())
# ================================================================ 3단계 (세그먼트 트윈즈 아트 · 시작 화면 · Esc 메뉴 · 패드 · 기술명 연출 · 움직임 · QTE · 보스 체력 절반)
exec(open(os.path.join(HERE, 'splice30.py'), encoding='utf8').read())
# ================================================================ 4단계 아트 테스트 공통 (ART · SLICE · 훅 · 판정용 숨은 리그) → 끝에서 테마 1 (splice41)
exec(open(os.path.join(HERE, 'splice40.py'), encoding='utf8').read())

open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf8').write(S)
print('index.html', len(S), 'chars,', S.count('\n'), 'lines')
