// ---- 2단계 보스 3 THE WEEPING BELL (에밀레종): 사람형이 아닌 새 리그 — 틀 · 매달린 종 · 당목(종 치는 통나무)
//      관절 이름은 공용 표(JOINTS)에서: body 전체 · spine = 종(대들보에 매단 점) · head = 용뉴(종 꼭대기) · chest = 울음 결정 받침
//      weapon = 당목 팔(세로축으로 돎) · hdR = 당목 줄(앞뒤로 흔들림) — 그래서 1·2보스 AI 코드가 그대로 돈다 (remap으로 동작 이름 연결)
//      패턴: 맥놀이(beat) · 당목 치기(strike) · 종 내려찍기(bellSlam) + 1단계 연타 · 원형탄 · 회오리탄 · 바닥 (가중치만)
const BP_ = (o = {}) => ({ body: { p: [0, 0, 0] }, spine: [0, 0, 0], head: [0, 0, 0], chest: [0, 0, 0], weapon: [0, 0, 0], hdR: [0, 0, 0], ...o });
const BELL_CLIPS = [
  { name: 'bIdle', label: 'IDLE', frames: 32, loop: true, keys: [
    [0, BP_({ spine: [0.03, 0, 0.04], hdR: [0.05, 0, 0] })], [16, BP_({ spine: [-0.03, 0, -0.04], hdR: [-0.05, 0, 0] })], [32, BP_({ spine: [0.03, 0, 0.04], hdR: [0.05, 0, 0] })],
  ] },
  { name: 'bGlide', label: 'GLIDE', frames: 16, loop: true, keys: [
    [0, BP_({ body: { p: [0, 0.04, 0], r: [0.05, 0, 0] }, spine: [-0.1, 0, 0.03], hdR: [-0.15, 0, 0] })], [8, BP_({ body: { p: [0, 0, 0], r: [0.07, 0, 0] }, spine: [-0.14, 0, -0.03], hdR: [-0.2, 0, 0] })],
    [16, BP_({ body: { p: [0, 0.04, 0], r: [0.05, 0, 0] }, spine: [-0.1, 0, 0.03], hdR: [-0.15, 0, 0] })],
  ], events: [{ f: 0, type: 'stomp' }] },
  // RING (맥놀이): the striker drawn far back, swung into the bell (f9 = 'ring'), the bell rocks and hums
  { name: 'bRing', label: 'RING', frames: 26, keys: [
    [0, BP_()],
    [6, BP_({ hdR: [0.95, 0, 0], spine: [-0.05, 0, 0] }), 'out'],
    [8, BP_({ hdR: [1.05, 0, 0] })],
    [9, BP_({ hdR: [-0.35, 0, 0], spine: [0.28, 0, 0] }), 'snap', 1.6],
    [12, BP_({ hdR: [-0.15, 0, 0], spine: [-0.18, 0, 0.06] }), 'io', 1.4],
    [16, BP_({ hdR: [0.05, 0, 0], spine: [0.1, 0, -0.05] }), 'io', 1.2],
    [21, BP_({ spine: [-0.04, 0, 0.02] }), 'io'],
    [26, BP_()],
  ], events: [{ f: 9, type: 'ring' }] },
  // STRIKE (당목 치기): the striker arm swung round to one side, then flung across the whole front (hit f11)
  { name: 'bStrike', label: 'STRIKE', frames: 22, keys: [
    [0, BP_()],
    [7, BP_({ weapon: [0, 1.75, 0], hdR: [-0.5, 0, 0], spine: [0, 0, 0.08] }), 'out'],
    [9, BP_({ weapon: [0, 1.85, 0], hdR: [-0.55, 0, 0], spine: [0, 0, 0.1] })],
    [11, BP_({ weapon: [0, -0.2, 0], hdR: [-1.15, 0, 0], spine: [0, 0, -0.08] }), 'lin'],
    [13, BP_({ weapon: [0, -1.8, 0], hdR: [-1.0, 0, 0], spine: [0, 0, -0.12] }), 'lin'],
    [16, BP_({ weapon: [0, -1.6, 0], hdR: [-0.4, 0, 0], spine: [0, 0, -0.05] }), 'out'],
    [22, BP_()],
  ], events: [{ f: 11, type: 'bstrike' }],
    smears: [{ f: 10, frames: 3, type: 'arc', pos: [0, 2.4, 0], rot: [Math.PI / 2, 0, 0], R: 5.2, W: 1.2, a0: 2.4, a1: -1.0 }] },
  // BELL SLAM (종 내려찍기): the bell hauled up its chain, then dropped onto the floor (f11 = 'bslam', a ring of shock — not parryable)
  { name: 'bSlam', label: 'BELL SLAM', frames: 24, keys: [
    [0, BP_()],
    [5, BP_({ spine: { r: [0, 0, 0], p: [0, 0.55, 0] }, hdR: [0.3, 0, 0] }), 'out', 1.5],
    [9, BP_({ spine: { r: [0.05, 0, 0], p: [0, 0.7, 0] }, hdR: [0.35, 0, 0] }), 'io', 1.8],
    [11, BP_({ spine: { r: [0, 0, 0], p: [0, -1.38, 0] }, hdR: [-0.3, 0, 0] }), 'snap', 1.0],
    [14, BP_({ spine: { r: [0.06, 0, 0.05], p: [0, -1.3, 0] }, hdR: [0.2, 0, 0] }), 'out'],
    [24, BP_()],
  ], events: [{ f: 11, type: 'bslam' }] },
  // PULSE (연타 한 번): the striker taps — a short ring (jab impact f6 = FIGHT.COMBO.jabF)
  { name: 'bPulse', label: 'PULSE', frames: 10, keys: [
    [0, BP_()], [4, BP_({ hdR: [0.6, 0, 0] }), 'out'], [6, BP_({ hdR: [-0.25, 0, 0], spine: [0.14, 0, 0] }), 'snap', 1.3], [10, BP_()],
  ], events: [{ f: 6, type: 'jab' }] },
  { name: 'bNova', label: 'WAIL', frames: 18, keys: [
    [0, BP_()], [5, BP_({ spine: { r: [0, 0, 0.08], p: [0, 0.25, 0] } }), 'out', 1.4], [8, BP_({ spine: { r: [0, 0, -0.1], p: [0, 0.3, 0] } }), 'snap', 2.0],
    [11, BP_({ spine: { r: [0, 0, 0.1], p: [0, 0.28, 0] } }), 'snap', 2.0], [18, BP_()],
  ], events: [{ f: 8, type: 'nova' }, { f: 11, type: 'nova2' }] },
  { name: 'bSpiral', label: 'TOLL', frames: 36, keys: [
    [0, BP_()], [4, BP_({ spine: [0, 0.6, 0.06] }), 'io', 1.3], [20, BP_({ spine: [0, TAU * 0.6, 0.06] }), 'lin', 1.5], [32, BP_({ spine: [0, TAU, 0.04] }), 'lin', 1.3], [36, BP_({ spine: [0, TAU, 0] })],
  ], events: Array.from({ length: 13 }, (_, i) => ({ f: 6 + i * 2, type: 'spin' })) },
  // HUM (바닥 패턴 · 페이즈 전환 'cast'): trembling, glowing
  { name: 'bHum', label: 'HUM', frames: 8, loop: true, keys: [
    [0, BP_({ spine: [0.02, 0, 0.05] }), 'io', 1.4], [2, BP_({ spine: [-0.02, 0, -0.05] }), 'io', 1.6], [4, BP_({ spine: [0.02, 0, 0.04] }), 'io', 1.4], [6, BP_({ spine: [-0.02, 0, -0.04] }), 'io', 1.6], [8, BP_({ spine: [0.02, 0, 0.05] }), 'io', 1.4],
  ] },
  // LIFTED (들림): the bell swung up on its chain, mouth turned out — the weeping crystal inside shows (weak point)
  { name: 'bLift', label: 'LIFTED', frames: 12, keys: [
    [0, BP_()], [3, BP_({ spine: { r: [-1.05, 0, 0.6], p: [0, 0.2, 0] }, hdR: [0.6, 0, 0] }), 'snap', 1.8], [6, BP_({ spine: { r: [-0.92, 0, 0.5], p: [0, 0.2, 0] }, hdR: [0.4, 0, 0] }), 'io', 1.6],
    [12, BP_({ spine: { r: [-1.0, 0, 0.55], p: [0, 0.2, 0] }, hdR: [0.5, 0, 0] }), 'io', 1.6],
  ] },
  { name: 'bSettle', label: 'SETTLE', frames: 10, keys: [
    [0, BP_({ spine: { r: [-0.92, 0, 0.5], p: [0, 0.2, 0] } })], [4, BP_({ spine: [0.25, 0, 0] }), 'out'], [7, BP_({ spine: [-0.1, 0, 0] }), 'io'], [10, BP_()],
  ], events: [{ f: 4, type: 'kneel' }] },
  // DROP (무릎 = 종이 바닥에 떨어져 기울어짐) · GROGGY (같은 자세, 떨림)
  { name: 'bDrop', label: 'DROPPED', frames: 10, keys: [
    [0, BP_()], [3, BP_({ spine: { r: [0.1, 0, 0.42], p: [0, -1.38, 0] }, hdR: [0.4, 0, 0] }), 'snap', 1.4], [6, BP_({ spine: { r: [0.06, 0, 0.32], p: [0, -1.33, 0] }, hdR: [0.2, 0, 0] }), 'io'],
    [10, BP_({ spine: { r: [0.08, 0, 0.36], p: [0, -1.35, 0] }, hdR: [0.25, 0, 0] }), 'io'],
  ], events: [{ f: 3, type: 'kneel' }] },
  { name: 'bGroggy', label: 'GROGGY', frames: 24, loop: true, keys: [
    [0, BP_({ spine: { r: [0.08, 0, 0.4], p: [0, -1.35, 0] }, hdR: [0.3, 0, 0] }), 'io', 1.3], [12, BP_({ spine: { r: [0.06, 0, 0.44], p: [0, -1.36, 0] }, hdR: [0.25, 0, 0] }), 'io', 1.1],
    [24, BP_({ spine: { r: [0.08, 0, 0.4], p: [0, -1.35, 0] }, hdR: [0.3, 0, 0] }), 'io', 1.3],
  ] },
  // SWAY (휘청 · 받아친 뒤): the bell rocked hard on its chain · TURN (돌아섬): swung round on its chain (the frame follows facing)
  { name: 'bSway', label: 'SWAY', frames: 14, keys: [
    [0, BP_()], [2, BP_({ spine: [0.55, 0, 0.05], hdR: [0.5, 0, 0] }), 'snap'], [6, BP_({ spine: [-0.35, 0, -0.04], hdR: [-0.3, 0, 0] }), 'io'],
    [10, BP_({ spine: [0.18, 0, 0.02] }), 'io'], [14, BP_({ spine: [0.3, 0, 0] }), 'io'],
  ], events: [{ f: 2, type: 'stomp' }] },
  { name: 'bTurn', label: 'TURN', frames: 12, keys: [
    [0, BP_()], [3, BP_({ spine: [0, 0.8, 0.4], hdR: [0.4, 0, 0] }), 'snap'], [8, BP_({ spine: [0, 1.4, 0.22] }), 'io'], [12, BP_({ spine: [0, 1.5, 0.25] }), 'io'],
  ] },
  { name: 'bDeath', label: 'DEATH', frames: 36, keys: [
    [0, BP_({ spine: [0.2, 0, 0] }), 'io', 2], [8, BP_({ spine: { r: [-0.3, 0, 0.2], p: [0, 0.2, 0] } }), 'io', 2.2], [12, BP_({ spine: { r: [0.2, 0, 0.6], p: [0, -1.4, 0] } }), 'snap', 1.5],
    [20, BP_({ spine: { r: [0.3, 0, 0.95], p: [0, -1.5, 0.2] }, weapon: [0, 0.6, 0], hdR: [-1.2, 0, 0] }), 'io', 1.0],
    [28, BP_({ spine: { r: [0.35, 0, 1.25], p: [0, -1.6, 0.35] }, weapon: [0, 0.7, 0], hdR: [-1.5, 0, 0] }), 'out', 0.4], [36, BP_({ spine: { r: [0.35, 0, 1.25], p: [0, -1.6, 0.35] }, weapon: [0, 0.7, 0], hdR: [-1.5, 0, 0] }), 'io', 0],
  ], events: [{ f: 12, type: 'kneel' }, { f: 28, type: 'fall' }] },
];
// golem clip names the shared AI code plays → the bell's own
const BELL_REMAP = { idle: 'bIdle', walk: 'bGlide', jabL: 'bPulse', jabR: 'bPulse', cast: 'bHum', nova: 'bNova', spiral: 'bSpiral',
                     lifted: 'bLift', liftDrop: 'bSettle', kneelDown: 'bDrop', staggered: 'bSway', turned: 'bTurn', reel: 'bSway', groggy: 'bGroggy', death: 'bDeath' };
