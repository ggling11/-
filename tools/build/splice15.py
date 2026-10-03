# 1.5단계 편집: 1단계 빌드(splice.py 앞부분) 뒤에 이어서 실행된다 (rep / region / part 는 splice.py 것을 그대로 씀)
# 문자열 기준만 사용 (행 번호 X). 새 게임 코드는 parts/*.js 에 있고, 여기서는 원본 쪽 문자열만 고친다.

# ---------------------------------------------------------------- FEEL: 두 캐릭터의 스킬 · 상태 · 마무리 8종
region("  // ── 듀오 1단계: 둘이 합을 맞추는 동사 4개", "  // B. 자리 나누기", """  // ── 듀오 1.5단계: 무기가 다른 두 캐릭터 · 스킬 2개씩 · 8가지 연계 ─────────────────────────────
  //  1인당 버튼 6개: 이동 · 공격(J) · 회피(Space) · 패리(K) · 스킬 1(U) · 스킬 2(I). 태그 솔로 교대(L). 부활(F 꾹)
  //  A = 1P 세검(청회 망토) · B = 2P 대검(청동 망토). 태그 솔로에서는 한 사람이 A·B를 번갈아 조종
  //  동사 4개(띄우고 받기 → 8가지 연계로 확장 · 자리 나누기 · 번갈아 패리 랠리 · 커버)와 1단계 규칙은 그대로
  PERFECT_WINDOW: 0.1,      // 공격이 닿기 이 시간(초) 전 이내에 누른 패리 = 'PERFECT' (연출 중심, 수치 이득은 작음)
  PERFECT_SLOW: 0.12,       // PERFECT 순간 슬로 모션(실제 초)
  PERFECT_BRK: 4,           // PERFECT 추가 그로기
  // A. 시동 스킬 (캐릭터별 2개). 보스에 맞으면 보스가 '상태'가 되고, LINK_WINDOW 동안 '다른 사람'의 U·I가 마무리 2종으로 바뀜
  //  dmg 피해 · brk 그로기 · cd 쿨타임(초) · reach 보스 표면까지 닿는 거리 · half 판정 부채꼴 반각(라디안)
  //  hitstop 적중 정지(초) · lock 이 시간(초) 뒤부터 대시·공격·패리로 캔슬 · status 적중 시 보스 상태
  SKILLS: {
    thrust: { dmg: 45, brk: 3, cd: 6, reach: 1.6, half: 0.55, hitstop: 0.1, lock: 0.58, status: 'stagger', lunge: 5.2 },   // A 스킬 1 섬광 찌르기: 긴 돌진 찌르기 → 보스 휘청 · lunge: 보스까지 늘어나는 최대 돌진 거리
    spin:   { dmg: 40, brk: 3, cd: 7, reach: 2.7, half: 3.2, hitstop: 0.1, lock: 0.62, status: 'turn' },                  // A 스킬 2 역회전 베기: 몸을 돌리며 한 바퀴 → 보스 돌아섬(등을 보임)
    launch: { dmg: 40, brk: 4, cd: 6, reach: 2.9, half: 1.1, hitstop: 0.1, lock: 0.62, status: 'lift' },                  // B 스킬 1 올려치기(1단계 띄우기) → 보스 뜸
    smash:  { dmg: 50, brk: 5, cd: 8, reach: 3.1, half: 0.8, hitstop: 0.14, lock: 0.8, status: 'kneel' },                 // B 스킬 2 내려찍기: 대검을 땅에 박음 → 보스 무릎 꿇음
  },
  KIT: { A: ['thrust', 'spin'], B: ['launch', 'smash'] },   // 캐릭터별 [스킬 1(U), 스킬 2(I)]
  LINK_WINDOW: 1.5,         // 보스 상태 지속(초). 이 안에 '다른 사람'이 U·I를 누르면 그 마무리 (자기 시동은 자기가 못 받음)
  LIFT_H: 0.9,              // 뜸 상태에서 보스가 떠오르는 높이 (보스 크기 1 기준 유닛 → 보스 크기 배율을 곱함)
  STATUS_HIT_MUL: 0.5,      // 상태 중인 보스에 마무리가 아닌 공격은 이 배율만 (1단계 '들림 중 스침 피해'를 네 상태로 확장 → 혼자 걸고 혼자 치면 가벼운 이득)
  LIFT_IMMUNE: 8.0,         // 상태가 끝난 뒤 이 시간(초) 동안 어떤 상태도 다시 걸 수 없음 (네 상태 공유)
  STATUS_REST: 0.35,        // 마무리 없이 상태가 풀렸을 때 보스가 쉬는 시간(초)
  LINK: { dmg: 180, brk: 35, speed: 20, maxD: 10, hitstop: 0.2, wind: 0.12, maxT: 0.7, lock: 0.4, rest: 0.5 },   // (날아가 박치기) 비행: 보스에게 날아가 들이받음 (이동 중 무적)
                            //   wind: 도약 전 웅크림(초) · maxT: 최대 비행 시간 · lock: 되튕김 뒤 캔슬까지 · rest: 마무리 뒤 보스가 쉬는 시간
  // B. 마무리 8종 = 상태(누가 걸었나) × 받는 사람의 스킬 1·2. 전부 새 동작 · 동작 중 무적 · 효과가 달라서 고를 이유가 있게
  //  dmg 타당 피해(등 뒤 ×1.5, 등 약점 ×3이 따로 붙음) · hits 타 수 · brk 타당 그로기 · stop 적중 순간 전체 정지(초)
  FINISH: {
    skyPierce:   { dmg: 250, hits: 1, brk: 18, stop: 0.16 },               // 뜸+A1 공중 관통: 피해형 — 날아올라 꿰뚫고 반대편으로 빠짐
    skyDance:    { dmg: 38, hits: 4, brk: 5, stop: 0.06, rally: 2 },       // 뜸+A2 공중 난도: 랠리형 — 떠 있는 보스 주위를 돌며 4연속 베기, 랠리 +2
    crownThrust: { dmg: 90, hits: 1, brk: 95, stop: 0.18 },                // 무릎+A1 정수리 찌르기: 그로기형 — 뛰어올라 머리를 찌름, 그로기 게이지 대량
    spineRide:   { dmg: 26, hits: 3, brk: 6, stop: 0.07 },                 // 무릎+A2 등 타기 베기: 위치형 — 등을 타고 오르며 등 약점 3연타
    ramLink:     { dmg: 180, hits: 1, brk: 35, stop: 0.2 },                // 휘청+B1 날아가 박치기: 피해형 — 1단계 연계기, 큰 피해 + 큰 정지
    topple:      { dmg: 80, hits: 1, brk: 0, stop: 0.16, groggyT: 1.6 },   // 휘청+B2 넘어뜨리기: 그로기형 — 다리를 쓸어 쓰러뜨림, 즉시 그로기(groggyT초로 짧음)
    backRiser:   { dmg: 95, hits: 1, brk: 12, stop: 0.18 },                // 돌아섬+B1 등 올려베기: 피해형 — 등 약점에 최대 피해
    pinDown:     { dmg: 60, hits: 1, brk: 10, stop: 0.14, pinT: 5.0 },     // 돌아섬+B2 등 찍어 박기: 위치형 — 보스가 pinT초 동안 선회 불가 → 둘 다 등 뒤로
  },
  FINISH_MAXD: 10,          // 보스에서 이 거리 안에 있어야 마무리 가능
  // C. 강제 교대 패턴 1 — 셔틀 수정구 (보스 1): 받을 사람 색으로 빛나는 수정구, 그 색만 받을 수 있음(커버 X) → 둘이 번갈아 받음
  //  n 페이즈별 받아칠 횟수(마지막 타 = 스매시) · t0 첫 비행 시간(초, 거리 무관) · dec 왕복마다 줄어드는 시간 · tMin 최소 비행 시간
  //  soloMin 태그 솔로 최소(교대 쿨타임보다 길게) · markD 솔로 그림자 표식이 보스 너머로 떨어진 거리 · arc 비행 높이
  //  smashT 스매시 비행 · smashDmg 스매시 피해(+그로기) · smashStop 스매시 전체 정지 · missDmg 놓치면 받을 사람 피해 · splashDmg/R 주변 피해·반경
  SHUTTLE: { n: [6, 6, 8], t0: 0.95, dec: 0.09, tMin: 0.5, soloMin: 1.1, markD: 2.6, arc: 1.3,
             smashT: 0.45, smashDmg: 260, smashStop: 0.2, missDmg: 30, splashDmg: 15, splashR: 1.8 },
  // D. 강제 교대 패턴 2 — 표식 넘기기 (보스 2): 표식 대상은 이 공격을 패리 못 함 · 파트너의 커버로만 막음 → 막은 사람에게 표식이 넘어감
  //  n 페이즈별 공격 수 · gap 공격 간격(초, 커버하러 붙을 시간) · soloGap 태그 솔로 간격(교대 쿨타임보다 길게) · lead 원이 뜨고 닿기까지
  //  lock 닿기 전 원이 굳는 시간 · r 원 반지름 · dmg 못 막았을 때 피해(회피 무적 관통) · recover 마지막 공격 뒤 여운 · flashEvery 표식 대상 몸 깜빡임 간격
  MARK: { n: [4, 4, 6], gap: 1.2, soloGap: 1.25, lead: 1.1, lock: 0.35, r: 1.2, dmg: 22, recover: 0.6, flashEvery: 0.45 },
  // E. 보스 2 방패: 방패 뒤 돌진 중에는 앞에서 친 공격이 막힘 (등 뒤는 그대로)
  WARDEN: { blockMul: 0.15, shieldScale: 1.5 },   // shieldScale: 방패 크기 배율 (원본 방패는 이 보스 크기에서 너무 작아 읽히지 않음)
  // F. 보스 러시 흐름: 보스 1 처치 → 휴식(체력 일부 회복 · 쓰러진 사람 부활, 유물 자리는 2단계) → 보스 2 등장
  //  restT 휴식 전체(초) · hideT 쓰러진 보스가 사라지는 때 · healFrac 휴식 시작 때 회복(최대 체력 비율) · reviveHp 부활 체력 비율 · entT 보스 2 낙하 등장 시간
  RUSH: { restT: 8, hideT: 3.2, healFrac: 0.5, reviveHp: 0.6, entT: 0.8 },
""")
rep("  REVIVE_R: 1.4,            // 쓰러진 동료 옆", "  REVIVE_R: 1.4,            // 쓰러진 동료 옆")   # (anchor check only)

