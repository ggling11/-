# 4단계 아트 테스트 공통 기반 (다섯 테마 세션이 같은 모양으로 만든다) — splice.py 끝에서 실행
#   ART 표(지금 테마 · 처음 켤 테마 · 이름 · 바꾸는 키) · SLICE 표(빠른 테스트판 흐름)
#   훅 artApply(id) · artDispose(id) · artFrame(dt) · artHud(ctx) · 판정용 숨은 리그(artHideRig)
#   바꾸는 법: F9 = 0 ↔ 이 세션 테마 · 주소 ?art=N · Esc 메뉴 RENDER SCALE 바로 아래 'ART THEME' 줄
#   Node(봇 테스트 · check15)에서는 늘 테마 0 · SLICE 꺼짐 (sim.mjs --art N 일 때만 테마 N, 렌더 없이)
# 문자열 기준으로만 끼운다 (행 번호 안 씀). splice 문자열 안 JS 주석은 /* */ 만 쓴다.

# ---------------------------------------------------------------- 0d. 데이터 구역: ART · SLICE
rep("""/* =============================================================================
 * 1b. BOSS RUSH DATA""", """/* =============================================================================
 * 0d. 4단계 아트 테스트 공통 — 테마(ART) · 빠른 테스트판 흐름(SLICE). 다섯 테마 세션이 같은 모양으로 쓴다.
 * ========================================================================== */
const ART_NODE = typeof process !== 'undefined' && !!(process.versions && process.versions.node);   /* Node(봇 테스트 · check15)인가 */
const ART = {
  cur: 0,                 /* 지금 테마 번호 (0 = 3단계 그래픽 그대로) */
  boot: 1,                /* 브라우저에서 처음 켤 테마 (이 세션 빌드 = 1 애니 셀) · Node는 늘 0 */
  names: ['STAGE 3', 'ANIME CEL', 'PIXEL', 'DARK REAL', 'PAINTERLY', 'DEATHS DOOR'],   /* 번호 → 메뉴 이름 (테마 0~5) */
  key: 'F9',              /* 이 키 = 테마 0 ↔ 이 세션 테마(boot) */
  param: 'art',           /* 주소 ?art=N */
  store: 'duoArtTheme',   /* 마지막 테마 기억 (localStorage, 실패해도 주소로 동작) */
  hideLayer: 31,          /* 판정용 숨은 리그를 옮길 레이어 (어느 카메라도 켜지 않음 · .visible은 그대로) */
  headless: false,        /* 렌더 없이 테마 데이터만 (sim.mjs --art N · check 4T 블록) */
  dt: 1 / 60,             /* 이번 화면 프레임 시간 (artFrame에 넘김) */
  themes: {},             /* 등록: ART.themes[번호] = { id, name, apply(), dispose(), frame(dt), hud(ctx) } */
};
const SLICE = {           /* 빠른 테스트판: 타이틀 → 아무 키 → 바로 전투 → 보스 처치 → 결과 → 아무 키로 다시 (브라우저 시작 흐름만 · Node에서는 꺼짐) */
  on: !ART_NODE,
  boss: 1,                /* 보스 순서 번호 (0 콜로서스 · 1 애저 워든 · 2 위핑 벨 · 3 쌍둥이 도깨비) */
  chars: ['rapier', 'great'],   /* 1P(청 세검) · 2P(적 대검) — 스킬은 CHARS[id].def 2개 */
};

/* =============================================================================
 * 1b. BOSS RUSH DATA""")

