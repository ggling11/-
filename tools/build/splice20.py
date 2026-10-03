# ================================================================ 2단계: 캐릭터 5명 · 스킬 3개 중 2개 · 공통 호응 마무리 · 유물 · 보스 4체
# (splice.py가 splice16.py 다음에 실행 — 문자열 기준 위치만, 행 번호 X)

# ---------------------------------------------------------------- 1단계: 1.6 FEEL.SKILLS · KIT · WAVE.color · cdHit → 2단계 데이터 표로 (값은 그대로)
region("  SKILLS: {\n    thrust:", "  LINK_WINDOW: 1.5,", """  // (스킬 표 SKILLS와 캐릭터별 장착 KIT은 2단계에서 파일 위쪽 '2단계 데이터' 구역의 SKILLS2 · CHARS로 옮김 — FEEL.SKILLS = SKILLS2)
""")
rep("""  //  color [A, B] · cdHit: 평타가 보스에 맞을 때마다 줄어드는 스킬 쿨타임(초, [A, B] — 대검은 느려서 한 대당 더 많이)""",
    """  //  (사람별 색 · 평타 적중 쿨타임 감소는 2단계에서 캐릭터 표 CHARS.color · CHARS.cdHit로 옮김)""")
rep("""  WAVE: { color: ['blue', 'red'], max: 3, cdHit: [0.15, 0.3],""", """  WAVE: { max: 3,""")

