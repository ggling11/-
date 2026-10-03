/* =============================================================================
 * 0c. 3단계 데이터 — 아트(STYLE) · 움직임(MOTION) · QTE · 메뉴·글자(UI) · 패드(PAD). 자주 바뀌는 것은 여기서만 고친다.
 * ========================================================================== */
// 아트 스타일: THE SEGMENT TWINS 벤치마킹 (레퍼런스 스크린샷 tools/style/ref/*.png · 색 통계 ref_stats.json)
//   레퍼런스에서 잰 것: 평균 채도 0.34~0.49 · 평균 밝기 0.51~0.62 · 모브/자두/라벤더 바탕 + 아주 어두운 자두색 적 + 주황 외곽선 + 핫핑크·청 강조
//   on: false = 2단계 픽셀 아트 그대로 · scale: 3D 내부 해상도 배율(1 = 화면 해상도, 메뉴에서 0.75 · 0.5)
const STYLE = {
  on: true,
  scale: 1.0,
  // 성능 (프레임 드랍 대응): maxH 3D 화면을 그리는 최대 세로 해상도(이보다 큰 화면 · 고해상도 노트북은 1080으로 그리고 부드럽게 키움 — 글자는 화면 해상도 그대로)
  //   auto 자동 화질 · downMs 이보다 느린 프레임이 이어지면 한 단계 내림 · upMs 이보다 빠른 게 upHold초 이어지면 한 단계 올림 · settle 단계를 바꾼 뒤 기다리는 시간(초)
  //   levels[단계]: scale 3D 해상도 배율 · shadow 그림자 지도 크기 · bloom 빛 번짐 · rings 외곽선 검사 바퀴(2 = 굵고 매끈 · 1 = 가벼움)
  //   fit: 'fill' = 창을 꽉 채움(소수 배율 · 글자 · 칸은 화면 픽셀에 맞춰 또렷하게) · 'integer' = 정수 배율만(2단계 방식 — 1366×768 창이면 960×540만 쓰고 가장자리 검은 띠)
  fit: 'fill',
  quality: { auto: true, maxH: 1080, downMs: 22, upMs: 14, upHold: 8, settle: 2.0, block: 60,
             levels: [{ scale: 1.0, shadow: 2048, bloom: true, rings: 2 }, { scale: 0.75, shadow: 2048, bloom: true, rings: 2 }, { scale: 0.5, shadow: 1024, bloom: false, rings: 1 }] },   // rings 외곽선 검사 바퀴 수
  // 원근 카메라: fov 화각(도) · pitch 내려다보는 각(도, 2단계 30) · viewH 초점 자리에서 보이는 세로 폭(유닛, 2단계 9.6) · near/far
  //   (3단계 M1: viewH 15 → 11 · 서 있는 플레이어 키가 화면 8.4% → 12% 이상이 되게. 레퍼런스보다 가까움 — 디렉터 요청 '움직임 확실히 크게' 우선)
  cam: { fov: 30, pitch: 55, viewH: 11, near: 2, far: 140 },
  // 32색 — 칸 역할은 2단계 팔레트와 같음 (0~4 밤 남보라 · 5~8 모브 · 9~11 크림 · 12~15 청 · 16~21 와인→핫핑크 · 22~24 주황→노랑 · 25~28 자두→피치 · 29 청파 · 30~31 자파)
  pal: [
    '#120a2a', '#1d0c34', '#2c1244', '#3f1c55', '#552a64',
    '#6f3e6f', '#8d567c', '#ad7889', '#c99ca2',
    '#e2c1bc', '#f1ddd5', '#fff7ef',
    '#262a6e', '#3a4aa6', '#5a7ee2', '#a0c2ff',
    '#28041f', '#4c0a3b', '#7a114f',
    '#b2185d', '#e42a6e', '#ff5d8e',
    '#ff9a3a', '#ffca5c', '#fff3c6',
    '#371b2c', '#683843', '#a8615a', '#e49b66',
    '#4fd2ff', '#7a3dd0', '#c78dff',
  ],
  // 그림자: tint 그림자 색 · mix 섞는 양 · ht 하프톤 칸(1080p 픽셀) · htAngle 각도 · soft 하프톤 경계 폭(빛 단계) · deep 아주 어두운 면 문턱 배율
  //   (아트 2차: 처음 보는 에이전트 '뿌옇고 대비 낮음 · 그림자 흐림' → tint 더 어둡게 · mix 0.38 → 0.5 · soft 0.06 → 0.03)
  shade: { tint: '#2a0c44', mix: 0.5, ht: 7, htAngle: 45, soft: 0.03, deep: 0.6 },
  // 외곽선: px 바깥 외곽선 굵기(1080p 픽셀) · crease 주름선 굵기 · creaseOn 주름선을 그리는 종류 · cols 종류별 색
  //   [0 없음, 1 청 캐릭터, 2 적 캐릭터, 3 쌍검(보라), 4 보스(주황), 5 소품(흰색), 6 청 도깨비, 7 적 도깨비, 8 에밀레종]
  outline: { px: 5.4, crease: 1.6, creaseOn: [1, 2, 3, 4, 6, 7, 8],   // (아트 2차: 캐릭터에도 주름선 — '속 디테일 없음' 지적)
             cols: ['#000000', '#52b8ff', '#ff4f8a', '#b77bff', '#ff9a2e', '#fff8f4', '#55c8ff', '#ff5e74', '#ffb03a'] },
  chr: { scale: 1.25, head: 1.3 },   // 캐릭터 크기 (1.15 → 1.25, M1) · 머리 배율
  // 빛: 낮게 깔린 해(긴 그림자) — y 높이 · left/back 화면 왼쪽 위에서 오는 비율 · shadowExtent 그림자 지도 범위(유닛, 2단계 11.5) · bias
  light: { y: 0.5, left: 0.8, back: 0.5, shadowExtent: 21, bias: 0.0009, shadowSize: 2048, pcf: 0.6 },   // (성능: 그림자 지도 3072 → 2048)   // pcf 그림자 가장자리 표본 간격(텍셀, 1.25 → 0.6 = 더 또렷)   // 캐릭터 외형: 전체 배율(보이는 크기만 — 판정 그대로) · 머리 배율(레퍼런스처럼 머리를 크게)
  // 화면 후처리: ca 색 번짐(화면 가운데 0 → 가장자리, 화면 폭 비율) · caEdge 가장자리 추가 · grain 필름 입자 · haze 뿌연 막 색/양 · lift 어두운 곳 들어 올림
  //   sat 채도 배율 · vig [시작 반경, 끝 반경, 세기] 하프톤 비네트 · vigCol · bloom 빛 번짐 세기
  //   contrast 대비(1 = 그대로) — 아트 2차: lift 0.03 → 0 · haze 0.02 → 0 · sat 1.08 → 0.96 (대비를 올리니 채도가 레퍼런스보다 높아져서) · contrast 1.12 (뿌연 막 걷기)
  post: { ca: 0.0025, caEdge: 0.002, grain: 0.03, haze: '#c9a4d8', hazeMix: 0.0, lift: '#14062a', liftMix: 0.0, sat: 0.96, contrast: 1.12,
          vig: [0.7, 1.2, 0.3], vigCol: '#0d0424', bloom: 0.8 },
  glitch: { t: 0.2, amp: 0.03, rows: 10, ca: 0.006, minShake: 5 },   // 큰 타격 화면 찢김: 시간(초) · 최대 밀림(화면 폭 비율) · 띠 수 · 순간 색 번짐 · 이 세기 이상 흔들림에서
  mono: { t: 1.7 },                                                   // 보스 등장 흑백 반전 카드 시간(초)
  // 보스 피부 (3단계: 몸은 아주 어두운 자두색 + 빛나는 코어 — 레퍼런스의 적처럼 주황 외곽선으로 읽힘)
  skins: {
    scarlet: { growth: ['DEEP', 'SHADE', 'BLOOD2', 'CRIM0'], core: ['CRIM0', 'CRIM2', 'EMBER', 'HOT'], rag: ['VOID', 'ABYSS', 'DEEP', 'SHADE'],
               iron: ['VOID', 'ABYSS', 'DEEP', 'SHADE'], plate: ['ABYSS', 'DEEP', 'SHADE', 'DUSK'], blade: ['ABYSS', 'DEEP', 'DUSK', 'STONE1'] },
    azure:   { growth: ['DEEP', 'SHADE', 'SLATE0', 'SLATE1'], core: ['SLATE1', 'SLATE2', 'CYAN', 'SLATE3'], rag: ['VOID', 'ABYSS', 'DEEP', 'SHADE'],
               iron: ['VOID', 'ABYSS', 'DEEP', 'SHADE'], plate: ['ABYSS', 'DEEP', 'SHADE', 'DUSK'], blade: ['ABYSS', 'DEEP', 'DUSK', 'STONE1'] },
  },
  // 도깨비 (아트 2차: '반투명 파스텔 유령' 지적 → 몸은 아주 어두운 남/자두 + 색 외곽선 · 빛나는 눈/불) — 팔레트 이름
  dkLook: [{ skin: ['VOID', 'ABYSS', 'SLATE0', 'SLATE1'], rage: ['ABYSS', 'SLATE0', 'SLATE1', 'CYAN'], pants: ['VOID', 'ABYSS', 'DEEP', 'SHADE'] },
           { skin: ['VOID', 'ABYSS', 'BLOOD0', 'BLOOD1'], rage: ['ABYSS', 'BLOOD0', 'BLOOD1', 'CRIM0'], pants: ['VOID', 'ABYSS', 'DEEP', 'SHADE'] }],
  // 유리 벽: 세그먼트 경계선이 위로 솟은 반투명 유리판 (레퍼런스의 '조각난 세상') — h 높이 · tint 흰 막 · edge 가장자리 선 밝기 · fade 위로 갈수록 옅어짐
  //   hLine 경기장 안쪽 세그먼트 선의 유리 높이 (아트 2차: 안쪽 판이 사람을 하얗게 덮던 것 → 낮게) · 바깥 테두리는 h
  glass: { h: 5, hLine: 1.6, tint: 0.07, edge: 0.85, fade: 0.8, lines: true },
  // 세그먼트 아레나: poly 걸을 수 있는 바닥 다각형(꼭짓점 x, z — 걷는 원 7.45를 감쌈) · wall 바닥 옆면 높이 · edge 흰 경계선 폭 · outerR 바깥 땅 반경
  //   themes[보스 순서]: sky 배경 · fog [시작, 끝 반경] · wall 옆면 색 · edgeCol 경계선 색 · lines 세그먼트 나누는 직선 [각도(도), 원점에서 거리]
  //     regions[선 기준 칸 번호 0~3] · outer 바깥 땅: { k 무늬, a, b 색, s 크기, r 각도(도), f 무늬 채움 }
  //     무늬 k: 0 단색 · 1 줄무늬(횡단보도) · 2 타일 · 3 판자 · 4 햇살 타일 · 5 모래 물결 · 6 얼룩(아스팔트) · 7 격자선 · 8 점자 블록(노란 점) — 모두 때(얼룩) · 이음매가 섞임
  //     props: 소품 묶음 이름 (style30.js PROPS3)
  arena: {
    poly: [[8.7, 0.9], [6.6, 6.2], [0.6, 9.2], [-6.1, 6.6], [-9.3, 0.4], [-6.5, -6.4], [-0.4, -9.0], [6.4, -6.9]],
    wall: 0.8, edge: 0.07, outerR: 46, grime: 0.55,   // grime 바닥 때 · 얼룩 세기 (아트 2차 1 → 0.55: '사진 같은 거친 바닥' 지적)
    // near: 경기장 바로 바깥 소품 띠 (아트 2차 '빈 상자' 지적) — n 개수 · r [안, 밖] 반경 · kinds 테마별 소품 종류
    near: { n: 30, r: [9.9, 12.8], kinds: { city: ['barrier', 'cone', 'cone', 'bench', 'sign', 'barrel'], docks: ['crate', 'barrel', 'barrel', 'cone', 'rope'], shore: ['chair', 'rope', 'barrel', 'bench', 'sign'], neon: ['sign', 'speaker', 'barrier', 'barrel', 'sign'] } },
    themes: [
      { name: 'CROSSING', sky: '#0e0722', fog: [34, 62], wall: '#5a2f58', edgeCol: '#f7eef3', lines: [[20, -1.2], [112, 1.6]],
        regions: [{ k: 1, a: '#7c4a5c', b: '#ecd3cd', s: 0.95, r: 20, f: 0.5 }, { k: 2, a: '#bd8a86', b: '#ead0c4', s: 1.7, r: 20 },
                  { k: 6, a: '#7b4c61', b: '#6b4059', s: 1, r: 0 }, { k: 8, a: '#d4ae9c', b: '#e7a34f', s: 0.45, r: 20, f: 0.3 }],
        outer: { k: 7, a: '#1f0f2e', b: '#2b163c', s: 4.0, r: 20, f: 0.025 }, props: 'city' },
      { name: 'DOCKS', sky: '#100826', fog: [34, 62], wall: '#4a2f6c', edgeCol: '#f3eefa', lines: [[-30, 0.8], [60, -2.2]],
        regions: [{ k: 3, a: '#735193', b: '#563874', s: 0.5, r: -30 }, { k: 4, a: '#ec9a4c', b: '#fbe2c4', s: 2.3, r: -30 },
                  { k: 2, a: '#b8a3c8', b: '#ae99bf', s: 1.3, r: -30 }, { k: 3, a: '#7a5a97', b: '#664887', s: 0.5, r: 60 }],
        outer: { k: 5, a: '#1e1640', b: '#281e52', s: 0.9, r: 10 }, props: 'docks' },
      { name: 'SHORE', sky: '#120a2a', fog: [34, 62], wall: '#7d6795', edgeCol: '#fbf3fb', lines: [[45, 0.0], [-45, 3.0]],
        regions: [{ k: 5, a: '#cbbbd6', b: '#bfadcd', s: 0.42, r: 45 }, { k: 7, a: '#9ea891', b: '#8c9782', s: 0.5, r: 45, f: 0.12 },
                  { k: 3, a: '#7a5895', b: '#684a85', s: 0.5, r: -45 }, { k: 5, a: '#c3b0cf', b: '#b6a3c6', s: 0.42, r: -45 }],
        outer: { k: 5, a: '#3d2f58', b: '#463864', s: 0.6, r: 30 }, props: 'shore' },
      { name: 'NEON', sky: '#0b0420', fog: [32, 60], wall: '#3d1a4a', edgeCol: '#ffe8f4', lines: [[0, -1.0], [90, 1.0]],
        regions: [{ k: 2, a: '#4c2652', b: '#5d3061', s: 1.5, r: 0 }, { k: 7, a: '#c79ab8', b: '#f2d8e8', s: 1.2, r: 0, f: 0.05 },   // (아트 2차: 회색 아스팔트 → 밝은 격자 · 진한 타일)
                  { k: 1, a: '#7b4f7e', b: '#e6b2cf', s: 0.9, r: 90, f: 0.45 }, { k: 2, a: '#33163c', b: '#3f1d4a', s: 1.1, r: 0 }],
        outer: { k: 7, a: '#150a22', b: '#5a1e4a', s: 6.0, r: 0, f: 0.012 }, props: 'neon' },
    ],
  },
};