# ---------------------------------------------------------------- FEEL: 대검 기본 3타 (세검 ATK 바로 뒤)
rep("""  ATK_EARLY_DODGE: 1,       // 공격 시작 후 이 프레임 안에 구르기를 누르면 공격을 취소 (오입력 구제)""",
"""  // 대검(B) 기본 3타: 느리고 무거움 · 넓고 긺 (1·2타 횡베기, 3타 내려찍기). 항목 뜻은 위 세검과 같음
  //  → 1·2타 판정까지 ≈0.2초, 전체 ≈0.5초 / 3타 판정까지 ≈0.4초, 전체 ≈0.75초 (히트스톱 제외) · 초당 피해는 세검과 비슷, 한 방·정지가 큼
  ATK_B: {
    1: { clip: 'gs1', start: 2, up: 1.6, active: 1, down: 2.2, strike: 5, chain: 8, dodge: 7, reach: 3.0, half: 1.8, dmg: 24, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.3 },
    2: { clip: 'gs2', start: 2, up: 1.6, active: 1, down: 2.2, strike: 5, chain: 8, dodge: 7, reach: 3.0, half: 1.8, dmg: 26, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.4 },
    3: { clip: 'gs3', start: 3, up: 1.3, active: 1, down: 1.8, strike: 8, chain: 99, dodge: 11, reach: 3.4, half: 0.9, dmg: 44, brk: 1.4, hitstop: 0.14, kick: 3, fx: 2.0 },
  },
  ATK_EARLY_DODGE: 1,       // 공격 시작 후 이 프레임 안에 구르기를 누르면 공격을 취소 (오입력 구제)""")