rep("""/* =============================================================================
 * 1b. BOSS RUSH DATA""", """/* =============================================================================
 * 0b. 2단계 데이터 — 캐릭터 · 스킬 · 마무리 효과 · 유물. 자주 바뀌는 것은 여기서만 고친다.
 * ========================================================================== */
// 캐릭터 5명. color: 'blue' 청파 · 'red' 적파 · 'both' 둘 다 흡수(쌍검) — 시동 방향: 청 = 휘청·돌아섬, 적 = 뜸·무릎
//   combo: 평타 표(FEEL 키, 타수 = 항목 수) · skills: 스킬 3개(SKILLS2 이름) · def: 처음 장착 [U, I] · cdHit: 평타가 보스에 맞을 때마다 줄어드는 스킬 쿨타임(초)
//   rig: 외형 (망토·머리 색 램프, 무기 모양 blade, face: HUD 초상 색 H 머리 · h 머리 그늘 · c 망토, remap: 이 캐릭터만의 대기·달리기 동작)
//   label: HUD 이름(영어 3x5 글꼴) · ready: 이 단계에서 고를 수 있나 (동작이 다 만들어진 캐릭터만)
const CHARS = {
  rapier: { label: 'RAPIER', color: 'blue', combo: 'ATK', skills: ['thrust', 'spin', 'windThrust'], def: ['thrust', 'spin'], cdHit: 0.15, ready: true,
            rig: { cloak: null, hair: null, blade: null, face: { H: C.BONE2, h: C.STONE3, c: C.SLATE2 } } },   // null = 원본 1P 그대로 (청회 망토 · 세검)
  great:  { label: 'GREATSWORD', color: 'red', combo: 'ATK_B', skills: ['launch', 'smash', 'earthSplit'], def: ['launch', 'smash'], cdHit: 0.3, ready: true,
            rig: { cloak: [C.LEATH0, C.LEATH1, C.LEATH2, C.BRONZE], hair: [C.BLOOD1, C.LEATH1, C.LEATH2, C.BRONZE], blade: 'great',
                   face: { H: C.LEATH2, h: C.LEATH1, c: C.BRONZE }, remap: { idle: 'idleB', run: 'runB' } } },
  chain:  { label: 'CHAIN', color: 'blue', combo: 'ATK_C', skills: ['chainSnatch', 'sickleHook', 'chainWhirl'], def: ['chainSnatch', 'sickleHook'], cdHit: 0.18, ready: true,
            rig: { cloak: [C.ABYSS, C.SLATE0, C.SLATE1, C.SLATE2], hair: [C.VOID, C.SHADE, C.DUSK, C.STONE1], blade: 'chain', face: { H: C.STONE1, h: C.DUSK, c: C.SLATE1 },
                   remap: { idle: 'idleC', run: 'runC' } } },
  shield: { label: 'SHIELD', color: 'red', combo: 'ATK_S', skills: ['shieldLift', 'maceSlam', 'shieldCharge'], def: ['shieldLift', 'maceSlam'], cdHit: 0.22, ready: true,
            rig: { cloak: [C.BLOOD1, C.BLOOD2, C.CRIM0, C.CRIM1], hair: [C.SHADE, C.LEATH0, C.LEATH1, C.LEATH2], blade: 'shield', face: { H: C.LEATH1, h: C.LEATH0, c: C.CRIM1 },
                   remap: { idle: 'idleS', run: 'runS' } } },
  twin:   { label: 'TWIN', color: 'both', combo: 'ATK_T', skills: ['crossCut', 'spinRise', 'twinDrop'], def: ['crossCut', 'spinRise'], cdHit: 0.12, ready: true,
            rig: { cloak: [C.STONE1, C.STONE3, C.BONE0, C.BONE1], hair: [C.STONE0, C.STONE2, C.BONE0, C.BONE2], blade: 'twin', face: { H: C.BONE1, h: C.STONE2, c: C.STONE3 },
                   remap: { idle: 'idleT', run: 'runT' } } },
};
const WAVE_COLORS = ['blue', 'red'];              // 파장 색 두 가지 (태그 솔로 번갈아 치기 · 쌍검을 노린 가시는 이 순서로 번갈아)
const START_CHARS = ['rapier', 'great'];          // 처음 1P / 2P (태그 솔로: 앞 / 뒤) — 캐릭터 선택 화면이 바꿈
// 캐릭터 선택 화면 키 [1P, 2P] (싸움 키와 따로 — 패드는 스틱 + A 확인 · B 취소). 혼자일 때 2P 키(방향키 · Enter · L …)를 누르면 2인으로
//   ok 확인 · back 취소 (1P 공격·패리 키 J K / 한 키보드 G H, 2P 공격·패리 L K / 숫자패드 1 2) · K는 혼자면 1P 취소, 2인이면 2P 취소
const SELECT_KEYS = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], ok: ['Space', 'KeyJ', 'KeyG'], back: ['Escape', 'KeyH'], backSolo: ['KeyK'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], ok: ['Enter', 'NumpadEnter', 'KeyL', 'Numpad1'], back: ['Backspace', 'Numpad0', 'Numpad2'], backDuo: ['KeyK'] },
];
// 스킬 15개. dmg 피해(연타면 타당) · hits 타 수 · brk 그로기 · cd 쿨타임(초) · reach 보스 표면까지 닿는 거리 · half 판정 부채꼴 반각(라디안)
//   hitstop 적중 정지(초) · lock 이 시간(초) 뒤부터 대시·공격·패리로 캔슬 · status 적중 시 보스 상태 · clip 동작(마무리도 이 동작을 다시 씀)
//   shape: 'single' 한방 / 'multi' 연타 / 'area' 범위 — 마무리 효과(FIN2)의 모양 · ready: 동작이 만들어졌나 (false면 장착 못 함) · name: 선택 화면·HUD 이름(영어)
//   proj: 날아가는 시동 — 'gust' 검풍(동작의 적중 프레임마다 하나, speed 유닛/초, w 판정 여유) · 'crack' 바닥 균열(speed로 달려가 보스에 닿거나 reach 끝에서 hits번 터짐, gap 간격 · burstR 반경)
//     → 마지막 것이 끝났을 때 한 번이라도 맞았으면 status (★11)
const SKILLS2 = {
  // A 세검 (청)
  thrust:      { name: 'FLASH THRUST', dmg: 45, hits: 1, brk: 3, cd: 6, reach: 1.6, half: 0.55, hitstop: 0.1, lock: 0.58, status: 'stagger', shape: 'single', clip: 'sThrust', ready: true, lunge: 5.2 },   // 섬광 찌르기: 긴 돌진 찌르기 · lunge 보스까지 늘어나는 최대 돌진
  spin:        { name: 'REVERSE SPIN', dmg: 40, hits: 1, brk: 3, cd: 7, reach: 2.7, half: 3.2, hitstop: 0.1, lock: 0.62, status: 'turn', shape: 'area', clip: 'sSpin', ready: true },                     // 역회전 베기: 몸을 돌리며 한 바퀴 → 돌아섬
  windThrust:  { name: 'WIND THRUST', dmg: 16, hits: 3, brk: 1, cd: 7, reach: 7.0, half: 0.35, hitstop: 0.06, lock: 0.72, status: 'stagger', shape: 'multi', clip: 'sWind', ready: true,
                 proj: 'gust', speed: 18, w: 0.3 },              // 바람 찌르기: 제자리에서 검풍 3연발 (먼 거리 시동) · lock 0.6 → 0.72 (셋째 검풍 f8 = 0.67초 뒤로)
  // B 대검 (적)
  launch:      { name: 'RISING CLEAVE', dmg: 40, hits: 1, brk: 4, cd: 6, reach: 2.9, half: 1.1, hitstop: 0.1, lock: 0.62, status: 'lift', shape: 'single', clip: 'launch', ready: true },                  // 올려치기(1단계 띄우기) → 뜸
  smash:       { name: 'GROUND SMASH', dmg: 50, hits: 1, brk: 5, cd: 8, reach: 3.1, half: 0.8, hitstop: 0.14, lock: 0.8, status: 'kneel', shape: 'area', clip: 'sSmash', ready: true },                   // 내려찍기: 대검을 땅에 박음 → 무릎
  earthSplit:  { name: 'EARTH SPLIT', dmg: 20, hits: 3, brk: 2, cd: 8, reach: 6.0, half: 0.3, hitstop: 0.08, lock: 0.85, status: 'kneel', shape: 'multi', clip: 'sEarth', ready: true,
                 proj: 'crack', speed: 16, burstR: 0.9, gap: 0.12 },               // 대지 가르기: 직선 충격파가 보스까지 달려가 3번 터짐
  // 사슬낫 (청)
  chainSnatch: { name: 'CHAIN SNATCH', dmg: 38, hits: 1, brk: 3, cd: 7, reach: 5.0, half: 0.4, hitstop: 0.1, lock: 0.6, status: 'stagger', shape: 'single', clip: 'cSnatch', ready: true, pull: true }, // 사슬 잡아채기 + 파트너를 보스 등 뒤로 끌어옴
  sickleHook:  { name: 'SICKLE HOOK', dmg: 15, hits: 3, brk: 1, cd: 7, reach: 5.5, half: 0.5, hitstop: 0.06, lock: 0.7, status: 'turn', shape: 'multi', clip: 'cHook', ready: true },                 // 낫 걸어 당기기: 보스 너머에 낫을 걸고 3번 당겨 돌림
  chainWhirl:  { name: 'CHAIN WHIRL', dmg: 36, hits: 1, brk: 3, cd: 8, reach: 3.2, half: 3.2, hitstop: 0.1, lock: 0.7, status: 'turn', shape: 'area', clip: 'cWhirl', ready: true },                  // 사슬 회오리: 몸 주위로 사슬 회전
  // 방패+철퇴 (적)
  shieldLift:  { name: 'SHIELD LIFT', dmg: 36, hits: 1, brk: 4, cd: 7, reach: 2.4, half: 0.9, hitstop: 0.1, lock: 0.62, status: 'lift', shape: 'single', clip: 'hLift', ready: true, coverBoost: true }, // 방패 올려치기 + 1초간 커버 범위 2배
  maceSlam:    { name: 'MACE SLAM', dmg: 48, hits: 1, brk: 5, cd: 8, reach: 2.8, half: 1.0, hitstop: 0.14, lock: 0.8, status: 'kneel', shape: 'area', clip: 'hSlam', ready: true },                  // 철퇴 내려찍기: 바닥 충격
  shieldCharge:{ name: 'SHIELD CHARGE', dmg: 16, hits: 3, brk: 2, cd: 8, reach: 2.2, half: 0.8, hitstop: 0.07, lock: 0.7, status: 'lift', shape: 'multi', clip: 'hCharge', ready: true },                // 방패 돌진: 밀며 3번 부딪힘
  // 쌍검 (청·적)
  crossCut:    { name: 'CROSS CUT', dmg: 12, hits: 4, brk: 1, cd: 6, reach: 2.4, half: 1.2, hitstop: 0.05, lock: 0.6, status: 'stagger', shape: 'multi', clip: 'tCross', ready: true },              // 교차 베기: 4연 베기
  spinRise:    { name: 'RISING SPIN', dmg: 36, hits: 1, brk: 3, cd: 7, reach: 2.6, half: 3.2, hitstop: 0.1, lock: 0.65, status: 'lift', shape: 'area', clip: 'tRise', ready: true },                   // 회전 올려베기
  twinDrop:    { name: 'TWIN DROP', dmg: 46, hits: 1, brk: 5, cd: 8, reach: 2.0, half: 0.8, hitstop: 0.13, lock: 0.75, status: 'kneel', shape: 'single', clip: 'tDrop', ready: true },               // 쌍날 낙하
};
FEEL.SKILLS = SKILLS2;                             // (1.5·1.6 코드가 쓰는 이름 그대로)
// 마무리 효과 = 상태(종류) × 받는 사람이 누른 스킬의 모양 (3단계부터 씀). 첫 값은 1.6 마무리 8개의 피해·그로기·정지에 맞춤
//   dmg 총 피해(연타면 hits로 나눔, 등 뒤 ×1.5 · 등 약점 ×3은 따로) · hits 타 수 · brk 타당 그로기 · stop 적중 정지(초) · rally 첫 적중 때 랠리 +
//   weak: 등 뒤에서 치면 등 약점(×3)에 맞음 · weakAll: 앞에서도 가슴 약점에 맞음(약점 동시 적중, ×3 — 그래서 피해 첫 값을 낮춤)
//   push: 보스 밀려나는 거리 · pinT: 선회 봉인(초) · wide: 판정 넓힘 배율 (보스가 둘일 때 범위 마무리가 옆 보스도 맞힘 — 10단계)
const FIN2 = {
  lift:    { single: { dmg: 300, hits: 1, brk: 18, stop: 0.16 },                   multi: { dmg: 200, hits: 4, brk: 5, stop: 0.06, rally: 1 },  area: { dmg: 90, hits: 1, brk: 18, stop: 0.14, weakAll: true, wide: 1.5 } },   // 뜸 → 큰 피해 (범위 90 × 약점 3 = 270 < 한방 300)
  kneel:   { single: { dmg: 110, hits: 1, brk: 95, stop: 0.18 },                   multi: { dmg: 90, hits: 3, brk: 24, stop: 0.07, rally: 1 },  area: { dmg: 100, hits: 1, brk: 80, stop: 0.16, wide: 1.5 } },               // 무릎 → 그로기
  stagger: { single: { dmg: 215, hits: 1, brk: 35, stop: 0.2, push: 2.0 },         multi: { dmg: 150, hits: 3, brk: 10, stop: 0.08, rally: 1 }, area: { dmg: 160, hits: 1, brk: 30, stop: 0.16, push: 2.5, wide: 1.5 } },    // 휘청 → 정지·밀어내기
  turn:    { single: { dmg: 115, hits: 1, brk: 12, stop: 0.18, weak: true },       multi: { dmg: 93, hits: 3, brk: 6, stop: 0.07, rally: 1, weak: true }, area: { dmg: 72, hits: 1, brk: 10, stop: 0.14, weak: true, pinT: 3.0 } },   // 돌아섬 → 위치
};
// 마무리 이름 앞말 (상태별 공통 호응) — HUD·컷인 이름 = 앞말 + 스킬 이름 (예: AERIAL FLASH THRUST)
const FIN2_PREFIX = { lift: 'AERIAL', kneel: 'DIVING', stagger: 'RUSHING', turn: 'FLANKING' };
// 전용 합동기 = 1.5 세검 + 대검 전용 마무리 8개: 이 쌍이고 그 상태의 유물이 있으면, 받는 사람이 누른 스킬 → 기존 전용 동작(FINDEF)
const FIN_EX = { lift: { thrust: 'skyPierce', spin: 'skyDance' }, kneel: { thrust: 'crownThrust', spin: 'spineRide' },
                 stagger: { launch: 'ramLink', smash: 'topple' }, turn: { launch: 'backRiser', smash: 'pinDown' } };
// 유물 12개. id · name: 카드 제목(영어 HUD) · en: 카드 효과 한 줄(영어 3x5 글꼴) · ko: 효과(한국어 설명) · kind: 효과 종류(훅 Relics.mul/sum/has/team이 묻는 이름) · v: 값
//   pair: 이 두 캐릭터가 듀오일 때만 나옴 (전용 합동기) · col: 카드·아이콘 색 · w: 봇이 고를 때 가중치
const RELICS = [
  { id: 'exLift',  name: 'SKY ART',     en: 'LIFTED FINISHERS BECOME THE RAPIER+GREAT DUO ARTS',   ko: '뜸 마무리가 전용 합동기로 (세검+대검)',     kind: 'exclusive', v: 'lift',    pair: ['rapier', 'great'], col: C.HOT, w: 1 },
  { id: 'exKneel', name: 'CROWN ART',   en: 'KNEEL FINISHERS BECOME THE RAPIER+GREAT DUO ARTS',    ko: '무릎 마무리가 전용 합동기로 (세검+대검)',   kind: 'exclusive', v: 'kneel',   pair: ['rapier', 'great'], col: C.HOT, w: 1 },
  { id: 'exStag',  name: 'RAM ART',     en: 'STAGGER FINISHERS BECOME THE RAPIER+GREAT DUO ARTS',  ko: '휘청 마무리가 전용 합동기로 (세검+대검)',   kind: 'exclusive', v: 'stagger', pair: ['rapier', 'great'], col: C.HOT, w: 1 },
  { id: 'exTurn',  name: 'BACK ART',    en: 'TURNED FINISHERS BECOME THE RAPIER+GREAT DUO ARTS',   ko: '돌아섬 마무리가 전용 합동기로 (세검+대검)', kind: 'exclusive', v: 'turn',    pair: ['rapier', 'great'], col: C.HOT, w: 1 },
  { id: 'echo',    name: 'ECHO MASK',   en: 'PARTNER FINISHER: MY SHADOW REPEATS IT AT 30%',  ko: '파트너 마무리 0.5초 뒤 내 그림자가 같은 스킬을 30% 위력으로 한 번 더', kind: 'echo', v: { delay: 0.5, mul: 0.3 }, col: C.PURP1, w: 1 },
  { id: 'slot4',   name: 'FOURTH SLOT', en: 'WAVE SLOTS 3 > 4',                               ko: '파장 칸 3 → 4',                              kind: 'slots', v: 4, col: C.CYAN, w: 1 },
  { id: 'handoff', name: 'HANDOFF',     en: 'WAVES I COVER GO TO MY PARTNER, ANY COLOUR',     ko: '커버로 막은 파장을 색과 상관없이 파트너 칸에', kind: 'handoff', v: 1, col: C.BONE1, w: 1 },
  { id: 'longBeat',name: 'LONG BEAT',   en: 'STATUSES I START LAST 30% LONGER',               ko: '내가 건 상태 시간 +30%',                     kind: 'statusT', v: 1.3, col: C.SLATE3, w: 1 },
  { id: 'ember',   name: 'RALLY EMBER', en: 'THE RALLY FADES 50% SLOWER',                     ko: '랠리가 줄어드는 시간 +50%',                  kind: 'rallyDecay', v: 1.5, col: C.EMBER, w: 1 },
  { id: 'violet',  name: 'VIOLET CORE', en: 'VIOLET HITS DEAL +0.3 DAMAGE',                   ko: '자파 피해 배율 +0.3',                        kind: 'violetMul', v: 0.3, col: C.PURP1, w: 1 },
  { id: 'quick',   name: 'QUICK HANDS', en: 'BASIC HITS CUT SKILL COOLDOWNS 50% MORE',        ko: '평타 쿨타임 감소량 +50%',                    kind: 'cdHit', v: 1.5, col: C.BONE2, w: 1 },
  { id: 'ward',    name: 'WARD RADIUS', en: 'MY COVER RANGE +40%',                            ko: '커버 범위 +40%',                             kind: 'coverR', v: 1.4, col: C.BRONZE, w: 1 },
];

/* =============================================================================
 * 1b. BOSS RUSH DATA""")

