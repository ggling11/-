/* =============================================================================
 * 4단계 테마 1 '애니 셀' — 렌더 경로 (t1_render.js) · 3단계 렌더 코드를 쓰지 않고 새로 짬
 *   ① 장면을 MRT 2장으로: 색(셀 1단, 재질에서 바로) + 정보(부품 ID · 선 굵기 · 선 켬)
 *   ② 합성: 부품 ID가 바뀌는 곳 · 깊이가 크게 튀는 곳에만 검정 선 (경계 검출 안쪽 선 없음)
 *      굵기 = T1.render.outlinePx(1080 기준) × (1 ± 흔들림 노이즈) × 먼 곳 얇게, 노이즈는 boilFps마다 바뀜(획 끓임)
 *   ③ 결과를 화면 크기로 키워 그림 (자동 품질이 렌더 배율을 바꿈)
 *   하프톤 · 글리치 · 색수차 · 그레인 · 블룸 · 비네트 · 그림자 맵 없음 (바닥 그림자는 회색 평면 한 단)
 * ========================================================================== */
const T1R = (() => {
  const SH = {};
  /* 셀 재질: 빛(화면 기준 고정 방향) · 문턱 하나 → 밝은 색 / 그림자 색. aBias = 정점별 그림자 경향 (+ 잘 안 생김, − 늘 그림자) */
  SH.vert = `
    #include <common>
    #include <skinning_pars_vertex>
    attribute float aPart; attribute float aBias;
    varying vec3 vN; varying float vPart; varying float vBias; varying float vDepth;
    void main() {
      #include <beginnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      #include <project_vertex>
      vN = normalize(transformedNormal); vPart = aPart; vBias = aBias; vDepth = -mvPosition.z;
    }`;
  SH.frag = `
    layout(location = 1) out highp vec4 gInfo;
    uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uL; uniform float uCut; uniform float uFlat; uniform float uId;
    uniform float uLine; uniform float uFlash; uniform float uAlpha;
    varying vec3 vN; varying float vPart; varying float vBias; varying float vDepth;
    void main() {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      float d = dot(n, uL) + vBias;
      vec3 c = (uFlat > 0.5 || d > uCut) ? uLit : uShade;
      if (uFlash > 0.5) { float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));   /* 피격 순간 (라운드 5): 2톤 반전 — 흰 → 먹 · 먹 → 흰 · 강조색 그대로 */
        c = sat > 0.3 ? c : (dot(c, vec3(0.299, 0.587, 0.114)) > 0.5 ? vec3(0.078, 0.067, 0.071) : vec3(0.992, 0.984, 0.984)); }
      pc_fragColor = vec4(c, uAlpha);
      float id = mod(uId + vPart, 255.0) + 1.0;                  /* 0 = 배경 */
      gInfo = vec4(id / 255.0, uLine, 1.0, 1.0);
    }`;
  /* 이펙트 · 선 없는 판: 단색 (선 끔) */
  SH.fxVert = `
    #include <common>
    attribute vec4 aCol;
    varying vec4 vCol;
    void main() {
      vCol = aCol;
      #include <begin_vertex>
      #include <project_vertex>
    }`;
  SH.fxFrag = `
    layout(location = 1) out highp vec4 gInfo;
    uniform float uId; uniform float uLine; uniform float uOpacity;
    varying vec4 vCol;
    void main() {
      if (vCol.a * uOpacity < 0.5) discard;                     /* 반투명 없음: 딱 끊긴 면만 */
      pc_fragColor = vec4(vCol.rgb, 1.0);
      gInfo = vec4((mod(uId, 255.0) + 1.0) / 255.0, uLine, uLine > 0.0 ? 1.0 : 0.0, 1.0);
    }`;
  /* 합성: 외곽선 */
  SH.compVert = `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  SH.compFrag = `
    precision highp float;
    uniform sampler2D tColor; uniform sampler2D tInfo; uniform sampler2D tDepth;
    uniform vec2 uSize; uniform float uPx; uniform float uJit; uniform float uSeed; uniform float uNear; uniform float uFar;
    uniform float uDepthEdge; uniform vec3 uInk; uniform float uFarThin; uniform vec3 uBg; uniform float uImpact; uniform float uDirs;
    in vec2 vUv; out vec4 outColor;
    float lin(float z) { return uNear * uFar / (uFar - z * (uFar - uNear)); }
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec4 c0 = texture(tColor, vUv); vec4 i0 = texture(tInfo, vUv);
      float z0 = lin(texture(tDepth, vUv).x);
      float id0 = floor(i0.r * 255.0 + 0.5);
      /* 굵기: 기준 px × 흔들림(노이즈, boilFps마다 바뀜) × 먼 곳 얇게 × 부품 선 굵기 */
      float n = vnoise(vUv * uSize / 38.0 + uSeed * 17.0);
      float far = mix(1.0, uFarThin, clamp((z0 - 20.0) / 40.0, 0.0, 1.0));
      float w0 = max(i0.g, 0.0);
      float R = uPx * (1.0 + uJit * (n * 2.0 - 1.0)) * far;
      float ink = 0.0;
      for (int k = 0; k < 16; k++) {
        if (float(k) >= uDirs) break;                            /* 자동 품질: 방향 수 16 → 12 → 8 */
        float a = float(k) * 6.2831853 / uDirs;
        for (int rr = 1; rr <= 2; rr++) {
          float r = R * float(rr) * 0.5;
          vec2 o = vec2(cos(a), sin(a)) * r / uSize;
          vec4 i1 = texture(tInfo, vUv + o);
          float id1 = floor(i1.r * 255.0 + 0.5);
          float z1 = lin(texture(tDepth, vUv + o).x);
          float lw = max(w0, i1.g);
          bool lineOn = (i0.b > 0.5 || i1.b > 0.5) && lw > 0.0;
          /* ID 경계: 양쪽이 반씩 (합쳐서 R) · 선 굵기 배율 반영 */
          if (lineOn && id1 != id0 && r <= R * 0.5 * lw + 0.5) ink = 1.0;
          /* 깊이 경계: 앞쪽(가까운) 픽셀만 그림 — 같은 부품이 겹친 실루엣 */
          if (i0.b > 0.5 && w0 > 0.0 && z1 - z0 > uDepthEdge * z0 && r <= R * w0) ink = 1.0;
        }
      }
      vec3 col = id0 < 0.5 ? uBg : c0.rgb;
      col = mix(col, uInk, ink);
      if (uImpact > 0.5) {                                       /* 임팩트 프레임 (라운드 5): 2톤 반전 — 밝은 면 → 먹 · 어두운 면 → 흰 · 강조색은 빨강 그대로 (팔레트 밖 색 없음) */
        float lum = dot(col, vec3(0.299, 0.587, 0.114)), sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
        col = sat > 0.3 ? vec3(0.784, 0.063, 0.18) : (lum > 0.5 ? uInk : vec3(0.992, 0.984, 0.984));
      }
      outColor = vec4(col, 1.0);
    }`;
  /* 텍스처 바닥: 텍스처 색 그대로 (선 = 부품 ID 경계만) */
  SH.texVert = `
    varying vec2 vUv2;
    void main() { vUv2 = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  SH.texFrag = `
    layout(location = 1) out highp vec4 gInfo;
    uniform sampler2D uMap; uniform float uUseMap; uniform vec3 uCol; uniform float uId; uniform float uLine;
    varying vec2 vUv2;
    void main() {
      vec3 c = uUseMap > 0.5 ? texture2D(uMap, vUv2).rgb : uCol;
      pc_fragColor = vec4(c, 1.0);
      gInfo = vec4((mod(uId, 255.0) + 1.0) / 255.0, uLine, 1.0, 1.0);
    }`;
  /* 예고 장판 (게임 Decals의 모양 · 진행 값을 그대로 읽어 테마 1 방식으로): 검정 사선 빗금 + 굵은 테두리 + 안쪽 파장색 선
     모양: 0 원 · 1 부채꼴 · 2 직사각형 · 3 내려찍기 금 · 4 바둑판 · 5 고리(반전 · 안전 구멍) — 바닥 ID를 써서 외곽선이 안 생김 */
  SH.teleVert = `
    varying vec2 vL; varying vec3 vW;
    void main() { vL = position.xz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  SH.teleFrag = `
    layout(location = 1) out highp vec4 gInfo;
    uniform int uShape; uniform float uR; uniform float uHalf; uniform float uLen; uniform float uWid; uniform float uProg; uniform float uFade;
    uniform float uLock; uniform float uWave; uniform float uAlly; uniform float uR0; uniform float uR1; uniform float uInv; uniform vec3 uHole; uniform vec3 uHole2;
    uniform float uCell; uniform float uPar; uniform float uActive; uniform float uSeed;
    uniform vec3 uInk; uniform vec3 uRed; uniform vec3 uBlue; uniform vec3 uGray; uniform vec3 uSoft; uniform float uB; uniform float uK; uniform float uFloorId;
    varying vec2 vL; varying vec3 vW;
    float h1(float n) { return fract(sin(n) * 43758.5453); }
    void main() {
      if (uFade < 0.04) discard;
      float edge, rr; bool inside; vec3 col;
      float stripe = fract((vW.x + vW.z) * uK);
      if (uShape == 3) {                                       /* 내려찍기 금: 검정 금 몇 줄 + 패인 자리 */
        float r = length(vL), a = atan(vL.x, vL.y); if (r > uR) discard;
        float m = 0.0;
        for (int k = 0; k < 6; k++) { float fk = float(k); float ak = uSeed * 6.2832 + fk * 1.047 + (h1(fk * 9.1 + uSeed * 30.0) - 0.5) * 0.7;
          float d = abs(mod(a - ak + 3.14159, 6.28318) - 3.14159) * r; float len = uR * (0.5 + 0.5 * h1(fk * 5.3 + uSeed));
          if (r < len && d < 0.07 * (1.0 - r / len) + 0.012) m = 1.0; }
        if (r < 0.32) m = 1.0;
        if (m < 0.5 || uFade < 0.5) discard;
        pc_fragColor = vec4(uInk, 1.0); gInfo = vec4((uFloorId + 1.0) / 255.0, 0.0, 0.0, 1.0); return;
      }
      if (uShape == 0) { rr = length(vL) / uR; inside = rr < 1.0; edge = uR * (1.0 - rr); }
      else if (uShape == 1) { float r = length(vL), a = abs(atan(vL.x, vL.y)); rr = r / uR; inside = r < uR && a < uHalf; edge = min(uR - r, (uHalf - a) * r); }
      else if (uShape == 2) { float x = abs(vL.x), z = vL.y; rr = z / uLen; inside = z > 0.0 && z < uLen && x < uWid * 0.5; edge = min(uWid * 0.5 - x, min(uLen - z, z)); }
      else if (uShape == 4) { float r = length(vL); vec2 c = floor(vL / uCell); vec2 fr = vL - c * uCell; inside = abs(mod(c.x + c.y, 2.0) - uPar) < 0.5 && r < uR;
        edge = min(min(min(fr.x, uCell - fr.x), min(fr.y, uCell - fr.y)), uR - r); rr = 0.5; }
      else { float r = length(vL); bool band = r > uR0 && r < uR1; inside = (uInv > 0.5 ? !band : band) && r < uR;
        edge = uInv > 0.5 ? (uR1 > 0.0 ? min(abs(r - uR0), abs(r - uR1)) : 1e3) : min(r - uR0, uR1 - r); edge = min(edge, uR - r);
        if (uHole.z > 0.0) { float hd = length(vL - uHole.xy) - uHole.z; if (hd < 0.0) inside = false; edge = min(edge, hd); }
        if (uHole2.z > 0.0) { float hd = length(vL - uHole2.xy) - uHole2.z; if (hd < 0.0) inside = false; edge = min(edge, hd); }
        rr = uInv > 0.5 ? r / uR : (r - uR0) / max(min(uR1, uR) - uR0, 1e-3); }
      if (!inside) discard;
      vec3 wave = uWave > 3.5 ? uRed : uWave > 2.5 ? uGray : (uWave > 0.5 && uWave < 1.5) ? uBlue : uWave > 1.5 ? uGray : uRed;
      if (uAlly > 0.5) {                                       /* 우리 편 효과: 연한 빗금 · 얇은 테두리 (위험 아님) */
        if (edge < uB * 0.45) col = uSoft; else if (stripe < 0.18 * uFade) col = uSoft; else discard;
      } else {
        bool front = uLock > 0.5 && rr < uProg;
        float dash = fract(atan(vL.x, vL.y) * 6.0 + length(vL) * 2.0);
        if (edge < uB) { if (uLock < 0.5 && dash > 0.55) discard; col = uInk; }                 /* 굵은 테두리 (조준 중엔 끊긴 선) */
        else if (edge < uB * 1.75) { col = wave; }                                                /* 안쪽 = 파장 색 (빨강 패리 · 파랑 청파 · 회색 못 막음) */
        else {
          float duty = uLock < 0.5 ? 0.16 : (front ? 0.62 : 0.3); if (uActive > 0.5) duty = 0.7;
          if (stripe > duty * clamp(uFade * 1.2, 0.0, 1.0)) discard; col = uInk;
        }
      }
      pc_fragColor = vec4(col, 1.0);
      gInfo = vec4((uFloorId + 1.0) / 255.0, 0.0, 0.0, 1.0);
    }`;
  SH.blitFrag = `
    precision highp float; uniform sampler2D tSrc; in vec2 vUv; out vec4 outColor;
    void main() { outColor = vec4(texture(tSrc, vUv).rgb, 1.0); }`;

  /* 색은 sRGB 숫자 그대로 (조명 계산이 없는 셀 경로라 선형 변환 불필요 · 전역 색 관리 설정은 건드리지 않음 — 테마 0과 공유) */
  function hex(THREE, h) { return new THREE.Color().setStyle(h, THREE.LinearSRGBColorSpace); }
  function create(THREE, renderer, D) {
    const R = { THREE, renderer, D, w: 0, h: 0, ids: 1, mats: [], t: 0, boil: 0 };
    R.scene = new THREE.Scene();
    R.camera = new THREE.PerspectiveCamera(D.cam.fov, 16 / 9, D.cam.near, D.cam.far);
    R.camera.rotation.order = 'YXZ';
    R.L = new THREE.Vector3(...D.render.light).normalize();      /* 화면(카메라) 기준 빛 방향 */
    R.rt = null; R.final = null;
    R.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    R.qScene = new THREE.Scene(); R.qScene.add(R.quad); R.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    R.comp = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: SH.compVert, fragmentShader: SH.compFrag, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: null }, tInfo: { value: null }, tDepth: { value: null }, uSize: { value: new THREE.Vector2() }, uPx: { value: 2 }, uJit: { value: 0.3 },
        uSeed: { value: 0 }, uNear: { value: 1 }, uFar: { value: 100 }, uDepthEdge: { value: 0.02 }, uInk: { value: hex(THREE, D.pal.ink) }, uFarThin: { value: 0.6 },
        uBg: { value: hex(THREE, D.pal.sky) }, uImpact: { value: 0 }, uDirs: { value: 16 } } });
    R.blit = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: SH.compVert, fragmentShader: SH.blitFrag, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null } } });
    /* 재질: kind = 팔레트 이름 쌍 [밝은 색, 그림자 색] · flat = 그림자 없음(검정 · 강조) · line = 선 굵기 배율(0 = 선 없음) */
    R.mat = (lit, shade, o = {}) => {
      const m = new THREE.ShaderMaterial({ vertexShader: SH.vert, fragmentShader: SH.frag, side: o.side ?? THREE.FrontSide,
        uniforms: { uLit: { value: hex(THREE, lit) }, uShade: { value: hex(THREE, shade || lit) }, uL: { value: R.L }, uCut: { value: o.cut ?? D.render.shadeCut },
          uFlat: { value: o.flat ? 1 : 0 }, uId: { value: o.id ?? R.newId() }, uLine: { value: o.line ?? 1 }, uFlash: { value: 0 }, uAlpha: { value: 1 } } });
      R.mats.push(m); return m;
    };
    R.fxMat = (o = {}) => {
      const m = new THREE.ShaderMaterial({ vertexShader: SH.fxVert, fragmentShader: SH.fxFrag, side: THREE.DoubleSide, depthWrite: o.depthWrite ?? true, depthTest: o.depthTest ?? true,
        uniforms: { uId: { value: o.id ?? R.newId() }, uLine: { value: o.line ?? 0 }, uOpacity: { value: 1 } } });
      R.mats.push(m); return m;
    };
    R.texMat = (tex, col, o = {}) => {
      const m = new THREE.ShaderMaterial({ vertexShader: SH.texVert, fragmentShader: SH.texFrag,
        uniforms: { uMap: { value: tex }, uUseMap: { value: tex ? 1 : 0 }, uCol: { value: hex(THREE, col) }, uId: { value: o.id ?? R.newId() }, uLine: { value: o.line ?? 1 } } });
      m.userData.tex = tex; R.mats.push(m); return m;
    };
    R.floorId = 0;
    R.teleMat = (U) => {   /* U = 게임 장판의 uniforms (값을 같이 읽음 · 게임 값은 안 바꿈) */
      const P = D.pal, m = new THREE.ShaderMaterial({ vertexShader: SH.teleVert, fragmentShader: SH.teleFrag, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
        uniforms: Object.assign({}, U, { uInk: { value: hex(THREE, P.ink) }, uRed: { value: hex(THREE, P.red) }, uBlue: { value: hex(THREE, P.blue) }, uGray: { value: hex(THREE, P.shadeW) },
          uSoft: { value: hex(THREE, P.hatch) }, uB: { value: D.fx.teleBorder }, uK: { value: 1 / D.fx.teleStep }, uFloorId: { value: R.floorId } }) });
      m.userData.tele = true; R.mats.push(m); return m;
    };
    R.newId = () => { R.ids = (R.ids + 7) % 250; return R.ids; };   /* 부품 ID: 이웃끼리 다르게 */
    /* 렌더 타깃 해제: MRT 색 2장 · 깊이 텍스처 · 출력 텍스처를 각각 dispose (타깃 dispose만으로는 텍스처가 남았음 — T2) */
    const freeRT = () => { for (const t of R.rt.textures || [R.rt.texture]) t.dispose(); if (R.rt.depthTexture) R.rt.depthTexture.dispose(); R.rt.dispose(); R.final.texture.dispose(); R.final.dispose(); R.rt = R.final = null; };
    R.resize = (w, h) => {
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      if (w === R.w && h === R.h) return;
      R.w = w; R.h = h;
      if (R.rt) freeRT();
      const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
      R.rt = new THREE.WebGLRenderTarget(w, h, { count: 2, depthBuffer: true, depthTexture: dt, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      R.final = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    };
    /* 한 프레임: dt = 실제 시간 (획 끓임 시계) · target = null이면 화면 */
    R.render = (dt, target = null, viewport = null) => {
      const r = renderer, U = R.comp.uniforms, Dr = D.render;
      R.t += dt; const step = R.qBoil === false ? 0 : Math.floor(R.t * Dr.boilFps); if (step !== R.boil) R.boil = step;   /* 자동 품질 낮으면 끓임 끔 */
      U.uDirs.value = R.qDirs || 16;
      r.setRenderTarget(R.rt); r.setClearColor(0x000000, 0); r.clear(true, true, true);
      r.render(R.scene, R.camera);
      U.tColor.value = R.rt.textures[0]; U.tInfo.value = R.rt.textures[1]; U.tDepth.value = R.rt.depthTexture;
      U.uSize.value.set(R.w, R.h); U.uPx.value = Math.max(1.2, Dr.outlinePx * R.h / 1080); U.uJit.value = Dr.outlineJit;
      U.uSeed.value = (R.boil % 7) * 0.37; U.uNear.value = R.camera.near; U.uFar.value = R.camera.far; U.uDepthEdge.value = Dr.depthEdge; U.uFarThin.value = Dr.farThin;
      R.quad.material = R.comp; r.setRenderTarget(R.final); r.render(R.qScene, R.qCam);
      R.blit.uniforms.tSrc.value = R.final.texture; R.quad.material = R.blit;
      r.setRenderTarget(target); if (viewport) r.setViewport(...viewport);
      r.render(R.qScene, R.qCam);
    };
    R.dispose = () => {
      if (R.rt) { freeRT(); R.w = R.h = 0; }
      for (const m of R.mats) { if (m.userData.tex) m.userData.tex.dispose(); m.dispose(); } R.mats.length = 0;
      R.comp.dispose(); R.blit.dispose(); R.quad.geometry.dispose();
      const skels = new Set(); R.scene.traverse(o => { if (o.isSkinnedMesh && o.skeleton) skels.add(o.skeleton); });   /* 뼈 텍스처(스켈레톤마다 1장)도 해제 — T2 누수 */
      for (const sk of skels) sk.dispose();
      R.scene.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of ms) { for (const k in m.uniforms || {}) { const v = m.uniforms[k].value; if (v && v.isTexture) v.dispose(); } m.dispose(); } });
    };
    return R;
  }
  return { create, SH, hex };
})();