# ---------------------------------------------------------------- input: U / I (2P 숫자패드 7 / 8 · [ / ]) · 패드 RT / LT
region(" *     1P  WASD 이동", " * ==========", """ *     1P  WASD 이동 · J 공격 · K 패리 · Space 회피(대시) · U 스킬 1 · I 스킬 2 · L 교대(태그 솔로) · F(꾹) 동료 부활
 *     2P  방향키 · ' 공격 · ; 패리 · / 회피 · [ 스킬 1 · P 스킬 2 · .(꾹) 부활   ← 노트북 키보드 하나로 2인 (1P는 왼쪽·가운데, 2P는 오른쪽 끝)
 *         숫자패드도 그대로: 1 공격 · 2 패리 · 0 회피 · 7 스킬 1 · 8 스킬 2 · 3(꾹) 부활  (2P 키 표시는 2P가 마지막에 누른 쪽을 따라감)
 *     패드 X 공격 · B 패리 · A 회피 · RT(또는 LB) 스킬 1 · LT 스킬 2 · RB 교대 · Y(꾹) 부활 · START 재시작 · SELECT 쇼케이스
 *     F3 AI 2P 켜기/끄기 · F4 태그 솔로로 돌아가기 · 2P 키를 누르면 2인 참가
""")
region("const PKEYS = [", "const GKEYS", """const PKEYS = [                                // 듀오 1.5단계: 1인당 이동 + 버튼 6개 (공격 · 회피 · 패리 · 스킬 1 · 스킬 2) + 교대(태그 솔로) + 부활(꾹)
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    attack: ['KeyJ'], parry: ['KeyK'], dodge: ['Space'], skill1: ['KeyU'], skill2: ['KeyI'], tag: ['KeyL'], interact: ['KeyF'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    // 노트북(숫자패드 없음): 오른손 방향키 + 왼손 ; ' / [ P . (1P 오른손 J·K·U·I와 L 한 줄 떨어짐) — 1P 키·전역 키(R·T·Q·E·H·M·1~5·Tab·F1~F4)와 겹치지 않음
    // 옛 대체 키 중 같은 뜻인 오른Shift(회피) · ](스킬 2) · \\(부활)은 남김
    attack: ['Quote', 'Numpad1'], parry: ['Semicolon', 'Numpad2'], dodge: ['Slash', 'Numpad0', 'ShiftRight'], skill1: ['BracketLeft', 'Numpad7'], skill2: ['KeyP', 'Numpad8', 'BracketRight'],
    tag: ['Numpad9'], interact: ['Period', 'Numpad3', 'Backslash'] },
];
const ACTS = ['attack', 'dodge', 'parry', 'skill1', 'skill2', 'tag', 'interact'];
""")
rep(""": [[2, 'attack'], [0, 'dodge'], [1, 'parry'], [7, 'skill'], [4, 'skill'], [5, 'tag'], [9, 'restart'], [8, 'show']];   // X 공격 · A 회피 · B 패리 · RT/LB 연계 · RB 교대""",
    """: [[2, 'attack'], [0, 'dodge'], [1, 'parry'], [7, 'skill1'], [4, 'skill1'], [6, 'skill2'], [5, 'tag'], [9, 'restart'], [8, 'show']];   // X 공격 · A 회피 · B 패리 · RT/LB 스킬 1 · LT 스킬 2 · RB 교대""")