// 움직임 과장 (5절) — 판정(맞는 범위 · 시간)은 그대로, 화면에서 보이는 움직임만 키움. 1 = 2단계 그대로
const MOTION = {
  leapH: 2.0,          // 위로 뜨는 동작(공중 마무리 도약 · 올려베기 · 무릎 마무리 뛰어오름) 최고 높이 배율
  airT: 1.8,           // 그 동작의 체공 시간 배율 (1.25 → 1.8: 카메라가 따라갈 시간 · 꼭대기에서 잠깐 멈칫)
  hang: 0.55,          // 도약 시간 중 올라가는 몫 — 올라갈 땐 감속, 꼭대기에서 멈칫, 내려갈 땐 가속
  dashDist: 1.3,       // 대시 거리 배율 (판정 영향 → 봇 테스트로 확인)
  dashGhosts: 4,       // 대시 잔상 수
  runLean: 2.0,        // 달리기 몸 기울기 배율
  runBob: 1.6,         // 달리기 위아래 바운스 배율
  slide: 1.35,         // 평타 · 스킬 앞으로 미끄러지는 거리 배율
  smearW: 1.5,         // 무기 궤적 두께 배율
  knock: 1.5,          // 피격 넉백 거리 배율
  landFx: true,        // 높이 뜬 뒤 착지 충격파
  airZoomMin: 0.62,    // 누가 높이 뜨면 둘 다 담으려고 카메라를 잠깐 넓힘 — 최소 배율 (1 = 안 넓힘)
};

