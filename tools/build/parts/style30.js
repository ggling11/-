/* =============================================================================
 * 13c. 3단계 아트 — THE SEGMENT TWINS 벤치마킹 (STYLE 데이터)
 *    full-res G-buffer (perspective camera) → style composite: thick outer outlines coloured by kind
 *    (character colour / boss orange / prop white) + boss crease lines + bloom → post: chromatic
 *    aberration, grade (lift · haze · saturation), halftone vignette, grain, glitch tears, 1-bit card.
 *    Segmented arenas: an extruded polygon floor split by straight lines into patterned regions
 *    (crosswalk · tiles · planks · sunburst · sand …) with white segment lines, an outer ground and
 *    themed props (merged per material) — one theme per boss (STYLE.arena.themes).
 * ========================================================================== */
const Style = { glitchT: 0, glitchAmp: 0, monoT: 0, monoDur: 1, theme: -1, sky: new THREE.Color(STYLE.arena.themes[0].sky), dist: 20, t: 0, airZ: 1, airWant: 1 };   // airZ: 높이 뜬 사람까지 담으려고 잠깐 넓히는 배율 (1 = 그대로)
const hexV3 = h => hexToVec3(h);
if (STYLE.on) {
  CFG.PITCH = STYLE.cam.pitch * Math.PI / 180;
  CFG.SHADOW_EXTENT = STYLE.light.shadowExtent; G.uShadowBias.value = STYLE.light.bias;
  for (const k in STYLE.skins) if (SKINS[k]) for (const n in STYLE.skins[k]) SKINS[k].ramps[n] = STYLE.skins[k][n].map(s => C[s]);
}
// outline kind on every toon material under root (STYLE.outline.cols index)
function styleTag(root, cat) {
  if (!STYLE.on || !root) return;
  root.traverse(o => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uOlCat) o.material.uniforms.uOlCat.value = cat; });
}
// character look (visual only): overall scale · bigger head (the reference's chibi read)
function styleRig(ch) {
  if (!STYLE.on || !ch || ch.styled) return;
  ch.styled = true; ch.root.scale.setScalar(STYLE.chr.scale);
  const h = ch.root.getObjectByName('head'); if (h) h.scale.setScalar(STYLE.chr.head);
}
const styleCharCat = id => { const c = CHARS[id] && CHARS[id].color; return c === 'blue' ? 1 : c === 'red' ? 2 : 3; };

// ---------------------------------------------------------------- composite: outlines · creases · bloom · x-ray
const styleCompMat = passMat(/* glsl */`
uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth; uniform sampler2D tId;
uniform sampler2D tBloom1; uniform sampler2D tBloom2; uniform sampler2D tXray;
uniform ivec2 uSize; uniform int uK; uniform vec2 uBloomSize; uniform float uBloomStr; uniform float uBloomOn;
uniform float uNear; uniform float uFar; uniform float uOlPx; uniform float uCrPx; uniform int uRings;
uniform vec3 uOlCol[9]; uniform float uCrOn[9]; uniform vec3 uXCol[2];
const ivec2 NB[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
float lin(ivec2 p) { float d = texelFetch(tDepth, p, 0).r; float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
int catAt(ivec2 p) { return int(texelFetch(tId, p, 0).a * 255.0 + 0.5); }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), hi = uSize - 1;
  vec3 col = texelFetch(tColor, p, 0).rgb;
  bool bg = texelFetch(tDepth, p, 0).r >= 0.999999;
  float d0 = bg ? 1e9 : lin(p);
  int c0 = bg ? 0 : catAt(p);
  // outer outline: a neighbour (two rings, 12 taps each) of an outlined object clearly in front of this pixel
  int oc = 0; float od = 1e9;
  for (int ring = 0; ring < 2; ring++) {
    if (ring >= uRings) break;                   // (성능: 낮은 화질 단계에선 1바퀴)
    float rr = ring == 0 ? uOlPx : max(1.0, uOlPx * 0.55);
    for (int i = 0; i < 12; i++) {
      float a = (float(i) + (ring == 0 ? 0.0 : 0.5)) * 0.5235988;
      ivec2 q = clamp(p + ivec2(floor(vec2(cos(a), sin(a)) * rr + 0.5)), ivec2(0), hi);
      if (texelFetch(tDepth, q, 0).r >= 0.999999) continue;
      int cq = catAt(q); if (cq == 0) continue;
      float dq = lin(q);
      if (dq < d0 - max(0.3, d0 * 0.025) && dq < od) { od = dq; oc = cq; }
    }
  }
  if (oc > 0) col = uOlCol[oc];
  else if (c0 > 0 && uCrOn[c0] > 0.5) {          // crease lines in the outline colour (bosses — the reference's orange-edged enemies)
    vec3 n0 = normalize(texelFetch(tNormal, p, 0).xyz * 2.0 - 1.0); float cr = 0.0;
    int r = int(max(1.0, uCrPx + 0.5));
    for (int i = 0; i < 4; i++) {
      ivec2 q = clamp(p + NB[i] * r, ivec2(0), hi);
      if (catAt(q) != c0) continue;
      vec3 nq = normalize(texelFetch(tNormal, q, 0).xyz * 2.0 - 1.0);
      if (abs(lin(q) - d0) < max(0.3, d0 * 0.025)) cr = max(cr, 1.0 - dot(n0, nq));
    }
    if (cr > 0.32) col = mix(col, uOlCol[c0], 0.9);
  }
  if (uBloomOn > 0.5) {
    vec2 buv = (vec2(p) + 0.5) / float(uK) / uBloomSize;
    col += (texture(tBloom1, buv).rgb * 0.85 + texture(tBloom2, buv).rgb * 0.55) * uBloomStr;
  }
  // x-ray: a player hidden behind the boss / scenery = a flat silhouette in her outline colour
  vec4 XR = texelFetch(tXray, p, 0);
  if (XR.r > 0.5) {
    bool rimX = false;
    for (int i = 0; i < 4; i++) if (texelFetch(tXray, clamp(p + NB[i] * 2, ivec2(0), hi), 0).r < 0.5) rimX = true;
    vec3 xc = uXCol[XR.b > 0.5 ? 1 : 0];
    col = rimX ? vec3(1.0) : mix(xc, vec3(0.08, 0.02, 0.15), XR.g > 0.5 ? 0.15 : 0.45);
  }
  outColor = vec4(col, 1.0);
}`, {
  tColor: { value: gbuf.textures[0] }, tNormal: { value: gbuf.textures[1] }, tDepth: { value: gbuf.depthTexture }, tId: { value: gbuf.textures[3] },
  tBloom1: { value: bloom1.texture }, tBloom2: { value: bloom2.texture }, tXray: { value: xrayRT.texture },
  uSize: { value: new THREE.Vector2() }, uK: { value: 1 }, uBloomSize: { value: new THREE.Vector2() }, uBloomStr: { value: STYLE.post.bloom }, uBloomOn: { value: 1 },
  uNear: { value: STYLE.cam.near }, uFar: { value: STYLE.cam.far }, uOlPx: { value: 3 }, uRings: { value: 2 }, uCrPx: { value: 1 },
  uOlCol: { value: STYLE.outline.cols.map(hexV3) }, uCrOn: { value: STYLE.outline.cols.map((_, i) => (STYLE.outline.creaseOn.includes(i) ? 1 : 0)) },
  uXCol: { value: [hexV3(STYLE.outline.cols[1]), hexV3(STYLE.outline.cols[2])] },
});