rep("""if (s === 1 && (act === 'attack' || act === 'dodge')) this.p2Touched = true;""",
    """if (s === 1 && (act === 'attack' || act === 'dodge' || act === 'skill1' || act === 'skill2')) this.p2Touched = true;""")
rep("""    if (i === 1 && (a === 'attack' || a === 'dodge')) Input.p2Touched = true;""",
    """    if (i === 1 && (a === 'attack' || a === 'dodge' || a === 'skill1' || a === 'skill2')) Input.p2Touched = true;""")

# ---------------------------------------------------------------- 2P 무기: 두 손 대검 (길고 넓고 평평함)
region("  const broad = opt.blade === 'broad';", "\n  // cloak: 4 overlapping panels", """  const great = opt.blade === 'great';            // 2P: a two-handed greatsword — long, wide, flat; a long grip under the fist for the second hand
  if (!great) { const guard = mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10), M.brass); guard.position.y = 0.07; guard.rotation.y = Math.PI / 2; weapon.add(guard); }
  const bar = mesh(flat(new THREE.BoxGeometry(great ? 0.38 : 0.17, great ? 0.042 : 0.022, great ? 0.04 : 0.03)), M.brass); bar.position.y = great ? 0.1 : 0.09; weapon.add(bar);
  if (great) { const grip2 = mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.2, 6), M.vest); grip2.position.y = -0.16; weapon.add(grip2); }
  const pommel = mesh(new THREE.SphereGeometry(great ? 0.04 : 0.028, 6, 4), M.brass); pommel.position.y = great ? -0.27 : -0.085; weapon.add(pommel);
  // blade: square-section taper so it stays a 1-2 px line from every angle (2P: 1.3 u long, wide and flat)
  const blade = mesh(flat(new THREE.CylinderGeometry(great ? 0.022 : 0.004, great ? 0.088 : 0.034, great ? 1.3 : 0.96, 4)), M.steel);
  blade.position.y = great ? 0.77 : 0.58; if (great) blade.scale.z = 0.3; weapon.add(blade);
  if (great) { const ricasso = mesh(flat(new THREE.BoxGeometry(0.12, 0.16, 0.035)), M.steel); ricasso.position.y = 0.2; weapon.add(ricasso); }
""")
rep("""const player2 = buildPlayer({ cloak: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], hair: [C.BLOOD1, C.LEATH1, C.LEATH2, C.BRONZE], blade: 'broad', name: 'PLAYER 2' });   // 2P: bronze cloak · copper hair · broad blade""",
    """const player2 = buildPlayer({ cloak: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], hair: [C.BLOOD1, C.LEATH1, C.LEATH2, C.BRONZE], blade: 'great', name: 'PLAYER 2' });   // 2P: bronze cloak · copper hair · two-handed greatsword
player2.remap = { idle: 'idleB', run: 'runB' };      // the greatsword's own stance + carry (everything else is shared)
player2.order = ['idle', 'run', 'gs1', 'gs2', 'gs3', 'launch', 'sSmash', 'link', 'linkEnd', 'fTopple', 'fBackRiser', 'fPin', 'dash', 'parry', 'held', 'kneel', 'hit', 'death'];""")
rep("""scene.add(player.root, player2.root, boss.root);""", """scene.add(player.root, player2.root, boss.root);
for (const ch of [player, player2, boss]) ch.order = ch.order.filter(n => ch.clips[n] || (ch.remap && ch.clips[ch.remap[n]]));   // showcase lists only clips that exist""")
rep("""    order: ['idle', 'run', 'combo1', 'combo2', 'combo3', 'dash', 'parry', 'launch', 'link', 'linkEnd', 'held', 'kneel', 'hit', 'death'],""",
    """    order: ['idle', 'run', 'combo1', 'combo2', 'combo3', 'sThrust', 'sSpin', 'fSkyPierce', 'fSkyDance', 'fCrown', 'fSpine', 'dash', 'parry', 'held', 'kneel', 'hit', 'death'],""")

