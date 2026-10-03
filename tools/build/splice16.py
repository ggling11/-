# ================================================================ 1.6: 한 키보드 2인(A안) · 청파·적파 3칸 · 연계 연출
# (splice.py가 splice15.py 다음에 실행 — 문자열 기준 위치만, 행 번호 X)

# ---------------------------------------------------------------- 조작 설명 머리말
region(" *     1P  WASD 이동", " * ==========", """ *     혼자(또는 2P가 AI · 패드 · 숫자패드)일 때
 *       1P  WASD 이동 · J 공격 · K 패리 · Space 회피(대시) · U 스킬 1 · I 스킬 2 · L 교대(태그 솔로) · F(꾹) 동료 부활
 *       2P  방향키 + 숫자패드 1 공격 · 2 패리 · 0 회피 · 7 스킬 1 · 8 스킬 2 · 3(꾹) 부활 (O · / · . 를 눌러도 2인 참가)
 *     한 키보드 2인(2P가 사람이고 키보드를 쓸 때) — 1P는 같은 손 모양 그대로 두 칸 왼쪽, 2P는 오른쪽
 *       1P  WASD 이동 · G 공격 · H 패리 · Space 회피 · T 스킬 1 · Y 스킬 2 · B(꾹) 부활
 *       2P  방향키 이동 · L 공격 · K 패리 · / 회피 · O 스킬 1 · I 스킬 2 · .(꾹) 부활   (숫자패드도 그대로)
 *     패드 X 공격 · B 패리 · A 회피 · RT(또는 LB) 스킬 1 · LT 스킬 2 · RB 교대 · Y(꾹) 부활 · START 재시작 · SELECT 쇼케이스
 *     R 꾹(0.6초) 재시작 (끝 화면에서는 한 번) · F3 AI 2P 켜기/끄기 · F4 태그 솔로로 돌아가기 · F8 HUD 숨기기
""")

# ---------------------------------------------------------------- 키 표: 혼자용 PKEYS + 한 키보드 2인용 PKEYS_SPLIT
region("const PKEYS = [", "const ACTS", """const PKEYS = [                                // 혼자 · 2P가 AI / 패드 / 숫자패드: 1P 왼손 WASD + 오른손 J K U I
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    attack: ['KeyJ'], parry: ['KeyK'], dodge: ['Space'], skill1: ['KeyU'], skill2: ['KeyI'], tag: ['KeyL'], interact: ['KeyF'] },
  // 2P: 1P와 안 겹치는 키만 (방향키 + 숫자패드, 노트북 키 중 O · / · . 는 혼자 할 때 눌러도 2P 참가)
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    attack: ['Numpad1'], parry: ['Numpad2'], dodge: ['Slash', 'Numpad0', 'ShiftRight'], skill1: ['KeyO', 'Numpad7'], skill2: ['Numpad8'],
    tag: ['Numpad9'], interact: ['Period', 'Numpad3'] },
];
// 1.6 한 키보드 2인 (2P가 사람이고 2P 패드가 없을 때): 1P는 같은 손 모양 그대로 두 칸 왼쪽(G H T Y), 2P는 방향키 + 왼손 L K O I
//   1P 오른손(G·H 줄)과 2P 왼손(K·L 줄) 사이에 J·U·M 한 줄이 비고, 2P 왼손과 방향키 사이에도 ; ' 한 줄이 빔
//   전역 키(R 꾹 재시작 · Q E 카메라 · M 소리 · 숫자 1~5 화면 · F키)와 안 겹침 (원래 T 전체 재시작 · H HUD는 1.6에서 뺌/F8로)
const PKEYS_SPLIT = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    attack: ['KeyG'], parry: ['KeyH'], dodge: ['Space'], skill1: ['KeyT'], skill2: ['KeyY'], tag: [], interact: ['KeyB'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    attack: ['KeyL', 'Numpad1'], parry: ['KeyK', 'Numpad2'], dodge: ['Slash', 'Numpad0', 'ShiftRight'], skill1: ['KeyO', 'Numpad7'], skill2: ['KeyI', 'Numpad8'],
    tag: ['Numpad9'], interact: ['Period', 'Numpad3'] },
];
""")
rep("const GKEYS = { KeyR: 'restart', KeyT: 'restartAll', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo' };",
    "const GKEYS = { KeyR: 'restart', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo' };   // R: 싸우는 중엔 꾹(FEEL.RESTART_HOLD) · T(전체 재시작)는 R과 같아서 뺌 (1P 한 키보드 키와 겹침)")
