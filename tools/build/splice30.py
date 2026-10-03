# ================================================================ 3단계: 세그먼트 트윈즈 아트 · 시작 화면 · Esc 메뉴 · 패드 · 기술명 연출 · 움직임 · QTE · 보스 체력 절반
# (splice.py가 splice20.py 다음에 실행 — 문자열 기준 위치만, 행 번호 X)

# ---------------------------------------------------------------- 데이터 구역 '0c. 3단계 데이터' (STYLE · MOTION · QTE · UI · PAD)
rep("""/* =============================================================================
 * 1b. BOSS RUSH DATA""", part('data30.js') + """/* =============================================================================
 * 1b. BOSS RUSH DATA""")

# ---------------------------------------------------------------- 보스 체력 절반 (디렉터 결정 7)
rep("""  { name: 'THE SCARLET COLOSSUS', skin: 'scarlet', size: 1.0, hp: 0.85, speed: 1.0, attach: [],   // hp 1.0 → 0.85 (1차: 합 봇 보스 1 4.9분)""",
    """  { name: 'THE SCARLET COLOSSUS', skin: 'scarlet', size: 1.0, hp: 0.425, speed: 1.0, attach: [],   // hp 1.0 → 0.85 (1차: 합 봇 보스 1 4.9분) · 3단계: 절반 0.85 → 0.425""")
rep("""  { name: 'THE AZURE WARDEN', skin: 'azure', size: 1.0, hp: 0.78, speed: 1.0, attach: ['shield'],   // hp 1.0 → 0.78 (1차: 합 봇 보스 2 6.1분)""",
    """  { name: 'THE AZURE WARDEN', skin: 'azure', size: 1.0, hp: 0.39, speed: 1.0, attach: ['shield'],   // hp 1.0 → 0.78 (1차: 합 봇 보스 2 6.1분) · 3단계: 절반 0.78 → 0.39""")
rep("""  { name: 'THE WEEPING BELL', rig: 'bell', skin: 'bell', size: 1.0, hp: 0.5,   // (12단계 2차: 0.62 → 0.55 · 3차: → 0.5)""",
    """  { name: 'THE WEEPING BELL', rig: 'bell', skin: 'bell', size: 1.0, hp: 0.25,   // (12단계 2차: 0.62 → 0.55 · 3차: → 0.5) · 3단계: 절반 0.5 → 0.25""")
rep("""  { name: 'THE TWIN DOKKAEBI', rig: 'dk', skin: 'dk', size: 0.75, hp: 0.34,   // (12단계 1차: 0.45 → 0.42 — 합 봇 4.97분 · 3차: → 0.34 · gapMul 1.5 → 2.0)""",
    """  { name: 'THE TWIN DOKKAEBI', rig: 'dk', skin: 'dk', size: 0.75, hp: 0.17,   // (12단계 1차: 0.45 → 0.42 — 합 봇 4.97분 · 3차: → 0.34 · gapMul 1.5 → 2.0) · 3단계: 절반 0.34 → 0.17""")

# ---------------------------------------------------------------- 아트 1: 팔레트 (같은 32칸 역할에 새 색 — STYLE.pal)
rep("const PAL_RGB = PAL_HEX.map(hexToVec3);",
    "if (STYLE.on) STYLE.pal.forEach((h, i) => { PAL_HEX[i] = h; });   // 3단계: 세그먼트 트윈즈 색 (칸 역할은 그대로)\nconst PAL_RGB = PAL_HEX.map(hexToVec3);")
rep("toggles: { pixel: true, outline: true, palette: true, dither: true, bloom: true },",
    "toggles: { pixel: !STYLE.on, outline: true, palette: !STYLE.on, dither: !STYLE.on, bloom: true },   // 3단계: 픽셀화 · 32색 양자화 · 디더 끔")

# ---------------------------------------------------------------- 아트 2: 툰 재질 — 3단계 셰이딩 (2~3톤 + 하프톤 경계 + 보라 그림자 + 외곽선 종류)
rep("""  uDitherOn: { value: 1 }, uDitherBand: { value: CFG.DITHER_BAND },
};""", """  uDitherOn: { value: 1 }, uDitherBand: { value: CFG.DITHER_BAND },
  // 3단계 아트 (STYLE): 켜짐 · 그림자 색/섞는 양 · 하프톤(칸 픽셀, cos, sin, 경계 폭) · 안개 색 · 아주 어두운 면 문턱 배율
  uStyle: { value: STYLE.on ? 1 : 0 }, uShTint: { value: hexToVec3(STYLE.shade.tint) }, uShMix: { value: STYLE.shade.mix },
  uHT: { value: new THREE.Vector4(STYLE.shade.ht, Math.cos(STYLE.shade.htAngle * Math.PI / 180), Math.sin(STYLE.shade.htAngle * Math.PI / 180), STYLE.shade.soft) },
  uFogCol: { value: hexToVec3(STYLE.arena.themes[0].sky) }, uDeep: { value: STYLE.shade.deep },
};""")
rep("const TOON_VS = /* glsl */`", """// 3단계 아트 공용 GLSL: 부드러운 그림자(4탭) · 하프톤(화면 공간 회전 격자) — 툰 재질 · 바닥 · 소품 재질이 같이 씀
const STYLE_GLSL = /* glsl */`
uniform float uStyle; uniform vec3 uShTint; uniform float uShMix; uniform vec4 uHT; uniform vec3 uFogCol; uniform float uDeep;
float shadowSoft(vec4 sc, sampler2D sm, float bias) {
  vec3 p = sc.xyz / sc.w;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  vec2 ts = 1.0 / vec2(textureSize(sm, 0)); float s = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2((i == 1 || i == 3) ? ${STYLE.light.pcf.toFixed(3)} : -${STYLE.light.pcf.toFixed(3)}, i >= 2 ? ${STYLE.light.pcf.toFixed(3)} : -${STYLE.light.pcf.toFixed(3)}) * ts;   // (STYLE.light.pcf)
    s += (p.z - bias > texture(sm, p.xy + o).r) ? 0.0 : 1.0;
  }
  return s * 0.25;
}
float halftone(float cell) {                     // 0 = dot centre → 1 = between dots
  vec2 q = gl_FragCoord.xy / max(cell, 1.0);
  q = vec2(q.x * uHT.y - q.y * uHT.z, q.x * uHT.z + q.y * uHT.y);
  vec2 f = fract(q) - 0.5;
  return clamp(length(f) / 0.7071, 0.0, 1.0);
}
// two-tone cel + halftone edge: lit / mid / shade colours, v = light amount (same scale as uBands)
vec3 celShade(vec3 cL, vec3 cM, vec3 cS, float v, vec3 bands) {
  float h = halftone(uHT.x);
  vec3 shade = mix(cS, uShTint, uShMix);
  float t = smoothstep(bands.y - uHT.w, bands.y + uHT.w, v);
  vec3 c = t > h ? cM : shade;
  if (t <= h && halftone(uHT.x * 0.7) < 0.22) c = mix(shade, cM, 0.35);   // a dot texture inside the shadow (screen print)
  if (v > bands.z) c = cL;
  if (v < bands.x * uDeep) c = mix(shade, uShTint, 0.45);
  return c;
}
`;
const TOON_VS = /* glsl */`""")
rep("""uniform float uCutOn; uniform vec3 uCut[2]; uniform float uCutZ[2]; uniform float uCutStr;   // x-ray cut-out (boss only)
""", """uniform float uCutOn; uniform vec3 uCut[2]; uniform float uCutZ[2]; uniform float uCutStr;   // x-ray cut-out (boss only)
uniform float uOlCat;                            // 3단계: outline kind (STYLE.outline.cols index, 0 = none)
${STYLE_GLSL}
""")
rep("""  if (uPLMode > 0.0) {
    vec3 tl = uPLPos - vWP; float dist = length(tl);""", """  if (uPLMode > 0.0 && uStyle < 0.5) {
    vec3 tl = uPLPos - vWP; float dist = length(tl);""")