# ---------------------------------------------------------------- character: per-character clip remap (2P's greatsword stance)
rep("""  play(name, speed = 1, from = 0) {
    this.clip = this.clips[name];""", """  play(name, speed = 1, from = 0) {
    name = (this.remap && this.remap[name]) || name;   // e.g. the greatsword's own idle
    this.clip = this.clips[name];""")
rep("""  is(name) { return !!this.clip && this.clip.name === name; }""",
    """  is(name) { return !!this.clip && (this.clip.name === name || (!!this.remap && this.clip.name === this.remap[name])); }""")

# ---------------------------------------------------------------- F2 overlay + showcase: the greatsword swings / 2P in the showcase
rep("""  const n = PC.state === 'attack' ? PC.combo : 1, A = FEEL.ATK[n];""", """  const n = PC.state === 'attack' ? PC.combo : 1, A = PC.atk(n);""")

# ---------------------------------------------------------------- 2P greatsword stance (two hands on the long grip, point up and forward)
rep("""const P_ = (o = {}) => ({ ...PS, ...o });""", """const P_ = (o = {}) => ({ ...PS, ...o });
const PSB = {                                   // greatsword guard: wide stance, right fist high on the grip, left fist below it, point up-forward
  body: { p: [0, -0.08, 0] },
  spine: [0.1, 0.42, 0], chest: [0.04, 0.16, 0], neck: [0, 0, 0], head: [0.05, -0.56, 0],
  shR: [-0.3, 0.2, -0.12], elR: [-0.95, 0, 0], hdR: [0.25, 0, 0],
  shL: [-0.62, 0, -0.42], elL: [-0.95, 0, 0], hdL: [0.3, 0, 0],
  thR: [-0.42, 0, -0.1], knR: [0.36, 0, 0], ftR: [0.06, 0, 0],
  thL: [0.3, 0, 0.18], knL: [0.42, 0, 0], ftL: [-0.1, 0, 0],
};
const PB_ = (o = {}) => ({ ...PSB, ...o });""")

# ---------------------------------------------------------------- new game parts: the 1.5 link layer (starters · statuses · finishers)
rep("""/* =============================================================================
 * 16. BOSS AI""", part('link15.js') + part('shuttle.js') + part('mark.js') + """
/* =============================================================================
 * 16. BOSS AI""")

# ---------------------------------------------------------------- boss clip list (showcase order) + the 1.5 status poses
rep("""    order: ['idle', 'walk', 'jabR', 'jabL', 'grab', 'hold', 'grabSlam', 'grabRelease', 'lifted', 'liftDrop', 'slam', 'sweep', 'charge', 'leap', 'shot', 'nova', 'spiral', 'cast', 'groggy', 'death'],""",
    """    order: ['idle', 'walk', 'jabR', 'jabL', 'grab', 'hold', 'grabSlam', 'grabRelease', 'lifted', 'liftDrop', 'kneelDown', 'staggered', 'turned', 'reel', 'orbThrow', 'mark', 'bash', 'shieldRush', 'slam', 'sweep', 'charge', 'leap', 'shot', 'nova', 'spiral', 'cast', 'groggy', 'death'],""")