# ---------------------------------------------------------------- 2단계 (2): 캐릭터 선택 화면 · 장착 · 듀오 규칙 · 리그 교체
rep("""  RESTART_HOLD: 0.6,        // 싸우는 중 R을 이 시간(초) 꾹 눌러야 재시작 (한 키보드 2인 손 근처라 실수 방지) · 끝 화면에서는 한 번""",
    """  RESTART_HOLD: 0.6,        // 싸우는 중 R을 이 시간(초) 꾹 눌러야 재시작 (한 키보드 2인 손 근처라 실수 방지) · 끝 화면에서는 한 번
  SELECT_START: 0.8,        // 2단계 캐릭터 선택: 둘 다 READY가 된 뒤 이 시간(초) 뒤 시작 (그 사이 취소 가능)
  SELECT_STAND: 1.1,        //   고른 두 캐릭터가 서는 자리: 화면 가운데에서 좌우로 이 거리(유닛)
  SELECT_FOCUS_Y: 1.35,     //   선택 화면 카메라가 보는 높이(유닛) — 두 캐릭터가 양쪽 패널 사이에 보이게
  SELECT_ZOOM: 1.8,         //   선택 화면 카메라 확대 (싸움 1)""")
rep("""const GKEYS = { KeyR: 'restart', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo' };""",
    """const GKEYS = { KeyR: 'restart', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo', KeyC: 'chars' };   // 2단계 C: 끝 화면에서 캐릭터 선택으로""")