rep("""  vec3 col = uPal[idx];

  // --- arena vignette: radial + height fade into the void (4 dithered steps)""", """  vec3 col = uPal[idx];
  if (uStyle > 0.5) {                            // 3단계: lit / mid / shade from the ramp (same tone shifts) + soft shadow + halftone
    float shs = (ndl > 0.0 && uShadowOn > 0.5) ? shadowSoft(vSC, uShadowMap, uShadowBias) : 1.0;
    float vs = max(ndl, 0.0) * shs * 0.62 + (N.y * 0.5 + 0.5) * 0.24 + uBandBias;
    int iL = I(ramp[3]), iM = I(ramp[2]), iS = I(ramp[1]);
    if (tone > 0.5) { iL = I(uUp[iL]); iM = I(uUp[iM]); iS = I(uUp[iS]); }
    if (tone < -0.5) { iL = I(uDn[iL]); iM = I(uDn[iM]); iS = I(uDn[iS]); }
    col = celShade(uPal[iL], uPal[iM], uPal[iS], vs, uBands);
    if (uFlash > 0.5) col = uPal[int(uFlashIdx + 0.5)];
    float fh = halftone(uHT.x);
    float ff = smoothstep(uFogR0, uFogR1, length(vWP.xz));
    ff = max(ff, smoothstep(-0.4, -4.0, vWP.y));
    col = mix(col, uFogCol, ff > fh ? min(1.0, ff + 0.2) : ff * 0.5);
    gColor = vec4(col, 1.0);
    gNormal = vec4(VN * 0.5 + 0.5, uOutline);
    float e3 = max(uEmit.r, max(uEmit.g, uEmit.b));
    gEmit = vec4(uEmit, e3 > 0.0 ? 1.0 : 0.0);
    gId = vec4(vId, 0.0, ghost, uOlCat / 255.0);
    return;
  }

  // --- arena vignette: radial + height fade into the void (4 dithered steps)""")
rep("""    uCutOn: { value: 0 }, uCut: { value: [V3(0, 0, 1), V3(0, 0, 1)] }, uCutZ: { value: [0, 0] }, uCutStr: { value: 0 },
  };""", """    uCutOn: { value: 0 }, uCut: { value: [V3(0, 0, 1), V3(0, 0, 1)] }, uCutZ: { value: [0, 0] }, uCutStr: { value: 0 },
    uOlCat: { value: o.cat ?? 0 },               // 3단계: outline kind (0 none · STYLE.outline.cols)
  };""")

# ---------------------------------------------------------------- 아트 3: 렌더 파이프라인 · 카메라 · 아레나 (style30.js — 월드 설정 앞에 넣어 buildArena에서 씀)
rep("""function renderFrame(scene, lightCam) {
  const T = Pipe.toggles;""", """function renderFrame(scene, lightCam) {
  if (STYLE.on) return renderStyle(scene, lightCam);   // 3단계: full-res G-buffer → style composite (coloured outlines) → post (CA · grade · halftone vignette · glitch)
  const T = Pipe.toggles;""")
rep("""  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
  camera.updateProjectionMatrix();
}""", """  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
  camera.updateProjectionMatrix();
  if (STYLE.on) styleResize();                   // 3단계: render scale · perspective camera · halftone cell size
}""")
rep("""  Pipe.k = Pipe.toggles.pixel ? 1 : scale;""", """  Pipe.k = Pipe.toggles.pixel ? 1 : STYLE.on ? Math.max(1, Math.round(scale * STYLE.scale)) : scale;   // 3단계: render scale""")
rep("""  apply() {
    camera.rotation.set(-CFG.PITCH, this.yaw, 0);""", """  apply() {
    if (STYLE.on) return styleCamApply(this);      // 3단계: perspective camera (STYLE.cam)
    camera.rotation.set(-CFG.PITCH, this.yaw, 0);""")