# Input: which key table is live right now
rep("""  p2Num: false,                                  // 2P가 마지막에 누른 키가 숫자패드였나 → HUD에 숫자패드 글자 / 아니면 노트북 글자""",
    """  p2Num: false,                                  // 2P가 마지막에 누른 키가 숫자패드였나 → HUD에 숫자패드 글자 / 아니면 노트북 글자
  // 1.6 한 키보드 2인: 2P가 사람(AI 아님)이고 2P 몫 패드가 없으면 → 1P G H T Y · 2P L K O I
  split() { return Game.mode === 'fight' && !Game.tagMode && !!fighters[1] && fighters[1].active && !fighters[1].bot && !this.pads[1].on; },
  map(i) { return (this.split() ? PKEYS_SPLIT : PKEYS)[i]; },""")
rep("""  heldOf(i, a) { const K = PKEYS[i][a];""", """  heldOf(i, a) { const K = this.map(i)[a];""")
rep("""    const K = PKEYS[i], any = l => l.some(k => keys.has(k));""", """    const K = this.map(i), any = l => l.some(k => keys.has(k));""")
rep("""  for (let i = 0; i < 2; i++) for (const a of ACTS) if (PKEYS[i][a].includes(e.code)) {""",
    """  for (let i = 0; i < 2; i++) for (const a of ACTS) if (Input.map(i)[a].includes(e.code)) {""")
rep("""  if (GKEYS[e.code]) Input.pressed.add(GKEYS[e.code]);""",
    """  if (GKEYS[e.code] && !(e.code === 'KeyR' && Game.mode === 'fight' && Game.state === 'play')) Input.pressed.add(GKEYS[e.code]);   // 싸우는 중 R은 꾹 눌러야 (update)""")
rep("""    case 'KeyH': hudVisible = !hudVisible; break;""", """    case 'F8': hudVisible = !hudVisible; break;   // (1.6: H → F8, H는 한 키보드 2인 1P 패리)""")
rep("""['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();""",
    """['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F8', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();""")

# ---------------------------------------------------------------- FEEL: 1.6 새 값 (파일 위쪽 데이터 구역)
rep("""  RUSH: { restT: 8, hideT: 3.2, healFrac: 1.0, reviveHp: 0.6, entT: 0.8 },   // healFrac 0.5 → 1.0 (1차: 보스 2 시작을 가득 찬 체력으로)""",
    """  RUSH: { restT: 8, hideT: 3.2, healFrac: 1.0, reviveHp: 0.6, entT: 0.8 },   // healFrac 0.5 → 1.0 (1차: 보스 2 시작을 가득 찬 체력으로)
  // ── 1.6 ──────────────────────────────────────────────
  // G. 청파·적파: 사람마다 메인 색 하나 (A 세검 = 청파, B 대검 = 적파). 보스 공격은 붉은(적파) / 푸른(청파) 색을 띰
  //    패리는 누구나 · 흡수는 자기 색만 (커버로 막은 것도, 셔틀 수정구 받아치기도 자기 색이면 흡수)
  //    칸은 최대 max개 — 넘치면 가장 오래된 것이 밀려 사라짐 · 스킬(시동·마무리)을 쓰면 가장 오래된 칸 하나를 써서 강화 · 칸이 비면 기본 스킬
  //  color [A, B] · cdHit: 평타가 보스에 맞을 때마다 줄어드는 스킬 쿨타임(초, [A, B] — 대검은 느려서 한 대당 더 많이)
  //  start: 시동 강화 — win 상태 시간 배율 · reach 판정 거리 배율 · half 판정 폭 배율 · dmg 피해 배율 · brk 그로기 배율
  //  pass: 강화된 시동에서 이어진 파트너 마무리 피해 배율 (내 파장이 파트너를 도움)
  //  fin: 마무리 강화(마무리를 넣는 사람이 자기 칸을 씀) — dmg 피해 · brk 그로기 · rally 첫 적중 때 랠리 +
  //  violet(자파): 강화 시동 + 강화 마무리 = 청 + 적 → start/pass/fin 대신 이 배율 · stop 적중 정지 추가(초)
  WAVE: { color: ['blue', 'red'], max: 3, cdHit: [0.15, 0.3],
          start: { blue: { win: 1.6, reach: 1.25, half: 1.2, dmg: 1.3, brk: 1.0 }, red: { win: 1.0, reach: 1.0, half: 1.0, dmg: 1.8, brk: 2.5 } },
          pass: 1.3,
          fin: { blue: { dmg: 1.25, brk: 1.0, rally: 1 }, red: { dmg: 1.25, brk: 1.6, rally: 0 } },
          violet: { dmg: 1.8, brk: 1.8, rally: 1, stop: 0.06 } },
  // H. 연계 연출: 시동 적중 → 두 사람을 잇는 빛줄 · 받을 사람 번쩍 · 부르는 소리 / 마무리 시작 → 대답 소리 · 짧은 전체 정지 · 줌인 · 흔들림 / 큰 순간 → 컷인
  //  freeze 마무리 시작 전체 정지(초) · zoom 줌 배율(1 = 그대로) · zoomIn / zoomHold / zoomOut 줌 들어가기 · 유지 · 빠지기(초)
  //  shake 마무리 시작 흔들림 [세기(픽셀), 초] · violetZoom / violetShake 자파일 때
  //  cutT 컷인 길이(실제 초) · cutSlow 컷인 동안 게임 시간 배율 · cutGap 컷인 최소 간격(게임 초, 1차 6 → 12 → 20: 봇 기준 판당 22 → 20 → 약 10번) · 컷인: 그 보스전에서 처음 나온 마무리 + 자파
  STAGE: { freeze: 0.08, zoom: 1.2, zoomIn: 0.07, zoomHold: 0.4, zoomOut: 0.35, shake: [4, 0.25],
           violetZoom: 1.32, violetShake: [6, 0.4], cutT: 0.75, cutSlow: 0.3, cutGap: 20 },
  RESTART_HOLD: 0.6,        // 싸우는 중 R을 이 시간(초) 꾹 눌러야 재시작 (한 키보드 2인 손 근처라 실수 방지) · 끝 화면에서는 한 번""")