rep("""['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F8', 'Quote', 'Slash'].includes(e.code)) e.preventDefault();""",
    """['Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F8', 'Quote', 'Slash', 'Backspace'].includes(e.code)) e.preventDefault();""")
rep("""  keys.add(e.code);\n""", """  keys.add(e.code); if ((Select.on || Relics.open) && Select.taps.length < 32) Select.taps.push(e.code);   // 2단계: 선택 화면은 누른 순간을 따로 모음 (한 프레임보다 짧은 탭도)\n""")
# 초상: 사람 번호 대신 캐릭터 색 (CHARS rig.face)
rep("""  const pal = { H: f.idx ? C.LEATH2 : C.BONE2, h: f.idx ? C.LEATH1 : C.STONE3, s: C.BONE0, r: C.CRIM2, d: C.STONE2, c: f.idx ? C.BRONZE : C.SLATE2 };""",
    """  const pal = facePal(f);                         // 2단계: the character's colours (CHARS rig.face)""")
# 컷아웃 · 충돌: 1P/2P 리그 고정 대신 캐릭터 리그 전부 (보이는 것만)
rep("""  for (const ch of [player, player2]) {\n    if (!ch.root.visible || n > 1) continue;""",
    """  for (const ch of Rigs.list) {                  // 2단계: every character rig (only the visible ones count)\n    if (!ch.root.visible || n > 1) continue;""")
rep("""  for (const o of [player, player2, boss]) if (o !== ch && o.root.visible && o.pos.y < 0.6) list.push({ x: o.pos.x, z: o.pos.z, r: o.radius });""",
    """  for (const o of Rigs.bodies) if (o !== ch && o.root.visible && o.pos.y < 0.6) list.push({ x: o.pos.x, z: o.pos.z, r: o.radius });   // 2단계: character rigs + boss""")
# 새 파트: 캐릭터 선택 (보스 AI 앞)
rep("""/* =============================================================================
 * 16. BOSS AI""", part('select20.js') + part('fin20.js') + part('skills20.js') + part('rig21.js') + part('relic20.js') + part('bell20.js') + part('dokkaebi20.js') + """
/* =============================================================================
 * 16. BOSS AI""")

# ---------------------------------------------------------------- 3단계: 공통 호응 마무리 (상태별 접근 + 스킬 동작 재사용 + FIN2 효과) · 전용 8개는 유물용
rep("""  FINISH_MAXD: 10,          // 보스에서 이 거리 안에 있어야 마무리 가능""",
    """  FINISH_MAXD: 10,          // 보스에서 이 거리 안에 있어야 마무리 가능
  // 2단계 공통 호응 마무리 = 상태별 접근 경로 + 받는 사람이 누른 스킬의 기존 동작 + FIN2 효과 (위 FINISH 8개는 전용 합동기 유물일 때만)
  //  coil 웅크림(초) · leap 도약(초, 뜸·무릎) · liftGap 뜸: 보스 표면에서 멈추는 거리 · kneelUp 무릎: 머리 위로 뛰어오르는 높이 · kneelGap 무릎: 내려앉는 거리
  //  dashSpeed 휘청: 돌진 속도(유닛/초) · dashMax 최대 돌진 시간(멀면 더 빨리) · dashGap 휘청: 표면에서 멈추는 거리 · turnT 돌아섬: 반원 시간 · backGap 등 뒤 거리
  //  lead 스킬 동작을 적중 프레임 몇 프레임(12fps) 전부터 시작 (휘청 = leadDash: 부딪히자마자) · tail 마지막 적중 뒤 손 놓기까지(초) · multiGap 동작보다 타 수가 많을 때 다음 타 간격
  //  airStop 공중 적중 정지 배율(무게) · airFx 공중 이펙트 크기 배율 · drop 공중 마무리 뒤 내려오기(초) · pushT 밀어내기 시간 · maxT 안전 상한(초)
  FIN_COMMON: { coil: 2 / 12, leap: 3 / 12, liftGap: 0.3, kneelUp: 0.5, kneelGap: 0.9, dashSpeed: 18, dashMax: 0.45, dashGap: 0.35,
                turnT: 4.5 / 12, backGap: 0.6, lead: 2, leadDash: 1, tail: 0.2, multiGap: 0.12, airStop: 1.5, airFx: 1.4, drop: 0.42, pushT: 0.22, maxT: 2.6 },""")

# ---------------------------------------------------------------- 4단계: A 바람 찌르기 · B 대지 가르기 (날아가는 시동) · 대검 평타 2타 (gs1 + gs3)
rep("""  // 대검(B) 기본 3타: 느리고 무거움 · 넓고 긺 (1·2타 횡베기, 3타 내려찍기). 항목 뜻은 위 세검과 같음
  //  → 1·2타 판정까지 ≈0.2초, 전체 ≈0.5초 / 3타 판정까지 ≈0.4초, 전체 ≈0.75초 (히트스톱 제외) · 초당 피해는 세검과 비슷, 한 방·정지가 큼
  ATK_B: {
    1: { clip: 'gs1', start: 2, up: 1.6, active: 1, down: 2.2, strike: 5, chain: 8, dodge: 7, reach: 3.0, half: 1.8, dmg: 24, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.3 },
    2: { clip: 'gs2', start: 2, up: 1.6, active: 1, down: 2.2, strike: 5, chain: 8, dodge: 7, reach: 3.0, half: 1.8, dmg: 26, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.4 },
    3: { clip: 'gs3', start: 3, up: 1.3, active: 1, down: 1.8, strike: 8, chain: 99, dodge: 11, reach: 3.4, half: 0.9, dmg: 44, brk: 1.4, hitstop: 0.14, kick: 3, fx: 2.0 },
  },""", """  // 대검(B) 기본 2타 (2단계): 느리고 무거움 · 넓고 긺 — 1타 횡베기(gs1) → 2타 내려찍기 + 바닥 균열(gs3). gs2는 뺌 (동작은 남김). 항목 뜻은 위 세검과 같음
  //  → 1타 판정까지 ≈0.2초, 전체 ≈0.5초 / 2타 판정까지 ≈0.4초, 전체 ≈0.75초 (히트스톱 제외) · 두 타 합 68 / 1.25초 ≈ 3타 시절 94 / 1.75초와 초당 피해 같음
  ATK_B: {
    1: { clip: 'gs1', start: 2, up: 1.6, active: 1, down: 2.2, strike: 5, chain: 8, dodge: 7, reach: 3.0, half: 1.8, dmg: 24, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.3 },
    2: { clip: 'gs3', start: 3, up: 1.3, active: 1, down: 1.8, strike: 8, chain: 99, dodge: 11, reach: 3.4, half: 0.9, dmg: 44, brk: 1.4, hitstop: 0.14, kick: 3, fx: 2.0 },
  },""")
