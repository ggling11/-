// ---- 1.5단계 강제 교대 패턴 1: 셔틀 수정구 (보스 1)
//      보스가 어그로 대상에게 수정구를 던짐 → 받을 사람의 색(1P 청회 ◆ / 2P 청동 ■)으로 빛남 → 그 사람이 패리하면 파트너에게 날아감
//      색 잠금: 그 색 캐릭터만 받을 수 있음 (커버 X) → 둘이 반드시 번갈아 받음 · 비행 시간은 거리와 무관하게 고정, 왕복마다 짧아짐
//      N번 받아치면 마지막 타가 보스로 → 스매시(큰 피해 + 그로기) · 놓치면 그 자리에서 폭발(받을 사람 + 주변 피해, 랠리 끊김)
//      태그 솔로: 받아친 수정구가 대기 캐릭터의 그림자 표식까지 갔다가 돌아옴 → 돌아오기 전에 교대해서 받음
const Shuttle = {
  o: null, seq: 0, mats: null, geos: null,
  get active() { return !!this.o; },
  init() {                                        // one material + shape per colour (colour-blind: shape carries it too)
    if (this.mats) return;
    this.mats = [toon({ chr: true, ramp: [C.SLATE2, C.SLATE3, C.CYAN, C.BONE2], emit: [0.3, 0.85, 1.15], pl: 0, bias: 0.12 }),      // 1.6: A 청파
                 toon({ chr: true, ramp: [C.CRIM0, C.CRIM1, C.CRIM2, C.HOT], emit: [1.15, 0.25, 0.2], pl: 0, bias: 0.12 })];        //      B 적파
    this.geos = [new THREE.OctahedronGeometry(0.44, 0), new THREE.BoxGeometry(0.56, 0.56, 0.56)];
    this.ids = [newId(), newId()];
  },
  clear(newFight = false) { if (this.o) this.kill(); if (newFight) this.seq = 0; },   // (ids stay unique within a fight: a groggy / phase change mid-fight must not reuse them)
  kill() {
    const o = this.o; if (!o) return;
    scene.remove(o.m); if (o.ghost) Decals.kill(o.ghost);
    this.o = null;
  },
  setColour(o) {                                  // the orb shows whoever must receive it next
    const k = Slots.k(o.recv);   // 0 blue octahedron · 1 red cube (2단계: by character colour)
    if (o.m) scene.remove(o.m);
    o.m = mesh(this.geos[k], this.mats[k], false); setId(o.m, this.ids[k]); o.m.position.copy(o.p); scene.add(o.m);
  },
  flightT(o) {
    const S = FEEL.SHUTTLE, t = Math.max(S.tMin, S.t0 - S.dec * o.n);
    return Game.tagMode && o.solo ? Math.max(S.soloMin, t) : t;
  },
  // boss throw frame: the orb leaves the crystal fist toward the aggro target
  launch(org, recv) {
    this.init();
    const S = FEEL.SHUTTLE, ph = AI.phase - 1;
    const o = this.o = { recv, p: org.clone(), from: org.clone(), t: 0, n: 0, N: S.n[ph], phase: 'fly', solo: false, id: ++this.seq, spin: 0 };
    o.T = this.flightT(o); o.hitId = 200000 + o.id * 32 + o.n;
    this.setColour(o);
    Duo.stats.shuttle.start++;
    Sfx.play('shot'); Particles.burst('spark', org, null, 12, 1.2);
  },
  // who is standing where the orb lands: duo = the receiver · tag solo = whoever is on the field (may be the wrong colour)
  lander(o) { return Game.tagMode ? fighters.find(f => f.onField) || o.recv : o.recv; },
  aim(o) { const f = this.lander(o), q = f.ch.pos; return V3(q.x, 1.1, q.z); },
  // seconds until the orb lands on f (only when f is the one who must take it) — bots / the timing ring
  etaFor(f) { const o = this.o; return o && o.phase === 'fly' && o.recv === f && f.onField ? Math.max(0, o.T - o.t) : null; },
  // tag solo: the orb is coming for the BENCHED character → tagging in right before it lands is a tag parry
  tagThreat(out) {
    const o = this.o;
    return !!o && Game.tagMode && o.phase === 'fly' && o.recv !== out && o.T - o.t <= FEEL.TAG_PARRY_LEAD && o.T - o.t > -0.05;
  },
  update(gdt) {
    const o = this.o; if (!o || gdt <= 0) return;
    const S = FEEL.SHUTTLE;
    o.t += gdt; o.spin += gdt * 9;
    if (o.m) { o.m.rotation.set(o.spin * 0.7, o.spin, 0); o.m.position.copy(o.p); }
    if (Math.random() < 0.8) Particles.burst(Slots.k(o.recv) ? 'orbB' : 'orbA', o.p, null, 1);
    if (o.phase === 'late') {                      // touching the receiver: the late-parry freeze decides it (Fighter.update → cb)
      if (!o.recv.pending || o.recv.pending.cb !== o.cb) this.missed(o, o.recv);   // left the field / the freeze vanished
      return;
    }
    if (o.phase === 'smash') {                     // the last return: straight into the boss's chest
      const u = Math.min(1, o.t / S.smashT), c = boss.weak[0].obj.getWorldPosition(V3());
      o.p.lerpVectors(o.from, c, u); o.p.y += S.arc * 0.5 * 4 * u * (1 - u);
      if (u >= 1) this.smash(o);
      return;
    }
    const u = Math.min(1, o.t / o.T);
    if (o.solo) {                                  // tag solo: out to the benched character's shadow mark, then back to the field
      const M = o.mark, tgt = this.aim(o);
      if (u < 0.5) { const k = u / 0.5; o.p.lerpVectors(o.from, M, k); o.p.y += S.arc * 4 * k * (1 - k); }
      else { const k = (u - 0.5) / 0.5; o.p.lerpVectors(M, tgt, k); o.p.y += S.arc * 4 * k * (1 - k); }
    } else { const tgt = this.aim(o); o.p.lerpVectors(o.from, tgt, u); o.p.y += S.arc * 4 * u * (1 - u); }
    if (u >= 1) this.land(o);
  },
  land(o) {
    const f = this.lander(o), S = FEEL.SHUTTLE;
    if (f !== o.recv || !f.alive) { this.missed(o, f); return; }   // the wrong colour can't take it (colour lock) / nobody there
    const src = o.from.clone();
    o.cb = res => { if (this.o !== o) return; if (res === 'absorb') this.returned(o); else this.missed(o, o.recv, res === 'hurt'); };
    const r = Game.hurtPlayer(f, S.missDmg, src, true, 'shuttle', false, 'shuttle', false, o.hitId, { cb: o.cb });
    if (r === 'absorb') this.returned(o);
    else if (r === 'pending') o.phase = 'late';
    else this.missed(o, f, r === true);
  },
  returned(o) {
    const S = FEEL.SHUTTLE, f = o.recv;
    Duo.stats.shuttle.returns++;
    o.n++; o.from = o.p.clone(); o.t = 0;
    Particles.burst(Slots.k(f) ? 'orbB' : 'orbA', o.p, null, 14, 1.4);
    if (o.n >= o.N) { o.phase = 'smash'; Sfx.play('link'); Game.popup('SMASH', V3(o.p.x, 3.0, o.p.z), C.HOT, 2); return; }
    const next = Game.tagMode ? fighters.find(q => q !== f && q.active) : fighters.find(q => q !== f && q.alive);
    if (!next || next.state === 'down') { this.missed(o, f); return; }
    o.recv = next; o.phase = 'fly'; o.hitId = 200000 + o.id * 32 + o.n;
    o.solo = Game.tagMode;
    if (o.solo) {                                 // the benched character's shadow: across the boss from the field, inside the arena
      const d = V3(boss.pos.x - f.ch.pos.x, 0, boss.pos.z - f.ch.pos.z).normalize(), R = boss.radius + S.markD;
      let mx = boss.pos.x + d.x * R, mz = boss.pos.z + d.z * R; const rr = Math.hypot(mx, mz); if (rr > 6.4) { mx *= 6.4 / rr; mz *= 6.4 / rr; }
      o.mark = V3(mx, 1.1, mz);
      if (o.ghost) Decals.kill(o.ghost);
      o.ghost = Decals.add(0, { R: 0.7, x: mx, z: mz, ally: 1, wave: Slots.k(next) ? 0 : 1, life: 1e9, fadeIn: 0.08 });
    }
    o.T = this.flightT(o);
    this.setColour(o);
  },
  smash(o) {
    const S = FEEL.SHUTTLE, f = o.recv, c = boss.weak[0].obj.getWorldPosition(V3());
    this.kill(); Duo.stats.shuttle.smash++;
    Particles.burst('shard', c, null, 24, 2.0); Particles.burst('spark', c, null, 36, 2.4); Particles.burst(Slots.k(f) ? 'orbB' : 'orbA', c, null, 30, 2.4);
    CamRig.shake(5, 0.5); Game.edgeFlash = { t: 0.18, col: C.HOTW }; Sfx.play('fullRally');
    if (AI.targetable()) {
      const n = V3(c.x - f.ch.pos.x, 0, c.z - f.ch.pos.z).normalize();
      Duo.hitBoss(f, S.smashDmg, 0, f.ch.pos, n, { hitstop: S.smashStop, kick: 4, fx: 3 }, { hitP: c, global: true, weak: false });
      if (AI.targetable() && AI.state !== 'transform') AI.deferGroggy = 'SMASH!';   // lands as the pattern ends (right now)
    }
  },
  missed(o, f, hurt = false) {                     // the orb hits the floor: blast on the spot, splash on anyone near, the rally drops
    const S = FEEL.SHUTTLE, p = V3(o.p.x, 0, o.p.z);
    this.kill(); Duo.stats.shuttle.fail++;
    Decals.add(3, { R: S.splashR, x: p.x, z: p.z, rot: Math.random() * TAU, life: 4, fadeIn: 0.01, fadeOut: 1.2 });
    Particles.burst('shard', V3(p.x, 0.6, p.z), null, 16, 1.4); Particles.burst('dust', p, null, 20, 1.8); Particles.burst(Slots.k(o.recv) ? 'orbB' : 'orbA', V3(p.x, 0.6, p.z), null, 20, 1.8);
    CamRig.shake(4, 0.35); Sfx.play('slam'); Game.popup('DROPPED', V3(p.x, 2.8, p.z), C.STONE2, 2);
    if (f && f.alive && !hurt) Game.hurtPlayer(f, S.missDmg, p, true, null, false, 'blast');
    for (const q of fighters) if (q !== f && q.alive && q.ch.pos.distanceTo(p) < S.splashR + q.ch.radius) Game.hurtPlayer(q, S.splashDmg, p, false, null, false, 'blast');
    if (f) Duo.onMiss(f, true);
  },
};
// the timing ring / HUD for the orb: arrow orb → receiver, the receiver's shape over both, the count
function drawShuttleHud() {
  const o = Shuttle.o; if (!o) return;
  const col = PAL_HEX[Slots.col(WAVE_COLORS[Slots.k(o.recv)])], blink = Math.floor(clock.t * 10) % 2 === 0;
  const glyph = (x, y, k, fill) => { if (k) { hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(x - 4, y - 4, 9, 9); hctx.fillStyle = fill; hctx.fillRect(x - 3, y - 3, 7, 7); }
                                     else { diamond(x, y, 5, null, C.VOID); diamond(x, y, 4, C.CYAN, C.BONE2); } };
  const [ox, oy] = toHud(o.p.x, o.p.y, o.p.z);
  if (o.phase !== 'smash') {
    const R = Game.tagMode ? fighters.find(f => f.onField) : o.recv;
    const [rx, ry] = toHud(R.ch.pos.x, R.ch.pos.y + 2.4, R.ch.pos.z);
    const n = Math.max(1, Math.round(Math.hypot(rx - ox, ry - oy) / 3)), ph = Math.floor(clock.t * 12) % 2;
    hctx.fillStyle = col;
    for (let i = ph; i < n; i += 2) hctx.fillRect(Math.round(ox + (rx - ox) * i / n), Math.round(oy + (ry - oy) * i / n), 1, 1);
    if (!Game.tagMode || R === o.recv) glyph(Math.round(rx), Math.round(ry) - 6, Slots.k(o.recv), col);
    else txtC(`${keyNames(R).tag} TAG`, Math.round(rx), Math.round(ry) - 10, PAL_HEX[blink ? C.HOTW : Slots.col(WAVE_COLORS[Slots.k(o.recv)])]);
    if (o.solo && o.mark) { const [mx, my] = toHud(o.mark.x, 1.6, o.mark.z); glyph(Math.round(mx), Math.round(my), Slots.k(o.recv), col); }
  }
  glyph(Math.round(ox), Math.round(oy) - 9, Slots.k(o.recv), col);
  txtC(`${o.n} / ${o.N}`, Math.round(ox), Math.round(oy) - 20, PAL_HEX[C.BONE2]);
  txtC(`SHUTTLE ${o.n} / ${o.N}`, CFG.BASE_W / 2, 32, PAL_HEX[o.n >= o.N - 1 ? C.HOT : C.BONE1]);
}