# ---------------------------------------------------------------- 새 파트: 청파·적파 3칸 + 연계 연출 (셔틀·표식 다음, 보스 AI 앞)
rep("""/* =============================================================================
 * 16. BOSS AI""", part('waves16.js') + part('stage16.js') + """
/* =============================================================================
 * 16. BOSS AI""")

# ---------------------------------------------------------------- 보스 공격 색: 적파(붉음) / 청파(푸름) — 연타 패턴(번갈아 치기)은 노리는 사람 색 (ai.js)
#   두 사람이 흡수할 기회가 비슷하게 (봇 테스트 흡수 수로 확인) · null = 패리 불가(중립)
rep("""    waves: { slam: 'red', sweep: 'red', charge: 'red', leap: 'red', shot: 'red', combo: 'red', nova: null, spiral: null, grab: null }, floorWave: null,""",
    """    waves: { slam: 'red', sweep: 'blue', charge: 'blue', leap: 'red', shot: 'blue', combo: 'red', nova: null, spiral: null, grab: null }, floorWave: null,   // 1.6 적파 / 청파 (combo = 노리는 사람 색)""")
rep("""    waves: { slam: 'red', sweep: 'red', charge: 'red', leap: 'red', shot: 'red', combo: 'red', bash: 'red', shieldRush: 'red', nova: null, spiral: null, grab: null }, floorWave: null,""",
    """    waves: { slam: 'blue', sweep: 'red', charge: 'red', leap: 'blue', shot: 'red', combo: 'red', bash: 'blue', shieldRush: 'blue', nova: null, spiral: null, grab: null }, floorWave: null,   // 1.6""")

# ---------------------------------------------------------------- 셔틀 수정구 흔적: 받을 사람의 파장 색 (A 청파 · B 적파)
rep("""  orbA:   { cols: [C.BONE2, C.SLATE3, C.SLATE2, C.SLATE1], g: 0, drag: 5, bounce: 0 },      // shuttle orb for 1P (slate)
  orbB:   { cols: [C.HOTW, C.HOT, C.BRONZE, C.LEATH2], g: 0, drag: 5, bounce: 0 },          // shuttle orb for 2P (bronze)""",
    """  orbA:   { cols: [C.BONE2, C.CYAN, C.SLATE3, C.SLATE2], g: 0, drag: 5, bounce: 0 },        // shuttle orb for A (1.6: 청파)
  orbB:   { cols: [C.HOTW, C.HOT, C.CRIM2, C.CRIM1], g: 0, drag: 5, bounce: 0 },            // shuttle orb for B (1.6: 적파)""")