// QTE (7절): 적 · 청 플레이어가 번갈아 누르는 합동 입력 — 첫 보스에는 없음
//   beat 칸 사이 시간(초) · win 판정 창(±초) · lead 첫 칸까지 준비 시간 · maxRun 같은 색 최대 연속 · keys 칸에 나오는 행동
//   reward: 전부 성공하면 보스 그로기(초) · 랠리 + · failDmg 실패 칸마다 그 색 사람 피해 · punishAt 이만큼 실패하면 보스 강공격
//   bosses[보스 순서]: null = 없음 · name HUD 이름 · cells [페이즈 1, 2, 3] 칸 수 · at 들어가는 페이즈 전환 · w 패턴 가중치 · from 가중치가 붙는 첫 페이즈
//   gap 가중치로 다시 나오기까지 최소 간격(게임 초) · gapPhase 페이즈 전환 QTE의 최소 간격 · spread 보스 앞 좌우 벌림(라디안) · stand 보스 표면에서 선 거리
//   tail 마지막 칸 뒤 여운(초) · after 끝난 뒤 무적(초) · rest 끝난 뒤 보스 쉼(초) · punish 강공격 패턴 · sfx 칸 깨질 때 소리
const QTE = {
  beat: 0.55, win: 0.15, lead: 1.1, maxRun: 2, keys: ['attack', 'parry', 'skill1', 'skill2'],
  reward: { groggy: 4.0, rally: 2 }, failDmg: 12, punishAt: 3,
  gap: 20, gapPhase: 4, spread: 0.55, stand: 1.2, tail: 0.5, after: 0.6, rest: 0.6,
  bot: { hit: 0.92, early: 0.04, spam: 0.25 },   // 합 봇: 칸당 성공 확률 · 너무 일찍 누르는 확률 (1.5 셔틀처럼 일부러 실수) · 연타 봇 프레임당 아무 키 확률
  bosses: [
    null,
    { name: 'SHIELD CLASH', cells: [5, 5, 6], at: [2], w: 1.0, from: 2, punish: 'bash', sfx: 'guard' },
    { name: 'BELL TOLL', cells: [6, 6, 7], at: [2, 3], w: 1.0, from: 2, punish: 'bellSlam', sfx: 'boom' },
    { name: 'SSIREUM', cells: [6, 7, 8], at: [2], w: 1.0, from: 2, punish: 'slam', sfx: 'stomp' },   // (조정 2회차: 35% 전환 QTE 뺌 — 페이즈 3은 합동 필살 자리, 합동기 쿨타임을 같이 써서 필살이 밀렸음)
  ],
};