# ---------------------------------------------------------------- x-ray silhouette: players only, never their sword smears (a big finisher arc behind the boss read as a brown ghost)
rep("""      const parent = r.parent; Xray.scene.add(r);
      Xray.scene.overrideMaterial.uniforms.uWho.value = i;
      renderer.render(Xray.scene, camera);
      parent.add(r);""", """      const parent = r.parent; Xray.scene.add(r);
      const sm = t.smear && t.smear.mesh, smv = sm && sm.visible; if (sm) sm.visible = false;
      Xray.scene.overrideMaterial.uniforms.uWho.value = i;
      renderer.render(Xray.scene, camera);
      if (sm) sm.visible = smv;
      parent.add(r);""")

# ---------------------------------------------------------------- shuttle orb particles (1P slate ◆ · 2P bronze ■)
rep("""  heal:   { cols: [C.HOTW, C.BONE2, C.HOT, C.EMBER], g: 1.6, drag: 2.2, bounce: 0 },   // potion / revive: warm motes drifting up""",
    """  heal:   { cols: [C.HOTW, C.BONE2, C.HOT, C.EMBER], g: 1.6, drag: 2.2, bounce: 0 },   // potion / revive: warm motes drifting up
  orbA:   { cols: [C.BONE2, C.SLATE3, C.SLATE2, C.SLATE1], g: 0, drag: 5, bounce: 0 },      // shuttle orb for 1P (slate)
  orbB:   { cols: [C.HOTW, C.HOT, C.BRONZE, C.LEATH2], g: 0, drag: 5, bounce: 0 },          // shuttle orb for 2P (bronze)""")
rep("""        case 'waveR': case 'waveB':               // lingering 2 px dot (shard trail)""",
    """        case 'orbA': case 'orbB': { const s = power;   // shuttle orb: glinting motes left in its wake
          this.spawn(p.x + rx * 0.12, p.y + ry * 0.12, p.z + rz * 0.12, rx * s, ry * s, rz * s, rnd(0.15, 0.35), Math.random() < 0.4 ? 2 : 1, sp); break; }
        case 'waveR': case 'waveB':               // lingering 2 px dot (shard trail)""")

# ---------------------------------------------------------------- boss rush data: per-boss pattern pools / weights (boss 1 = + shuttle)
rep("""  { name: 'THE SCARLET COLOSSUS', skin: 'scarlet', size: 1.0, hp: 1.0, speed: 1.0, attach: [],""",
    """  // pools / weights: 페이즈별 패턴 목록 · 가중치 덮어쓰기 (없으면 FIGHT.POOLS · FIGHT.WEIGHTS)
  { name: 'THE SCARLET COLOSSUS', skin: 'scarlet', size: 1.0, hp: 1.0, speed: 1.0, attach: [],
    pools: [['slam', 'sweep', 'charge', 'nova', 'combo', 'grab', 'shuttle'], ['slam', 'sweep', 'charge', 'nova', 'combo', 'grab', 'leap', 'shot', 'shuttle'],
            ['slam', 'sweep', 'charge', 'nova', 'combo', 'grab', 'leap', 'shot', 'spiral', 'shuttle']],
    weights: { shuttle: 2.4 },""")