rep(part('clips_player.js') + "];", part('clips_player.js') + part('clips20.js') + part('clips21.js') + "];")
rep("""player2.order = ['idle', 'run', 'gs1', 'gs2', 'gs3', 'launch', 'sSmash',""", """player2.order = ['idle', 'run', 'gs1', 'gs2', 'gs3', 'launch', 'sSmash', 'sEarth',""")
rep("""    order: ['idle', 'run', 'combo1', 'combo2', 'combo3', 'sThrust', 'sSpin',""", """    order: ['idle', 'run', 'combo1', 'combo2', 'combo3', 'sThrust', 'sSpin', 'sWind',""")

# ---------------------------------------------------------------- 5~7단계: 사슬낫 · 방패+철퇴 · 쌍검 (무기 · 자세 · 평타 · 스킬 · 고유 행동 · 양색 흡수)
rep("""const PB_ = (o = {}) => ({ ...PSB, ...o });""", """const PB_ = (o = {}) => ({ ...PSB, ...o });
const PSC = {                                   // 2단계 사슬낫: 낮은 자세, 오른손 낫을 앞에 · 왼손 추와 사슬을 허리에
  body: { p: [0, -0.08, 0] },
  spine: [0.14, 0.2, 0], chest: [0.04, 0.08, 0], neck: [0, 0, 0], head: [0.06, -0.26, 0],
  shR: [-0.5, 0, -0.22], elR: [-1.0, 0, 0], hdR: [1.0, 0, 0],
  shL: [-0.2, 0, 0.32], elL: [-1.2, 0, 0], hdL: [0.3, 0, 0],
  thR: [-0.36, 0, -0.08], knR: [0.42, 0, 0], ftR: [0.04, 0, 0],
  thL: [0.3, 0, 0.14], knL: [0.46, 0, 0], ftL: [-0.1, 0, 0],
};
const PC_ = (o = {}) => ({ ...PSC, ...o });
const PSS = {                                   // 2단계 방패+철퇴: 왼발·방패를 앞에 (왼어깨가 앞), 철퇴는 오른 어깨 옆에 세움
  body: { p: [0, -0.07, 0] },
  spine: [0.1, -0.2, 0], chest: [0.04, -0.08, 0], neck: [0, 0, 0], head: [0.04, 0.25, 0],
  shL: [-1.0, 0.3, 0.15], elL: [-1.3, 0, 0], hdL: [0.2, 0, 0],
  shR: [-0.2, 0, -0.35], elR: [-1.5, 0, 0], hdR: [0.4, 0, 0],
  thR: [0.25, 0, -0.1], knR: [0.45, 0, 0], ftR: [-0.05, 0, 0],
  thL: [-0.35, 0, 0.12], knL: [0.42, 0, 0], ftL: [0.05, 0, 0],
};
const PSh_ = (o = {}) => ({ ...PSS, ...o });
const PST = {                                   // 2단계 쌍검: 깊게 웅크린 자세, 양손 짧은 검을 앞으로 낮게
  body: { p: [0, -0.12, 0] },
  spine: [0.25, 0.05, 0], chest: [0.08, 0.02, 0], neck: [0, 0, 0], head: [-0.08, -0.05, 0],
  shR: [-0.55, 0.2, -0.3], elR: [-1.1, 0, 0], hdR: [1.1, 0, 0],
  shL: [-0.55, -0.2, 0.3], elL: [-1.1, 0, 0], hdL: [1.1, 0, 0],
  thR: [-0.25, 0, -0.18], knR: [0.6, 0, 0], ftR: [0.05, 0, 0],
  thL: [0.2, 0, 0.18], knL: [0.6, 0, 0], ftL: [0.0, 0, 0],
};
const PT_ = (o = {}) => ({ ...PST, ...o });""")
# buildPlayer: the new weapons replace the rapier / greatsword parts
region("""  const grip = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), M.vest); weapon.add(grip);""", """  // cloak: 4 overlapping panels""", """  const W20 = !!opt.blade && opt.blade !== 'great' && buildWeapon20(opt.blade, root, M, weapon);   // 2단계: chain · shield · twin (rig21.js)
  if (!W20) {
  const grip = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), M.vest); weapon.add(grip);
  const great = opt.blade === 'great';            // 2P: a two-handed greatsword — long, wide, flat; a long grip under the fist for the second hand
  if (!great) { const guard = mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10), M.brass); guard.position.y = 0.07; guard.rotation.y = Math.PI / 2; weapon.add(guard); }
  const bar = mesh(flat(new THREE.BoxGeometry(great ? 0.38 : 0.17, great ? 0.042 : 0.022, great ? 0.04 : 0.03)), M.brass); bar.position.y = great ? 0.1 : 0.09; weapon.add(bar);
  if (great) { const grip2 = mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.2, 6), M.vest); grip2.position.y = -0.16; weapon.add(grip2); }
  const pommel = mesh(new THREE.SphereGeometry(great ? 0.04 : 0.028, 6, 4), M.brass); pommel.position.y = great ? -0.27 : -0.085; weapon.add(pommel);
  // blade: square-section taper so it stays a 1-2 px line from every angle (2P: 1.3 u long, wide and flat)
  const blade = mesh(flat(new THREE.CylinderGeometry(great ? 0.022 : 0.004, great ? 0.088 : 0.034, great ? 1.3 : 0.96, 4)), M.steel);
  blade.position.y = great ? 0.77 : 0.58; if (great) blade.scale.z = 0.3; weapon.add(blade);
  if (great) { const ricasso = mesh(flat(new THREE.BoxGeometry(0.12, 0.16, 0.035)), M.steel); ricasso.position.y = 0.2; weapon.add(ricasso); }
  }

""")
# per-character extras after each pose update (the chain's flying sickle)
rep("""    if (collide) collide(this);
    this.root.position.copy(this.pos);
    this.root.updateMatrixWorld(true);
    if (dt > 0) for (const s of this.springs) s.simulate(dt);""", """    if (collide) collide(this);
    this.root.position.copy(this.pos);
    if (this.post) this.post(this);               // 2단계: per-rig extras (the chain-sickle's ext track)
    this.root.updateMatrixWorld(true);
    if (dt > 0) for (const s of this.springs) s.simulate(dt);""")