# ---------------------------------------------------------------- 훅 함수 + 테마 0 등록 (PIPE 바로 앞)
rep("const PIPE = window.PIPE = {           // dev hook", """/* ---------------------------------------------------------------- 4단계 아트 테마 공통 (splice40) */
ART.themes[0] = { id: 0, name: ART.names[0], apply() {}, dispose() {}, frame: null, hud: null };   /* 테마 0 = 3단계 그대로 (빈 함수) */
/* 판정용 숨은 리그: 3단계 리그(캐릭터 · 보스 · 종 · 도깨비)를 그대로 만들고 돌리되, 테마가 켜지면 화면에서만 숨긴다 (레이어 이동, .visible 안 건드림) */
function artRigRoots() {
  const s = new Set();
  for (const g of Rigs.list) s.add(g.root);
  for (const g of Rigs.bodies) if (g && g.root) s.add(g.root);
  if (Bell.rig) s.add(Bell.rig.root);
  for (const r of Dk.rigs || []) if (r && r.root) s.add(r.root);
  if (typeof boss !== 'undefined' && boss && boss.root) s.add(boss.root);
  return [...s];
}
function artHideRig(on) {
  const L = ART.hideLayer;
  for (const r of artRigRoots()) r.traverse(o => {
    const u = o.userData;
    if (on) { if (u.artMask === undefined) u.artMask = o.layers.mask; o.layers.set(L); }
    else if (u.artMask !== undefined) { o.layers.mask = u.artMask; delete u.artMask; }
  });
  ART.hiddenN = on ? artRigRoots().length : 0;
}
function artApply(id) { const T = ART.themes[id]; artHideRig(id !== 0); if (T && T.apply) T.apply(); }
function artDispose(id) { const T = ART.themes[id]; if (T && T.dispose) T.dispose(); }
function artFrame(dt) { const T = ART.themes[ART.cur]; if (!ART.cur || !T || !T.frame) return false; artHideRig(true); return T.frame(dt) !== false; }   /* true = 테마가 렌더를 대신함 · 새로 만든 리그(다시 시작 · 캐릭터 바꿈)도 매 프레임 레이어로 숨김 */
function artHud(ctx) { const T = ART.themes[ART.cur]; if (!ART.cur || !T || !T.hud) return false; return T.hud(ctx) !== false; }   /* true = 테마가 HUD를 대신함 */
function artSet(n, o = {}) {
  n = Number(n) || 0; if (!ART.themes[n]) n = 0;
  if (n === ART.cur && !o.force) return ART.cur;
  artDispose(ART.cur); ART.cur = n; artApply(n);
  if (!o.noSave && !ART_NODE) { try { localStorage.setItem(ART.store, String(n)); } catch (e) { /* 저장 실패 = 주소로만 */ } }
  return n;
}
function artCycle(d) { const ids = Object.keys(ART.themes).map(Number).sort((a, b) => a - b), i = ids.indexOf(ART.cur); return artSet(ids[(i + (d < 0 ? ids.length - 1 : 1)) % ids.length]); }
function artBoot() {   /* 브라우저: 주소 ?art=N > 기억 > ART.boot · Node: 0 */
  if (ART_NODE) return;
  let n = ART.boot;
  try { const v = localStorage.getItem(ART.store); if (v !== null && ART.themes[+v]) n = +v; } catch (e) { /* 기억 없음 */ }
  try { const q = new URLSearchParams(location.search).get(ART.param); if (q !== null && ART.themes[+q]) n = +q; } catch (e) { /* 주소 없음 */ }
  artSet(n, { noSave: true, force: n !== 0 });
}
/* 빠른 테스트판: 타이틀에서 바로 워든 전투 (세검 + 대검, 스킬 = 각자 기본 2개) */
function sliceStart() {
  Select.on = false; Rush.startIdx = SLICE.boss;
  assignChar(fighters[0], SLICE.chars[0]); assignChar(fighters[1], SLICE.chars[1]);
  Game.reset(); Game.noteT = 0; Input.p2Touched = false; Input.p2Num = false; SLICE.tap = false;
  Sfx.play('join');
}
function sliceEndFrame() {   /* 결과 화면: 아무 키 · 패드 아무 버튼 → 다시 시작 (끝 화면 글자가 다 뜬 뒤) */
  const end = Game.state === 'won' ? 2.2 : Game.state === 'lost' ? 1.6 : -1;
  const padAny = [0, 1].some(s => Input.pads[s].on && Input.padPrev[s].some(Boolean));
  if (end > 0 && Game.endT > end + 0.4 && (SLICE.tap || padAny)) { SLICE.tap = false; sliceStart(); return true; }
  if (end < 0 || Game.endT <= end + 0.4) SLICE.tap = false;
  return false;
}

const PIPE = window.PIPE = {           // dev hook""")

rep("  STYLE, Style, Arena3, MOTION, QTE, UI, PAD, styleGlitch,",
    "  ART, SLICE, artApply, artDispose, artFrame, artHud, artSet, artCycle, artBoot, artHideRig, artRigRoots, sliceStart, sliceEndFrame,   /* 4단계 공통 (키는 추가만) */\n  STYLE, Style, Arena3, MOTION, QTE, UI, PAD, styleGlitch,")

