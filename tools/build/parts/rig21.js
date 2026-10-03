// ---- 2단계 새 무기 (buildPlayer가 blade 'chain' · 'shield' · 'twin'일 때 부름) — 1~2px 선으로 읽히게 얇은 면 + 납작한 단면
//      chain: 오른손 낫(사슬 끝) + 왼손 추 · 동작의 ext 트랙만큼 낫이 사슬을 달고 앞으로 날아감 (사슬 마디가 그 사이를 채움)
//      shield: 오른손 철퇴 + 왼팔 둥근 방패 · twin: 양손 짧은 검 (왼손은 weapon2 — 동작 표에 없는 관절, 손에 고정)
// a value from a [[frame, v], …] track at (fractional) frame f, linear between keys
function sampleTrack(T, f) {
  if (!T || !T.length) return 0;
  if (f <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (f <= T[i][0]) { const a = T[i - 1], b = T[i], u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  return T[T.length - 1][1];
}
// a thin flat box from (x0, y0) to (x1, y1) in the weapon's XY plane (a blade segment)
function seg20(x0, y0, x1, y1, w, mat) {
  const L = Math.hypot(x1 - x0, y1 - y0), m = mesh(flat(new THREE.BoxGeometry(L, w, 0.012)), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
  return m;
}
function buildWeapon20(kind, root, M, weapon) {
  const hdL = root.getObjectByName('hdL');
  if (kind === 'chain') {
    const head = new THREE.Group(); head.name = 'sickle'; weapon.add(head);
    const h = mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.36, 6), M.brass); h.position.y = 0.08; head.add(h);            // wooden haft
    for (const [a, b, c, d] of [[0, 0.26, 0.11, 0.33], [0.11, 0.33, 0.23, 0.3], [0.23, 0.3, 0.3, 0.19]]) head.add(seg20(a, b, c, d, 0.026, M.steel));   // the hooked blade
    const links = [];
    for (let i = 0; i < 22; i++) { const k = mesh(flat(new THREE.BoxGeometry(0.022, 0.05, 0.022)), M.steel, false); k.visible = false; weapon.add(k); links.push(k); }
    const wt = mesh(new THREE.SphereGeometry(0.034, 6, 4), M.steel); wt.position.y = -0.17; hdL.add(wt);                    // the weight in the left fist, on a short chain
    const hang = mesh(flat(new THREE.BoxGeometry(0.012, 0.12, 0.012)), M.steel, false); hang.position.y = -0.09; hdL.add(hang);
    root.userData.post = ch => {                   // the sickle flies out along its chain by the clip's ext track (stepped with the 12 fps poses)
      const e = ch.clip && ch.clip.ext ? sampleTrack(ch.clip.ext, ch.f) : 0;
      head.position.y = e;
      const on = e > 0.12;
      links.forEach((k, i) => { k.visible = on; if (on) k.position.y = e * (i + 0.5) / links.length; });
    };
    return true;
  }
  if (kind === 'shield') {
    const hf = mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.5, 6), M.brass); hf.position.y = 0.17; weapon.add(hf);         // mace haft
    const pm = mesh(new THREE.SphereGeometry(0.026, 6, 4), M.brass); pm.position.y = -0.09; weapon.add(pm);
    const hd = mesh(new THREE.SphereGeometry(0.066, 8, 6), M.steel); hd.position.y = 0.45; weapon.add(hd);
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const fl = mesh(flat(new THREE.BoxGeometry(x ? 0.06 : 0.025, 0.13, z ? 0.06 : 0.025)), M.steel); fl.position.set(x * 0.06, 0.45, z * 0.06); weapon.add(fl); }
    const el = root.getObjectByName('elL'), sg = new THREE.Group(); sg.name = 'shieldG'; sg.position.set(0.07, -0.17, 0.02); el.add(sg);
    const face = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 14), M.vest); face.rotation.z = Math.PI / 2; sg.add(face);  // round leather-faced shield on the forearm
    const rim = mesh(new THREE.TorusGeometry(0.25, 0.016, 4, 16), M.brass); rim.rotation.y = Math.PI / 2; sg.add(rim);
    const boss = mesh(new THREE.SphereGeometry(0.06, 8, 5), M.steel); boss.position.x = 0.03; boss.scale.x = 0.6; sg.add(boss);
    return true;
  }
  if (kind === 'twin') {
    const blade = par => {
      const g = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), M.vest); par.add(g);
      const gd = mesh(flat(new THREE.BoxGeometry(0.12, 0.02, 0.03)), M.brass); gd.position.y = 0.08; par.add(gd);
      const bl = mesh(flat(new THREE.CylinderGeometry(0.005, 0.03, 0.62, 4)), M.steel); bl.position.y = 0.4; par.add(bl);
    };
    blade(weapon);
    const w2 = joint('weapon2', hdL, 0, -0.04, 0); w2.rotation.x = Math.PI / 2; blade(w2);
    return true;
  }
  if (kind === 'club') {                         // 2단계 보스 4 도깨비 방망이: 끝으로 갈수록 굵어지는 나무 몽둥이 + 쇠 징 · dkTip = 내려찍기 판정 중심
    const grip = mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.22, 6), M.vest); weapon.add(grip);
    const body = mesh(new THREE.CylinderGeometry(0.085, 0.036, 0.8, 8), M.brass); body.position.y = 0.5; weapon.add(body);
    const cap = mesh(new THREE.SphereGeometry(0.085, 8, 5), M.brass); cap.position.y = 0.9; cap.scale.y = 0.55; weapon.add(cap);
    for (let i = 0; i < 12; i++) {                 // studs: three staggered rings near the head, pointing out
      const a = i * TAU / 4 + (i >> 2) * 0.8, y = 0.56 + (i >> 2) * 0.13, r = 0.036 + (y - 0.1) * 0.06;
      const s = mesh(new THREE.ConeGeometry(0.017, 0.05, 4), M.steel); s.rotation.order = 'YXZ'; s.rotation.set(Math.PI / 2, a, 0);
      s.position.set(Math.sin(a) * (r + 0.015), y, Math.cos(a) * (r + 0.015)); weapon.add(s);
    }
    const tip = new THREE.Object3D(); tip.name = 'dkTip'; tip.position.y = 0.78; weapon.add(tip);
    return true;
  }
  return false;
}