// 메뉴 · 화면 글자 (3 · 4절)
//   nameT 기술명 표시 시간(초) · nameY 기술명 자리(화면 위에서 픽셀, 480x270 기준) · maxTexts 화면 글자 동시 표시 최대
//   cutins 컷인 띠 (false = 기술명만, 메뉴에서 바꿈) · keys2P 싸우는 화면에 2P 키 표시 · joinHold 2P 참가 · 나가기 꾹 누르는 시간(초)
const UI = {
  nameT: 0.8, nameY: 34, maxTexts: 3, cutins: false, keys2P: false, joinHold: 0.6, shake: 1.0, volume: 1.0,
  stopMul: 0.7,        // 전체 정지(그로기 · 처치 · 완벽 랠리 · 마무리 시작 …) 길이 배율 — 흐름 우선 (A14: 2인 전체 정지 4% 이하 · 0.8에서 합 봇 10판 4.0% 경계 → 0.7)
  title: { name: 'CRIMSON ARENA', sub: 'DUO', blink: 0.55 },   // 시작 화면 제목 (게임 이름이 정해지면 여기만 바꿈)
};

// 패드 (6절): dead 원형 데드존 · on/off 메뉴 방향 켜짐/꺼짐 문턱 · trig 트리거 문턱 · retry 막혔을 때 다시 시도 간격(초) · keep 끊긴 패드 자리 유지(초)
//   std 표준 매핑 버튼 번호 (X 공격 · A 대시 · B 패리 · RT/LB 스킬1 · LT 스킬2 · RB 교대 · Y 부활 꾹 · START 메뉴 · BACK 캐릭터 선택)
//   fallback 비표준 패드(버튼 순서 미정)일 때 쓰는 첫 추정 — 메뉴의 '버튼 다시 배정'으로 고침
const PAD = {
  dead: 0.25, on: 0.5, off: 0.35, trig: 0.5, retry: 1.0, keep: 5.0,
  std: { attack: [2], dodge: [0], parry: [1], skill1: [7, 4], skill2: [6], tag: [5], interact: [3], menu: [9], back: [8], up: [12], down: [13], left: [14], right: [15] },
  fallback: { attack: [0], dodge: [1], parry: [2], skill1: [7, 5], skill2: [6, 4], tag: [3], interact: [3], menu: [9], back: [8], up: [12], down: [13], left: [14], right: [15] },
};