// ---------------------------------------------------------------- post: CA · glitch · grade · halftone vignette · grain · 1-bit card
const stylePostMat = passMat(/* glsl */`
uniform sampler2D tFinal; uniform ivec2 uSize; uniform float uScale; uniform float uMargin; uniform vec2 uScreen; uniform float uT;
uniform float uCA; uniform float uCAEdge; uniform float uCAHit; uniform float uGrain; uniform vec3 uHaze; uniform float uHazeMix;
uniform vec3 uLift; uniform float uLiftMix; uniform float uSat; uniform float uCon; uniform vec3 uVig; uniform vec3 uVigCol;
uniform float uGlitch; uniform float uRows; uniform float uMono; uniform vec3 uHT;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 tap(vec2 px) { return texture(tFinal, (px / uScale + uMargin) / vec2(uSize)).rgb; }   // (성능: 3D를 낮은 해상도로 그렸으면 부드럽게 키움 · 같은 해상도면 그대로)
float ht(vec2 fc, float cell) {
  vec2 q = fc / cell; q = vec2(q.x * uHT.y - q.y * uHT.z, q.x * uHT.z + q.y * uHT.y);
  return clamp(length(fract(q) - 0.5) / 0.7071, 0.0, 1.0);
}
void main() {
  vec2 fc = gl_FragCoord.xy, uv = fc / uScreen, c = uv - 0.5;
  float asp = uScreen.x / uScreen.y, r = length(c * vec2(asp, 1.0));
  float shift = 0.0;
  if (uGlitch > 0.0) {                            // horizontal tears in a few bands
    float fr = floor(uT * 24.0), band = floor(uv.y * uRows + hash(vec2(fr, 3.1)) * 3.0);
    float hb = hash(vec2(band, fr));
    if (hb > 0.62) shift = (hb - 0.81) / 0.19 * uGlitch * uScreen.x;
  }
  vec2 off = c * (uCA + uCAEdge * dot(c, c) * 4.0 + uCAHit) * uScreen.x;
  vec2 b = fc + vec2(shift, 0.0);
  vec3 col = vec3(tap(b + off).r, tap(b).g, tap(b - off).b);
  col = mix(col, uLift + col * (1.0 - uLift), uLiftMix * 4.0);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uCon + 0.5;
  col = mix(col, uHaze, uHazeMix);
  float cell = uHT.x * 1.4;
  float v = smoothstep(uVig.x, uVig.y, r) * uVig.z, h = ht(fc, cell);
  col = mix(col, uVigCol, v > h ? min(1.0, v * 1.15) : v * 0.22);
  if (uMono > 0.0) {                              // 1-bit card: dark → black, light → white, the middle as halftone dots
    float m = dot(col, vec3(0.299, 0.587, 0.114));
    float bw = m > 0.62 ? 1.0 : m < 0.28 ? 0.0 : (smoothstep(0.28, 0.62, m) > ht(fc, cell * 0.8) ? 1.0 : 0.0);
    col = mix(col, vec3(bw), uMono);
  }
  col += (hash(fc + fract(uT * 7.13) * 91.7) - 0.5) * uGrain;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`, {
  tFinal: { value: finalRT.texture }, uSize: { value: new THREE.Vector2() }, uScale: { value: 1 }, uMargin: { value: CFG.MARGIN }, uScreen: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 },
  uCA: { value: STYLE.post.ca }, uCAEdge: { value: STYLE.post.caEdge }, uCAHit: { value: 0 }, uGrain: { value: STYLE.post.grain },
  uHaze: { value: hexV3(STYLE.post.haze) }, uHazeMix: { value: STYLE.post.hazeMix }, uLift: { value: hexV3(STYLE.post.lift) }, uLiftMix: { value: STYLE.post.liftMix },
  uSat: { value: STYLE.post.sat }, uCon: { value: STYLE.post.contrast ?? 1 }, uVig: { value: V3(...STYLE.post.vig) }, uVigCol: { value: hexV3(STYLE.post.vigCol) },
  uGlitch: { value: 0 }, uRows: { value: STYLE.glitch.rows }, uMono: { value: 0 }, uHT: { value: V3(7, 0.707, 0.707) },
});