# ---------------------------------------------------------------- boss 2 — THE AZURE WARDEN (same rig, azure skin + kite shield) · per-boss phase looks & banners
rep("""    floorChance: [0.2, 0.26, 0.3], floors: [['split', 'chain', 'donut'], ['split', 'cross', 'checker', 'rdonut'], ['split', 'rotor', 'xcross', 'safe', 'chain']] },
];""", """    floorChance: [0.2, 0.26, 0.3], floors: [['split', 'chain', 'donut'], ['split', 'cross', 'checker', 'rdonut'], ['split', 'rotor', 'xcross', 'safe', 'chain']],
    look: { horns: 2, wings: 3 }, banners: ['THE CRYSTALS AWAKEN', 'THE COLOSSUS UNBOUND'] },
  // 보스 2: 방패 변형 패턴(방패 밀치기 · 방패 뒤 돌진) + 표식 넘기기. 나머지는 1단계 패턴을 가중치만 바꿔 재사용 · 3페이즈에 방패가 깨짐
  { name: 'THE AZURE WARDEN', skin: 'azure', size: 1.0, hp: 1.0, speed: 1.0, attach: ['shield'],
    pools: [['slam', 'sweep', 'bash', 'shieldRush', 'nova', 'combo', 'grab', 'mark'], ['slam', 'sweep', 'bash', 'shieldRush', 'nova', 'combo', 'grab', 'leap', 'shot', 'mark'],
            ['slam', 'sweep', 'charge', 'nova', 'combo', 'grab', 'leap', 'shot', 'spiral', 'mark']],
    weights: { mark: 2.6, bash: 2.6, shieldRush: 2.0, combo: 3.0, slam: 2.4, sweep: 2.4, grab: 1.5, charge: 1.6 },
    waves: { slam: 'red', sweep: 'red', charge: 'red', leap: 'red', shot: 'red', combo: 'red', bash: 'red', shieldRush: 'red', nova: null, spiral: null, grab: null }, floorWave: null,
    floorChance: [0.2, 0.26, 0.3], floors: [['split', 'checker', 'donut'], ['split', 'cross', 'rdonut', 'chain'], ['split', 'rotor', 'xcross', 'safe']],
    look: { shieldUntil: 2, horns: 2, wings: 3 }, banners: ['THE WARD HARDENS', 'THE SHIELD SHATTERS'] },
];""")
rep("""  CHARGE: { dmg: 22, lockF: 5, rushF0: 6, rushF1: 9, maxL: 7.5, minL: 2.6, wid: 1.6 },   // 돌진 공격: 5프레임 조준 → 직선 돌진""",
    """  CHARGE: { dmg: 22, lockF: 5, rushF0: 6, rushF1: 9, maxL: 7.5, minL: 2.6, wid: 1.6 },   // 돌진 공격: 5프레임 조준 → 직선 돌진 (보스 2 방패 뒤 돌진도 같은 수치)
  BASH: { dmg: 22, r: 3.3, half: 0.75, lockF: 5, hitF: 9, push: 1.6 },   // 보스 2 방패 밀치기: 앞쪽 부채꼴 · 붉은(패리 가능) · 맞으면 push 유닛 밀려남""")
# decal: the mark's telegraph (wave 1) gets a cyan rim, not the crimson 'parry me' rim
rep("""      idx = uAlly > 0.5 ? (uWave > 1.5 ? 31 : uWave > 0.5 ? 29 : 23) : uWave > 2.5 ? (uLock < 0.5 ? 8 : 10) : (uLock < 0.5 ? 20 : 21);""",
    """      idx = uAlly > 0.5 ? (uWave > 1.5 ? 31 : uWave > 0.5 ? 29 : 23) : uWave > 2.5 ? (uLock < 0.5 ? 8 : 10) : uWave > 0.5 && uWave < 1.5 ? (uLock < 0.5 ? 14 : 29) : (uLock < 0.5 ? 20 : 21);""")

# ================================================================ 10단계 수치 조정 (값만) — 1차: 보스 체력 · 보스 피해 · 휴식 회복
rep("""  { name: 'THE SCARLET COLOSSUS', skin: 'scarlet', size: 1.0, hp: 1.0, speed: 1.0, attach: [],""",
    """  { name: 'THE SCARLET COLOSSUS', skin: 'scarlet', size: 1.0, hp: 0.85, speed: 1.0, attach: [],   // hp 1.0 → 0.85 (1차: 합 봇 보스 1 4.9분)""")
rep("""  { name: 'THE AZURE WARDEN', skin: 'azure', size: 1.0, hp: 1.0, speed: 1.0, attach: ['shield'],""",
    """  { name: 'THE AZURE WARDEN', skin: 'azure', size: 1.0, hp: 0.78, speed: 1.0, attach: ['shield'],   // hp 1.0 → 0.78 (1차: 합 봇 보스 2 6.1분)""")
rep("""  BOSS_DMG: 0.6,            // 보스가 주는 모든 피해 배율 (포션이 없어진 4~7분 보스전에 맞춤)""",
    """  BOSS_DMG: 0.5,            // 보스가 주는 모든 피해 배율 (1.5단계 1차: 0.6 → 0.5 — 표식·셔틀 실패 피해가 더해짐, 2체 러시)""")
rep("""  RUSH: { restT: 8, hideT: 3.2, healFrac: 0.5, reviveHp: 0.6, entT: 0.8 },""",
    """  RUSH: { restT: 8, hideT: 3.2, healFrac: 1.0, reviveHp: 0.6, entT: 0.8 },   // healFrac 0.5 → 1.0 (1차: 보스 2 시작을 가득 찬 체력으로)""")

