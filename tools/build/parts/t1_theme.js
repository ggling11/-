/* =============================================================================
 * 4단계 테마 1 '애니 셀' — 게임에 붙이기 (t1_theme.js) · ART.themes[1] 등록
 *   apply(): 렌더 경로 · 아레나 · 보이는 리그(세검 · 대검 · 워든) · 이펙트를 만들고, 3단계 입자/궤적 시작에 손잡이를 겁니다(화면만)
 *   frame(dt): 보이는 리그가 숨은 리그를 따라감 → 카메라 → 예고/탄/가시 거울 → 렌더 (true = 3단계 렌더 대신)
 *   hud(ctx): 테마 1 HUD · 화면 5개 (타이틀 · 전투 · QTE · 메뉴 · 결과)
 *   dispose(): 만든 것을 전부 정리 (재질 · 기하 · 렌더 타깃 · 텍스처) · 손잡이 되돌림
 *   ★1 테마 코드는 Math.random을 쓰지 않음 (T1M.rng) — Node 재생에서 봇 입력 난수열을 건드리지 않게
 * ========================================================================== */
const T1T = (() => {
  const S = { on: false, built: false, t: 0, models: {}, shadows: {}, mirrors: new Map(), shotMesh: null, impact: 0, lastZp: null, lastPerfect: 0, trails: {}, stats: {}, realDt: 1 / 60 };
  const D = T1;
  const V = () => new THREE.Vector3();
  /* 숨은 리그 → 보이는 모델 */
  const charOf = f => (f && f.char === 'great' ? 'great' : 'rapier');
  /* ★1 난수 격리: three.js는 메쉬 · 재질을 만들 때 uuid에 Math.random을 씀 → 테마 코드(만들기 · 프레임 · 이펙트 손잡이)는
   *   그동안만 Math.random을 테마 자체 시드 난수로 바꿔 둠 → 게임 · 봇 쪽 Math.random 순서가 테마와 무관하게 같음 */
  const tRand = T1M.rng(97531);
  const iso = fn => function () { const mr = Math.random; Math.random = tRand; try { return fn.apply(this, arguments); } finally { Math.random = mr; } };
  function build() {
    T1R_THREE = THREE;
    S.R = T1R.create(THREE, renderer, D);
    S.arena = T1A.build(S.R, D, { headless: ART.headless }); S.R.scene.add(S.arena);
    S.FX = T1F.create(S.R, D); S.R.scene.add(S.FX.group); S.R.scene.add(S.R.camera);
    S.models.rapier = T1C.rapier(S.R, D); S.models.great = T1C.great(S.R, D); S.models.warden = T1C.warden(S.R, D);
    S.models.rapier2 = null;
    for (const k of ['rapier', 'great', 'warden']) {
      S.R.scene.add(S.models[k].root); S.models[k].root.visible = false;
      const sh = k === 'warden' ? S.FX.shadowMesh(1.2, 1.05) : S.FX.shadowMesh(0.4, 0.34); S.R.scene.add(sh); S.shadows[k] = sh;
    }
    /* 궤적(스미어): 모델마다 칼 손잡이→끝 기록으로 만든 날카로운 띠 (흰 몸 + 선) */
    for (const k of ['rapier', 'great', 'warden']) {
      const N = D.fx.trailN, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 4);
      for (let i = 0; i < N * 2; i++) { col[i * 4] = 0.99; col[i * 4 + 1] = 0.98; col[i * 4 + 2] = 0.98; col[i * 4 + 3] = 1; }
      const idx = []; for (let i = 0; i + 1 < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
      const m = new THREE.Mesh(g, S.R.fxMat({ line: 1 })); m.frustumCulled = false; m.visible = false; S.R.scene.add(m);
      S.trails[k] = { mesh: m, hist: [], on: 0 };
    }
    /* 탄: 인스턴스 (빨강 · 파랑 · 검정) — 길쭉한 마름모 */
    const sg = new THREE.OctahedronGeometry(0.22, 0); sg.scale(0.7, 1.9, 0.7);
    S.shots = {};
    for (const [k, c] of [['red', D.pal.red], ['blue', D.pal.blue], ['ink', D.pal.ink]]) {
      const im = new THREE.InstancedMesh(sg, S.R.mat(c, c, { flat: true, line: 1.2 }), 64); im.count = 0; im.frustumCulled = false; S.R.scene.add(im); S.shots[k] = im;
    }
    const kg = new THREE.ConeGeometry(0.28, 1.3, 5); kg.translate(0, 0.65, 0);
    S.spikes = new THREE.InstancedMesh(kg, S.R.mat(D.pal.ink, D.pal.ink, { flat: true, line: 1 }), 64); S.spikes.count = 0; S.spikes.frustumCulled = false; S.R.scene.add(S.spikes);
    T1H.init(D);
    S.built = true;
  }
  /* 3단계 입자 · 궤적 시작에 손잡이 (원래 함수는 그대로 부르고, 테마 그림만 덧붙임) */
  function hook() {
    if (S.hooked) return; S.hooked = true;
    S.origBurst = Particles.burst;
    Particles.burst = function (kind, p, dir, n, power) { const r = S.origBurst.apply(this, arguments); try { if (ART.cur === 1) isoBurst(kind, p, dir, n, power); } catch (e) { /* 화면만 */ } return r; };
    S.smearHooks = [];
    for (const g of new Set([...Rigs.list, ...Rigs.bodies, boss])) if (g && g.smear && !g.smear.__t1) {
      const sm = g.smear, orig = sm.start; sm.__t1 = orig;
      sm.start = function (spec) { const r = orig.apply(this, arguments); try { if (ART.cur === 1) isoSmear(g, spec); } catch (e) { /* 화면만 */ } return r; };
      S.smearHooks.push(sm);
    }
  }
  function unhook() {
    if (!S.hooked) return; S.hooked = false;
    Particles.burst = S.origBurst;
    for (const sm of S.smearHooks) { sm.start = sm.__t1; delete sm.__t1; }
  }
  const BURST = { spark: ['ink', 'red'], metal: ['ink', 'red'], shard: ['ink', 'red'], sparkB: ['ink', 'blue'], sparkP: ['purple', 'purple'], blood: ['blood', 'red'], flame: ['wisp', 'red'],
    auraR: ['wisp', 'red'], auraB: ['wisp', 'blue'], waveR: ['wisp', 'red'], waveB: ['wisp', 'blue'], pullR: ['wisp', 'red'], pullB: ['wisp', 'blue'], heal: ['heal', 'paper'] };
  function onBurst(kind, p, dir, n, power) {
    if (ART.headless || !S.built || !p) return;
    const B = BURST[kind]; if (!B) return;
    S.fxThisFrame = (S.fxThisFrame || 0) + 1; if (S.fxThisFrame > 6) return;
    const v = new THREE.Vector3(p.x, p.y, p.z), sz = Math.min(1.6, 0.45 + (n || 4) * 0.06) * (power || 1);
    if (B[0] === 'ink') S.FX.ink(v, S.R.camera, { size: sz, n: 6 + Math.min(10, n | 0), accent: 3, life: 0.4 });
    else if (B[0] === 'purple') S.FX.ink(v, S.R.camera, { size: sz * 1.2, color: D.pal.purple, accent: 0, life: 0.5 });
    else if (B[0] === 'blood') S.FX.ink(v, S.R.camera, { size: sz * 0.8, color: D.pal.ink, accent: 4, life: 0.45 });
    else if (B[0] === 'wisp') S.FX.ink(v, S.R.camera, { size: 0.35, n: 3, color: B[1] === 'red' ? D.pal.red : D.pal.blue, accent: 0, life: 0.3 });
  }
  function onSmear(g, spec) {
    const k = g === boss ? 'warden' : (fighters.find(f => f.ch === g) ? charOf(fighters.find(f => f.ch === g)) : null); if (!k || !S.trails[k]) return;
    const T = S.trails[k]; T.on = Math.max(0.12, (spec && spec.frames ? spec.frames : 3) / 12 + 0.06);   /* 기록은 지우지 않음 (예비 자세부터 펼침) */
  }
  const isoBurst = iso(onBurst), isoSmear = iso(onSmear);
  /* 칼 끝 · 손잡이 (모델의 weapon 뼈 기준) */
  const _a = V(), _b = V();
  function bladeEnds(M, k) {
    const w = M.bones.weapon; if (!w) return null;
    const L = k === 'great' ? -1.3 : k === 'rapier' ? -1.05 : -0.35, H = k === 'warden' ? -0.05 : -0.06;
    _a.set(0, H * M.k1, 0).applyMatrix4(w.matrixWorld); _b.set(0, L * M.k1, 0).applyMatrix4(w.matrixWorld);
    return [_a.clone(), _b.clone()];
  }
  /* 칼 궤적 (라운드 10): 칼 자세를 늘 기록(칼끝이 움직였을 때만 — 12fps 계단 사이 같은 자세는 건너뜀 · 0.3초 지난 것은 버림)
   *   → 스미어가 켜지면 예비 자세부터 타격 자세까지 펼쳐진 날카로운 부채꼴 판 (애니 스미어) */
  function updTrail(k, M, dt) {
    const T = S.trails[k]; if (!T) return;
    T.on = Math.max(0, T.on - dt); T.age = (T.age || 0) + dt;
    const m = T.mesh; if (!M.root.visible) { m.visible = false; T.hist.length = 0; return; }
    const e = bladeEnds(M, k); if (!e) return;
    const last = T.hist[0];
    if (!last || last[1].distanceTo(e[1]) > 0.04) {
      /* 12fps 계단 사이 칼끝이 크게 움직이면 손잡이 기준으로 방향을 돌려 가며 중간 칸을 채움 → 휘두른 호를 따라 펼쳐진 부채꼴 */
      if (last) { const d0 = last[1].clone().sub(last[0]), d1 = e[1].clone().sub(e[0]), L0 = d0.length(), L1 = d1.length(), n = Math.min(8, Math.floor(last[1].distanceTo(e[1]) / 0.22));
        for (let q = 1; q <= n; q++) { const t = q / (n + 1), hd = last[0].clone().lerp(e[0], t), dir = d0.clone().normalize().lerp(d1.clone().normalize(), t); if (dir.lengthSq() < 1e-6) continue;
          const mid = [hd, hd.clone().addScaledVector(dir.normalize(), L0 + (L1 - L0) * t)]; mid.t = T.age; T.hist.unshift(mid); } }
      e.t = T.age; T.hist.unshift(e);
    } else last.t = T.age;   /* 멈춘 자세(예비 유지)는 마지막으로 본 시각으로 */
    while (T.hist.length && T.age - T.hist[T.hist.length - 1].t > 0.3) T.hist.pop();
    if (T.hist.length > D.fx.trailN) T.hist.length = D.fx.trailN;
    const n = T.hist.length; if (T.on <= 0 || n < 2) { m.visible = false; return; }
    const pos = m.geometry.attributes.position.array;
    for (let i = 0; i < D.fx.trailN; i++) {
      const h = T.hist[Math.min(i, n - 1)], t = i / Math.max(1, n - 1), a = h[0].clone().lerp(h[1], Math.min(0.97, 0.2 + t * 0.77));   /* 오래된 쪽일수록 칼끝 쪽으로 좁아짐 = 끝 뾰족 */
      pos.set([a.x, a.y, a.z, h[1].x, h[1].y, h[1].z], i * 6);
    }
    m.geometry.attributes.position.needsUpdate = true; m.geometry.setDrawRange(0, (n - 1) * 6); m.visible = true;
  }
  /* 한 모델이 숨은 리그를 따라감 */
  function follow(M, ch, kind, visible, dt, hipK) {
    M.root.visible = visible; S.shadows[kind].visible = visible;
    if (!visible) return;
    M.root.position.copy(ch.root.position); M.root.rotation.set(0, ch.root.rotation.y, 0);
    T1P.apply(M, ch, { poses: D.poses[kind], hipK });
    T1P.secondary(M, dt, ch.root.position, ch.root.rotation.y, S.t);
    M.root.updateMatrixWorld(true);
    const sh = S.shadows[kind]; sh.position.set(ch.pos.x, 0.012, ch.pos.z); const hgt = Math.max(0, ch.pos.y); sh.scale.setScalar(Math.max(0.35, 1 - hgt * 0.12));
    const fl = ch.flashT > 0 ? 1 : 0; for (const k in M.mats) M.mats[k].uniforms.uFlash.value = fl;
    if (kind === 'warden') eyeTele(M, dt);
  }
  /* 타이틀 히어로 (라운드 8): 워든을 고정 자리 · 대기 자세로 (게임 상태와 무관 · 화면만) */
  const titleCh = { clip: null, f: 0 };
  function titleHero(dt) {
    const M = S.models.warden; M.root.visible = true; S.shadows.warden.visible = true;
    titleCh.clip = boss.clips.idle; titleCh.f = (S.t * 12) % boss.clips.idle.frames;
    M.root.position.set(0, 0, 0); M.root.rotation.set(0, CamRig.yaw - 0.35, 0);
    T1P.apply(M, titleCh, { poses: D.poses.warden }); T1P.secondary(M, dt, M.root.position, M.root.rotation.y, S.t); M.root.updateMatrixWorld(true);
    S.shadows.warden.position.set(0, 0.012, 0); S.shadows.warden.scale.setScalar(1);
    for (const k in M.mats) M.mats[k].uniforms.uFlash.value = 0;
  }
  /* 보스 예고 순간 붉은 눈이 빛남: 예고 장판이 새로 생기면 두 눈에 빨간 별 + 눈 색이 잠깐 밝은 빨강 (화면만) */
  function eyeTele(M, dt) {
    const n = (AI.tele && AI.tele.length) || 0, eye = M.mats.eye;
    if (n > (S.teleN || 0) && !ART.headless && M.bones.head) {
      const h = M.bones.head, cam = S.R.camera;
      for (const sx of [-1, 1]) S.FX.glint(new THREE.Vector3(sx * 0.17 * M.k1, 0.12 * M.k1, 0.3 * M.k1).applyMatrix4(h.matrixWorld), cam, { size: 0.42 });
      S.eyeT = 0.3;
    }
    S.teleN = n; S.eyeT = Math.max(0, (S.eyeT || 0) - dt);
    if (eye) eye.uniforms.uLit.value.copy(S.eyeT > 0 ? S.eyeHot || (S.eyeHot = T1R.hex(THREE, '#ff2a48')) : S.eyeBase || (S.eyeBase = eye.uniforms.uLit.value.clone()));
  }
  /* 카메라: 원근 · 41° · 서 있는 키 20% · 게임 카메라의 목표점과 방향(yaw)을 그대로 따라감 + 넓히기 · 흔들림 · 확대 */
  function camera(dt) {
    const C = D.cam, cam = S.R.camera, p = C.pitch * Math.PI / 180, yaw = CamRig.yaw;
    const tgt = CamRig.target;
    if (!S.camK) {   /* 거리 보정 (한 번): 목표점에 선 키 standH가 화면 standFrac */
      cam.fov = C.fov; cam.aspect = Math.max(0.5, S.R.w / Math.max(1, S.R.h)); cam.near = C.near; cam.far = C.far; cam.updateProjectionMatrix();
      let d = C.standH * Math.cos(p) / (2 * Math.tan(C.fov * Math.PI / 360) * C.standFrac);
      for (let it = 0; it < 4; it++) {
        cam.position.set(Math.sin(yaw) * Math.cos(p) * d, Math.sin(p) * d + 1.0, Math.cos(yaw) * Math.cos(p) * d); cam.rotation.set(-p, yaw, 0, 'YXZ'); cam.updateMatrixWorld(true);
        const a = new THREE.Vector3(0, 0, 0).project(cam), b = new THREE.Vector3(0, C.standH, 0).project(cam); d *= (Math.abs(b.y - a.y) / 2) / C.standFrac;
      }
      S.camK = d; S.camW = 1;
    }
    /* 넓히기: 필드 위 사람 + 보스가 화면 안쪽 80%에 들게 (부드럽게) */
    let need = 1;
    const pts = []; for (const f of fighters) if (f.onField && f.ch.root.visible) pts.push(f.ch.pos);
    if (boss.root.visible) pts.push(boss.pos);
    cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(p) * S.camK * S.camW, tgt.y + Math.sin(p) * S.camK * S.camW, tgt.z + Math.cos(yaw) * Math.cos(p) * S.camK * S.camW);
    cam.rotation.set(-p, yaw, 0, 'YXZ'); cam.updateMatrixWorld(true);
    for (const q of pts) for (const hy of [0, 2.4]) { const v = new THREE.Vector3(q.x, q.y + hy, q.z).project(cam); need = Math.max(need, Math.abs(v.x) / 0.82, Math.abs(v.y) / 0.78); }
    const want = Math.min(C.widenMax, Math.max(1, S.camW * need));
    S.camW += (want - S.camW) * (1 - Math.exp(-dt * (want > S.camW ? 6 : 1.5)));
    /* 확대(마무리 첫 적중) · 흔들림 · 반동: 게임 카메라 값을 이 카메라 크기로 */
    let zoom = 1, zf = null;
    if (CamRig.zp && CamRig.zw > 0) { zoom = 1 + 0.55 * Math.pow(CamRig.zw, 0.6); zf = CamRig.zp.f; }   /* 라운드 7: 마무리 첫 적중 확대를 더 짧고 날카롭게 (빨리 들어가 버팀) */
    let T = zf ? new THREE.Vector3().copy(tgt).lerp(zf, 0.6 * CamRig.zw) : tgt, d = S.camK * S.camW / zoom;
    if (Game.state === 'title') {   /* 라운드 8 타이틀: 워든을 화면 오른쪽 1/3에 크게 (제목 글자는 왼쪽 여백에) */
      T = new THREE.Vector3(-Math.cos(yaw) * 2.7, 2.2, Math.sin(yaw) * 2.7); d = S.camK * 0.98;
    }
    const vh = 2 * d * Math.tan(C.fov * Math.PI / 360), px = vh / 270 * (UI.shake ?? 1) * C.shakeMul;
    const R3 = CamRig.R, U3 = CamRig.U;
    cam.position.set(T.x + Math.sin(yaw) * Math.cos(p) * d, T.y + Math.sin(p) * d, T.z + Math.cos(yaw) * Math.cos(p) * d);
    if (R3 && U3) cam.position.addScaledVector(R3, (CamRig.sx + CamRig.kx) * px).addScaledVector(U3, (CamRig.sy + CamRig.ky) * px);
    cam.rotation.set(-p, yaw, 0, 'YXZ'); cam.updateMatrixWorld(true);
  }
  /* 예고 장판 거울: 게임 Decals 목록의 모양 · 진행 값을 같이 읽는 테마 1 재질 메쉬 */
  function mirrors() {
    const seen = new Set();
    for (const d of Decals.list) {
      seen.add(d);
      let m = S.mirrors.get(d);
      if (!m) { m = new THREE.Mesh(d.m.geometry, S.R.teleMat(d.mat.uniforms)); m.frustumCulled = false; m.renderOrder = 2; S.R.scene.add(m); S.mirrors.set(d, m); }
      m.position.copy(d.m.position); m.position.y = 0.02; m.rotation.copy(d.m.rotation); m.scale.copy(d.m.scale); m.visible = d.m.visible !== false;
    }
    for (const [d, m] of S.mirrors) if (!seen.has(d)) { S.R.scene.remove(m); m.material.dispose(); S.R.mats.splice(S.R.mats.indexOf(m.material), 1); S.mirrors.delete(d); }
    /* 탄 */
    const cnt = { red: 0, blue: 0, ink: 0 }, mtx = new THREE.Matrix4();
    for (const s of Shots.list) { const k = s.wave === 'red' ? 'red' : s.wave === 'blue' ? 'blue' : 'ink', im = S.shots[k]; if (cnt[k] >= 64) continue;
      mtx.compose(s.m.position, s.m.quaternion, s.m.scale); im.setMatrixAt(cnt[k]++, mtx); }
    for (const k in cnt) { S.shots[k].count = cnt[k]; S.shots[k].instanceMatrix.needsUpdate = true; }
    let ns = 0; for (const o of Spikes.list) { if (ns >= 64) break; mtx.compose(o.m.position, o.m.quaternion, o.m.scale); S.spikes.setMatrixAt(ns++, mtx); }
    S.spikes.count = ns; S.spikes.instanceMatrix.needsUpdate = true;
  }
  /* 대시: 몸 뒤로 검정 속도 줄 몇 개 (바닥 위 · 짧게) */
  function dashFx(f, kind) {
    if (f.state !== 'dodge' || ART.headless) return;
    const key = 'dash' + f.idx; if ((S[key] || 0) > S.t) return; S[key] = S.t + 0.05;
    const p = f.ch.pos, fa = f.ch.facing, bx = -Math.sin(fa), bz = -Math.cos(fa), r = T1M.rng((S.t * 1000) | 0);
    const tris = [], ink = T1R.hex(THREE, D.pal.ink);
    for (let i = 0; i < 4; i++) {
      const y = 0.3 + r() * 1.6, side = (r() - 0.5) * 0.7, L = 0.8 + r() * 1.1, sx = Math.cos(fa) * side, sz = -Math.sin(fa) * side;
      const a = [p.x + sx, p.y + y, p.z + sz], b = [p.x + sx + bx * L, p.y + y, p.z + sz + bz * L], w = 0.035;
      tris.push({ p: [[a[0], a[1] + w, a[2]], [a[0], a[1] - w, a[2]], b], c: ink });
    }
    S.FX.add(S.FX.mesh(tris, { line: 0, order: 4 }), 0.16);
  }
  function apply() {
    if (!S.built) build();
    hook(); S.on = true; S.camK = 0; S.t = 0;
    S.R.scene.visible = true;
    if (!ART.headless) for (const m of S.R.mats) if (m.uniforms && m.uniforms.uId && S.R) { /* 재질 그대로 */ }
  }
  function dispose() {
    unhook(); S.on = false;
    if (!S.built) return;
    for (const [d, m] of S.mirrors) { S.R.scene.remove(m); } S.mirrors.clear();
    S.FX.clear(); S.R.dispose();
    S.built = false; S.models = {}; S.shadows = {}; S.trails = {}; S.R = null; S.arena = null; S.FX = null;
  }
  /* 한 화면 프레임 */
  function frame(dt) {
    if (!S.built) build();
    S.t += dt; S.realDt = dt; S.fxThisFrame = 0;
    const R = S.R, gdt = (Game.hitstop > 0 || (typeof PIPE !== 'undefined' && PIPE.paused)) ? 0 : dt;
    { const lv = Math.max(0, Math.min(D.quality.dirs.length - 1, (typeof Perf3 !== 'undefined' && Perf3.level) || 0)); R.qDirs = D.quality.dirs[lv]; R.qBoil = D.quality.boil[lv]; R.qSS = D.quality.ss[lv]; }   /* 자동 품질 단계 → 테마 고유 값 */
    if (!ART.headless) { const w = Pipe.lowW || 1920, h = Pipe.lowH || 1080, ss = Math.min(R.qSS || 1, 2880 / Math.max(w, 1)); R.resize(w * ss, h * ss); }   /* 슈퍼샘플 (선 계단 없앰) */
    /* 숨은 리그 따라가기 */
    const used = new Set();
    for (const f of fighters) {
      const k = charOf(f); if (used.has(k)) continue;
      const vis = f.ch.root.visible && f.active !== false && !f.bench && Game.mode === 'fight' && Game.state !== 'title';   /* 타이틀 = 워든만 */
      if (!vis) continue; used.add(k);
      follow(S.models[k], f.ch, k, true, dt, f.ch.root.scale.y);
      dashFx(f, k);
    }
    for (const k of ['rapier', 'great']) if (!used.has(k)) follow(S.models[k], null, k, false, dt);
    const bv = boss.root.visible && Game.state !== 'title';
    if (S.arena.userData.props) S.arena.userData.props.root.visible = Game.state !== 'title';   /* 타이틀: 소품 숨김 (제목 여백) */
    if (Game.state === 'title') titleHero(dt); else follow(S.models.warden, boss, 'warden', bv, dt, boss.root.scale.y);
    for (const k of ['rapier', 'great', 'warden']) updTrail(k, S.models[k], dt);
    mirrors();
    S.FX.update(dt);
    camera(dt);
    /* 임팩트 프레임: 마무리 첫 적중(게임 카메라 확대가 새로 시작) · QTE 완벽 → 1프레임 흑백 반전 + 스피드 라인 */
    if (CamRig.zp && CamRig.zp !== S.lastZp) { S.lastZp = CamRig.zp; if (D.render.impactFrame) S.impact = 1; if (!ART.headless) S.FX.speed(R.camera, { life: 0.22 }); }
    const qs = Duo.stats && Duo.stats.qte ? Duo.stats.qte.perfect : 0; if (qs > S.lastPerfect) { S.lastPerfect = qs; if (D.render.impactFrame) S.impact = 1; }
    R.comp.uniforms.uImpact.value = S.impact > 0 ? 1 : 0; S.impact = 0;
    if (ART.headless) return true;
    R.render(dt, null);
    return true;
  }
  function hud(ctx) {
    if (ART.headless) return true;
    ctx.save(); const hk = HUDK.on; HUDK.on = false;   /* 3단계 HUD의 fillRect 칸 맞춤(배율 곱)을 끄고 그림 → 끝나면 되돌림 */
    try { T1H.game(ctx, S); } finally { HUDK.on = hk; ctx.restore(); }
    return true;
  }
  ART.themes[1] = { id: 1, name: ART.names[1], apply: iso(apply), dispose: iso(dispose), frame: iso(frame), hud };
  S.tool = { updTrail, bladeEnds };   /* 점검 도구(동작 띠)가 궤적을 같은 코드로 그리게 */
  S.resetFx = () => { if (S.FX) S.FX.clear(); for (const k in S.trails) { S.trails[k].on = 0; S.trails[k].mesh.visible = false; } S.impact = 0; S.lastZp = CamRig.zp; S.eyeT = 0; S.teleN = (AI.tele && AI.tele.length) || 0; };
  return S;
})();
