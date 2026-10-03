/* 랩 드라이버 (lab4_t1): 3단계 코드 없이 테마 1 모듈만으로 워든 아레나 + 세검 · 대검 + 워든 + 마무리 이펙트 + HUD 조각 */
const canvas = document.getElementById('c'), hud = document.getElementById('hud'), hctx = hud.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.autoClear = true;
const D = T1;
const R = T1R.create(THREE, renderer, D);
const arena = T1A.build(R, D); R.scene.add(arena);
const FX = T1F.create(R, D); R.scene.add(FX.group); R.scene.add(R.camera);
const M = { rapier: T1C.rapier(R, D), great: T1C.great(R, D), warden: T1C.warden(R, D) };
const shadows = {};
for (const k in M) { R.scene.add(M[k].root); const s = k === 'warden' ? FX.shadowMesh(1.25, 1.1) : FX.shadowMesh(0.42, 0.36); R.scene.add(s); shadows[k] = s; }
T1H.init(D);
/* 랩 자세 (라운드 1~3 첫 판 — 라운드 6~7에서 T1.poses로 옮겨 다듬음) */
const deg = Math.PI / 180;
const LABPOSE = {
  rIdle: { body: [0, 0.1, 5], spine: [3, -4, -6], chest: [4, -6, -3], neck: [6, 0, 4], head: [8, 12, 9], shR: [8, 0, -10], elR: [-24, 0, -6], hdR: [-10, 0, 0], weapon: [-38, 0, -18],
           shL: [4, 0, 10], elL: [-55, -10, 18], hdL: [0, 0, 10], thR: [0, 0, -3], knR: [3, 0, 0], ftR: [-3, 0, 0], thL: [-14, 8, 6], knL: [22, 0, 0], ftL: [-6, 10, 0] },
  gIdle: { body: [0, -0.1, -5], spine: [2, 4, 5], chest: [3, 8, 2], neck: [4, 0, -4], head: [4, -14, -5], shR: [-38, 0, -30], elR: [-95, 20, 0], hdR: [-20, 0, -20], weapon: [-30, 0, 85],
           shL: [4, 0, 6], elL: [-12, 0, 4], hdL: [0, 0, 0], thL: [0, 0, 3], knL: [3, 0, 0], thR: [-12, -10, -8], knR: [20, 0, 0], ftR: [-6, -10, 0] },
  wIdle: { body: [6, 0, 0], spine: [12, 0, 0], chest: [8, 0, 0], neck: [-26, 0, 0], head: [30, 8, 0], shR: [-40, 0, -14], elR: [-50, 0, 10], hdR: [20, 0, 0], shL: [-36, 0, 18], elL: [-62, 0, -12], hdL: [10, 0, 0],
           thL: [-20, 0, 6], knL: [34, 0, 0], ftL: [-14, 0, 0], thR: [-20, 0, -6], knR: [34, 0, 0], ftR: [-14, 0, 0], tl0: [10, 0, 0], tl1: [8, 10, 0], tl2: [0, 20, 0], tl3: [-10, 18, 0], tl4: [-14, 10, 0] },
  rThrust: { body: [8, -30, 0], spine: [10, -16, 0], chest: [12, -20, 0], neck: [-6, 10, 0], head: [-6, 30, 0], shR: [-78, 0, -8], elR: [-6, 0, 0], hdR: [-4, 0, 0], weapon: [-90, 0, 0],
             shL: [30, 0, 30], elL: [-20, 0, 10], thR: [-50, 0, -6], knR: [40, 0, 0], ftR: [10, 0, 0], thL: [30, 0, 10], knL: [10, 0, 0], ftL: [-20, 0, 0] },
  gLaunch: { body: [-10, 30, 0], spine: [-14, 20, 0], chest: [-16, 24, 0], head: [-10, -20, 0], shR: [-170, 0, -20], elR: [-10, 0, 0], weapon: [-60, 0, 0], shL: [-150, 0, 20], elL: [-20, 0, 0],
             thR: [-30, 0, 0], knR: [30, 0, 0], thL: [20, 0, 6], knL: [10, 0, 0] },
  wReel: { body: [-14, 0, 8], spine: [-18, 0, 6], chest: [-16, 0, 0], neck: [20, 0, 10], head: [-30, 20, 14], shR: [-100, 0, -40], elR: [-30, 0, 0], shL: [-80, 0, 50], elL: [-40, 0, 0],
           thL: [-10, 0, 10], knL: [20, 0, 0], thR: [-30, 0, -10], knR: [40, 0, 0], tl0: [-20, 0, 0], tl1: [-10, 30, 0], tl2: [0, 30, 0] },
};
function pose(m, P) {
  for (const n in m.bones) { const b = m.bones[n], r = m.rest[n]; b.position.copy(r.p); b.quaternion.copy(r.q); }
  for (const n in P) { const b = m.bones[n]; if (!b) continue; const e = P[n]; b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * deg, e[1] * deg, e[2] * deg, 'YXZ'))); }
  m.root.updateMatrixWorld(true);
}
function place(m, x, z, face) { m.root.position.set(x, 0, z); m.root.rotation.y = face; shadows[m.kind].position.set(x, 0.012, z); }
/* 카메라: 원근 · 내려다봄 pitch · 서 있는 키가 화면 standFrac */
function camAt(tx, ty, tz, yaw, zoom = 1) {
  const c = D.cam, p = c.pitch * deg, fov = c.fov * deg, d = c.standH * Math.cos(p) / (2 * Math.tan(fov / 2) * c.standFrac) / zoom;
  R.camera.fov = c.fov; R.camera.position.set(tx + Math.sin(yaw) * Math.cos(p) * d, ty + Math.sin(p) * d, tz + Math.cos(yaw) * Math.cos(p) * d);
  R.camera.rotation.set(-p, yaw, 0); R.camera.updateProjectionMatrix(); R.camera.updateMatrixWorld(true);
  /* 보정: 목표 위치에 선 캐릭터(발 → 머리)가 실제로 화면 standFrac×zoom이 되게 거리 조절 (원근이라 식만으로는 어긋남) */
  for (let it = 0; it < 3; it++) {
    const a = new THREE.Vector3(tx, 0, tz).project(R.camera), b = new THREE.Vector3(tx, c.standH, tz).project(R.camera);
    const fr = Math.abs(b.y - a.y) / 2, want = c.standFrac * zoom, k = fr / want;
    const off = R.camera.position.clone().sub(new THREE.Vector3(tx, ty, tz)).multiplyScalar(k);
    R.camera.position.set(tx, ty, tz).add(off); R.camera.updateMatrixWorld(true);
  }
}
function size() {
  const dpr = window.devicePixelRatio || 1, W = Math.floor(innerWidth * dpr), Hh = Math.floor(innerHeight * dpr);
  renderer.setPixelRatio(1); renderer.setSize(W, Hh, false); canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  hud.width = W; hud.height = Hh; hud.style.width = innerWidth + 'px'; hud.style.height = innerHeight + 'px';
  R.resize(Math.min(W, Math.round(W * Math.min(1, D.quality.maxH / Hh))), Math.min(Hh, D.quality.maxH));
  return [W, Hh];
}
const YAW = 0.62;
const SCENES = {
  wide() { pose(M.rapier, LABPOSE.rIdle); pose(M.great, LABPOSE.gIdle); pose(M.warden, LABPOSE.wIdle);
    place(M.warden, 0.3, -1.6, 0.35); place(M.rapier, -2.2, 1.9, 2.4); place(M.great, 2.3, 1.2, -2.6); camAt(0, 1.0, 0.2, YAW, 1.0);
    FX.tele([-2.5, 0, -3.2], { r: 1.9, life: 99 }); },
  close() { pose(M.rapier, LABPOSE.rIdle); pose(M.great, LABPOSE.gIdle); pose(M.warden, LABPOSE.wIdle);
    place(M.warden, 0.4, -3.4, 0.4); place(M.rapier, -0.9, 0.6, 0.9); place(M.great, 1.0, 0.2, 0.2); camAt(0.0, 1.3, 0.4, YAW, 1.9); },
  finisher() { pose(M.rapier, LABPOSE.rThrust); pose(M.great, LABPOSE.gLaunch); pose(M.warden, LABPOSE.wReel);
    place(M.warden, 0.2, -1.2, 0.3); place(M.rapier, -1.1, 1.5, 2.6); place(M.great, 2.0, 0.6, -2.3); camAt(0, 1.4, 0.0, YAW, 1.05);
    FX.smear([-1.1, 0, 1.5], 1.6, 1.2, 3.4, 1.6, { w: 0.5, life: 99, dy: -0.2 }); FX.ink(new THREE.Vector3(-0.3, 1.9, -0.4), R.camera, { size: 1.3, life: 99 });
    FX.speed(R.camera, { life: 99 }); LAB.tech = { s: 'FLASH THRUST', ko: '섬광 찌르기', col: D.pal.blue, t: 0.6 }; },
  hud() { SCENES.wide(); LAB.hud = true; },
};
const LAB = window.LAB = { R, M, FX, D, hud: false, tech: null, ready: false,
  scene(name) { FX.clear(); LAB.hud = false; LAB.tech = null; size(); SCENES[name](); LAB.draw(); return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, models: Object.fromEntries(Object.entries(M).map(([k, m]) => [k, { tris: m.tris, meshes: Object.keys(m.meshes).length }])) }; },
  draw() {
    renderer.info.autoReset = false; renderer.info.reset();
    R.render(1 / 60, null); hctx.setTransform(1, 0, 0, 1, 0, 0); hctx.clearRect(0, 0, hud.width, hud.height);
    T1H.frame(hctx, hud.width, hud.height);
    if (LAB.tech) T1H.techName(hctx, LAB.tech);
    if (LAB.hud) { T1H.bossBar(hctx, { name: 'AZURE WARDEN', ko: '애저 워든', hp: 0.62, chip: 0.68, phase: 2, groggy: 0.35 }); T1H.stamp(hctx, 1580, 250, 58, '3', 70, 1, 'RALLY');
      T1H.portrait(hctx, 'rapier', T1H.left() + 60, 900, 0.6); T1H.portrait(hctx, 'great', T1H.right() - 190, 900, 0.6, true); }
  },
};
addEventListener('resize', () => LAB.ready && LAB.draw());
document.fonts && document.fonts.ready.then(() => { setTimeout(() => { LAB.ready = true; }, 50); }); if (!document.fonts) LAB.ready = true;