function buildBell() {
  const M = {
    bronze: toon({ chr: true, ramp: [C.VOID, C.LEATH0, C.LEATH2, C.BRONZE], rim: C.SLATE1 }),
    band:   toon({ chr: true, ramp: [C.VOID, C.ABYSS, C.LEATH0, C.BRONZE], rim: C.SLATE1 }),
    wood:   toon({ chr: true, ramp: RAMP.wood, rim: C.SLATE0 }),
    woodDk: toon({ chr: true, ramp: [C.VOID, C.ABYSS, C.LEATH0, C.LEATH1], rim: C.SLATE0 }),
    rope:   toon({ chr: true, ramp: RAMP.bone, rim: C.SLATE0, outline: 0.5 }),
    stone:  toon({ chr: true, ramp: RAMP.stone, rim: C.SLATE0 }),
    core:   toon({ chr: true, ramp: RAMP.crystalB, emit: [0.3, 0.75, 1.1], pl: 0, bias: 0.06 }),
    crack:  toon({ chr: true, ramp: [C.VOID, C.VOID, C.VOID, C.ABYSS], pl: 0 }),
  };
  const root = new THREE.Group(); root.name = 'bell';
  const body = joint('body', root, 0, 0, 0);
  // the frame: two posts on stone feet, a crossbeam with turned-up ends
  for (const s of [-1, 1]) {
    const foot = mesh(flat(new THREE.BoxGeometry(0.62, 0.32, 0.9)), M.stone); foot.position.set(1.95 * s, 0.16, 0); body.add(foot);
    const post = mesh(flat(new THREE.BoxGeometry(0.3, 4.5, 0.32)), M.wood); post.position.set(1.95 * s, 2.55, 0); body.add(post);
    const brace = mesh(flat(new THREE.BoxGeometry(0.16, 1.3, 0.18)), M.woodDk); brace.position.set(1.62 * s, 4.15, 0); brace.rotation.z = 0.75 * s; body.add(brace);
    const tip = mesh(flat(new THREE.BoxGeometry(0.5, 0.18, 0.4)), M.woodDk); tip.position.set(2.45 * s, 4.95, 0); tip.rotation.z = -0.3 * s; body.add(tip);
  }
  const beam = mesh(flat(new THREE.BoxGeometry(4.6, 0.36, 0.42)), M.wood); beam.position.y = 4.8; body.add(beam);
  const cap = mesh(flat(new THREE.BoxGeometry(4.9, 0.12, 0.6)), M.woodDk); cap.position.y = 5.02; body.add(cap);
  // the bell (hangs from the beam): bronze lathe, two raised bands, bosses, the dragon loop on top, the weeping crystal in its mouth
  const spine = joint('spine', body, 0, 4.55, 0);
  const shell = mesh(lathe([[1.12, -2.86], [1.14, -2.78], [1.02, -2.55], [0.9, -2.15], [0.84, -1.5], [0.8, -0.85], [0.68, -0.32], [0.42, -0.06], [0, 0]], 16), M.bronze);
  spine.add(shell);
  for (const [y, r] of [[-0.62, 0.76], [-2.42, 0.97]]) { const b = mesh(new THREE.TorusGeometry(r, 0.05, 4, 18), M.band); b.rotation.x = Math.PI / 2; b.position.y = y; spine.add(b); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, k = mesh(new THREE.SphereGeometry(0.07, 5, 4), M.band); k.position.set(Math.sin(a) * 0.83, -1.15, Math.cos(a) * 0.83); spine.add(k); }
  const mouth = mesh(new THREE.CircleGeometry(1.08, 16), M.crack, false); mouth.rotation.x = Math.PI / 2; mouth.position.y = -2.84; spine.add(mouth);
  const head = joint('head', spine, 0, 0.02, 0);
  const loop = mesh(new THREE.TorusGeometry(0.2, 0.07, 5, 10), M.band); loop.position.y = 0.16; head.add(loop);
  const chain = mesh(flat(new THREE.BoxGeometry(0.08, 0.3, 0.08)), M.band); chain.position.y = 0.36; head.add(chain);
  const chest = joint('chest', spine, 0, -2.5, 0);
  const cry = mesh(crystalGeo(0.3, 0.32, 0.42, 6), M.core); cry.rotation.x = Math.PI; chest.add(cry);   // points down out of the mouth
  const cry2 = crystalCluster(4, 0.08, 0.16, 0.6, M.core, 61); cry2.position.y = -0.1; cry2.rotation.x = Math.PI; chest.add(cry2);
  // phase cracks (shown at 70 % / 35 %)
  const att = { horns: new THREE.Group(), wings: new THREE.Group(), shield: new THREE.Group(), crack1: new THREE.Group(), crack2: new THREE.Group() };
  for (const [g, segs] of [[att.crack1, [[0.35, -0.5, -1.2, 0.5], [0.1, -1.15, -1.7, -0.4]]], [att.crack2, [[-0.4, -0.6, -1.0, -0.6], [-0.6, -1.0, -2.3, 0.3], [0.5, -1.7, -2.6, 0.6]]]]) {
    for (const [a, y0, y1, tw] of segs) { const c = mesh(flat(new THREE.BoxGeometry(0.05, Math.abs(y1 - y0), 0.05)), M.crack, false); const r = 0.86; c.position.set(Math.sin(a) * r, (y0 + y1) / 2, Math.cos(a) * r); c.rotation.set(0, a, tw); g.add(c); }
    spine.add(g);
  }
  for (const g of Object.values(att)) g.visible = false;
  // the striker: an arm out over the front, two ropes, the log
  const weapon = joint('weapon', body, 0, 4.7, 0);
  const yoke = mesh(flat(new THREE.BoxGeometry(0.16, 0.16, 2.5)), M.woodDk); yoke.position.set(0, 0, 1.2); weapon.add(yoke);
  const hdR = joint('hdR', weapon, 0, 0, 2.35);
  for (const s of [-1, 1]) { const r = mesh(flat(new THREE.BoxGeometry(0.035, 1.7, 0.035)), M.rope, false); r.position.set(0.55 * s, -0.85, 0); hdR.add(r); }
  const log = mesh(new THREE.CylinderGeometry(0.24, 0.26, 1.7, 8), M.wood); log.rotation.z = Math.PI / 2; log.position.y = -1.75; hdR.add(log);
  const ring1 = mesh(new THREE.TorusGeometry(0.26, 0.035, 4, 10), M.band); ring1.rotation.y = Math.PI / 2; ring1.position.set(0.6, -1.75, 0); hdR.add(ring1);
  const ring2 = ring1.clone(); ring2.position.x = -0.6; hdR.add(ring2);
  tagIdsByMaterial(root);
  const S = FEEL.BOSS_SCALE;
  root.scale.setScalar(S);
  const ch = new Character({
    name: 'BELL', root, clips: BELL_CLIPS, springs: [], focus: 2.5 * S, radius: 1.35 * S, turnRate: 1.6,
    order: BELL_CLIPS.map(c => c.name),
    smear: new Smear(C.BRONZE, C.LEATH1, [0.5, 0.3, 0.1]),
    glowMats: [{ mat: M.core, base: [0.3, 0.75, 1.1], bias: 0.06 }], mats: Object.values(M),
    onEvent: (c, e) => Game.onEvent(c, e),
  });
  ch.remap = BELL_REMAP; ch.coreMat = M.core; ch.M = M; ch.att = att;
  ch.weak = [{ name: 'CRYSTAL', obj: cry }, { name: 'RIM', obj: loop }, { name: 'CRYSTAL', obj: cry }];
  for (const m of ch.mats) { if (!m.uniforms) continue; m.uniforms.uCutOn = CUT.on; m.uniforms.uCut = CUT.p; m.uniforms.uCutZ = CUT.z; m.uniforms.uCutStr = CUT.str; }
  return ch;
}
// ---- 종 리그 바꿔 끼우기 + 패턴 + 맥놀이 + HUD 화살표 + 봇 도움
const Bell = {
  rig: null, golem: null, beat: null,
  ensure() {
    if (!this.golem) this.golem = boss;
    if (!this.rig) { this.rig = buildBell(); this.rig.root.visible = false; scene.add(this.rig.root); }
    return this.rig;
  },
  active() { return !!this.rig && boss === this.rig; },
  // the rush's current boss rig: the bell for a 'bell' boss, the golem otherwise (the shared AI only ever sees `boss`)
  use(on) {
    if (Dk.on) return;                              // (2단계 보스 4: the dokkaebi pair holds `boss` — Dk.use(false) puts the golem back first)
    if (on) this.ensure(); else if (!this.golem) return;
    const want = on ? this.rig : this.golem, other = on ? this.golem : this.rig;
    if (boss === want) return;
    const p = boss.pos.clone(), f = boss.facing, vis = boss.root.visible;
    if (other) other.root.visible = false;
    boss = want; Rigs.bodies[Rigs.bodies.length - 1] = boss;
    boss.place(p.x, p.z, f); boss.root.visible = vis; boss.play('idle');
  },
  owns(n) { return n === 'beat' || n === 'strike' || n === 'bellSlam'; },
  // pattern start (AI.start hands these over) · strike = 당목 치기 (coloured, parryable sector) · bellSlam = 종 내려찍기 (neutral ring) · beat = 맥놀이
  start(name) {
    const B = FEEL.BELL, A = AI;
    if (name === 'strike') {
      A.curWave = SR() < 0.5 ? 'blue' : 'red'; Rush.tint(A.curWave);
      boss.play('bStrike', A.speed); Sfx.play('warn');
      A.tele.push(Decals.add(1, { R: B.strikeR, half: B.strikeHalf, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: Waves.code(A.curWave) }));
      return true;
    }
    if (name === 'bellSlam') {
      A.curWave = null; Rush.tint(null); boss.play('bSlam', A.speed * B.slamSpd); Sfx.play('warn');
      A.tele.push(Decals.add(0, { R: B.slamR, x: boss.pos.x, z: boss.pos.z, wave: 3 }));
      return true;
    }
    if (name === 'beat') {
      A.curWave = null; Rush.tint(null); boss.play('bRing', 1); Sfx.play('warn'); Game.banner('RESONANCE', 1.2);
      const n = B.beatN[A.phase - 1], pairs = [];
      let th = SR() * TAU;
      for (let j = 0; j < n; j++) {
        if (j) th += (SR() < 0.5 ? 1 : -1) * (B.turn[0] + SR() * (B.turn[1] - B.turn[0]));
        pairs.push({ at: B.first + j * B.gap, th, rings: null });
      }
      this.beat = { t: 0, pairs, id: A.atkSeq * 64 };
      return true;
    }
    return false;
  },
  updateAttack(a, gdt) {
    const A = AI, B = FEEL.BELL, f = boss.f;
    if (A.cur === 'strike') {
      const t = A.tele[0];
      if (f < B.strikeLockF) { const tp = A.target.ch.pos; boss.turnRate = 3; boss.facingTo = Math.atan2(tp.x - boss.pos.x, tp.z - boss.pos.z); }
      else { boss.turnRate = 0; boss.facingTo = boss.facing; }
      if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; A.setTele(t, f, B.strikeLockF, B.strikeF); }
      if (boss.done) A.finish();
      return;
    }
    if (A.cur === 'bellSlam') {
      const t = A.tele[0]; boss.turnRate = 0;
      if (t) A.setTele(t, f, B.slamF - 4, B.slamF);
      if (boss.done) A.finish();
      return;
    }
    if (A.cur === 'beat') {
      boss.turnRate = 1.2; boss.facingTo = a;
      if (boss.done && !boss.is('cast')) boss.play('cast');
      if (this.updateBeat(gdt)) { this.endBeat(); A.finish(); }
    }
  },
  // the clip events: the striker's sweep · the bell hitting the floor · the ring
  onEvent(e) {
    const A = AI, B = FEEL.BELL, fight = Game.mode === 'fight' && A.state === 'attack';
    if (e.type === 'bstrike') {
      CamRig.shake(3, 0.25); Sfx.play('sweep');
      if (!fight || A.cur !== 'strike') return;
      for (const q of fighters) {
        if (!q.alive || A.swingHit.has(q)) continue;
        const dx = q.ch.pos.x - boss.pos.x, dz = q.ch.pos.z - boss.pos.z;
        if (Math.hypot(dx, dz) < B.strikeR + q.ch.radius && Math.abs(angDiff(Math.atan2(dx, dz), boss.facing)) < B.strikeHalf)
          if (Game.hurtPlayer(q, B.strikeDmg, boss.pos.clone(), true, A.curWave, false, 'melee')) A.swingHit.add(q);
      }
    } else if (e.type === 'bslam') {
      const c = V3(boss.pos.x, 0, boss.pos.z);
      Decals.add(3, { R: B.slamR, x: c.x, z: c.z, rot: Math.random() * TAU, life: 6, fadeIn: 0.01, fadeOut: 1.5 });
      Particles.burst('dust', c, null, 40, 2.6); Particles.burst('debris', c, null, 16, 1.6); CamRig.shake(5, 0.45); Sfx.play('slam'); Sfx.play('boom', 0.7);
      if (!fight || A.cur !== 'bellSlam') return;
      A.clearTele();
      for (const q of fighters) if (q.alive && Math.hypot(q.ch.pos.x - c.x, q.ch.pos.z - c.z) < B.slamR + q.ch.radius) Game.hurtPlayer(q, B.slamDmg, c, true, null, false, 'blast');
    } else if (e.type === 'ring') {
      const hd = boss.root.getObjectByName('head').getWorldPosition(V3());
      Particles.burst('sparkB', hd, null, 20, 1.6); Particles.burst('spark', V3(hd.x, hd.y - 1, hd.z), null, 14, 1.4); CamRig.shake(3, 0.3); Sfx.play('cutin');
    }
  },
  // ---- 맥놀이: per pair a blue ring and a red ring from opposite edges of the arena (source angle th / th + π), sweeping across
  srcOf(th) { const R = FEEL.BELL.src; return V3(Math.sin(th) * R, 0, Math.cos(th) * R); },
  colAt(ring) { return AI.phase >= FEEL.BELL.mixPhase && ring.r >= FEEL.BELL.src ? (ring.col0 === 'blue' ? 'red' : 'blue') : ring.col0; },   // 3페이즈: past the middle a ring turns the other colour
  updateBeat(gdt) {
    const b = this.beat, B = FEEL.BELL; if (!b) return true;
    b.t += gdt;
    let live = false;
    for (const P of b.pairs) {
      if (b.t < P.at) { live = true; continue; }
      if (!P.rings) {
        P.rings = ['blue', 'red'].map((col0, k) => {
          const S = this.srcOf(P.th + k * Math.PI);
          return { col0, S, r: 0, d: Decals.add(5, { R: 2 * B.src + 2, R0: 0, R1: B.band, x: S.x, z: S.z, wave: Waves.code(col0), lock: 1, prog: 1, fadeIn: 0.05 }),
                   seen: new Set(), blocks: [], id: b.id + b.pairs.indexOf(P) * 2 + k, wasCol: col0 };
        });
        Sfx.play('cutin'); CamRig.shake(2, 0.2);
      }
      for (const ring of P.rings) {
        if (!ring.d) continue;
        ring.r = (b.t - P.at) * B.speed;
        const col = this.colAt(ring);
        if (col !== ring.wasCol) { ring.wasCol = col; ring.d.mat.uniforms.uWave.value = Waves.code(col); Sfx.play('fizzle'); }
        ring.d.mat.uniforms.uR0.value = Math.max(0, ring.r - B.band); ring.d.mat.uniforms.uR1.value = ring.r + B.band;
        // who the front crosses this frame — nearest the source first (a blocker shields whoever stands in its wake)
        const cross = fighters.filter(q => q.alive && !ring.seen.has(q) && Math.hypot(q.ch.pos.x - ring.S.x, q.ch.pos.z - ring.S.z) <= ring.r)
          .sort((p, q) => Math.hypot(p.ch.pos.x - ring.S.x, p.ch.pos.z - ring.S.z) - Math.hypot(q.ch.pos.x - ring.S.x, q.ch.pos.z - ring.S.z));
        for (const q of cross) { ring.seen.add(q); this.cross(ring, q, col); }
        if (ring.r > 2 * B.src + 1) { Decals.kill(ring.d); ring.d = null; } else live = true;
      }
    }
    return !live;
  },
  mine(q, col) { const c = Slots.color(q); return c === col || c === 'both'; },
  parrying(q) { return q.state === 'parry' && (q.parried || q.t <= Waves.parryWindow(q)); },
  cross(ring, q, col) {
    const B = FEEL.BELL, st = this.stats(), p = q.ch.pos, mine = this.mine(q, col);
    if (mine) st.match++;
    if (mine && this.parrying(q)) {                   // blocked: absorb my colour, rally +1, my wake is safe
      if (!q.parried) { q.parried = true; q.parriedAt = q.t; }
      st.block++; Slots.absorb(q, col, ring.id); Duo.rallyUp(B.rally, q);
      const dir = V3(p.x - ring.S.x, 0, p.z - ring.S.z).normalize();
      ring.blocks.push({ p: p.clone(), dir });
      Particles.burst(col === 'blue' ? 'sparkB' : 'spark', V3(p.x, 1.1, p.z), dir, 22, 1.6); Particles.burst(Slots.pk(col), V3(p.x, 1.0, p.z), null, 12, 1.4);
      Game.popup('BLOCK', V3(p.x, 2.8, p.z), col === 'blue' ? C.CYAN : C.HOT, 2); Sfx.play('parry'); CamRig.shake(2, 0.14); Game.stop(FEEL.PARRY_HITSTOP, [q]);
      return;
    }
    const half = B.fanHalf * Math.PI / 180;
    for (const k of ring.blocks) {                   // in a blocker's wake (the fan behind it, away from the source)
      const v = V3(p.x - k.p.x, 0, p.z - k.p.z), L = Math.hypot(v.x, v.z);
      if (L <= B.fanLen && (L < 0.3 || (v.x * k.dir.x + v.z * k.dir.z) / L >= Math.cos(half))) { st.prot++; Particles.burst('sparkB', V3(p.x, 1.0, p.z), null, 6, 0.8); return; }
    }
    st.hit++; if (mine) st.miss++;
    Game.hurtPlayer(q, B.dmg, V3(p.x - (p.x - ring.S.x) * 0.05, 0, p.z - (p.z - ring.S.z) * 0.05), false, null, true, 'beat', false, ring.id);
  },
  endBeat() { const b = this.beat; if (b) for (const P of b.pairs) for (const r of P.rings || []) if (r.d) Decals.kill(r.d); this.beat = null; },
  stats() { const S = Duo.stats; return S.bell || (S.bell = { rings: 0, match: 0, block: 0, prot: 0, hit: 0, miss: 0 }); },
  // seconds until the next ring of colour col (or any) reaches point p — bots / tag parry
  eta(p, col) {
    const b = this.beat, B = FEEL.BELL; if (!b || AI.cur !== 'beat') return null;
    let best = null;
    for (const P of b.pairs) for (let k = 0; k < 2; k++) {
      const ring = P.rings && P.rings[k];
      if (ring && !ring.d) continue;
      const S = ring ? ring.S : this.srcOf(P.th + k * Math.PI), r = ring ? ring.r : 0, d = Math.hypot(p.x - S.x, p.z - S.z);
      const e = (P.at - b.t > 0 ? P.at - b.t : 0) + Math.max(0, d - r) / B.speed;
      if (ring && d <= r) continue;
      const c = ring ? this.colAt({ col0: ring.col0, r: d }) : this.colAt({ col0: k ? 'red' : 'blue', r: d });
      if (col && c !== col) continue;
      if (best === null || e < best.e) best = { e, col: c, S };
    }
    return best;
  },
  tagThreat(f) { const e = this.eta(f.ch.pos); return !!e && e.e <= FEEL.TAG_PARRY_LEAD && !this.mine(f, e.col); },   // tag solo: the wave coming is the benched one's colour
  // ---- HUD: a coloured arrow at the screen edge toward each wave's source, from FEEL.BELL.lead s before it starts until it has crossed
  arrowsNow() {
    const b = this.beat, out = []; if (!b || AI.cur !== 'beat') return out;
    for (const P of b.pairs) {
      if (b.t < P.at - FEEL.BELL.lead || (P.rings && P.rings.every(r => !r.d || r.r > FEEL.BELL.src))) continue;
      for (let k = 0; k < 2; k++) out.push({ P, S: this.srcOf(P.th + k * Math.PI), col: P.rings ? this.colAt(P.rings[k]) : (k ? 'red' : 'blue'), pre: b.t < P.at });
    }
    return out;
  },
  drawArrows() {
    const b = this.beat; if (!b || AI.cur !== 'beat') return;
    const W = CFG.BASE_W, H = CFG.BASE_H, blink = Math.floor(clock.t * 8) % 2 === 0;
    for (const { P, S, col } of this.arrowsNow()) {
      {
        const [sx, sy] = toHud(S.x, 0.5, S.z), cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy, L = Math.hypot(dx, dy) || 1;
        const k2 = Math.min((W / 2 - 14) / Math.abs(dx / L || 1e-6), (dy < 0 ? H / 2 - 36 : H / 2 - 46) / Math.abs(dy / L || 1e-6));   // clear of the vitals (top) and the boss bar (bottom)
        const ax = cx + dx / L * k2, ay = cy + dy / L * k2, ang = Math.atan2(-dy, -dx);   // pointing in, toward the arena
        hctx.fillStyle = PAL_HEX[blink && b.t < P.at ? C.HOTW : col === 'blue' ? C.CYAN : C.CRIM2];
        for (let i = 0; i < 7; i++) for (let j = -6 + i; j <= 6 - i; j++) {
          const px = ax + Math.cos(ang) * (i - 3) - Math.sin(ang) * j, py = ay + Math.sin(ang) * (i - 3) + Math.cos(ang) * j;
          hctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        }
        if (b.t < P.at) txtC(String(Math.ceil((P.at - b.t) * 10) / 10), Math.round(ax - Math.cos(ang) * 10), Math.round(ay - Math.sin(ang) * 10) - 2, PAL_HEX[C.BONE1]);
      }
    }
  },
  // ---- the coop bot during a beat: stand on my colour's side (between the middle and its source), parry my colour's front
  botStep(f, bot, inp, toV) {
    if (!this.beat || AI.cur !== 'beat' || AI.state !== 'attack' || !f.onField) return false;
    const me = f.ch.pos, mode = bot.mode;
    if (mode !== 'coop' && mode !== 'tag') return false;
    const other = fighters.find(q => q !== f && q.onField);
    let col = Slots.color(f);
    if (col === 'both') col = other ? (Slots.color(other) === 'blue' ? 'red' : 'blue') : 'blue';
    const e = this.eta(me, col), any = this.eta(me);
    if (any && any.col === col && any.e <= FEEL.BELL.botParryAt && f.state !== 'parry') {
      if (bot.bellPick !== any.S.x + ':' + any.S.z) { bot.bellPick = any.S.x + ':' + any.S.z; bot.bellOK = Math.random() < Companion.bellSkill; }
      if (bot.bellOK) { inp.pressed.add('parry'); return true; }
    }
    if (e) {                                          // where to stand: toward my colour's source, off the line of my partner's
      const k = FEEL.BELL.botStand, t = V3(e.S.x * k, 0, e.S.z * k);
      if (Math.hypot(t.x - me.x, t.z - me.z) > 0.5 && f.state === 'move') { inp.d = toV(t); return true; }
    }
    return f.state === 'move';
  },
};