# ---------------------------------------------------------------- 바닥 표시: 표식(1.6)은 흰 '봉인' (wave 4) — 청록은 이제 청파
rep("""      idx = uAlly > 0.5 ? (uWave > 1.5 ? 31 : uWave > 0.5 ? 29 : 23) : uWave > 2.5 ? (uLock < 0.5 ? 8 : 10) : uWave > 0.5 && uWave < 1.5 ? (uLock < 0.5 ? 14 : 29) : (uLock < 0.5 ? 20 : 21);""",
    """      idx = uAlly > 0.5 ? (uWave > 3.5 ? 24 : uWave > 1.5 ? 31 : uWave > 0.5 ? 29 : 23) : uWave > 3.5 ? (uLock < 0.5 ? 10 : 24) : uWave > 2.5 ? (uLock < 0.5 ? 8 : 10) : uWave > 0.5 && uWave < 1.5 ? (uLock < 0.5 ? 14 : 29) : (uLock < 0.5 ? 20 : 21);""")
rep("""      idx = uWave > 2.5 ? 7 : uWave > 0.5 && uWave < 1.5 ? 29 : 22;""",
    """      idx = uWave > 3.5 ? 11 : uWave > 2.5 ? 7 : uWave > 0.5 && uWave < 1.5 ? 29 : 22;""")
rep("""        if (uWave > 1.5) { if (b > (front ? 0.45 : 0.14)) discard; idx = front ? 31 : 30; }""",
    """        if (uWave > 3.5) { if (((gp.x + gp.y) & 3) != 0 || b > 0.3) discard; idx = 11; }
        else if (uWave > 1.5) { if (b > (front ? 0.45 : 0.14)) discard; idx = front ? 31 : 30; }""")
rep("""      bool blue = uWave > 0.5 && uWave < 1.5;
      bool on = blue ?""", """      bool blue = (uWave > 0.5 && uWave < 1.5) || uWave > 3.5;
      bool on = blue ?""")
rep("""      idx = uWave > 2.5 ? (front ? 8 : 6) : uWave > 1.5 ? (front ? 31 : 30) : blue ? (front ? 29 : 14) : (front ? 22 : 19);""",
    """      idx = uWave > 3.5 ? (front ? 24 : 10) : uWave > 2.5 ? (front ? 8 : 6) : uWave > 1.5 ? (front ? 31 : 30) : blue ? (front ? 29 : 14) : (front ? 22 : 19);""")

# ---------------------------------------------------------------- 카메라: 줌 펀치 (연계 연출) — 직교 카메라 zoom + 픽셀 격자 맞춤
rep("""  shakeAmp: 0, shakeT: 0, shakeDur: 1, shakeTick: 0, sx: 0, sy: 0, kx: 0, ky: 0, kickT: 0, kickX: 0, kickY: 0,""",
    """  shakeAmp: 0, shakeT: 0, shakeDur: 1, shakeTick: 0, sx: 0, sy: 0, kx: 0, ky: 0, kickT: 0, kickX: 0, kickY: 0,
  zoom: 1, zw: 0, zp: null,                      // 1.6 zoom punch: current zoom · how far toward the focus (0..1) · the running punch
  zoomPunch(z, focus) { this.zp = { z, t: 0, f: focus.clone() }; },""")
rep("""    if (follow) this.target.lerp(follow, 1 - Math.exp(-dt * CFG.CAM_FOLLOW));
    this.apply();""",
    """    if (follow) this.target.lerp(follow, 1 - Math.exp(-dt * CFG.CAM_FOLLOW));
    if (this.zp) {                                // in · hold · out (FEEL.STAGE), smoothstep
      const Z = this.zp, S = FEEL.STAGE; Z.t += dt;
      const a = S.zoomIn, h = S.zoomHold, o = S.zoomOut;
      const e = Z.t < a ? Z.t / a : Z.t < a + h ? 1 : Z.t < a + h + o ? 1 - (Z.t - a - h) / o : 0, ee = e * e * (3 - 2 * e);
      this.zoom = 1 + (Z.z - 1) * ee; this.zw = ee;
      if (Z.t >= a + h + o) { this.zp = null; this.zoom = 1; this.zw = 0; }
    }
    this.apply();""")
rep("""    const P = this.target;
    const s = Pipe.wpp;""",
    """    if (camera.zoom !== this.zoom) { camera.zoom = this.zoom; camera.updateProjectionMatrix(); }
    const P = this.zp ? V3().lerpVectors(this.target, this.zp.f, 0.6 * this.zw) : this.target;   // zooming: lean toward the action
    const s = Pipe.wpp / this.zoom;""")
