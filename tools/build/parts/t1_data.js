/* =============================================================================
 * 0e. 4단계 테마 1 '애니 셀' 데이터 — 렌더 · 색 · 모델 · 애니메이션 · 아레나 · 이펙트 · UI · 카메라 · 자동 품질
 *     (자주 바뀌는 값은 전부 여기. 화면만 바꾸는 값이며 게임 판정에는 쓰지 않는다)
 * ========================================================================== */
const T1 = {
  id: 1, name: 'ANIME CEL',
  /* 팔레트: 레퍼런스 대표색 (흰 · 검정 · 회보라 그림자 · 분홍 피부 · 적/청 강조 · 금 보조) */
  pal: {
    ink: '#141112', paper: '#fdfbfb', shadeW: '#b0a3a5', shadeW2: '#cdc5c7', skin: '#f6e6e3', skinSh: '#dcafb2',
    blue: '#2350b8', blueSh: '#183a86', red: '#c8102e', redSh: '#8c0b20', gold: '#b8995a', goldSh: '#7a6538',
    floor: '#f2eaea', floorSh: '#d8ced2', floor2: '#e8e0e0', sky: '#f7f3f3', hatch: '#cfc6c8', purple: '#3d1a5c', pink: '#e8a3ad',
    eye: '#d01530', steel: '#f4f2f4', steelSh: '#b9b0b8',
  },
  /* 렌더 규칙 하나: 셀 1단(문턱) · 검정 외곽선(부품 ID · 깊이 경계만) · 굵기 흔들림 · 획 끓임 */
  render: {
    outlinePx: 2.4,        /* 외곽선 굵기 (1080p 기준 px) — 라운드 1은 레퍼런스보다 세게 */
    outlineJit: 0.22,      /* 굵기 흔들림 ±비율 (노이즈) — 라운드 5: 0.3은 게임 거리에서 톱니로 읽힘 */
    boilFps: 8,            /* 획 끓임: 노이즈가 바뀌는 횟수/초 (0 = 고정) */
    farThin: 0.55,         /* 먼 곳 선 굵기 배율 */
    depthEdge: 0.035,      /* 깊이 경계 문턱 (거리 대비 비율) — 같은 부품끼리 겹친 실루엣 */
    shadeCut: 0.06,        /* 셀 문턱 (N·L + 정점 경향) — 이보다 작으면 그림자 색 */
    light: [-0.55, 0.62, 0.56],   /* 빛 방향 (카메라 기준 고정 → 카메라가 움직여도 그림자 모양 안정) */
    impactFrame: true,     /* 임팩트 프레임 (1프레임 흑백 반전) — 마무리 첫 적중 · QTE 완벽 때만 */
  },
  /* 카메라: 원근 · 내려다봄 41° · 화각 26 · 서 있는 키 = 화면 20% */
  cam: { fov: 26, pitch: 41, standFrac: 0.2, standH: 2.38, near: 1, far: 120, follow: 7.0, widenMax: 1.45, shakeMul: 1.0 },   /* 라운드 5: 47° · 15% → 41° · 20% (작고 위에서 검정 덩어리로 읽힘) */
  /* 자동 품질 (3단계 Perf3 배관 재사용 · 이 테마 고유: 외곽선 고리 수 · 끓임 끔) */
  quality: { maxH: 1080 },
  /* 모델 (E): 비율 · 크기 — 판정 크기 ±15% 안 (숨은 리그 키: 세검 2.43 · 대검 2.57 · 워든 3.91) */
  model: {
    rapier: { H: 2.38, heads: 7.6, shoulder: 0.165, seed: 11, det: 1.5, sub: 2 },   /* det · sub = 둘레 칸 배율 · 고리 나눔 (M1 삼각형 8천~1.5만) */
    great: { H: 2.5, heads: 7.8, shoulder: 0.18, seed: 23, det: 1.6, sub: 2 },
    warden: { H: 4.2, seed: 37, det: 2, sub: 2 },   /* 보스 1.5만~3만 · 라운드 6: 3.9 → 4.2 (키 = 숨은 리그 ±15%) */
    line: { rapier: 1.7, great: 1.7, warden: 1.7 },   /* 실루엣 선 굵기 배율 (라운드 5: 게임 거리에서 선이 끊겨 보임 → 굵게) */
  },
  /* 자세 (F): 모델 → 동작 이름 → 키 자세 표 (t1_poses.js가 채움 · 형식은 t1_pose.js 머리말) */
  poses: { rapier: {}, great: {}, warden: {} },
  /* 아레나 (G): 워든 = 연회색 바닥 + 사선 빗금 많이(띠 · 구역) */
  arena: { R: 9.5, ring: 0.7, hatchW: 0.22, hatchGap: 0.22, bands: 2, props: 20, seed: 5 },
  /* 이펙트 */
  fx: { smearLife: 0.16, inkN: 10, inkLife: 0.45, accentN: 4, speedLines: 18, teleBorder: 0.16, teleStep: 0.36, trailN: 14 },
  /* UI (U) */
  ui: { nameT: 0.8, stampT: 0.35, slideT: 0.18, wipeT: 0.35,
    /* 기술명 한글 부제 (화면 글자만 · 앞말은 따로 붙임: AERIAL FLASH THRUST → 공중 섬광 찌르기) */
    ko: { 'FLASH THRUST': '섬광 찌르기', 'REVERSE SPIN': '역회전 베기', 'WIND THRUST': '바람 찌르기', 'RISING CLEAVE': '올려치기', 'GROUND SMASH': '내려찍기', 'EARTH SPLIT': '대지 가르기',
      'SKY PIERCE': '하늘 꿰기', 'SKY DANCE': '하늘 춤', 'CROWN THRUST': '정수리 찌르기', 'SPINE RIDE': '등 타기', 'RAM LINK': '들이받기', 'TOPPLE': '넘어뜨리기', 'BACK RISER': '등 올려베기', 'PIN DOWN': '꽂아 누르기',
      'PERFECT CHAIN': '완벽한 연쇄', 'HAP DAE HAP': '합대합', 'SHIELD CLASH': '방패 맞부딪침' },
    koPre: { AERIAL: '공중', DIVING: '낙하', RUSHING: '돌진', FLANKING: '측면', VIOLET: '보라' } },
};