// ---------------------------------------------------------------- resize · camera
function styleResize() {
  finalRT.texture.minFilter = finalRT.texture.magFilter = THREE.LinearFilter; finalRT.texture.needsUpdate = true;   // (성능: 확대 때 부드럽게)
  const k1080 = Pipe.rtH / 1080;
  G.uHT.value.x = Math.max(3, STYLE.shade.ht * k1080);
  styleCompMat.uniforms.uOlPx.value = Math.max(1.5, STYLE.outline.px * k1080);
  styleCompMat.uniforms.uCrPx.value = Math.max(1, STYLE.outline.crease * k1080);
  stylePostMat.uniforms.uHT.value.set(Math.max(3, STYLE.shade.ht * ((canvas.height || 1080) / 1080)), G.uHT.value.y, G.uHT.value.z);
  camera.near = STYLE.cam.near; camera.far = STYLE.cam.far;
  const fov0 = STYLE.cam.fov * Math.PI / 180;
  Style.dist = STYLE.cam.viewH / (2 * Math.tan(fov0 / 2));
  Pipe.wpp = STYLE.cam.viewH / Pipe.rtH;          // world units per render pixel at the focus distance (shake · kick · decal edges)
  stylePersp(CamRig.zoom || 1);
}
function stylePersp(zoom) {
  const fov = STYLE.cam.fov * Math.PI / 180 / Math.max(0.2, zoom), n = STYLE.cam.near, f = STYLE.cam.far;
  const top = n * Math.tan(fov / 2) / Math.max(0.3, Style.airZ), asp = Pipe.rtW / Pipe.rtH;
  camera.projectionMatrix.makePerspective(-top * asp, top * asp, top, -top, n, f);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
function styleCamApply(rig) {
  camera.rotation.set(-CFG.PITCH, rig.yaw, 0);
  camera.position.set(0, 0, 0);
  camera.updateMatrixWorld(true);
  const m = camera.matrixWorld.elements;
  rig.R.set(m[0], m[1], m[2]); rig.U.set(m[4], m[5], m[6]); rig.B.set(m[8], m[9], m[10]);
  rig.Fh.set(-rig.B.x, 0, -rig.B.z).normalize();
  stylePersp(rig.zoom);
  const P = rig.zp ? V3().lerpVectors(rig.target, rig.zp.f, 0.6 * rig.zw) : rig.target;
  const px = (rig.sx + rig.kx) * Pipe.k * Pipe.wpp * UI.shake, py = (rig.sy + rig.ky) * Pipe.k * Pipe.wpp * UI.shake;
  camera.position.copy(P).addScaledVector(rig.B, Style.dist).addScaledVector(rig.R, px).addScaledVector(rig.U, py);
  camera.updateMatrixWorld(true);
  Pipe.offset.set(0, 0); Pipe.origin.set(0, 0);
}

// ---------------------------------------------------------------- frame
function renderStyle(scene, lightCam) {
  G.uDitherOn.value = 0;
  scene.overrideMaterial = shadowMat;
  renderer.setRenderTarget(shadowRT); renderer.setClearColor(0xffffff, 1);
  renderer.render(scene, lightCam);
  scene.overrideMaterial = null;
  renderer.setRenderTarget(gbuf); renderer.setClearColor(Style.sky, 0);
  renderer.render(scene, camera);
  if (Xray.targets.length) {
    renderer.setRenderTarget(xrayRT); renderer.setClearColor(0x000000, 0); renderer.clear();
    const ac = renderer.autoClear; renderer.autoClear = false;
    Xray.targets.forEach((t, i) => {
      const r = t.root; if (!r.visible) return;
      const parent = r.parent; Xray.scene.add(r);
      const sm = t.smear && t.smear.mesh, smv = sm && sm.visible; if (sm) sm.visible = false;
      Xray.scene.overrideMaterial.uniforms.uWho.value = i;
      renderer.render(Xray.scene, camera);
      if (sm) sm.visible = smv;
      parent.add(r);
    });
    renderer.autoClear = ac;
  }
  if (Pipe.toggles.bloom) {
    bloomExtractMat.uniforms.tEmit.value = gbuf.textures[2];
    bloomExtractMat.uniforms.uK.value = Pipe.k;
    bloomExtractMat.uniforms.uSrcSize.value.set(Pipe.rtW, Pipe.rtH);
    runPass(bloomExtractMat, bloomE);
    const blur = (src, dst, dx, dy, sigma, step) => {
      const u = blurMat.uniforms;
      u.tSrc.value = src.texture; u.uDir.value.set(dx, dy); u.uSize.value.set(Pipe.bloomW, Pipe.bloomH);
      u.uSigma.value = sigma; u.uStep.value = step;
      runPass(blurMat, dst);
    };
    blur(bloomE, bloomT, 1, 0, 2.5, 1); blur(bloomT, bloom1, 0, 1, 2.5, 1);
    blur(bloom1, bloomT, 1, 0, 3.0, 2); blur(bloomT, bloom2, 0, 1, 3.0, 2);
  }
  const cu = styleCompMat.uniforms;
  cu.uSize.value.set(Pipe.rtW, Pipe.rtH); cu.uK.value = Pipe.k; cu.uBloomSize.value.set(Pipe.bloomW, Pipe.bloomH);
  cu.uNear.value = camera.near; cu.uFar.value = camera.far; cu.uBloomOn.value = Pipe.toggles.bloom ? 1 : 0;
  fighters.forEach((f, i) => { if (i < 2 && f.char) cu.uXCol.value[i].copy(cu.uOlCol.value[styleCharCat(f.char)]); });
  runPass(styleCompMat, finalRT);
  if (Glass3.mesh) { renderer.autoClear = false; renderer.setRenderTarget(finalRT); Glass3.mat.uniforms.uSize.value.set(Pipe.rtW, Pipe.rtH); renderer.render(Glass3.scene, camera); renderer.autoClear = true; }   // translucent segment walls over the composite (manual depth test)
  const pu = stylePostMat.uniforms, W = canvas.width || 1, H = canvas.height || 1;
  pu.uSize.value.set(Pipe.rtW, Pipe.rtH); pu.uScale.value = Pipe.scale / Pipe.k; pu.uScreen.value.set(W, H); pu.uT.value = Style.t;
  const g = Style.glitchT > 0 ? Style.glitchT / STYLE.glitch.t : 0;
  pu.uGlitch.value = g * STYLE.glitch.amp * Style.glitchAmp; pu.uCAHit.value = g * STYLE.glitch.ca;
  pu.uMono.value = Style.monoT > 0 && Game.state !== 'select' && Game.state !== 'title' ? Math.min(1, Style.monoT / 0.12, (Style.monoDur - Style.monoT + 0.02) / 0.06) : 0;
  runPass(stylePostMat, null);
}
// per-frame clocks (real time — effects keep running through hit-stop)
function styleTick(dt) {
  Style.t += dt;
  Style.glitchT = Math.max(0, Style.glitchT - dt);
  Style.monoT = Math.max(0, Style.monoT - dt);
  if (Game.techName && Game.techName.t > 0) Game.techName.t -= dt;   // 화면 글자 시간은 게임 갱신에서 (그리기와 따로 — 헤드리스 측정도 같게)
  if (Game.bannerT > 0) Game.bannerT -= dt;
  if (Game.noteT > 0 && !Menu3.on) Game.noteT -= dt;
  const w = Style.airWant; Style.airZ += (w - Style.airZ) * (1 - Math.exp(-dt * (w < Style.airZ ? 14 : 3))); Style.airWant = 1;   // Game.focus가 이 프레임에 다시 정함
}
function styleGlitch(amp = 1) { if (!STYLE.on) return; Style.glitchT = STYLE.glitch.t; Style.glitchAmp = Math.min(1.5, amp); }
function styleMono(t = STYLE.mono.t) { if (!STYLE.on) return; Style.monoT = Style.monoDur = t; }

// ---------------------------------------------------------------- materials for new content (direct colours, same G-buffer)
const S3_VS = /* glsl */`
uniform mat4 uShadowMatrix;
out vec3 vWN; out vec3 vVN; out vec3 vWP; out vec4 vSC;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); vVN = normalize(normalMatrix * normal); vSC = uShadowMatrix * wp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const S3_HEAD = /* glsl */`
precision highp float; precision highp int;
layout(location = 0) out vec4 gColor; layout(location = 1) out vec4 gNormal; layout(location = 2) out vec4 gEmit; layout(location = 3) out vec4 gId;
in vec3 vWN; in vec3 vVN; in vec3 vWP; in vec4 vSC;
uniform vec3 uLightDir; uniform sampler2D uShadowMap; uniform float uShadowBias; uniform float uShadowOn; uniform vec3 uBands;
uniform float uFogR0; uniform float uFogR1;
${STYLE_GLSL}
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y); }
float lightAmt(vec3 N) {
  float ndl = dot(N, uLightDir);
  float shs = (ndl > 0.0 && uShadowOn > 0.5) ? shadowSoft(vSC, uShadowMap, uShadowBias) : 1.0;
  return max(ndl, 0.0) * shs * 0.62 + (N.y * 0.5 + 0.5) * 0.24;
}
vec3 fogged(vec3 col) {
  float fh = halftone(uHT.x), ff = smoothstep(uFogR0, uFogR1, length(vWP.xz));
  ff = max(ff, smoothstep(-1.2, -6.0, vWP.y));
  return mix(col, uFogCol, ff > fh ? min(1.0, ff + 0.2) : ff * 0.5);
}`;
// props: flat colour + 3 tones + halftone shadow · cat = outline kind · emit = glow (bloom)
function sMat(o) {
  const u = { ...G, uCol: { value: hexV3(o.col) }, uEmit: { value: o.emit ? hexV3(o.emit) : V3() }, uEmitK: { value: o.emitK ?? 1 }, uOlCat: { value: o.cat ?? 0 }, uStripe: { value: o.stripe || 0 }, uCol2: { value: hexV3(o.col2 || o.col) } };
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: S3_VS, side: o.side ?? THREE.FrontSide, uniforms: u, fragmentShader: S3_HEAD + /* glsl */`
uniform vec3 uCol; uniform vec3 uCol2; uniform vec3 uEmit; uniform float uEmitK; uniform float uOlCat; uniform float uStripe;
void main() {
  vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
  vec3 base = uCol;
  if (uStripe > 0.0 && fract(vWP.y / uStripe) > 0.5) base = uCol2;   // banded (bollards · buoys)
  float v = lightAmt(N);
  vec3 col = celShade(min(base * 1.06, vec3(1.0)), base * 0.86, base * 0.6, v, uBands);
  float e = max(uEmit.r, max(uEmit.g, uEmit.b));
  if (e > 0.0) col = mix(col, uEmit, 0.85);
  gColor = vec4(fogged(col), 1.0);
  gNormal = vec4(normalize(gl_FrontFacing ? vVN : -vVN) * 0.5 + 0.5, 0.5);
  gEmit = vec4(uEmit * uEmitK, e > 0.0 ? 1.0 : 0.0);
  gId = vec4(0.0, 0.0, 0.0, uOlCat / 255.0);
}` });
}
// floor: extruded polygon (top = patterned regions split by lines, white segment / border lines · sides = wall colour) · outer ground
const FLOOR3_FS = S3_HEAD + /* glsl */`
uniform vec3 uLn[2]; uniform float uKk[5]; uniform vec3 uA[5]; uniform vec3 uB[5]; uniform vec3 uP[5];
uniform vec3 uPolyN[8]; uniform float uEdgeW; uniform vec3 uEdgeCol; uniform vec3 uWall; uniform float uOuter;
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
vec3 pat(int i, vec2 p) {
  float k = uKk[i]; vec3 A = uA[i], B = uB[i]; vec3 P = uP[i];
  vec2 q = rot2(p, P.y) / max(P.x, 0.05);
  vec3 c = A;
  if (k < 0.5) c = mix(A, B, step(0.62, vnoise2(p * 2.3)) * 0.35);
  else if (k < 1.5) c = fract(q.x) < P.z ? B : A;
  else if (k < 2.5) { vec2 g = floor(q), f = fract(q); c = mod(g.x + g.y, 2.0) < 0.5 ? A : B; if (min(f.x, f.y) < 0.035) c = mix(A, B, 0.5) * 0.82; }
  else if (k < 3.5) { float row = floor(q.y); float sx = q.x + hash21(vec2(row, 7.0)) * 3.0; float bi = floor(sx / 3.0);
                      c = mix(A, B, step(0.5, hash21(vec2(row, bi)))); if (fract(q.y) < 0.07 || fract(sx / 3.0) < 0.012) c *= 0.66; }
  else if (k < 4.5) { vec2 f = fract(q) - 0.5; float a = atan(f.y, f.x); c = fract(a / 6.2831853 * 12.0) < 0.5 ? A : B;
                      if (max(abs(f.x), abs(f.y)) > 0.46) c = mix(A, B, 0.5) * 0.8; if (length(f) < 0.07) c = A * 0.7; }
  else if (k < 5.5) { float w = sin((q.x + vnoise2(q * 0.35) * 1.1) * 6.2831853); c = w > 0.62 ? B : A; }
  else if (k < 6.5) { c = mix(A, B, step(0.55, vnoise2(p * 16.0)) * 0.7); if (hash21(floor(p * 12.0)) > 0.985) c *= 1.15; }
  else if (k < 7.5) { vec2 f = fract(q); c = (min(f.x, f.y) < P.z) ? B : A; }
  else { vec2 g = fract(q) - 0.5; c = length(g) < P.z ? B : mix(A, B, 0.18); vec2 big = fract(q / 6.0); if (min(big.x, big.y) < 0.03) c *= 0.8; }   // tactile paving
  float grime = smoothstep(0.55, 0.85, vnoise2(p * 0.45)) * 0.16 + smoothstep(0.6, 0.9, vnoise2(p * 2.1 + 7.3)) * 0.07;
  if (hash21(floor(p * 3.0)) > 0.992) grime += 0.12;                                 // odd dark stains
  grime *= ${(STYLE.arena.grime ?? 1).toFixed(3)};                                   // (아트 2차: STYLE.arena.grime)
  return c * (1.0 - 0.03 * ${(STYLE.arena.grime ?? 1).toFixed(3)} + vnoise2(p * 7.0) * 0.06 * ${(STYLE.arena.grime ?? 1).toFixed(3)}) * (1.0 - grime);
}
void main() {
  vec3 N = normalize(vWN); vec2 p = vWP.xz;
  vec3 base;
  float edge = 0.0;
  if (uOuter > 0.5) base = pat(4, p);
  else if (N.y > 0.5) {
    int rg = 0;
    for (int i = 0; i < 2; i++) if (dot(p, uLn[i].xy) > uLn[i].z) rg += (1 << i);
    base = pat(rg, p);
    float dpe = -1e9;
    for (int i = 0; i < 8; i++) dpe = max(dpe, dot(p, uPolyN[i].xy) - uPolyN[i].z);
    float dl = 1e9;
    for (int i = 0; i < 2; i++) dl = min(dl, abs(dot(p, uLn[i].xy) - uLn[i].z));
    if (dpe > -uEdgeW || dl < uEdgeW * 0.55) { base = uEdgeCol; edge = 1.0; }
  } else base = uWall;
  float v = lightAmt(N);
  vec3 col = edge > 0.5 ? base : celShade(min(base * 1.04, vec3(1.0)), base * 0.9, base * 0.62, v, uBands);
  if (uOuter < 0.5 && N.y < 0.5 && vWP.y > -0.05) col = uEdgeCol;   // white lip on the top edge of the wall
  gColor = vec4(fogged(col), 1.0);
  gNormal = vec4(normalize(vVN) * 0.5 + 0.5, 0.0);
  gEmit = vec4(0.0);
  gId = vec4(0.0);
}`;
const Floor3U = {
  ...G, uLn: { value: [V3(), V3()] }, uKk: { value: [0, 0, 0, 0, 0] }, uA: { value: [V3(), V3(), V3(), V3(), V3()] }, uB: { value: [V3(), V3(), V3(), V3(), V3()] },
  uP: { value: [V3(1, 0, 0.5), V3(1, 0, 0.5), V3(1, 0, 0.5), V3(1, 0, 0.5), V3(1, 0, 0.5)] }, uPolyN: { value: Array.from({ length: 8 }, () => V3()) },
  uEdgeW: { value: STYLE.arena.edge }, uEdgeCol: { value: V3(1, 1, 1) }, uWall: { value: V3(0.4, 0.2, 0.4) },
};
const floor3Mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: S3_VS, fragmentShader: FLOOR3_FS, uniforms: { ...Floor3U, uOuter: { value: 0 } } });
const outer3Mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: S3_VS, fragmentShader: FLOOR3_FS, uniforms: { ...Floor3U, uOuter: { value: 1 } } });

// merge simple parts (geometry + transform) into one non-indexed geometry
function mergeGeo(parts) {
  const P = [], N = [];
  for (const { g, m } of parts) {
    const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    q.deleteAttribute('normal'); q.computeVertexNormals();
    P.push(...q.attributes.position.array); N.push(...q.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  return out;
}
const M4 = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL8 = new THREE.CylinderGeometry(0.5, 0.5, 1, 8), CONE8 = new THREE.ConeGeometry(0.5, 1, 8), TOR = new THREE.TorusGeometry(0.5, 0.16, 6, 12);
// themed prop sets: { matKey: [{ g, m }, ...] } built on demand · mats: key → sMat options
const PROPS3 = {
  mats: {
    ped:     { col: '#2a1335', cat: 5 }, pedTop: { col: '#fff4ea', emit: '#fff1e6', emitK: 0.55, cat: 5 }, pedGem: { col: '#ffd34f', emit: '#ffcc3a', emitK: 0.9, cat: 5 },
    bollard: { col: '#2c1636', col2: '#e2a24f', stripe: 0.24, cat: 0 }, truss: { col: '#2a1438', cat: 0 }, trussLt: { col: '#3c1e4a', cat: 0 },
    neonP:   { col: '#ff3d8f', emit: '#ff3d8f', emitK: 1.2, cat: 0 }, neonC: { col: '#4fd2ff', emit: '#4fd2ff', emitK: 1.0, cat: 0 },
    fence:   { col: '#8a6a96', cat: 0 }, crate: { col: '#c84a72', cat: 0 }, crateLid: { col: '#e06a8c', cat: 0 },
    buoy:    { col: '#f3ecf6', col2: '#5a6fd0', stripe: 0.18, cat: 5 }, post: { col: '#3b2350', cat: 0 }, lamp: { col: '#fff0d0', emit: '#ffd88a', emitK: 0.9, cat: 0 },
    umbA:    { col: '#e8a88c', cat: 0, side: THREE.DoubleSide }, umbB: { col: '#3e3e8e', cat: 0, side: THREE.DoubleSide }, umbC: { col: '#9a5e86', cat: 0, side: THREE.DoubleSide },
    pole:    { col: '#efe6f2', cat: 0 }, pylon: { col: '#1f0d2b', cat: 0 },
    blk:  { col: '#2a1538' }, blkLt: { col: '#3e2150' }, blkD: { col: '#2a1c4a' }, blkDLt: { col: '#3a2a62' },
    blkS: { col: '#4b3a66' }, blkSLt: { col: '#5d4a7a' }, blkN: { col: '#1d0c2a' }, blkNLt: { col: '#2c133e' },
    caster: { col: '#24112f' }, casterLt: { col: '#341a44' },
  },
  common(add) {                                   // pedestals at four polygon corners (outside the walkable circle) — white outline like the reference
    for (const [x, z] of [[7.6, 4.2], [-5.6, 6.6], [-7.9, -4.6], [5.4, -7.2]]) {
      add('ped', BOX, M4(x, 0.08, z, 0.6, 0.95, 0.16, 0.95)); add('ped', BOX, M4(x, 0.6, z, 0.6, 0.62, 0.95, 0.62));
      add('ped', BOX, M4(x, 1.12, z, 0.6, 0.85, 0.14, 0.85)); add('pedTop', CYL8, M4(x, 1.24, z, 0, 0.42, 0.1, 0.42));
    }
  },
  city(add) {
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.3, r = 10.2; add('bollard', CYL8, M4(Math.cos(a) * r, -0.35, Math.sin(a) * r, 0, 0.42, 1.0, 0.42)); }
    const tower = (x, z, h, ry) => {
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add('truss', BOX, M4(x + dx * 1.1, -0.8 + h / 2, z + dz * 1.1, 0, 0.22, h, 0.22).premultiply(new THREE.Matrix4()));
      for (let y = 0.6; y < h; y += 1.6) {
        add('trussLt', BOX, M4(x, -0.8 + y, z - 1.1, 0, 2.4, 0.16, 0.16)); add('trussLt', BOX, M4(x, -0.8 + y, z + 1.1, 0, 2.4, 0.16, 0.16));
        add('trussLt', BOX, M4(x - 1.1, -0.8 + y, z, 0, 0.16, 0.16, 2.4)); add('trussLt', BOX, M4(x + 1.1, -0.8 + y, z, 0, 0.16, 0.16, 2.4));
        add('truss', BOX, M4(x, -0.8 + y + 0.8, z - 1.1, 0, 0.12, 2.3, 0.12, 0, 0.75)); add('truss', BOX, M4(x - 1.1, -0.8 + y + 0.8, z, 0, 0.12, 2.3, 0.12, 0.75, 0));
      }
      add('neonP', BOX, M4(x, -0.8 + h * 0.62, z + 1.25, ry, 1.6, 0.5, 0.06));
    };
    tower(-13, -10, 9, 0); tower(4, -15, 7, 0); tower(15, -6, 10, 0); tower(-16, 3, 8, 0); tower(13, 10, 6, 0);
    for (const [x, z, ry] of [[9.6, -3.5, 1.2], [-8.4, 7.3, 0.7]]) for (let j = 0; j < 4; j++) {
      add('fence', BOX, M4(x + Math.cos(ry) * j * 0.9, -0.35, z + Math.sin(ry) * j * 0.9, -ry, 0.85, 0.06, 0.1)); add('fence', BOX, M4(x + Math.cos(ry) * j * 0.9, -0.55, z + Math.sin(ry) * j * 0.9, 0, 0.08, 0.5, 0.08));
    }
  },
  docks(add) {
    const crates = [[11, -5, 0.2], [12.2, -3.6, 0.5], [-11.5, -6, 0.3], [-10.4, 7.6, 0.9], [3, 12, 0.1], [-4, -12.2, 0.6], [12.5, 6, 1.2]];
    for (const [x, z, ry] of crates) for (let j = 0; j < 3; j++) {
      const h = j === 2 ? 1 : 0; add('crate', BOX, M4(x + (j % 2) * 1.05 * Math.cos(ry), -0.8 + 0.5 + h * 1.0, z + (j % 2) * 1.05 * Math.sin(ry), ry, 1, 1, 1));
      add('crateLid', BOX, M4(x + (j % 2) * 1.05 * Math.cos(ry), -0.8 + 1.02 + h * 1.0, z + (j % 2) * 1.05 * Math.sin(ry), ry, 1.04, 0.06, 1.04));
    }
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.6, r = 9.8; add('buoy', TOR, M4(Math.cos(a) * r, -0.7, Math.sin(a) * r, 0, 1.4, 1.4, 1.4, Math.PI / 2, 0)); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = 14.5; add('post', CYL8, M4(Math.cos(a) * r, -0.2, Math.sin(a) * r, 0, 0.45, 1.6, 0.45)); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4, r = 11.5; add('pole', CYL8, M4(Math.cos(a) * r, 0.9, Math.sin(a) * r, 0, 0.12, 3.4, 0.12)); add('lamp', BOX, M4(Math.cos(a) * r, 2.7, Math.sin(a) * r, 0, 0.36, 0.36, 0.36)); }
  },
  shore(add) {
    const ums = [[10.5, 2, 'umbA'], [-10.8, -2.5, 'umbB'], [3, 11, 'umbC'], [-2.5, -11.4, 'umbA'], [8.5, -8.8, 'umbB'], [-8, 9.4, 'umbA'], [12.5, -4.5, 'umbC']];
    for (const [x, z, k] of ums) { add('pole', CYL8, M4(x, 0.4, z, 0, 0.1, 2.4, 0.1)); add(k, CONE8, M4(x, 1.85, z, 0.3, 3.2, 0.7, 3.2)); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.25, r = 12.8; add('ped', BOX, M4(Math.cos(a) * r, -0.3, Math.sin(a) * r, a, 1.8, 1.0, 0.7)); }
  },
  // dense blocks around the arena (stacked boxes, deep recesses) — every theme gets its own ring in its own colours
  blocks(add, key, seed, rMin = 11.5, rMax = 23, n = 26) {
    let r = mulberry32(seed);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, rr = rMin + r() * (rMax - rMin), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const w = 1.5 + r() * 3, d = 1.5 + r() * 3, h = 1 + r() * 4.5;
      add(key, BOX, M4(x, -0.8 + h / 2, z, a, w, h, d));
      if (r() < 0.45) add(key + 'Lt', BOX, M4(x + (r() - 0.5), -0.8 + h + 0.5, z + (r() - 0.5), a + 0.4, w * 0.5, 1, d * 0.5));
    }
  },
  cityBlocks(add) { PROPS3.blocks(add, 'blk', 11); }, docksBlocks(add) { PROPS3.blocks(add, 'blkD', 22); },
  shoreBlocks(add) { PROPS3.blocks(add, 'blkS', 33, 13, 24, 18); }, neonBlocks(add) { PROPS3.blocks(add, 'blkN', 44); },
  neon(add) {
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + 0.2, r = 13 + (i % 3) * 2.2, h = 6 + (i % 4) * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      add('pylon', BOX, M4(x, -0.8 + h / 2, z, a, 1.8, h, 1.8));
      add(i % 2 ? 'neonC' : 'neonP', BOX, M4(x - Math.cos(a) * 0.95, -0.8 + h * 0.55, z - Math.sin(a) * 0.95, a, 0.08, h * 0.6, 0.2));
    }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = 10.4; add(i % 2 ? 'neonP' : 'neonC', BOX, M4(Math.cos(a) * r, -0.76, Math.sin(a) * r, -a, 0.12, 0.05, 1.6)); }
  },
};
// ---- 아트 2차: 경기장 바로 바깥 소품 띠 (STYLE.arena.near) — 레퍼런스처럼 주변이 꽉 차게 (시드로 흩뿌림, 걷는 다각형 밖)
Object.assign(PROPS3.mats, {
  barrier: { col: '#fff1e6', col2: '#ff4f8a', stripe: 0.16, cat: 5 }, cone: { col: '#ff7a3a', col2: '#fff1e6', stripe: 0.14, cat: 0 },
  barrel: { col: '#3c2f7e', col2: '#e2a24f', stripe: 0.22, cat: 0 }, chair: { col: '#e8a88c', col2: '#fff1e6', stripe: 0.1, cat: 0 },
  speaker: { col: '#1a0c26', cat: 0 }, rope: { col: '#d8b98a', cat: 0 },
});
PROPS3.near = (add, kinds, seed) => {
  const N = STYLE.arena.near, rr = mulberry32(seed), B = -0.8;
  for (let i = 0; i < N.n; i++) {
    const a = (i + rr() * 0.7) / N.n * TAU, r = N.r[0] + rr() * (N.r[1] - N.r[0]), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const ry = -a + Math.PI / 2 + (rr() - 0.5) * 0.9, k = kinds[Math.floor(rr() * kinds.length)];
    const at = (dx, dz) => [x + dx * Math.cos(ry) + dz * Math.sin(ry), z - dx * Math.sin(ry) + dz * Math.cos(ry)];
    switch (k) {
      case 'barrier': { add('barrier', BOX, M4(x, B + 0.62, z, ry, 1.5, 0.3, 0.12)); for (const s of [-0.62, 0.62]) { const [px, pz] = at(s, 0); add('fence', BOX, M4(px, B + 0.32, pz, ry, 0.08, 0.64, 0.42)); } break; }
      case 'cone': { add('cone', CONE8, M4(x, B + 0.36, z, 0, 0.4, 0.72, 0.4)); add('pylon', BOX, M4(x, B + 0.03, z, ry, 0.5, 0.06, 0.5)); break; }
      case 'bench': { add('fence', BOX, M4(x, B + 0.46, z, ry, 1.6, 0.08, 0.44)); const [bx, bz] = at(0, -0.2); add('fence', BOX, M4(bx, B + 0.78, bz, ry, 1.6, 0.36, 0.06));
                      for (const s of [-0.65, 0.65]) { const [px, pz] = at(s, 0); add('truss', BOX, M4(px, B + 0.22, pz, ry, 0.08, 0.44, 0.4)); } break; }
      case 'sign': { add('pole', CYL8, M4(x, B + 0.95, z, 0, 0.08, 1.9, 0.08)); add(i % 2 ? 'neonC' : 'neonP', BOX, M4(x, B + 1.75, z, ry, 0.95, 0.55, 0.06)); break; }
      case 'crate': { add('crate', BOX, M4(x, B + 0.45, z, ry, 0.9, 0.9, 0.9)); add('crateLid', BOX, M4(x, B + 0.92, z, ry, 0.94, 0.05, 0.94)); break; }
      case 'barrel': { add('barrel', CYL8, M4(x, B + 0.43, z, 0, 0.56, 0.86, 0.56)); if (rr() < 0.5) { const [px, pz] = at(0.62, 0.1); add('barrel', CYL8, M4(px, B + 0.43, pz, 0, 0.56, 0.86, 0.56)); } break; }
      case 'rope': { add('rope', TOR, M4(x, B + 0.06, z, ry, 1.1, 1.1, 1.1, Math.PI / 2, 0)); add('rope', TOR, M4(x, B + 0.16, z, ry + 0.4, 0.8, 0.8, 0.8, Math.PI / 2, 0)); break; }
      case 'chair': { add('chair', BOX, M4(x, B + 0.32, z, ry, 0.62, 0.06, 1.2, 0.35, 0)); add('truss', BOX, M4(x, B + 0.16, z, ry, 0.56, 0.32, 0.06)); break; }
      case 'speaker': { add('speaker', BOX, M4(x, B + 0.6, z, ry, 0.8, 1.2, 0.7)); const [px, pz] = at(0, 0.36); add('neonC', BOX, M4(px, B + 0.78, pz, ry, 0.5, 0.5, 0.02)); break; }
    }
  }
};
PROPS3.cityNear = add => PROPS3.near(add, STYLE.arena.near.kinds.city, 101); PROPS3.docksNear = add => PROPS3.near(add, STYLE.arena.near.kinds.docks, 202);
PROPS3.shoreNear = add => PROPS3.near(add, STYLE.arena.near.kinds.shore, 303); PROPS3.neonNear = add => PROPS3.near(add, STYLE.arena.near.kinds.neon, 404);
const Arena3 = { floor: null, outer: null, groups: {}, mats: {}, common: null,
  // tall structures on the light's side: their long shadows cut across the arena (the reference's big shadow shapes)
  casters(scene) {
    const L = G.uLightDir.value, lx = L.x, lz = L.z, l = Math.hypot(lx, lz) || 1, ux = lx / l, uz = lz / l, vx = -uz, vz = ux;
    PROPS3.casterSet = add => {
      for (const [d, s, h, w] of [[12.5, -3.5, 9, 2.4], [13.5, 2.5, 11, 1.8], [12.2, 7.5, 7, 3.0], [14, -9, 8, 2.2]]) {
        const x = ux * d + vx * s, z = uz * d + vz * s;
        add('caster', BOX, M4(x, -0.8 + h / 2, z, Math.atan2(ux, uz), w, h, w));
        add('casterLt', BOX, M4(x, -0.8 + h + 0.3, z, Math.atan2(ux, uz) + 0.3, w * 1.3, 0.6, w * 1.3));
      }
    };
    this.buildSet('casterSet', scene);
  },
  // build a prop set → one mesh per material
  buildSet(name, scene) {
    const parts = {};
    const add = (key, g, m) => (parts[key] = parts[key] || []).push({ g, m });
    PROPS3[name](add);
    const grp = new THREE.Group(); grp.name = 'props3:' + name;
    for (const key in parts) {
      const mat = this.mats[key] || (this.mats[key] = sMat(PROPS3.mats[key]));
      const msh = mesh(mergeGeo(parts[key]), mat); grp.add(msh);
    }
    scene.add(grp);
    return grp;
  },
  // theme i (boss order): floor regions · lines · colours · fog · sky · props
  set(i) {
    if (!STYLE.on) return;
    const T = STYLE.arena.themes[Math.min(i, STYLE.arena.themes.length - 1)];
    if (this.theme === T) return;
    this.theme = T; Style.theme = i;
    const U = Floor3U, rad = d => d * Math.PI / 180;
    T.lines.forEach(([ang, d], j) => U.uLn.value[j].set(Math.cos(rad(ang)), Math.sin(rad(ang)), d));
    [...T.regions, T.outer].forEach((R, j) => { U.uKk.value[j] = R.k; U.uA.value[j].copy(hexV3(R.a)); U.uB.value[j].copy(hexV3(R.b)); U.uP.value[j].set(R.s, rad(R.r || 0), R.f ?? 0.5); });
    U.uWall.value.copy(hexV3(T.wall)); U.uEdgeCol.value.copy(hexV3(T.edgeCol));
    G.uFogCol.value.copy(hexV3(T.sky)); G.uFogR0.value = T.fog[0]; G.uFogR1.value = T.fog[1];
    Style.sky.set(T.sky); VOID_COLOR.set(T.sky);
    for (const n in this.groups) this.groups[n].visible = n === T.props;
    buildGlass3(T);
  },
};
function buildArena3(scene) {
  const A = STYLE.arena, poly = A.poly;
  // edge planes (outward normals) of the convex polygon
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]; let nx = b[1] - a[1], nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    if (nx * (a[0] - cx) + nz * (a[1] - cz) < 0) { nx = -nx; nz = -nz; }
    Floor3U.uPolyN.value[i].set(nx, nz, nx * a[0] + nz * a[1]);
  });
  // extruded polygon: top cap (fan) + side walls
  const P = [], top = 0, bot = -A.wall;
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    P.push(cx, top, cz, b[0], top, b[1], a[0], top, a[1]);
    P.push(a[0], top, a[1], b[0], top, b[1], b[0], bot, b[1]);
    P.push(a[0], top, a[1], b[0], bot, b[1], a[0], bot, a[1]);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  // make sure every face points outward / up (the fan is wound for +Y)
  const nrm = g.attributes.normal;
  for (let t = 0; t < nrm.count; t += 3) {
    const ny = nrm.getY(t), px = (P[t * 3] + P[t * 3 + 3] + P[t * 3 + 6]) / 3, pz = (P[t * 3 + 2] + P[t * 3 + 5] + P[t * 3 + 8]) / 3;
    const out = Math.abs(ny) > 0.5 ? ny < 0 : nrm.getX(t) * (px - cx) + nrm.getZ(t) * (pz - cz) < 0;
    if (out) { for (let k = 0; k < 3; k++) nrm.setXYZ(t + k, -nrm.getX(t + k), -nrm.getY(t + k), -nrm.getZ(t + k)); const s = t * 3; for (let k = 0; k < 3; k++) { const tmp = P[s + 3 + k]; P[s + 3 + k] = P[s + 6 + k]; P[s + 6 + k] = tmp; } }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  Arena3.floor = mesh(g, floor3Mat, false); scene.add(Arena3.floor);
  Arena3.outer = mesh(new THREE.CircleGeometry(A.outerR, 64).rotateX(-Math.PI / 2).translate(0, bot - 0.002, 0), outer3Mat, false); scene.add(Arena3.outer);
  Arena3.common = Arena3.buildSet('common', scene);
  for (const n of ['city', 'docks', 'shore', 'neon']) {
    Arena3.groups[n] = Arena3.buildSet(n, scene);
    Arena3.groups[n].add(Arena3.buildSet(n + 'Blocks', scene));
    Arena3.groups[n].add(Arena3.buildSet(n + 'Near', scene));   // (아트 2차: 경기장 바로 바깥 소품 띠)
  }
  Arena3.set(0);
  const seal = new THREE.Group(); scene.add(seal);
  const crystal = new THREE.Group(); crystal.position.set(0, 0.9, 0); scene.add(crystal);
  return { colliders: [], crystal, seal };
}

// ---------------------------------------------------------------- glass segment walls: translucent vertical panes rising from the arena border and the segment lines
const Glass3 = { scene: new THREE.Scene(), mesh: null, mat: new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending,
  vertexShader: /* glsl */`out vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`precision highp float;
layout(location = 0) out vec4 outColor;
in vec2 vUv;
uniform sampler2D tDepth; uniform ivec2 uSize; uniform float uTint; uniform float uEdge; uniform float uFade;
void main() {
  float sz = texelFetch(tDepth, clamp(ivec2(gl_FragCoord.xy), ivec2(0), uSize - 1), 0).r;
  if (gl_FragCoord.z > sz) discard;                                // behind something opaque
  float top = 1.0 - smoothstep(0.0, 1.0, vUv.y) * uFade;
  float e = (vUv.x < 0.012 || vUv.x > 0.988) ? uEdge : (vUv.y < 0.02 ? uEdge * 0.8 : 0.0);
  float a = max(uTint * top, e * top);
  outColor = vec4(1.0, 0.97, 0.99, a);
}`,
  uniforms: { tDepth: { value: gbuf.depthTexture }, uSize: { value: new THREE.Vector2(1, 1) }, uTint: { value: STYLE.glass.tint }, uEdge: { value: STYLE.glass.edge }, uFade: { value: STYLE.glass.fade } },
}) };
// rebuild the panes for theme T: every polygon edge + each segment line clipped to the polygon
function buildGlass3(T) {
  const A = STYLE.arena, poly = A.poly, H = STYLE.glass.h, P = [], U = [];
  const pane = (a, b, H = STYLE.glass.h) => { P.push(a[0], 0, a[1], b[0], 0, b[1], b[0], H, b[1], a[0], 0, a[1], b[0], H, b[1], a[0], H, a[1]); U.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); };
  poly.forEach((a, i) => pane(a, poly[(i + 1) % poly.length]));
  if (STYLE.glass.lines) for (const [ang, d] of T.lines) {             // clip the line n·p = d to the convex polygon
    const nx = Math.cos(ang * Math.PI / 180), nz = Math.sin(ang * Math.PI / 180), hits = [];
    poly.forEach((a, i) => {
      const b = poly[(i + 1) % poly.length], fa = nx * a[0] + nz * a[1] - d, fb = nx * b[0] + nz * b[1] - d;
      if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); hits.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    });
    if (hits.length >= 2) pane(hits[0], hits[1], STYLE.glass.hLine ?? H);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  if (Glass3.mesh) { Glass3.scene.remove(Glass3.mesh); Glass3.mesh.geometry.dispose(); }
  Glass3.mesh = new THREE.Mesh(g, Glass3.mat); Glass3.mesh.frustumCulled = false; Glass3.scene.add(Glass3.mesh);
}