rep("""function buildArena(scene) {
  const colliders = [];""", """function buildArena(scene) {
  if (STYLE.on) return buildArena3(scene);       // 3단계: segmented arenas (STYLE.arena)
  const colliders = [];""")
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('style30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
# 매 프레임 효과 시계 · 큰 흔들림 = 화면 찢김 · 보스마다 아레나 테마 · 외곽선 종류 붙이기
rep("""  clock.t += dt;
  Input.poll();""", """  clock.t += dt;
  if (STYLE.on) styleTick(dt);                    // 3단계: glitch · 1-bit card clocks (real time, look only)
  Input.poll();""")
rep("""  shake(amp, dur) {
    const cur""", """  shake(amp, dur) {
    if (STYLE.on && amp >= STYLE.glitch.minShake) styleGlitch(amp / 8);   // 3단계: big hits tear the screen
    const cur""")
rep("""  apply(i) {
    if (BOSSES[i].rig === 'dk')""", """  apply(i) {
    if (STYLE.on) Arena3.set(i);                   // 3단계: this boss's segmented arena theme
    if (BOSSES[i].rig === 'dk')""")
rep("Xray.targets = [player, player2];", "Xray.targets = [player, player2];\nif (STYLE.on) { styleTag(player.root, styleCharCat('rapier')); styleTag(player2.root, styleCharCat('great')); styleTag(boss.root, 4); styleRig(player); styleRig(player2); }   // 3단계: outline kinds · character look")
rep("    if (R.remap) ch.remap = R.remap;", "    if (R.remap) ch.remap = R.remap;\n    styleTag(ch.root, styleCharCat(id)); styleRig(ch);   // 3단계: outline in the character's colour · character look")
rep("    if (!this.rig) { this.rig = buildBell(); this.rig.root.visible = false; scene.add(this.rig.root); }",
    "    if (!this.rig) { this.rig = buildBell(); this.rig.root.visible = false; scene.add(this.rig.root); styleTag(this.rig.root, 8); }")
rep("for (let k = 0; k < 2; k++) { const r = buildDokkaebi(k); r.root.visible = false; scene.add(r.root); this.rigs.push(r); }",
    "for (let k = 0; k < 2; k++) { const r = buildDokkaebi(k); r.root.visible = false; scene.add(r.root); this.rigs.push(r); styleTag(r.root, 6 + k); }")
rep("""  drawFightHud, skillGlyph,""", """  drawFightHud, skillGlyph,
  STYLE, Style, Arena3, MOTION, QTE, UI, PAD, styleGlitch, styleMono, styleTag, Menu3, Title3, Join3, Pads3, leapMid3, styleMotion3, styleEye3, leapEase3, Qte3, Perf3,   // 3단계 (키는 추가만)""")
# 에밀레종 · 3단계: 몸을 어둡게 (레퍼런스의 적처럼 주황 외곽선으로 읽히게)
rep("    bronze: toon({ chr: true, ramp: [C.VOID, C.LEATH0, C.LEATH2, C.BRONZE], rim: C.SLATE1 }),",
    "    bronze: toon({ chr: true, ramp: STYLE.on ? [C.VOID, C.ABYSS, C.LEATH0, C.LEATH1] : [C.VOID, C.LEATH0, C.LEATH2, C.BRONZE], rim: C.SLATE1 }),")
rep("    band:   toon({ chr: true, ramp: [C.VOID, C.ABYSS, C.LEATH0, C.BRONZE], rim: C.SLATE1 }),",
    "    band:   toon({ chr: true, ramp: STYLE.on ? [C.VOID, C.ABYSS, C.LEATH1, C.LEATH2] : [C.VOID, C.ABYSS, C.LEATH0, C.BRONZE], rim: C.SLATE1 }),")
rep("    wood:   toon({ chr: true, ramp: RAMP.wood, rim: C.SLATE0 }),",
    "    wood:   toon({ chr: true, ramp: STYLE.on ? [C.VOID, C.ABYSS, C.DEEP, C.SHADE] : RAMP.wood, rim: C.SLATE0 }),")
# ---------------------------------------------------------------- 3단계 HUD (hud30.js) · 기술명 한 자리 · 보스 등장 1비트 카드
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('hud30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
rep("""function drawFightHud(dt) {
  if (Game.state === 'select') { Select.draw(); return; }""", """function drawFightHud(dt) {
  if (STYLE.on) return drawFightHud3(dt);          // 3단계: Segment Twins-style HUD
  if (Game.state === 'select') { Select.draw(); return; }""")
rep("""function drawRally(dt) {
  const W = CFG.BASE_W, n = FEEL.RALLY_MAX, gap = 14, cy = 13, cx = W / 2;""", """function drawRally(dt) {
  if (STYLE.on) return;                            // 3단계: the right-side RALLY bar (hud30.js rally3)
  const W = CFG.BASE_W, n = FEEL.RALLY_MAX, gap = 14, cy = 13, cx = W / 2;""")
rep("""    this.stats.starts++; this.stats.launches++; this.stats.startBy[kind] = (this.stats.startBy[kind] || 0) + 1;   // (2단계: every skill, not just the old four)""",
    """    this.stats.starts++; this.stats.launches++; this.stats.startBy[kind] = (this.stats.startBy[kind] || 0) + 1;   // (2단계: every skill, not just the old four)
    techNameSet(SKILLS2[kind] ? SKILLS2[kind].name : kind, f);   // 3단계: the name slot""")
rep("""  onFinish(L) {
    const S = FEEL.STAGE, f = L.f, by = L.by;""", """  onFinish(L) {
    const S = FEEL.STAGE, f = L.f, by = L.by;
    techNameSet(finLabel(L.name), f, L.violet);      // 3단계: the name slot (instead of the cut-in band)""")
rep("""    Game.banner(this.boss.name, 2.4); Sfx.play('p2charge');""",
    """    if (STYLE.on) { Style.card = { a: `BOSS ${i + 1}`, b: this.boss.name.replace('THE ', '') }; styleMono(); } else Game.banner(this.boss.name, 2.4);   // 3단계: the 1-bit boss card
    Sfx.play('p2charge');""")
rep("""  if (Game.noteT > 0) { txtC(Game.noteText, CFG.BASE_W / 2, 70, PAL_HEX[C.BONE1]); Game.noteT -= dt; }""",
    """  if (Game.noteT > 0) { if (STYLE.on) txtC(Game.noteText, CFG.BASE_W / 2, 64, '#fff7ef', 1, '#150720'); else txtC(Game.noteText, CFG.BASE_W / 2, 70, PAL_HEX[C.BONE1]); Game.noteT -= dt; }""")
rep("""  reset() { this.idx = this.startIdx || 0; this.state = 'fight'; this.t = 0; this.lock = false; this.cards = null; this.enterT = 0; this.entT = 0; this.apply(this.idx); },""",
    """  reset() { this.idx = this.startIdx || 0; this.state = 'fight'; this.t = 0; this.lock = false; this.cards = null; this.enterT = 0; this.entT = 0; this.apply(this.idx);
    if (STYLE.on && Game.mode === 'fight' && Game.state !== 'select') { Style.card = { a: `BOSS ${this.idx + 1}`, b: this.boss.name.replace('THE ', '') }; styleMono(); } },   // 3단계: the boss card at the start too""")
# ---------------------------------------------------------------- 아트 2차 (처음 보는 에이전트 검토 반영): 낮은 해 · 긴 그림자 · 그림자 드리우는 구조물 · 테두리 번쩍임 X · 마름모 입자 · 가는 흰 궤적
rep("""  G.uLightDir.value.set(0, 0.9, 0).addScaledVector(left, 0.7).addScaledVector(back, 0.4).normalize();
}""", """  G.uLightDir.value.set(0, 0.9, 0).addScaledVector(left, 0.7).addScaledVector(back, 0.4).normalize();
  if (STYLE.on) G.uLightDir.value.set(0, STYLE.light.y, 0).addScaledVector(left, STYLE.light.left).addScaledVector(back, STYLE.light.back).normalize();   // 3단계: a low sun → long shadows
}""")
rep("""lightCam.layers.set(1);""", """lightCam.layers.set(1);
if (STYLE.on) Arena3.casters(scene);            // 3단계: tall blocks on the light's side throw long shadows across the arena""")
rep("""  const E = Game.edgeFlash;""", """  const E = STYLE.on ? null : Game.edgeFlash;   // 3단계: no screen border flash (the glitch tear does that job)""")
rep("""uniform vec3 uPal[32]; uniform float uId;
void main() {
  vec3 c = uPal[vCol];
  bool hot = (vCol >= 21 && vCol <= 24) || vCol == 29 || vCol == 31;""", """uniform vec3 uPal[32]; uniform float uId; uniform float uStyle;
void main() {
  vec3 c = uPal[vCol];
  bool hot = (vCol >= 21 && vCol <= 24) || vCol == 29 || vCol == 31;
  if (uStyle > 0.5) {                            // 3단계: diamonds with a white-hot core (the reference's sparks)
    vec2 q = abs(gl_PointCoord - 0.5); float d = q.x + q.y;
    if (d > 0.5) discard;
    if (d < 0.2 && hot) c = vec3(1.0, 0.97, 0.92);
  }""")
rep("""  gl_PointSize = aSize * uPx;""", """  gl_PointSize = aSize * uPx * (uStyle > 0.5 ? 1.9 : 1.0);   // 3단계: bigger (diamond sprites)""")
rep("""uniform float uPx;
flat out int vCol;""", """uniform float uPx; uniform float uStyle;
flat out int vCol;""")
rep("""      uniforms: { uPal: { value: PAL_RGB }, uPx: { value: 1 }, uId: { value: newId() / 255 } }, depthWrite: false });""",
    """      uniforms: { uPal: { value: PAL_RGB }, uPx: { value: 1 }, uId: { value: newId() / 255 }, uStyle: G.uStyle }, depthWrite: false });""")
rep("""uniform vec3 uA; uniform vec3 uB; uniform vec3 uEmit; uniform float uId;
void main() {
  bool edge = vUv.y > 0.62 || vUv.x > 0.94;          // bright leading edge, softer body""", """uniform vec3 uA; uniform vec3 uB; uniform vec3 uEmit; uniform float uId; uniform float uStyle;
void main() {
  if (uStyle > 0.5) {                            // 3단계: a thin tapered white-hot streak + colour fringe, the tail dissolving in halftone dots
    if (vUv.y < 0.42) discard;
    vec2 hq = gl_FragCoord.xy / 5.0; hq = vec2(hq.x * 0.707 - hq.y * 0.707, hq.x * 0.707 + hq.y * 0.707);
    float ht = length(fract(hq) - 0.5) / 0.7071;
    if (smoothstep(0.0, 0.4, vUv.x) < ht) discard;
    bool core = vUv.y > 0.78;
    vec3 c = core ? vec3(1.0, 0.98, 0.95) : uA;
    gColor = vec4(c, 1.0); gNormal = vec4(0.5, 0.5, 1.0, 0.0);
    gEmit = vec4(core ? vec3(0.4) : uA * 0.35 + uEmit * 0.25, 1.0); gId = vec4(uId, 0.0, 0.0, 0.0);
    return;
  }
  bool edge = vUv.y > 0.62 || vUv.x > 0.94;          // bright leading edge, softer body""")
rep("""                  uEmit: { value: V3(...(emit || [0, 0, 0])) }, uId: { value: newId() / 255 } },""",
    """                  uEmit: { value: V3(...(emit || [0, 0, 0])) }, uId: { value: newId() / 255 }, uStyle: G.uStyle },""")
# HUD canvas at native resolution (pixel font stays crisp: integer transform) → the portraits can be drawn as ink art
rep("""  Pipe.scale = scale;
  Pipe.k = Pipe.toggles.pixel""", """  Pipe.scale = scale;
  if (STYLE.on) { hudCanvas.width = CFG.BASE_W * scale; hudCanvas.height = CFG.BASE_H * scale; hctx.setTransform(scale, 0, 0, scale, 0, 0); hctx.imageSmoothingEnabled = false; }   // 3단계: native-res HUD
  Pipe.k = Pipe.toggles.pixel""")
rep("const shadowRT = new THREE.WebGLRenderTarget(CFG.SHADOW_SIZE, CFG.SHADOW_SIZE, { ...NEAREST, depthBuffer: true });\nshadowRT.depthTexture = new THREE.DepthTexture(CFG.SHADOW_SIZE, CFG.SHADOW_SIZE);",
    "const SHSZ = STYLE.on ? STYLE.light.shadowSize : CFG.SHADOW_SIZE;   // 3단계: bigger shadow map (longer shadows over a wider extent)\nconst shadowRT = new THREE.WebGLRenderTarget(SHSZ, SHSZ, { ...NEAREST, depthBuffer: true });\nshadowRT.depthTexture = new THREE.DepthTexture(SHSZ, SHSZ);")
# ---------------------------------------------------------------- 시작 화면 · Esc 메뉴 · 2P 참가/나가기 (menu30.js)
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('menu30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
rep("const GKEYS = { KeyR: 'restart', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo', KeyC: 'chars' };",
    "const GKEYS = { KeyR: 'restart', F1: 'show', Tab: 'switch', F3: 'ai2', F4: 'tagSolo', KeyC: 'chars', Escape: 'menu' };   // 3단계: Esc = settings menu")
rep("""  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], ok: ['Space', 'KeyJ', 'KeyG'], back: ['Escape', 'KeyH'], backSolo: ['KeyK'] },""",
    """  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], ok: ['Space', 'KeyJ', 'KeyG'], back: ['KeyH'], backSolo: ['KeyK'] },   // 3단계: Esc = menu (not back)""")
rep("""  keys.add(e.code); if ((Select.on || Relics.open) && Select.taps.length < 32) Select.taps.push(e.code);""",
    """  keys.add(e.code); if ((Select.on || Relics.open) && Select.taps.length < 32 && !Menu3.on) Select.taps.push(e.code);
  if (Menu3.on && Menu3.taps.length < 32) Menu3.taps.push(e.code);   // 3단계: menu keys
  if (Game.state === 'title' && e.code !== 'Escape' && !/^F\\d/.test(e.code)) Title3.tap = true;   // 3단계: PRESS ANY KEY""")
rep("""  switch (e.code) {
    case 'Digit1': T.pixel = !T.pixel; resize(); note('PIXEL', T.pixel); break;""", """  if (!STYLE.on) switch (e.code) {               // 3단계: the pixel-art debug toggles only apply to the old look
    case 'Digit1': T.pixel = !T.pixel; resize(); note('PIXEL', T.pixel); break;""")
rep("""    case 'Digit5': T.bloom = !T.bloom; note('BLOOM', T.bloom); break;
""", """    case 'Digit5': T.bloom = !T.bloom; note('BLOOM', T.bloom); break;
  }
  switch (e.code) {
""")
rep("""                       : [[2, 'attack'], [0, 'dodge'], [1, 'parry'], [7, 'skill1'], [4, 'skill1'], [6, 'skill2'], [5, 'tag'], [9, 'restart'], [8, 'show']];""",
    """                       : [[2, 'attack'], [0, 'dodge'], [1, 'parry'], [7, 'skill1'], [4, 'skill1'], [6, 'skill2'], [5, 'tag'], [9, STYLE.on ? 'menu' : 'restart'], [8, 'show']];   // 3단계: START = menu""")
rep("""          const global = act === 'restart' || act === 'show' || act === 'prev' || act === 'next' || act === 'switch';""",
    """          const global = act === 'restart' || act === 'show' || act === 'prev' || act === 'next' || act === 'switch' || act === 'menu';""")
rep("""  Input.poll();
  if (Input.hit('show')) Game.toggleMode();""", """  Input.poll();
  if (STYLE.on && Menu3.on) { Menu3.frame(dt); return; }   // 3단계: settings menu = paused (nothing recorded)
  if (STYLE.on && Input.hit('menu') && Game.mode === 'fight') { Menu3.open(); Input.endFrame(); return; }
  if (Input.hit('show')) Game.toggleMode();
  if (STYLE.on && Game.mode === 'fight' && Game.state === 'title') { Title3.frame(dt); return; }   // 3단계: title screen""")
rep("""    if (Input.p2Touched) { Input.p2Touched = false; if (Game.tagMode || fighters[1].bot) Game.join(1, false); }""",
    """    if (STYLE.on) { Input.p2Touched = false; joinHold3(dt); }   // 3단계: hold ENTER / NUM1 / 2nd pad A to join — no accidental drop-in
    else if (Input.p2Touched) { Input.p2Touched = false; if (Game.tagMode || fighters[1].bot) Game.join(1, false); }""")
rep("""    if (e.s === 1 && this.mode !== 'duo') { this.mode = 'duo'; this.resetPanel(1); Sfx.play('join'); return; }   // 2P joins by pressing any 2P key""",
    """    if (e.s === 1 && this.mode !== 'duo') { if (STYLE.on) return; this.mode = 'duo'; this.resetPanel(1); Sfx.play('join'); return; }   // 2P joins by pressing any 2P key (3단계: only by holding — Select.update)""")
rep("""    for (const code of this.taps.splice(0)) this.handle(this.keyEvent(code), ids);""",
    """    if (STYLE.on) {                                // 3단계: hold the 2P confirm keys to join · the 2P back keys to leave
      const k = Join3.step(dt, this.mode === 'duo' ? SELECT_KEYS[1].back : SELECT_KEYS[1].ok);
      if (k >= 1) { this.mode = this.mode === 'duo' ? 'solo' : 'duo'; this.resetPanel(1); Join3.reset(); Sfx.play('join'); this.taps.length = 0; }
    }
    for (const code of this.taps.splice(0)) this.handle(this.keyEvent(code), ids);""")
rep("""Select.open();                                     // 2단계: the game opens on character select""",
    """if (STYLE.on) Title3.open(); else Select.open();   // 3단계: title screen first (2단계: character select)""")
# 선택 화면 안내 글자 (3단계: 꾹 눌러 참가 / 나가기 · Esc = 메뉴) · 큰 배너는 굵은 글꼴
rep("""    else if (this.mode === 'solo') line = 'ANY 2P KEY: 2P JOINS     F3: AI PARTNER';
    else if (this.mode === 'ai') line = 'F3: BACK TO TAG SOLO';""", """    else if (this.mode === 'solo') line = STYLE.on ? 'HOLD ENTER: 2P JOINS     F3: AI PARTNER     ESC: MENU' : 'ANY 2P KEY: 2P JOINS     F3: AI PARTNER';
    else if (this.mode === 'ai') line = 'F3: BACK TO TAG SOLO';
    else if (STYLE.on) line = 'HOLD BACKSPACE: 2P LEAVES     ESC: MENU';""")
rep("""    const t1 = pad1 ? '1P STICK  A OK  B BACK' : duo ? '1P WASD  G/J OK  H/ESC BACK' : 'WASD  J/SPACE OK  K/ESC BACK';""",
    """    const t1 = pad1 ? '1P STICK  A OK  B BACK' : duo ? `1P WASD  G/J OK  H${STYLE.on ? '' : '/ESC'} BACK` : `WASD  J/SPACE OK  K${STYLE.on ? '' : '/ESC'} BACK`;""")
rep("""  if (Game.bannerT > 0) { txtC(Game.bannerText, W / 2, 52, PAL_HEX[C.BONE2], 2); Game.bannerT -= dt; }""",
    """  if (Game.bannerT > 0) { if (STYLE.on) t7(Game.bannerText, W / 2, 52, '#fff7ef', { al: 'c', sc: 2 }); else txtC(Game.bannerText, W / 2, 52, PAL_HEX[C.BONE2], 2); if (!STYLE.on) Game.bannerT -= dt; }   // 3단계: 시간은 update(styleTick)에서""")
rep("""  if (Game.noteT > 0) { if (STYLE.on) txtC(Game.noteText, CFG.BASE_W / 2, 64, '#fff7ef', 1, '#150720');""", """  if (Game.noteT > 0 && !(STYLE.on && Menu3.on)) { if (STYLE.on) t7(Game.noteText, CFG.BASE_W - 8, 35, '#fff7ef', { al: 'r' }); /* 3단계: 상태 알림은 오른쪽 위 (기술명 · 보스 상태 글자와 안 겹치게) */""")
rep("""else txtC(Game.noteText, CFG.BASE_W / 2, 70, PAL_HEX[C.BONE1]); Game.noteT -= dt; }""", """else txtC(Game.noteText, CFG.BASE_W / 2, 70, PAL_HEX[C.BONE1]); if (!STYLE.on) Game.noteT -= dt; }   // 3단계: 시간은 update(styleTick)에서""")
# ---------------------------------------------------------------- 패드 입력 다시 짜기 (pad30.js)
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('pad30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
rep("""  poll() {
    // embedded previews may block the Gamepad API (permissions policy) → keyboard only, never crash""", """  poll() {
    if (STYLE.on) return Pads3.poll(this);        // 3단계: slot-by-first-press · retry when blocked · standard / fallback mapping · trigger values · round dead zone
    // embedded previews may block the Gamepad API (permissions policy) → keyboard only, never crash""")
# ---------------------------------------------------------------- 스킬 연출 단순화 (4절): 컷인 슬로모션 끔 · 합 대 합도 기술명만 (Stage.cut 표시는 통계 · 점검용으로 남김)
rep("""      this.cut = { L, by, f, t: 0 }; this.slowT = S.cutT; this.lastCut = Game.t; Duo.stats.wave.cut++;""",
    """      this.cut = { L, by, f, t: 0 }; this.slowT = STYLE.on && !UI.cutins ? 0 : S.cutT; this.lastCut = Game.t; Duo.stats.wave.cut++;   // 3단계: 컷인 옵션이 꺼져 있으면 슬로모션 없음""")
rep("""    Stage.slowT = FEEL.STAGE.cutT; Stage.lastCut = Game.t; Sfx.play('cutin'); Sfx.play('violet');""",
    """    Stage.slowT = STYLE.on && !UI.cutins ? 0 : FEEL.STAGE.cutT; Stage.lastCut = Game.t; Sfx.play('cutin'); Sfx.play('violet');
    techNameSet('HAP DAE HAP', a.who, true);       // 3단계: 기술명 한 줄""")
# ---------------------------------------------------------------- 움직임 과장 (5절, motion30.js · MOTION 표)
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('motion30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
# 공중 · 무릎 마무리 도약: 최고 높이 × leapH · 체공 × airT
rep("""    const u = Math.min(1, (fr - C2.coil) / C2.leap);
    let to;""", """    const u = Math.min(1, (fr - C2.coil) / (C2.leap * leapT3()));   // 3단계: 체공 × MOTION.airT
    let to;""")
rep("""    FP.set(p, FP.bez(L.from.x, (L.from.x + to.x) / 2, to.x, u), FP.bez(0, top + 0.6, to.y, u), FP.bez(L.from.z, (L.from.z + to.z) / 2, to.z, u));""",
    """    const mid = STYLE.on ? leapMid3(top + 0.6, to.y) : top + 0.6, w = leapEase3(u, mid, to.y);   // 3단계: 최고 높이 × MOTION.leapH · 꼭대기에서 멈칫
    FP.set(p, FP.bez(L.from.x, (L.from.x + to.x) / 2, to.x, w), FP.bez(0, mid, to.y, w), FP.bez(L.from.z, (L.from.z + to.z) / 2, to.z, w));""")
# 대시 거리 × dashDist (봇의 대시 예측도 같은 거리)
rep("""    const c = p.clip; p.rootScale = FEEL.DASH_DIST / (sampleRoot(c, c.frames) || 1);""",
    """    const c = p.clip; p.rootScale = FEEL.DASH_DIST * (STYLE.on ? MOTION.dashDist : 1) / (sampleRoot(c, c.frames) || 1);   // 3단계: 대시 거리 × MOTION.dashDist""")
rep("""      if (kind === 'dash') { const k = Math.min(1, tau / 0.17); x += d.x * FEEL.DASH_DIST * k; z += d.z * FEEL.DASH_DIST * k;""",
    """      if (kind === 'dash') { const k = Math.min(1, tau / 0.17), D = FEEL.DASH_DIST * (STYLE.on ? MOTION.dashDist : 1); x += d.x * D * k; z += d.z * D * k;""")
# 전진 스텝: 보스 쪽 최대 늘림 × slide · 조준 없을 때 × slide
rep("""      p.rootScale = nominal > 0.05 ? Math.max(nominal * FEEL.MAGNET_MIN, Math.min(nominal * FEEL.MAGNET_MAX, want)) / nominal : 1;
    }""", """      p.rootScale = nominal > 0.05 ? Math.max(nominal * FEEL.MAGNET_MIN, Math.min(nominal * FEEL.MAGNET_MAX * (STYLE.on ? MOTION.slide : 1), want)) / nominal : 1;
    } else if (STYLE.on && clip.root) p.rootScale = MOTION.slide;   // 3단계: 앞으로 미끄러짐 × MOTION.slide""")
# 피격 넉백 × knock
rep("""    else { this.state = 'hit'; this.invuln = FEEL.HURT_INVULN; p.play('hit'); }
    return true;""", """    else { this.state = 'hit'; this.invuln = FEEL.HURT_INVULN; p.play('hit'); if (STYLE.on) p.rootScale = MOTION.knock; }   // 3단계: 넉백 × MOTION.knock
    return true;""")
# 무기 궤적 두께 × smearW
rep("""  start(spec) { this.spec = spec; this.frame = 0; }""",
    """  start(spec) { this.spec = STYLE.on && spec && spec.W ? { ...spec, W: spec.W * MOTION.smearW } : spec; this.frame = 0; }   // 3단계: 궤적 두께 × MOTION.smearW""")
# 매 프레임: 잔상 · 먼지 · 늘림/찌그러뜨림 · 착지 충격파
rep("""    for (const f of fighters) if (f.bot) f.bot.inp.endFrame();
    if (Game.tagBot) Game.tagBot.inp.endFrame();""", """    for (const f of fighters) if (f.bot) f.bot.inp.endFrame();
    if (STYLE.on) styleMotion3(dt);                 // 3단계: 움직임 화면 과장 (입자 · 몸 늘림만)
    if (Game.tagBot) Game.tagBot.inp.endFrame();""")
# 카메라 틀(Game.focus): 3단계 원근 카메라의 실제 보이는 폭으로 (2단계 직교 480×270 px 단위 → STYLE.cam.viewH) — 높이 뜬 플레이어도 화면 안에
rep("""    const R = CamRig.R, U = CamRig.U, px = 1 / CFG.PPU;
    const HW = CFG.BASE_W / 2 * px, HH = CFG.BASE_H / 2 * px;""", """    const R = CamRig.R, U = CamRig.U, px = STYLE.on ? STYLE.cam.viewH / CFG.BASE_H / Style.airZ : 1 / CFG.PPU;   // 3단계: 화면 1칸 = viewH / 270 유닛 (높이 뜬 사람 때문에 넓혔으면 그만큼)
    const HW = CFG.BASE_W / 2 * px, HH = CFG.BASE_H / 2 * px;""")
rep("""      pr0 = Math.min(pr0, r - 0.6); pr1 = Math.max(pr1, r + 0.6); pu0 = Math.min(pu0, u - 0.4); pu1 = Math.max(pu1, u + 2.0 * U.y);
    }""", """      pr0 = Math.min(pr0, r - 0.6); pr1 = Math.max(pr1, r + 0.6); pu0 = Math.min(pu0, u - 0.4); pu1 = Math.max(pu1, u + 2.0 * U.y);
      if (STYLE.on) { const q = styleEye3(f.ch.pos, 2.6), g = styleEye3(f.ch.pos, 0); pr0 = Math.min(pr0, q[0] - 0.6, g[0] - 0.6); pr1 = Math.max(pr1, q[0] + 0.6, g[0] + 0.6); pu0 = Math.min(pu0, g[1] - 0.4); pu1 = Math.max(pu1, q[1]); }   // 3단계: 원근 보정
    }""")
rep("""    const crown = (AI.state === 'dead' ? 2.2 : 5.4) * Rush.scale();
    const E = Dk.extent(R, U, crown);""", """    if (STYLE.on) Style.airWant = Math.max(MOTION.airZoomMin, Math.min(1, STYLE.cam.viewH * (1 - 84 / CFG.BASE_H) / Math.max(1e-3, pu1 - pu0)));   // 3단계: 다 안 담기면 넓힘
    const crown = (AI.state === 'dead' ? 2.2 : 5.4) * Rush.scale();
    const E = Dk.extent(R, U, crown);""")
# 줌인은 마무리 첫 적중 때만 (4절) — 도약 중엔 줌인 없음(높이 뜬 사람이 화면 밖으로 안 나가게) · 첫 적중 기술명 팝업은 기술명 자리와 겹치므로 뺌
rep("""    CamRig.zoomPunch(L.violet ? S.violetZoom : S.zoom, V3((fp.x + b.x) / 2, 1.2, (fp.z + b.z) / 2));
    const sh = L.violet ? S.violetShake : S.shake; CamRig.shake(sh[0], sh[1]);""", """    if (!STYLE.on) CamRig.zoomPunch(L.violet ? S.violetZoom : S.zoom, V3((fp.x + b.x) / 2, 1.2, (fp.z + b.z) / 2));   // 3단계: 첫 적중 때로 옮김 (onFinHit)
    const sh = L.violet ? S.violetShake : S.shake; CamRig.shake(sh[0], sh[1]);""")
rep("""  onFinHit(L) {
    CamRig.shake(L.violet ? 6 : 4, L.violet ? 0.4 : 0.28);""", """  onFinHit(L) {
    if (STYLE.on) { const S = FEEL.STAGE, fp = L.f.ch.pos, b = boss.pos; CamRig.zoomPunch(L.violet ? S.violetZoom : S.zoom, V3((fp.x + b.x) / 2, Math.max(1.2, fp.y), (fp.z + b.z) / 2)); }   // 3단계: 줌인 = 첫 적중
    CamRig.shake(L.violet ? 6 : 4, L.violet ? 0.4 : 0.28);""")
rep("""      Game.popup(L.violet ? `VIOLET ${finLabel(L.name)}` : finLabel(L.name), V3(hitP.x, 3.4, hitP.z), L.violet ? C.PURP1 : C.HOT, 2);
      if (M.rally > 0) this.rallyUp(M.rally, f);""", """      if (!STYLE.on) Game.popup(L.violet ? `VIOLET ${finLabel(L.name)}` : finLabel(L.name), V3(hitP.x, 3.4, hitP.z), L.violet ? C.PURP1 : C.HOT, 2);   // 3단계: 기술명 자리에 이미 있음
      if (M.rally > 0) this.rallyUp(M.rally, f);""")
# ---------------------------------------------------------------- QTE (7절, qte30.js · QTE 표)
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('qte30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
rep("""  reset() { this.link = null; this.cut = null; this.slowT = 0; this.lastCut = -99; this.seen = new Set(); CamRig.zp = null; CamRig.zoom = 1; CamRig.zw = 0; },""",
    """  reset() { this.link = null; this.cut = null; this.slowT = 0; this.lastCut = -99; this.seen = new Set(); CamRig.zp = null; CamRig.zoom = 1; CamRig.zw = 0; Qte3.reset(); },   // (3단계: QTE도 비움)""")
# 사람: QTE 중엔 기록된 입력이 QTE 판정으로 (교대 키 포함) · 움직임 · 공격 없음
rep("""    if (Game.tagMode && inp.hit('tag')) { if (Game.tagSwap(this)) return; }""",
    """    if (STYLE.on && Qte3.on) { Qte3.input(this, inp); return; }   // 3단계 QTE: 입력 = 칸 판정
    if (Game.tagMode && inp.hit('tag')) { if (Game.tagSwap(this)) return; }""")
# 봇
rep("""    bot.tick = (bot.tick || 0) + 1;""", """    bot.tick = (bot.tick || 0) + 1;
    if (STYLE.on && Qte3.on) { Qte3.botStep(f, bot, inp, mode); return; }   // 3단계 QTE: 자기 칸""")
# 보스: 페이즈 전환 때 한 번 (QTE.bosses[].at) + 페이즈 2부터 패턴 가중치 w
rep("""    this.clearTele(); this.phase = this.nextPhase; this.phaseNoteT = 2.5; this.setLook(this.phase);""",
    """    this.clearTele(); this.phase = this.nextPhase; this.phaseNoteT = 2.5; this.setLook(this.phase);
    if (STYLE.on) Qte3.onPhase(this.phase);         // 3단계: 이 페이즈 전환에 QTE""")
rep("""    if (Dk.hold()) { this.toIdle(FEEL.DK.holdT); return; }   // 2단계 보스 4: the other dokkaebi is mid-attack → usually wait a beat
    const ph = this.phase - 1, B = Rush.boss;""", """    if (Dk.hold()) { this.toIdle(FEEL.DK.holdT); return; }   // 2단계 보스 4: the other dokkaebi is mid-attack → usually wait a beat
    const ph = this.phase - 1, B = Rush.boss;
    if (STYLE.on && Qte3.want && Qte3.can(ph, true)) { this.hist.push('qte'); if (this.hist.length > 4) this.hist.shift(); Qte3.start(); return; }   // 3단계: 페이즈 전환 QTE""")
rep("""    const h = this.hist, pool = (B.pools || FIGHT.POOLS)[ph], W = { ...FIGHT.WEIGHTS, ...(B.weights || {}) }, last = h[h.length - 1];""",
    """    const h = this.hist, pool = (B.pools || FIGHT.POOLS)[ph], W = { ...FIGHT.WEIGHTS, ...(B.weights || {}) }, last = h[h.length - 1];
    if (STYLE.on && Qte3.weight(ph) > 0) W.qte = Qte3.weight(ph);   // 3단계 QTE 가중치 (페이즈 2부터)""")
rep("""    const ok = n => {
      if (n !== 'walk' && !pool.includes(n)) return false;""", """    const ok = n => {
      if (n === 'qte') return Qte3.can(ph) && last !== 'qte';   // 3단계
      if (n !== 'walk' && !pool.includes(n)) return false;""")
rep("""    h.push(pick); if (h.length > 4) h.shift();
    if (pick === 'walk') {""", """    h.push(pick); if (h.length > 4) h.shift();
    if (pick === 'qte') { Qte3.start(); return; }   // 3단계
    if (pick === 'walk') {""")
rep("""    Slots.update(dt); Dk.with(Dk.main(), () => Stage.update(dt, gdt));   // 1.6""",
    """    Slots.update(dt); Dk.with(Dk.main(), () => Stage.update(dt, gdt));   // 1.6
    if (STYLE.on) Dk.with(Dk.main(), () => Qte3.update(dt));   // 3단계 QTE (실제 시간 · 메뉴 멈춤 땐 안 돎)""")
# 전체 정지 짧게 (4절 · A14): Game.stopAll × UI.stopMul
rep("""  stopAll(t) { this.hitstop = Math.max(this.hitstop, t); },""", """  stopAll(t) { if (STYLE.on) t *= UI.stopMul; this.hitstop = Math.max(this.hitstop, t); },   // 3단계: 전체 정지 × UI.stopMul""")
# 시작 화면: 클릭도 시작 (2절 — 아무 키 · 클릭 · 패드 버튼)
rep("""addEventListener('pointerdown', () => { window.focus(); Sfx.unlock(); });""",
    """addEventListener('pointerdown', () => { window.focus(); Sfx.unlock(); if (STYLE.on && Game.state === 'title') Title3.tap = true; });   // (3단계: 시작 화면은 클릭으로도 시작)""")
# 패드 진동: 패리 성공 때 짧게 (6-3 · 없으면 조용히 건너뜀 · 게임 결과와 무관)
rep("""      Sfx.play('parry');
      this.stats.parry++;""", """      Sfx.play('parry'); if (STYLE.on) Pads3.rumble(Game.tagMode ? 0 : f.idx, 60, perfect ? 0.9 : 0.5);   // 3단계
      this.stats.parry++;""")
# 아트 2차: 도깨비 몸 어둡게 (STYLE.dkLook — 팔레트 이름)
rep("""function buildDokkaebi(k) {
  const D = FEEL.DK, L = DK_LOOK[k];""", """function buildDokkaebi(k) {
  if (STYLE.on && STYLE.dkLook && !DK_LOOK[k].styled) { const S = STYLE.dkLook[k], cv = l => l.map(n => C[n]); Object.assign(DK_LOOK[k], { skin: cv(S.skin), rage: cv(S.rage), pants: cv(S.pants), styled: true }); }   // 3단계 아트 2차
  const D = FEEL.DK, L = DK_LOOK[k];""")
# 아트 2차: 바닥 예고(데칼) — 4×4 디더(저해상도 픽셀용)를 새 스타일에선 화면 하프톤 점으로 · 살짝 빛남 ('납작한 주황 원판' 지적)
rep("""  float b = (BAYER[ba.y * 4 + ba.x] + 0.5) / 16.0;
  if (b > uFade) discard;                                   // dithered fade in / out""", """  float b = (BAYER[ba.y * 4 + ba.x] + 0.5) / 16.0;
  if (uStyle > 0.5) { vec2 q = gl_FragCoord.xy / (uHT.x * 1.15); q = vec2(q.x * uHT.y - q.y * uHT.z, q.x * uHT.z + q.y * uHT.y); b = clamp(length(fract(q) - 0.5) / 0.7071, 0.0, 1.0); }   // 3단계: 하프톤 점
  if (b > uFade) discard;                                   // dithered fade in / out""")
rep("""uniform ivec2 uOrigin; uniform vec3 uPal[32];
const float BAYER[16]""", """uniform ivec2 uOrigin; uniform vec3 uPal[32]; uniform float uStyle; uniform vec4 uHT;
const float BAYER[16]""")
rep("""  gColor = vec4(uPal[idx], 1.0);
  gNormal = vec4(0.5, 0.5, 1.0, 0.0);
  gEmit = vec4(0.0);
  gId = vec4(uId, 0.0, 0.0, 1.0);
}`;
const Decals = {""", """  gColor = vec4(uPal[idx], 1.0);
  gNormal = vec4(0.5, 0.5, 1.0, 0.0);
  gEmit = uStyle > 0.5 ? vec4(uPal[idx] * 0.35, 1.0) : vec4(0.0);   // 3단계: 예고가 살짝 빛남
  gId = vec4(uId, 0.0, 0.0, 1.0);
}`;
const Decals = {""")
rep("""                  uPar: { value: o.par ?? 0 }, uActive: { value: 0 } },""", """                  uPar: { value: o.par ?? 0 }, uActive: { value: 0 }, uStyle: G.uStyle, uHT: G.uHT },   // (3단계: 하프톤)""")
# 조정 2회차 (데이터): 체력 절반으로 페이즈 3이 짧아져 합동 필살이 안 나오고 끝나는 판 43% · 맥놀이 없는 판 11% → 페이즈 패턴 가중치 올림 (프롬프트 8절)
rep("""    weights: { beat: 1.5, strike: 2.6, bellSlam: 1.4, combo: 2.4, nova: 1.2, spiral: 1.0, walk: 0.5 },""",
    """    weights: { beat: 3.0, strike: 2.6, bellSlam: 1.4, combo: 2.4, nova: 1.2, spiral: 1.0, walk: 0.5 },   // 3단계 조정 2회차: beat 1.5 → 3.0""")
rep("""dkLink: 3.2, dkSwap: 0.8, dkThrow: 1.4, dkCoin: 0.6, dkUlt: 2.4, walk: 1.6 },""",
    """dkLink: 3.2, dkSwap: 0.8, dkThrow: 1.4, dkCoin: 0.6, dkUlt: 5.0, walk: 1.6 },   // 3단계 조정 2회차: dkUlt 2.4 → 5.0""")
# ---------------------------------------------------------------- 성능 (프레임 드랍): 자동 화질 · 3D 최대 1080 · 부드러운 확대 · 그림자 2048 · HUD 글자 캐시 · 작은 글자 교체
rep("""/* =============================================================================
 * 14. WORLD SETUP""", part('perf30.js') + """/* =============================================================================
 * 14. WORLD SETUP""")
rep("""  Pipe.k = Pipe.toggles.pixel ? 1 : STYLE.on ? Math.max(1, Math.round(scale * STYLE.scale)) : scale;   // 3단계: render scale""",
    """  Pipe.k = Pipe.toggles.pixel ? 1 : STYLE.on ? Math.max(1, Math.min(Math.round(scale * STYLE.scale), Math.floor(STYLE.quality.maxH / CFG.BASE_H))) : scale;   // 3단계: render scale (성능: 3D는 최대 maxH 세로로 그리고 키움)""")
rep("""function loop(now) {
  requestAnimationFrame(loop);                 // schedule first: one bad frame can never freeze the game
  const dt = Math.min((now - last) / 1000, 1 / 20); last = now;""", """function loop(now) {
  requestAnimationFrame(loop);                 // schedule first: one bad frame can never freeze the game
  if (STYLE.on && !PIPE.paused) Perf3.tick(now - last);   // 3단계: 자동 화질 (실제 프레임 간격)
  const dt = Math.min((now - last) / 1000, 1 / 20); last = now;""")
# 작은 글자: 2단계 3×5 글꼴 → F7 모양(장치 픽셀) · 캐시
rep("""function txt(s, x, y, col, sc = 1) {
  hctx.fillStyle = col;""", """function txt(s, x, y, col, sc = 1) {
  if (STYLE.on && txt3ok()) return txt3(s, x, y, col, sc);   // 3단계: 읽히는 작은 글자 + 캐시
  hctx.fillStyle = col;""")
rep("""const tw = (s, sc = 1) => (String(s).length * 4 - 1) * sc;""",
    """const tw = (s, sc = 1) => (STYLE.on && txt3ok() ? tw3(s, sc) : (String(s).length * 4 - 1) * sc);   // (3단계: 새 작은 글자 폭)""")
rep("""  const x = Math.round(cx - tw(s, sc) / 2);
  if (shadow) txt(s, x + sc, y + sc, shadow, sc);
  txt(s, x, y, col, sc);""", """  const x = Math.round(cx - tw(s, sc) / 2);
  if (STYLE.on && txt3ok()) { txt3(s, x, y, col, sc, shadow); return; }   // (3단계: 그림자도 한 장에)
  if (shadow) txt(s, x + sc, y + sc, shadow, sc);
  txt(s, x, y, col, sc);""")
# 체크무늬 디더 배경 → 반투명 어두운 막 (글자가 체크무늬에 묻혀 깨져 보이던 것)
rep("""function hudDither(x, y, w, h) {
  if (_hudDith === null) {""", """function hudDither(x, y, w, h) {
  if (STYLE.on) { hctx.fillStyle = 'rgba(21,7,32,0.74)'; hctx.fillRect(x, y, w, h); return; }   // 3단계
  if (_hudDith === null) {""")
# 창 꽉 채우기 (STYLE.fit 'fill'): 소수 배율 · 3D는 정수 k로 그리고 부드럽게 맞춤 · HUD는 화면 픽셀 좌표(칸을 픽셀 경계에 맞춤)
rep("""  const scale = Math.max(1, Math.floor(Math.min(aw / CFG.BASE_W, ah / CFG.BASE_H)));
  const bw = CFG.BASE_W * scale, bh = CFG.BASE_H * scale;""", """  const fill = STYLE.on && STYLE.fit === 'fill';   // 3단계: 창을 꽉 채움 (소수 배율)
  const scale = fill ? Math.max(1, Math.min(aw / CFG.BASE_W, ah / CFG.BASE_H)) : Math.max(1, Math.floor(Math.min(aw / CFG.BASE_W, ah / CFG.BASE_H)));
  const bw = Math.round(CFG.BASE_W * scale), bh = Math.round(CFG.BASE_H * scale);""")
rep("""  Pipe.scale = scale;
  if (STYLE.on) { hudCanvas.width = CFG.BASE_W * scale; hudCanvas.height = CFG.BASE_H * scale; hctx.setTransform(scale, 0, 0, scale, 0, 0); hctx.imageSmoothingEnabled = false; }""",
    """  Pipe.scale = bw / CFG.BASE_W;
  if (STYLE.on) { hudCanvas.width = bw; hudCanvas.height = bh; hctx.imageSmoothingEnabled = false;
    if (fill) { hctx.setTransform(1, 0, 0, 1, 0, 0); HUDK.k = Pipe.scale; HUDK.on = true; } else { hctx.setTransform(scale, 0, 0, scale, 0, 0); HUDK.on = false; } }""")
rep("""  hctx.clearRect(0, 0, CFG.BASE_W, CFG.BASE_H);""", """  if (STYLE.on) hctx.clearRect(0, 0, hudCanvas.width, hudCanvas.height); else hctx.clearRect(0, 0, CFG.BASE_W, CFG.BASE_H);   // (3단계: 화면 픽셀 좌표일 수 있음)""")