# basic strings of the new characters + the unique-action / twin numbers
rep("""    2: { clip: 'gs3', start: 3, up: 1.3, active: 1, down: 1.8, strike: 8, chain: 99, dodge: 11, reach: 3.4, half: 0.9, dmg: 44, brk: 1.4, hitstop: 0.14, kick: 3, fx: 2.0 },
  },""", """    2: { clip: 'gs3', start: 3, up: 1.3, active: 1, down: 1.8, strike: 8, chain: 99, dodge: 11, reach: 3.4, half: 0.9, dmg: 44, brk: 1.4, hitstop: 0.14, kick: 3, fx: 2.0 },
  },
  // 2단계 사슬낫 3타: 낫 정베기 → 낫 역베기 → 사슬 던지기(길고 좁음, 낫이 사슬 끝에 날아감). 항목 뜻은 위 세검과 같음
  ATK_C: {
    1: { clip: 'cc1', start: 2, up: 1.8, active: 1, down: 2.5, strike: 4, chain: 6, dodge: 5, reach: 2.4, half: 1.5, dmg: 15, brk: 0.5, hitstop: 0.08, kick: 1, fx: 1 },
    2: { clip: 'cc2', start: 2, up: 1.8, active: 1, down: 2.5, strike: 4, chain: 6, dodge: 5, reach: 2.4, half: 1.5, dmg: 16, brk: 0.5, hitstop: 0.08, kick: 1, fx: 1.1 },
    3: { clip: 'cc3', start: 3, up: 1.5, active: 1, down: 2, strike: 6, chain: 99, dodge: 9, reach: 4.6, half: 0.45, dmg: 30, brk: 1, hitstop: 0.1, kick: 2, fx: 1.6 },
  },
  // 2단계 방패+철퇴 3타: 철퇴 대각 → 철퇴 역방향 → 방패 밀치기(그로기 큼)
  ATK_S: {
    1: { clip: 'sc1', start: 2, up: 1.6, active: 1, down: 2.2, strike: 4, chain: 7, dodge: 6, reach: 2.5, half: 1.5, dmg: 20, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.2 },
    2: { clip: 'sc2', start: 2, up: 1.6, active: 1, down: 2.2, strike: 4, chain: 7, dodge: 6, reach: 2.5, half: 1.5, dmg: 21, brk: 0.7, hitstop: 0.1, kick: 1, fx: 1.3 },
    3: { clip: 'sc3', start: 2, up: 1.4, active: 1, down: 2, strike: 5, chain: 99, dodge: 9, reach: 2.6, half: 1.0, dmg: 30, brk: 1.6, hitstop: 0.12, kick: 3, fx: 1.8 },
  },
  // 2단계 쌍검 4타: 오른검 → 왼검 → 교차 → 회전(사방) · 한 타가 가볍고 빠름
  ATK_T: {
    1: { clip: 'tc1', start: 1, up: 2.0, active: 1, down: 2.8, strike: 3, chain: 5, dodge: 4, reach: 2.2, half: 1.5, dmg: 11, brk: 0.4, hitstop: 0.06, kick: 1, fx: 0.9 },
    2: { clip: 'tc2', start: 1, up: 2.0, active: 1, down: 2.8, strike: 3, chain: 5, dodge: 4, reach: 2.2, half: 1.5, dmg: 11, brk: 0.4, hitstop: 0.06, kick: 1, fx: 0.9 },
    3: { clip: 'tc3', start: 1, up: 1.8, active: 1, down: 2.6, strike: 4, chain: 6, dodge: 5, reach: 2.3, half: 1.4, dmg: 14, brk: 0.5, hitstop: 0.07, kick: 1, fx: 1.1 },
    4: { clip: 'tc4', start: 2, up: 1.5, active: 1, down: 2, strike: 5, chain: 99, dodge: 8, reach: 2.6, half: 3.2, dmg: 24, brk: 0.8, hitstop: 0.1, kick: 2, fx: 1.6 },
  },
  // 2단계 고유 행동 · 쌍검
  //  PULL 사슬 잡아채기: 상태가 걸리면 파트너를 보스 등 뒤 gap 거리까지 t초에 끌어옴 (끌려가는 동안 무적, 보스를 돌아서) · 잡혀 있으면 빼냄(적중만 해도)
  //  COVER_BOOST 방패 올려치기: 적중하면 t초 동안 내 커버 범위 × mul
  PULL: { t: 0.35, gap: 1.0 },
  COVER_BOOST: { t: 1.0, mul: 2.0 },
  // 2단계 유물 휴식: botT 봇이 고르기까지(초, 2P는 +0.2) · autoT 휴식 화면이 열리고 이 시간(초)이 지나면 아무도 안 고른 칸은 첫 카드 · 장착 그대로
  RELIC: { botT: 0.6, autoT: 20, waveFirst: ['slot4', 'handoff', 'violet'] },   // waveFirst: 규칙 봇(relicBot 'wave')이 먼저 고르는 파장 관련 유물 순서""")
rep("""  WAVE: { max: 3,""", """  WAVE: { max: 3, twinK: 0.8,                     // twinK: 쌍검(청·적 둘 다 흡수)의 강화 배율 — 강화로 늘어나는 몫 × 0.8 (예: 피해 ×1.3 → ×1.24)""")
rep("""           names: [...names], root: c.root || null, smears: c.smears || [], events: c.events || [] };""",
    """           names: [...names], root: c.root || null, smears: c.smears || [], events: c.events || [], ext: c.ext || null };   // 2단계 ext: 사슬낫 낫이 날아간 거리 트랙""")

# ---------------------------------------------------------------- 9단계: 보스 3 THE WEEPING BELL (새 리그 · 맥놀이 · 당목 치기 · 종 내려찍기)
rep("""const boss = buildBoss();""", """let boss = buildBoss();                          // 2단계: \`let\` — the rush swaps in the bell's own rig for boss 3 (Bell.use)""")
rep("""  scarlet: { ramps: { growth: RAMP.crimson,""", """  bell:    { ramps: { core: RAMP.crystalB }, emit: [0.3, 0.75, 1.1], smear: [C.BRONZE, C.LEATH1], smearEmit: [0.5, 0.3, 0.1] },   // 2단계 보스 3 (종 리그는 자기 재질 · 결정만 칠함)
  scarlet: { ramps: { growth: RAMP.crimson,""")