# ---------------------------------------------------------------- 2차: 마무리 피해 ×1.2 · 스매시 260→320 (합 대비 무시 시간 비율) · 표식 피해 22→18 (무시 봇 생존)
rep("""    skyPierce:   { dmg: 250, hits: 1, brk: 18, stop: 0.16 },""", """    skyPierce:   { dmg: 300, hits: 1, brk: 18, stop: 0.16 },   // (2차: 마무리 피해 ×1.2)""")
rep("""    skyDance:    { dmg: 38, hits: 4, brk: 5, stop: 0.06, rally: 2 },""", """    skyDance:    { dmg: 46, hits: 4, brk: 5, stop: 0.06, rally: 2 },""")
rep("""    crownThrust: { dmg: 90, hits: 1, brk: 95, stop: 0.18 },""", """    crownThrust: { dmg: 110, hits: 1, brk: 95, stop: 0.18 },""")
rep("""    spineRide:   { dmg: 26, hits: 3, brk: 6, stop: 0.07 },""", """    spineRide:   { dmg: 31, hits: 3, brk: 6, stop: 0.07 },""")
rep("""    ramLink:     { dmg: 180, hits: 1, brk: 35, stop: 0.2 },""", """    ramLink:     { dmg: 215, hits: 1, brk: 35, stop: 0.2 },""")
rep("""    topple:      { dmg: 80, hits: 1, brk: 0, stop: 0.16, groggyT: 1.6 },""", """    topple:      { dmg: 95, hits: 1, brk: 0, stop: 0.16, groggyT: 1.6 },""")
rep("""    backRiser:   { dmg: 95, hits: 1, brk: 12, stop: 0.18 },""", """    backRiser:   { dmg: 115, hits: 1, brk: 12, stop: 0.18 },""")
rep("""    pinDown:     { dmg: 60, hits: 1, brk: 10, stop: 0.14, pinT: 5.0 },""", """    pinDown:     { dmg: 72, hits: 1, brk: 10, stop: 0.14, pinT: 5.0 },""")
rep("""             smashT: 0.45, smashDmg: 260, smashStop: 0.2, missDmg: 30, splashDmg: 15, splashR: 1.8 },""",
    """             smashT: 0.45, smashDmg: 320, smashStop: 0.2, missDmg: 30, splashDmg: 15, splashR: 1.8 },   // smashDmg 260 → 320 (2차)""")
rep("""  MARK: { n: [4, 4, 6], gap: 1.2, soloGap: 1.25, lead: 1.1, lock: 0.35, r: 1.2, dmg: 22, recover: 0.6, flashEvery: 0.45 },""",
    """  MARK: { n: [4, 4, 6], gap: 1.2, soloGap: 1.25, lead: 1.1, lock: 0.35, r: 1.2, dmg: 18, recover: 0.6, flashEvery: 0.45 },   // dmg 22 → 18 (2차)""")

# ================================================================ 노트북 키보드 하나로 2인: 2P 키 표시가 2P가 쓴 키 묶음(노트북 / 숫자패드)을 따라감
rep("""  padOn: false, padOK: true, p2Touched: false,""",
    """  padOn: false, padOK: true, p2Touched: false,
  p2Num: false,                                  // 2P가 마지막에 누른 키가 숫자패드였나 → HUD에 숫자패드 글자 / 아니면 노트북 글자""")
rep("""    (i ? Input.pressed2 : Input.pressed).add(a);
    if (i === 1 && (a === 'attack' || a === 'dodge' || a === 'skill1' || a === 'skill2')) Input.p2Touched = true;""",
    """    (i ? Input.pressed2 : Input.pressed).add(a);
    if (i === 1) Input.p2Num = e.code.startsWith('Numpad');
    if (i === 1 && (a === 'attack' || a === 'dodge' || a === 'skill1' || a === 'skill2')) Input.p2Touched = true;""")
rep("""상호작용 키(1P F · 2P 숫자패드 3 · 패드 Y)""", """상호작용 키(1P F · 2P . 또는 숫자패드 3 · 패드 Y)""")
rep("""  // ── 패리 (1P K · 2P 숫자패드 2 · 패드 B) ────────────────""", """  // ── 패리 (1P K · 2P ; 또는 숫자패드 2 · 패드 B) ────────""")
rep("""['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();""",
    """['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();   // ' / = 파이어폭스 빠른 찾기 막기 (2P 공격 · 회피)""")