# ---------------------------------------------------------------- 렌더 루프 · HUD 훅
rep("""function frame(dt) {
  update(dt);
  updateCut();
  renderFrame(scene, lightCam);
  drawHud(dt);
}""", """function frame(dt) {
  update(dt);
  updateCut();
  ART.dt = dt;                                     /* 4단계: 테마가 렌더를 대신하면 artFrame이 그림 */
  renderFrame(scene, lightCam);
  drawHud(dt);
}""")
rep("  if (STYLE.on) return renderStyle(scene, lightCam);   // 3단계:",
    "  if (ART.cur && artFrame(ART.dt)) return;       /* 4단계: 테마 렌더 (테마 0 = 아래 3단계 그대로) */\n  if (STYLE.on) return renderStyle(scene, lightCam);   // 3단계:")
rep("  if (!hudVisible) return;\n  if (fps.value > 0 && (Dev.on",
    "  if (!hudVisible) return;\n  if (ART.cur && artHud(hctx)) return;           /* 4단계: 테마 HUD (테마 0 = 아래 3단계 그대로) */\n  if (fps.value > 0 && (Dev.on")

# ---------------------------------------------------------------- 바꾸는 키 · 메뉴 줄
rep("  if (Game.state === 'title' && e.code !== 'Escape' && !/^F\\d/.test(e.code)) Title3.tap = true;",
    "  if (e.code === ART.key) { e.preventDefault(); artSet(ART.cur ? 0 : ART.boot); return; }   /* 4단계: F9 = 테마 0 ↔ 이 세션 테마 */\n"
    "  if (SLICE.on && (Game.state === 'won' || Game.state === 'lost') && e.code !== 'Escape' && !/^F\\d/.test(e.code)) SLICE.tap = true;   /* 4단계 빠른 테스트판: 결과 화면 아무 키 */\n"
    "  if (Game.state === 'title' && e.code !== 'Escape' && !/^F\\d/.test(e.code)) Title3.tap = true;")
rep("      { k: 'EFFECTS', v: () => (UI.cutins ? 'CUT-INS' : 'NAME ONLY'),",
    "      { k: 'ART THEME', v: () => `${ART.cur} ${ART.names[ART.cur] || ''}`, set: d => { artCycle(d); }, act: () => { artCycle(1); } },   /* 4단계: 아트 테마 (F9 · ?art=N 과 같음) */\n"
    "      { k: 'EFFECTS', v: () => (UI.cutins ? 'CUT-INS' : 'NAME ONLY'),")
rep("    if (Game.state !== 'select' && Game.state !== 'title') L.push({ k: 'CHARACTER SELECT',",
    "    if (Game.state !== 'select' && Game.state !== 'title' && !SLICE.on) L.push({ k: 'CHARACTER SELECT',")

# ---------------------------------------------------------------- 빠른 테스트판 흐름
rep("    if ((this.tap || padAny) && this.t > 0.4) { this.tap = false; CamRig.zoom = 1; Sfx.play('join'); Select.open(); }",
    "    if ((this.tap || padAny) && this.t > 0.4) { this.tap = false; CamRig.zoom = 1; Sfx.play('join'); if (SLICE.on) sliceStart(); else Select.open(); }   /* 4단계: 선택 화면 건너뜀 */")
rep("    if (this.idx < BOSSES.length - 1) this.startRest(); else Game.win();",
    "    if (this.idx < BOSSES.length - 1 && !SLICE.on) this.startRest(); else Game.win();   /* 4단계 빠른 테스트판: 보스 하나 = 바로 결과 (유물 화면 안 거침) */")
rep("    if (toSel && (Game.state === 'won' || Game.state === 'lost') && Game.endT > (Game.state === 'won' ? 2.2 : 1.6)) { Select.open(); Input.endFrame(); return; }",
    "    if (SLICE.on && sliceEndFrame()) { Input.endFrame(); return; }   /* 4단계: 결과 → 아무 키 = 다시 시작 */\n"
    "    if (toSel && !SLICE.on && (Game.state === 'won' || Game.state === 'lost') && Game.endT > (Game.state === 'won' ? 2.2 : 1.6)) { Select.open(); Input.endFrame(); return; }")

# ---------------------------------------------------------------- 시작: 테마 고르기 (브라우저만)
rep("document.getElementById('boot').remove();\naddEventListener('pointerdown',",
    "artBoot();                                        /* 4단계: 주소 ?art=N > 기억 > ART.boot (Node = 테마 0) · 테마 등록(PIPE 앞)이 다 끝난 뒤 */\ndocument.getElementById('boot').remove();\naddEventListener('pointerdown',")

# 4단계 테마 1 (애니 셀)
exec(open(os.path.join(HERE, 'splice41.py'), encoding='utf8').read())