rep("""    look: { shieldUntil: 2, horns: 2, wings: 3 }, banners: ['THE WARD HARDENS', 'THE SHIELD SHATTERS'] },
];""", """    look: { shieldUntil: 2, horns: 2, wings: 3 }, banners: ['THE WARD HARDENS', 'THE SHIELD SHATTERS'] },
  // 2단계 보스 3 에밀레종: 새 리그(rig 'bell') · 맥놀이(청·적 파동 고리 = 자리 나누기) · 당목 치기(색 있음, 패리 가능) · 종 내려찍기(패리 불가)
  //   연타·원형탄·회오리탄·바닥은 1단계 것을 가중치만 · liftH 0 = 뜸 때 몸이 뜨지 않고 종이 사슬째 들림(안쪽 울음 결정 = 약점) · 페이즈 70%·35% 금
  { name: 'THE WEEPING BELL', rig: 'bell', skin: 'bell', size: 1.0, hp: 0.5,   // (12단계 2차: 0.62 → 0.55 · 3차: → 0.5)
    speed: 1.0, attach: [], liftH: 0,   // hp 0.8 → 0.62 (만들면서: 봇 이긴 판 380~440초)
    pools: [['beat', 'strike', 'bellSlam', 'combo', 'nova'], ['beat', 'strike', 'bellSlam', 'combo', 'nova', 'spiral'], ['beat', 'strike', 'bellSlam', 'combo', 'nova', 'spiral']],
    weights: { beat: 1.5, strike: 2.6, bellSlam: 1.4, combo: 2.4, nova: 1.2, spiral: 1.0, walk: 0.5 },   // bellSlam 2.0 → 1.4 · (12단계 2차: beat 2.6 → 1.8 · 3차: → 1.5)
    waves: { combo: 'red', nova: null, spiral: null, beat: null, bellSlam: null }, floorWave: null,
    floorChance: [0.1, 0.13, 0.16], floors: [['split', 'chain', 'donut'], ['split', 'cross', 'checker', 'rdonut'], ['split', 'rotor', 'xcross', 'safe', 'chain']],   // (12단계 1차: 0.18/0.22/0.26 → 0.14/0.17/0.2 · 2차: → 0.1/0.13/0.16)
    look: { horns: 9, wings: 9 }, banners: ['THE BELL CRACKS', 'THE BELL WEEPS'] },
];""")
rep("""  PULL: { t: 0.35, gap: 1.0 },""", """  PULL: { t: 0.35, gap: 1.0 },
  // 2단계 보스 3 에밀레종
  //  beatN 맥놀이 한 번에 파동 쌍 수(페이즈 1/2/3) · first 첫 쌍까지(초) · gap 쌍 간격 · turn 다음 쌍 방향 회전 [최소, 최대](라디안) · src 파동이 시작하는 경기장 가장자리 반경
  //  speed 파동 고리 속도(유닛/초) · band 고리 두께 반쪽 · dmg 못 막으면 피해(회피 무적 관통 · 랠리 끊김) · rally 막으면 랠리 + · fanHalf/fanLen 막은 사람 뒤쪽 보호 부채꼴(도 · 유닛)
  //  lead HUD 화살표가 미리 뜨는 시간(초) · mixPhase 이 페이즈부터 고리가 경기장 가운데를 지나면 색이 바뀜(구간마다 섞임)
  //  strike 당목 치기: R 반경 · half 반각 · dmg · lockF 조준 고정 프레임 · F 적중 프레임 / slam 종 내려찍기: R · dmg · F · slamSpd 동작 속도 배율(느릴수록 피할 틈)
  //  botParryAt 합 봇이 자기 색 고리를 패리하는 남은 시간(초) · botStand 합 봇이 서는 자리(자기 색 출발점 쪽 src × 이 비율)
  BELL: { beatN: [3, 3, 4], first: 1.2, gap: 2.1, turn: [0.9, 1.7], src: 7.6, speed: 6.5, band: 0.32, dmg: 4, rally: 1, fanHalf: 70, fanLen: 9.0, lead: 1.0, mixPhase: 3,
          strikeR: 4.6, strikeHalf: 1.5, strikeDmg: 28, strikeLockF: 8, strikeF: 11, slamR: 3.0, slamDmg: 15, slamF: 11, slamSpd: 0.8, botParryAt: 0.12, botStand: 0.3 },   // 12단계 조정 1차: 맥놀이 14 → 7 · 쌍 3/3/5 → 3/3/4 · 내려찍기 20 → 15 (러시 0차: 합 봇이 보스 3에서 가장 많이 짐 — 피해 대부분 다른 색 고리) · 2차: 맥놀이 7 → 4 (무시 봇이 보스 3에 간 31판 중 27판이 거기서 짐)   // 첫 값 gap 1.7 · dmg 30 · fan 40°/7 · slam 3.3/34 → 봇 8판 전패(맥놀이·내려찍기 피해가 대부분)라 만들면서 두 번 낮춤 (2차: 맥놀이 22 → 14 · 내려찍기 28 → 20 · 부채꼴 70° · 봇 자리 0.3)""")

# ---------------------------------------------------------------- 12단계 조정 1차 (데이터 값만): 4체 러시 0차 = 합 봇 41% · 무시 봇 0% (무시 봇은 보스 1·2에서도 40%가 짐)
rep("""  BOSS_DMG: 0.5,            // 보스가 주는 모든 피해 배율 (1.5단계 1차: 0.6 → 0.5 — 표식·셔틀 실패 피해가 더해짐, 2체 러시)""",
    """  BOSS_DMG: 0.42,           // 보스가 주는 모든 피해 배율 (1.5단계 1차: 0.6 → 0.5 — 표식·셔틀 실패 피해가 더해짐, 2체 러시 · 2단계 12단계 1차: 0.5 → 0.42 — 4체 러시)""")
# ---------------------------------------------------------------- 10단계: 보스 4 THE TWIN DOKKAEBI (두 마리 · 각자 자기 색 · 합동기 5 · 되살리기)
rep("""    skin:  toon({ chr: true, ramp: RAMP.skin, rim: C.SLATE2, outline: 0.5, pl: 0.5 }),""",
    """    skin:  toon({ chr: true, ramp: opt.skin || RAMP.skin, rim: C.SLATE2, outline: 0.5, pl: 0.5 }),   // 2단계: opt.skin (도깨비 청·적 피부)""")
rep("""    name: opt.name || 'PLAYER', root, clips: PLAYER_CLIPS, springs,""", """    name: opt.name || 'PLAYER', root, clips: opt.clips || PLAYER_CLIPS, springs,   // 2단계: opt.clips (도깨비 = 플레이어 동작 + 자기 동작)""")
rep("""  bell:    { ramps: { core: RAMP.crystalB },""", """  dk:      { ramps: { core: RAMP.crystalB }, emit: [0.3, 0.75, 1.1], smear: [C.CYAN, C.SLATE2], smearEmit: [0.2, 0.45, 0.65] },   // 2단계 보스 4 (도깨비 리그는 자기 재질 · 이 칸은 비상용)
  bell:    { ramps: { core: RAMP.crystalB },""")
rep("""    look: { horns: 9, wings: 9 }, banners: ['THE BELL CRACKS', 'THE BELL WEEPS'] },
];""", """    look: { horns: 9, wings: 9 }, banners: ['THE BELL CRACKS', 'THE BELL WEEPS'] },
  // 2단계 보스 4 쌍둥이 도깨비: 두 마리(rig 'dk' · 플레이어 리그 1.7배) · 각자 자기 색 공격만(waves 'self') · hp = 한 마리 몫 (둘이라 합은 2배)
  //   근접·연타는 1단계 것을 가중치만 · dk* = 합동기 (연계 · 자리 바꾸기 · 씨름 던지기 · 뚝딱 · 합동 필살(3페이즈)) · gapMul 공격 뒤 쉬는 시간 배율(둘이니 길게)
  { name: 'THE TWIN DOKKAEBI', rig: 'dk', skin: 'dk', size: 0.75, hp: 0.34,   // (12단계 1차: 0.45 → 0.42 — 합 봇 4.97분 · 3차: → 0.34 · gapMul 1.5 → 2.0)
    speed: 1.0, attach: [], gapMul: 2.0,
    pools: [['combo', 'slam', 'sweep', 'charge', 'dkLink', 'dkSwap', 'dkThrow', 'dkCoin'],
            ['combo', 'slam', 'sweep', 'charge', 'leap', 'dkLink', 'dkSwap', 'dkThrow', 'dkCoin'],
            ['combo', 'slam', 'sweep', 'charge', 'leap', 'dkLink', 'dkSwap', 'dkThrow', 'dkCoin', 'dkUlt']],
    weights: { combo: 2.2, slam: 2.6, sweep: 2.6, charge: 1.2, leap: 1.2, dkLink: 3.2, dkSwap: 0.8, dkThrow: 1.4, dkCoin: 0.6, dkUlt: 2.4, walk: 1.6 },   // (만들면서: 뚝딱 0.9 → 0.6 · 연계 2.4 → 3.2 — 봇 4판에 뚝딱 10~13번 · 연계 0~4번이라)
    waves: { combo: 'self', slam: 'self', sweep: 'self', charge: 'self', leap: 'self', nova: null, spiral: null, grab: null }, floorWave: null,
    floorChance: [0, 0, 0], floors: [[], [], []],
    look: { horns: 1, wings: 3 }, banners: ['THE GHOST FIRES RISE', 'THE TWINS RAGE'] },
];""")
rep("""  PULL: { t: 0.35, gap: 1.0 },
  // 2단계 보스 3 에밀레종""", """  PULL: { t: 0.35, gap: 1.0 },
  // 2단계 보스 4 쌍둥이 도깨비 (두 마리가 같은 보스 AI를 각자 돌림 · 체력 따로 · 페이즈는 둘의 체력 합으로)
  //  scale 플레이어 리그 배율 · radius 몸 반경 · sweepR 방망이 휘두르기 반경 · reachH 약점 높이 한계 · spawn 등장 때 둘 사이 반 거리 · offset 둘째 첫 행동 지연(초)
  //  overlap 한 마리가 공격 중일 때 다른 하나도 바로 공격할 확률 (나머지는 holdT초 쉼) · jointCd0/jointCd 합동기 사이 최소 간격(시작 · 이후, 초) · botEven 봇이 덜 깎인 쪽으로 옮겨 가는 체력 비율 차
  //  fireMul 도깨비불(연타 불기둥) 피해 배율 (페이즈 1/2/3)
  //  revive: wait 쓰러지고 남은 하나가 살리러 가기까지(초) · t 무릎 꿇고 살리는 시간 · hp 되살아난 체력 비율 · brk 살리는 중 이만큼 맞으면 끊김 · walk 걸음 배율
  //  link 도깨비 연계: liftR/liftHalf 띄우기 부채꼴(유닛 · 라디안) · lockF/liftF 띄우기 조준 고정 · 적중 프레임 · liftDmg · air 띄워진 시간(초, 페이즈별 = 빨라짐) · h 높이
  //       rushT 적 도깨비 돌진 시간 · dmg 받아치기 피해 · laneL/laneW 돌진 예고 · rally 합 끊기 랠리 합계 · stagger 합 끊기 휘청(그로기 초)
  //  swap: at 순간이동 순간(초) · t 끝(초) · throw: hold 들고 있는 시간 · release 던지는 순간 · gap 받는 도깨비 앞 착지 거리 · fly 날아가는 시간 · h 높이 · strikeAt 착지 뒤 일격까지
  //       swatR/swatHalf 받는 도깨비 휘두르기 · dmg · counterDmg/counterBrk 역받아치기(던져진 사람이 받는 도깨비 앞에서 패리)
  //  coin: n 금화 수(페이즈별) · r 반경 · tele 떨어지기까지(초) · gap 다음 금화 간격 · dmg (다른 색 금화) · cd 다음 뚝딱까지 최소(초, 둘이 공유)
  //  ult 합동 필살: lead 예고(초) · lock 원이 멈추는 시간 · jump 뛰어오르는 시점 · h 높이 · r 원 반경 · sync 두 패리 사이 허용(초) · dmg 실패 피해 · groggy 성공 그로기(초) · rally · tagGap 태그 솔로 두 일격 간격
  //  bot: link 합 봇이 연계를 커버하는 확률 · throw 역받아치기 확률 · throwCover 던지기 커버 배율 · ult 합동 필살 자기 색 패리 확률 (1.5 셔틀처럼 일부러 실수)
  DK: { scale: 1.7, radius: 0.72, sweepR: 3.1, reachH: 3.0, spawn: 1.9, offset: 0.9, overlap: 0.15, holdT: 0.35, jointCd0: 6, jointCd: 4, botEven: 0.15, fireMul: [0.8, 1.0, 1.0],
        revive: { wait: 7, t: 3.2, hp: 0.35, brk: 280, walk: 1.2 },
        link: { liftR: 2.4, liftHalf: 0.85, lockF: 6, liftF: 9, liftDmg: 8, air: [1.2, 0.95, 0.85], h: 2.3, rushT: 0.42, dmg: 18, laneL: 8, laneW: 1.4, rally: 2, stagger: 2.6 },
        swap: { at: 0.34, t: 0.95 },
        throw: { hold: 0.5, release: 0.42, gap: 1.0, fly: 0.55, h: 2.2, strikeAt: 0.4, swatR: 2.6, swatHalf: 0.9, dmg: 24, counterDmg: 420, counterBrk: 40 },
        coin: { n: [6, 8, 10], r: 1.0, tele: 1.1, gap: 0.1, dmg: 12, cd: 14 },
        ult: { lead: 1.5, lock: 0.35, jump: 0.3, h: 3.0, r: 1.6, sync: 0.3, dmg: 28, groggy: 4.0, rally: 2, tagGap: 0.45 },
        bot: { link: 0.8, throw: 0.65, throwCover: 0.5, ult: 0.85 } },   // 12단계 조정 3차: 한 마리 hp 0.42 → 0.34 · 쉬는 시간 ×1.5 → ×2.0 · 동시 공격 0.25 → 0.15 · 도깨비불 ×1/1.25/1.25 → ×0.8/1/1 · 연계 24 → 18 (2차: 보스 4에 간 무시 봇 16판 모두 거기서 짐) · 1차: 한 마리 hp 0.45 → 0.42 · 동시 공격 0.35 → 0.25 · 연계 32 → 24 · 던지기 30 → 24 · 금화 18 → 12 · 필살 44 → 28 · 봇 필살 패리 0.72 → 0.85 (0차: 동시 패리 41.6%)
  // 2단계 보스 3 에밀레종""")
