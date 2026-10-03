/* =============================================================================
 * 16. BOSS AI — one colossus, 3 phases (70% · 35%). It hunts ONE player at a time (aggro) and alternates
 *     targets in its combo. Patterns: alternating combo (the rally) · grab · slam / sweep · charge (far only)
 *     · nova (neutral) · leap · shot · spiral. A player's starter skill puts it in a status → the partner finishes.
 *     Its back 120° is the soft side (×1.5, the back crystal). Randomness: the seeded Sim RNG only.
 * ========================================================================== */
// crystal spikes erupting under a combo hit (cosmetic, driven by gameplay time)
const Spikes = {
  list: [], geo: null, id: 0,
  add(x, z) {
    if (!this.geo) { this.geo = crystalGeo(0.3, 1.35, 0.2, 6); this.id = newId(); setId(new THREE.Mesh(this.geo), this.id); }
    for (let k = 0; k < 4; k++) {
      const a = k * TAU / 4 + Math.random() * 0.8, r = k ? rnd(0.35, 0.75) : 0, s = k ? rnd(0.55, 0.8) : 1.05;
      const m = mesh(this.geo, boss.coreMat, false);
      m.position.set(x + Math.sin(a) * r, 0, z + Math.cos(a) * r);
      m.rotation.set(k ? rnd(-0.45, 0.45) : 0, rnd(0, TAU), k ? rnd(-0.45, 0.45) : 0);
      m.scale.set(s, 0.01, s); scene.add(m);
      this.list.push({ m, t: -k * 0.02, s });
    }
  },
  clear() { for (const o of this.list) scene.remove(o.m); this.list = []; },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i]; o.t += dt;
      const t = o.t, h = t < 0 ? 0.01 : t < 0.07 ? t / 0.07 : t < 0.3 ? 1 : Math.max(0.01, 1 - (t - 0.3) / 0.25);
      o.m.scale.set(o.s, o.s * h, o.s);
      if (t > 0.56) { scene.remove(o.m); this.list.splice(i, 1); }
    }
  },
};

const AI = {
  hs: 0, lastDmg: 0, atkSeq: 0, hitId: 0, aggro: null, aggroT: 0, grab: null, cmb: null, liftCd: 0,
  reset() {
    this.maxHp = 0;
    this.phase = 1; this.phaseNoteT = 0; this.brk = 0; this.chipWait = 0;
    this.state = 'idle'; this.t = 1.4; this.hist = []; this.cur = null; this.chained = false;
    this.tele = []; this.swingHit = new Set(); this.aim = 0; this.volley = 0;
    this.sinceFloor = 0; this.lastFloor = null; this.curWave = null; this.chainN = 0;
    this.nextPhase = 2; this.hs = 0; this.liftCd = 0; this.grab = null; this.cmb = null; this.grabTarget = null;
    this.stKind = null; this.stAnim = 0; this.pinT = 0; this.deferGroggy = null; this.deferPhase = false;
    this.aggro = null; this.aggroT = 0; this.busyT = 0; this.lastDmg = 0; this.atkSeq = 0; this.hitId = 0; this.etaK = 0;
    boss.glowMul = 1; boss.turnRate = 1.6; boss.play('idle'); boss.rootOn = true; boss.pos.y = 0;
    Spikes.clear(); this.setLook(1);
    this.rescaleHp(true);
    this.pickAggro();
  },
  // boss health: ×(1 + HP_PER_EXTRA) with two on the field · ×SOLO_HP_MUL in tag solo (keeps the current ratio)
  rescaleHp(full = false) {
    const duo = !Game.tagMode && fighters.filter(f => f.active).length > 1;
    const next = FIGHT.BOSS_HP * Rush.hpMul() * (duo ? 1 + FIGHT.HP_PER_EXTRA : Game.tagMode ? FIGHT.SOLO_HP_MUL : 1);
    const k = full || !this.maxHp ? 1 : this.hp / this.maxHp;
    this.maxHp = next; this.hp = this.chip = Math.round(next * k);
  },
  targetable() { return this.state !== 'dead' && this.state !== 'away'; },
  get speed() { return FIGHT.SPEED[this.phase - 1] * Rush.speedMul(); },
  // B. aggro: one target. Swaps when the other deals AGGRO_SWAP_DMG or covers (both after AGGRO_MIN_T); a downed target is dropped at once
  get target() { return this.aggro && this.aggro.alive ? this.aggro : (fighters.find(f => f.alive) || fighters[0]); },
  pickAggro() {
    if (this.aggro && this.aggro.alive) return;
    let best = null, bd = 1e9;
    for (const f of fighters) if (f.alive) { const d = f.ch.pos.distanceTo(boss.pos); if (d < bd) { bd = d; best = f; } }
    if (best) this.setAggro(best, 'auto', true);
  },
  setAggro(f, why, force = false) {
    if (!f || !f.alive || f === this.aggro) return false;
    if (!force && this.aggroT < FEEL.AGGRO_MIN_T) return false;
    const had = !!(this.aggro && this.aggro.alive);
    this.aggro = f; this.aggroT = 0;
    for (const q of fighters) q.aggroDmg = 0;
    if (had && why !== 'auto' && why !== 'tag') { Duo.stats.aggroSwaps++; Game.popup('AGGRO', V3(f.ch.pos.x, 3.05, f.ch.pos.z), C.CRIM2); }
    return true;
  },
  isBack(p) {                                       // the rear 120°: within ±BACK_HALF of straight behind the boss
    const a = Math.atan2(p.x - boss.pos.x, p.z - boss.pos.z);
    return Math.abs(angDiff(a, boss.facing + Math.PI)) <= FEEL.BACK_HALF * Math.PI / 180;
  },
  toPlayer() {
    const t = this.target.ch.pos, dx = t.x - boss.pos.x, dz = t.z - boss.pos.z;
    return { d: Math.hypot(dx, dz), a: Math.atan2(dx, dz) };
  },
  waveOf() { return this.curWave; },
  clearTele() { for (const t of this.tele) Decals.kill(t); this.tele = []; },
  setLook(ph) {                                     // phase looks per boss: horns · crystal wings · (Warden) the kite shield until it shatters
    const L = Rush.boss.look || { horns: 2, wings: 3 };
    boss.att.horns.visible = ph >= L.horns; boss.att.wings.visible = ph >= L.wings;
    boss.att.shield.visible = !!L.shieldUntil && ph <= L.shieldUntil;
    boss.att.shield.scale.setScalar(FEEL.WARDEN.shieldScale);
    if (boss.att.crack1) { boss.att.crack1.visible = ph >= 2; boss.att.crack2.visible = ph >= 3; }   // 2단계 보스 3: the bell cracks at 70 % / 35 %
    Dk.look(ph);                                    // 2단계 보스 4: 3페이즈 = 분노 색
  },
  isRush(n) { return n === 'charge' || n === 'shieldRush'; },   // the Warden's shield charge runs on the charge code
  update(gdt, dt) {
    if (this.chipWait > 0) this.chipWait -= dt; else this.chip = Math.max(this.hp, this.chip - 90 * dt);
    this.exposed = !['idle', 'walk', 'dead', 'away'].includes(this.state);
    boss.glowMul = (this.phase >= 3 ? 1.55 : this.phase === 2 ? 1.3 : 1) * (this.exposed ? 1.25 : 1) * (this.state === 'status' ? 1.6 : 1);
    if (gdt <= 0) return;
    this.aggroT += gdt; this.liftCd = Math.max(0, this.liftCd - gdt);
    if (Game.state === 'play') this.pickAggro();
    const { d, a } = this.toPlayer();
    const hunt = fighters.some(f => f.alive) && Game.state === 'play' && this.state !== 'away';
    if (this.state === 'walk' || this.state === 'attack' || this.state === 'cast') this.busyT = (this.busyT || 0) + gdt;
    switch (this.state) {
      case 'idle':
        boss.turnRate = 3.0 * FIGHT.TEMPO; boss.facingTo = a;
        if (!boss.is('idle')) boss.play('idle');
        this.t -= gdt;
        if (this.t <= 0 && hunt) this.decide(d, false);
        break;
      case 'walk': {                              // chase: runs its target down, then attacks
        boss.turnRate = 4.0 * FIGHT.TEMPO; boss.facingTo = a;
        const v = this.pinT > 0 ? 0 : FIGHT.WALK[this.phase - 1] * FIGHT.TEMPO * gdt;   // pinned: rooted to the spot
        boss.pos.x += Math.sin(boss.facing) * v; boss.pos.z += Math.cos(boss.facing) * v;
        this.t -= gdt;
        if (!hunt) { this.toIdle(1); break; }
        if (d < FIGHT.D_STOP || this.t <= 0) this.decide(d, true);
        break;
      }
      case 'attack': this.updateAttack(a, gdt); break;
      case 'cast': boss.turnRate = 1.2; boss.facingTo = a; Hazards.bossCast(gdt); break;   // floor patterns landing
      case 'transform': {                         // phase change: gathers power, then blasts everyone close (unparryable)
        this.t += gdt; const k = Math.min(1, this.t / FEEL.P2_CHARGE), tl = this.tele[0];
        boss.pos.y = Math.max(0, boss.pos.y - gdt * 8);
        if (tl) { tl.m.position.set(boss.pos.x, 0.022, boss.pos.z); tl.mat.uniforms.uProg.value = k; }
        boss.glowMul = 1.3 + 2.2 * k; boss.facingTo = a; boss.turnRate = 1.5;
        for (let i = 0; i < 2; i++) {
          const an = Math.random() * TAU, r = rnd(1.2, FEEL.P2_BLAST_R + 0.6), x = boss.pos.x + Math.sin(an) * r, z = boss.pos.z + Math.cos(an) * r;
          Particles.spawn(x, 0.15, z, (boss.pos.x - x) * 2.2, rnd(1.5, 3), (boss.pos.z - z) * 2.2, 0.4, 2, Math.random() < 0.5 ? PK.auraR : (this.nextPhase >= 3 ? PK.flame : PK.sparkP));
        }
        if (Math.random() < 0.08 + 0.2 * k) CamRig.shake(1, 0.1);
        if (this.t >= FEEL.P2_CHARGE) this.blast();
        break;
      }
      case 'groggy':
        boss.pos.y = Math.max(0, boss.pos.y - gdt * 8);
        this.t -= gdt;
        if (this.t <= 0) this.toIdle(0.8);
        break;
      case 'status': {                            // A. a starter landed: lifted / kneeling / staggering / turned — the partner's finisher window
        const fin = !!(Duo.st && Duo.st.fin);       // the window holds while a finisher is on its way
        if (!fin) this.t += gdt;
        this.stAnim += gdt;
        const k = this.stKind, S = Rush.scale();
        if (k === 'lift') {                         // floating, glowing
          const u = Math.min(1, this.stAnim / 0.22), H = (Rush.boss.liftH ?? FEEL.LIFT_H) * S;   // (the bell: 0 — its chain swings it up instead)
          boss.pos.y = H * (1 - (1 - u) * (1 - u)) + Math.sin(this.stAnim * 9) * 0.03 * u;
        } else if (k === 'stagger' && this.stAnim < 0.3) {   // reeling back from the thrust
          const v = (0.3 - this.stAnim) * 6 * gdt; boss.pos.x += this.stDir.x * v; boss.pos.z += this.stDir.z * v;
        }
        if (Math.random() < 0.5) Particles.burst(k === 'kneel' ? 'dust' : 'spark', V3(boss.pos.x + rnd(-0.6, 0.6), boss.pos.y + rnd(0.5, 3.5) * S, boss.pos.z + rnd(-0.6, 0.6)), null, 1, 0.6);
        if (this.t >= ((Duo.st && Duo.st.win) || FEEL.LINK_WINDOW) && !fin) this.endStatus(null);   // 1.6: a 청파-powered starter holds it longer
        break;
      }
      case 'recover':                             // out of a status: crash down / get up / reel, then back to idle
        boss.pos.y = Math.max(0, boss.pos.y - gdt * 9);
        if (boss.done) this.toIdle(this.recoverRest || 0.5);
        break;
      case 'holding':                             // D. a player in the crystal fist; the partner has GRAB.hold s to free them
        this.t -= gdt; this.holdVictim();
        boss.facingTo = boss.facing;
        if (this.t <= 0) {
          this.state = 'attack'; this.cur = 'grabSlam'; this.swingHit = new Set(); this.atkSeq++; this.hitId = this.atkSeq;
          boss.play('grabSlam', this.speed); Sfx.play('warn');
        }
        break;
    }
    if (this.pinT > 0) { this.pinT -= gdt; boss.turnRate = 0; boss.facingTo = boss.facing; }   // PIN DOWN: can't turn (or walk) until it wears off
  },
  // pattern choice: weighted (FIGHT.WEIGHTS), each only inside its real reach; never the same three times running
  decide(d, fromWalk) {
    if (Dk.hold()) { this.toIdle(FEEL.DK.holdT); return; }   // 2단계 보스 4: the other dokkaebi is mid-attack → usually wait a beat
    const ph = this.phase - 1, B = Rush.boss;
    const fc = B.floorChance[ph] * (ph === 0 ? FIGHT.P1_FLOOR_MUL : 1);
    if (!fromWalk && this.sinceFloor >= 1 && SR() < fc) {
      const list = B.floors[ph];
      let name = list[Math.floor(SR() * list.length)];
      if (name === this.lastFloor && list.length > 1) name = list[(list.indexOf(name) + 1) % list.length];
      this.startCast(name); return;
    }
    const h = this.hist, pool = (B.pools || FIGHT.POOLS)[ph], W = { ...FIGHT.WEIGHTS, ...(B.weights || {}) }, last = h[h.length - 1];
    const two = Game.tagMode ? !!fighters.find(f => f.active && f.bench && f.state !== 'down') : fighters.filter(f => f.alive).length > 1;   // a forced-alternation pattern needs two
    const ok = n => {
      if (n !== 'walk' && !pool.includes(n)) return false;
      if (n !== 'walk' && h.length >= 2 && last === n && h[h.length - 2] === n) return false;
      switch (n) {
        case 'walk': return !fromWalk && d > FIGHT.D_MID && this.pinT <= 0;
        case 'slam': case 'sweep': return d < FIGHT.D_CLOSE;
        case 'grab': return d < FEEL.GRAB.reach + boss.radius + 0.4 && last !== 'grab';
        case 'charge': return d >= FIGHT.CHARGE_MIN_D && this.pinT <= 0;   // pinned: no travelling moves
        case 'leap': return d >= FIGHT.LEAP_MIN_D && this.pinT <= 0;
        case 'shot': return d >= FIGHT.SHOT.minD;
        case 'combo': case 'spiral': return last !== n;
        case 'shuttle': case 'mark': return two && last !== n && !h.slice(-3).includes(n);
        case 'beat': return two && last !== n && !h.slice(-2).includes(n);   // 2단계 보스 3
        case 'strike': return d < FEEL.BELL.strikeR + 0.8;
        case 'bellSlam': return d < FEEL.BELL.slamR + 1.2;
        case 'dkLink': case 'dkThrow': case 'dkSwap': case 'dkCoin': case 'dkUlt': return Dk.can(n, d, last);   // 2단계 보스 4 합동기
        default: return true;                       // nova
      }
    };
    const cands = Object.keys(W).filter(n => W[n] > 0 && ok(n));
    let pick = d < FIGHT.D_CLOSE ? 'slam' : Dk.on ? 'combo' : 'nova';   // (2단계 도깨비: no shard ring — the fire combo)
    if (cands.length) {
      let sum = 0; for (const n of cands) sum += W[n];
      let r = SR() * sum; pick = cands[cands.length - 1];
      for (const n of cands) { r -= W[n]; if (r <= 0) { pick = n; break; } }
    }
    h.push(pick); if (h.length > 4) h.shift();
    if (pick === 'walk') {                          // run in (walk cycle sped up, capped so it doesn't flicker)
      this.state = 'walk'; this.t = srnd(0.5, 0.9); this.cur = null;
      boss.play('walk', Math.min(2.4, FIGHT.WALK[ph] * FIGHT.TEMPO / (1.4 * Rush.scale()))); return;
    }
    this.start(pick);
  },
  ground() { boss.pos.y = 0; boss.rootOn = true; },
  startTransform(next) {
    if (this.grab) this.release('phase');
    Dk.cut('phase'); Dk.phaseUp(next);              // 2단계 보스 4: its joint attack stops · the other one changes phase too
    if (Dk.st()) { Duo.st = null; this.liftCd = FEEL.LIFT_IMMUNE; }
    this.nextPhase = next; this.clearTele(); this.cmb = null; Hazards.cancelSeq(); Rush.tint(null); Shuttle.clear(); this.deferGroggy = null; this.deferPhase = false;
    this.state = 'transform'; this.cur = 'transform'; this.t = 0; this.brk = 0; this.chainN = 0; boss.rootOn = true;
    boss.play('cast'); boss.turnRate = 1.5;
    this.tele.push(Decals.add(0, { R: FEEL.P2_BLAST_R, x: boss.pos.x, z: boss.pos.z, lock: 1, prog: 0, wave: 3 }));
    const bn = Rush.boss.banners || ['THE CRYSTALS AWAKEN', 'THE COLOSSUS UNBOUND'];
    Game.banner(bn[next - 2], FEEL.P2_CHARGE + 0.4); Mark.clear();
    Sfx.play('p2charge'); CamRig.shake(2, 0.3); Game.stopAll(0.12);
  },
  blast() {                                         // the release: area damage around the boss, then the next phase begins
    const hadShield = boss.att.shield.visible, shp = boss.att.shield.getWorldPosition(V3());
    this.clearTele(); this.phase = this.nextPhase; this.phaseNoteT = 2.5; this.setLook(this.phase);
    if (hadShield && !boss.att.shield.visible) {       // the Warden's shield shatters
      Particles.burst('shard', shp, null, 30, 2.2); Particles.burst('sparkB', shp, null, 30, 2.0); Particles.burst('debris', V3(shp.x, 0.2, shp.z), null, 16, 1.4);
      Game.popup('SHIELD BROKEN', V3(shp.x, 3.6, shp.z), C.CYAN, 2); Sfx.play('weak');
    }
    const c = boss.pos.clone(); c.y = 0;
    Particles.burst('dust', c, null, 46, 3.2); Particles.burst('debris', c, null, 20, 1.6);
    Particles.burst(this.phase >= 3 ? 'flame' : 'sparkP', V3(c.x, 1.2, c.z), null, 44, 2.6); Particles.burst('auraR', V3(c.x, 0.4, c.z), null, 30, 4);
    for (const w of boss.weak) Particles.burst('spark', w.obj.getWorldPosition(V3()), null, 14, 1.4);
    const hd = boss.root.getObjectByName('head').getWorldPosition(V3());
    Particles.burst('shard', hd, null, 16, 1.4);
    Decals.add(3, { R: FEEL.P2_BLAST_R, x: c.x, z: c.z, rot: Math.random() * TAU, life: 8, fadeIn: 0.01, fadeOut: 2 });
    CamRig.shake(5, 0.6); Sfx.play('purple'); Game.edgeFlash = { t: 0.2, col: C.HOTW }; Game.stopAll(0.14);
    for (const f of fighters) if (f.alive && Math.hypot(f.ch.pos.x - c.x, f.ch.pos.z - c.z) < FEEL.P2_BLAST_R + f.ch.radius)
      Game.hurtPlayer(f, FEEL.P2_BLAST_DMG, c, true, null, false, 'blast');
    this.toIdle(0.6);
  },
  // rest before the next move: the base gap ÷ TEMPO, plus (1/TEMPO − 1) × the time just spent walking / attacking / casting
  toIdle(t) {
    this.ground(); this.clearTele(); this.state = 'idle'; this.cur = null; this.cmb = null; this.chained = false;
    this.t = t / FIGHT.TEMPO + Math.min(6, this.busyT || 0) * (1 / FIGHT.TEMPO - 1); this.busyT = 0;
    boss.turnRate = 1.6; boss.play('idle'); Rush.tint(null);
  },
  isMelee(n) { return n === 'slam' || n === 'sweep' || n === 'charge' || n === 'leap' || n === 'bash' || n === 'shieldRush' || n === 'strike'; },
  // seconds until the running melee attack connects (bots use it to time a parry)
  hitEta() {
    if (this.state !== 'attack' || !this.isMelee(this.cur)) return null;
    const S = FIGHT, f = boss.f + boss.acc / ANIM_DT * (boss.speed || 1), A = ANIM_DT / (boss.speed || 1);
    const hitF = this.cur === 'slam' ? S.SLAM.hitF : this.cur === 'sweep' ? S.SWEEP.hitF : this.cur === 'leap' ? S.LEAP.landF : this.cur === 'bash' ? S.BASH.hitF : this.cur === 'strike' ? FEEL.BELL.strikeF : S.CHARGE.rushF0 + 1;
    return (hitF - f) * A;
  },
  hitEtaFor(fi) {                                   // seconds until this melee reaches that player (charge: when the body gets there)
    const e = this.hitEta();
    if (e === null || !this.isRush(this.cur)) return e;
    const Cg = FIGHT.CHARGE, A = ANIM_DT / (boss.speed || 1), D = Math.max(0.3, this.rushL - 0.6);
    const along = (fi.ch.pos.x - this.rushFrom.x) * Math.sin(boss.facing) + (fi.ch.pos.z - this.rushFrom.z) * Math.cos(boss.facing) - boss.radius - fi.ch.radius - 0.25;
    const k = Math.max(0, Math.min(1, along / D)), u = 1 - Math.sqrt(1 - k);
    return e - A + u * (Cg.rushF1 - Cg.rushF0) * A;
  },
  // seconds until the next PARRYABLE boss hit reaches f (combo spike aimed at / under f, or a red melee whose telegraph f stands in)
  etaFor(f) {
    if (this.state !== 'attack' || !this.targetable()) return null;
    if (this.cur === 'combo' && this.cmb) {
      let best = null;
      for (const h of this.cmb.hits) {
        if (h.done) continue;
        const inside = Math.hypot(f.ch.pos.x - h.x, f.ch.pos.z - h.z) < FIGHT.COMBO.r + f.ch.radius;
        if ((!h.locked && h.who === f) || inside) { const e = h.at - this.cmb.t; if (best === null || e < best) { best = e; this.etaK = h.k; } }
      }
      return best;
    }
    if (this.isMelee(this.cur) && this.curWave && Companion.teleAt(f.ch.pos)) return this.hitEtaFor(f);
    return null;
  },
  etaWave() {                                       // 1.6: the colour of the hit etaFor last found (combo spikes carry their own)
    if (this.cur === 'combo' && this.cmb) { const h = this.cmb.hits.find(q => q.k === this.etaK); return h ? h.col : 'red'; }
    return this.curWave;
  },
  threatId(f) { this.etaFor(f); return this.cur === 'combo' ? `${this.atkSeq}:${this.etaK}` : `${this.atkSeq}`; },
  grabEta() {
    if (this.state !== 'attack' || this.cur !== 'grab') return null;
    const fe = boss.f + boss.acc / ANIM_DT * (boss.speed || 1);
    return (FIGHT.GRAB.hitF - fe) * ANIM_DT / (boss.speed || 1);
  },
  startCast(name) {                                 // floor pattern: fist to the sky while the hazards land
    this.state = 'cast'; this.cur = name; this.lastFloor = name; this.sinceFloor = 0; this.chained = false;
    this.clearTele(); boss.play('cast'); Sfx.play('warn'); Hazards.startSeq(name);
  },
  addBreak(n) {                                     // parries / rally: posture damage toward groggy
    if (['groggy', 'dead', 'away', 'transform'].includes(this.state)) return;
    this.brk = Math.min(FIGHT.BREAK_MAX, this.brk + n);
    if (this.brk >= FIGHT.BREAK_MAX && !this.poised()) this.toGroggy('BREAK!');
  },
  // poise: mid-combo the boss can't be broken (the rally has room to reach 5); a full gauge breaks it as the combo ends
  poised() { return this.state === 'attack' && ((FEEL.COMBO_POISE && this.cur === 'combo') || this.cur === 'shuttle' || this.cur === 'mark' || this.cur === 'beat'); },
  // the forced-alternation patterns (shuttle / mark) hold even a perfect rally's groggy until they end
  holdsGroggy() { return this.state === 'attack' && (this.cur === 'shuttle' || this.cur === 'mark' || this.cur === 'beat'); },   // (2단계: + 맥놀이)
  forceGroggy(label = 'COLLAPSE!') {                // perfect rally: instant groggy (or a longer one)
    if (this.state === 'dead' || this.state === 'away' || this.state === 'transform') return;
    this.toGroggy(label);
  },
  toGroggy(label) {                                 // a big moment: global freeze
    const already = this.state === 'groggy';
    if (this.grab) this.release('groggy');
    Dk.cut('groggy');                               // 2단계 보스 4: (Dk.st = the status only if it's this dokkaebi's)
    if (Dk.st() || this.state === 'status') { Duo.st = null; this.liftCd = FEEL.LIFT_IMMUNE; }
    Hazards.cancelSeq(); this.cmb = null; this.brk = 0; this.clearTele(); this.state = 'groggy'; this.cur = null; this.deferGroggy = null; Shuttle.clear(); Mark.clear();
    this.rushing = false; this.airborne = false; boss.rootOn = true;
    this.t = Math.max(already ? this.t : 0, FIGHT.GROGGY_T[this.phase - 1]);
    boss.turnRate = 0; if (!already) boss.play('groggy');
    Game.popup(label, V3(boss.pos.x, boss.pos.y + 3.3 * Rush.scale(), boss.pos.z), label === 'BREAK!' ? C.HOTW : C.HOT, label === 'BREAK!' ? 1 : 2);
    CamRig.shake(3, 0.3); Particles.burst('dust', boss.pos, null, 26, 1.6); Sfx.play('brk');
    Game.stopAll(FEEL.HITSTOP_BREAK);
    if (!already) Duo.stats.groggyN++;
  },
  // ---- A. status: a starter hit while the boss can take one (not groggy / casting / holding / mid shuttle or mark,
  //      LIFT_IMMUNE after each status — shared by all four)
  canStatus() {
    return this.liftCd <= 0 && Game.state === 'play' && ['idle', 'walk', 'attack'].includes(this.state)
      && !['grabSlam', 'release', 'shuttle', 'mark', 'beat', 'dkUlt', 'dkSwap'].includes(this.cur) && !(Dk.on && Duo.st);   // 2단계 보스 4: one status at a time for the pair
  },
  startStatus(kind, by) {
    Dk.cut('status');                               // 2단계 보스 4: a status breaks its joint attack / revive
    this.clearTele(); this.cmb = null; Hazards.cancelSeq(); this.rushing = this.airborne = false; this.chainN = 0;
    this.state = 'status'; this.cur = 'status'; this.stKind = kind; this.t = 0; this.stAnim = 0; boss.rootOn = false; boss.turnRate = 0; Rush.tint(null);
    Duo.st = { kind, by, fin: null, emp: null, win: FEEL.LINK_WINDOW }; Duo.stats.statusN++; Dk.tagSt();   // (2단계: which dokkaebi)   // emp / win: set by the starter (1.6 waves) Duo.stats.lifts++; Duo.stats.status[kind]++;
    const b = boss.pos, S = Rush.scale(), bp = by.ch.pos;
    this.stDir = V3(b.x - bp.x, 0, b.z - bp.z).normalize();
    if (kind === 'lift') {
      boss.play('lifted'); Particles.burst('dust', b, null, 30, 2.2); Particles.burst('spark', V3(b.x, 1.4, b.z), V3(0, 1, 0), 24, 2);
      CamRig.shake(4, 0.3); Sfx.play('lift');
    } else if (kind === 'kneel') {
      boss.play('kneelDown'); Particles.burst('dust', b, null, 34, 2.4); Particles.burst('debris', b, null, 12, 1.2);
      CamRig.shake(4, 0.35); Sfx.play('boom', 0.9);
    } else if (kind === 'stagger') {
      boss.play('staggered'); Particles.burst('spark', V3(b.x, 1.6, b.z), this.stDir, 20, 1.8);
      CamRig.shake(3, 0.25); Sfx.play('lift');
    } else {                                      // turn: spun round to show its back to whoever finishes
      const recv = Game.tagMode ? by : fighters.find(o => o !== by && o.alive) || by, rp = recv.ch.pos;
      boss.play('turned'); boss.turnRate = 16; boss.facingTo = Math.atan2(b.x - rp.x, b.z - rp.z);
      Particles.burst('trail', b, null, 20); CamRig.shake(3, 0.25); Sfx.play('sweep');
    }
    Game.popup(`${STATUS_LABEL[kind]}!`, V3(b.x, 4.7 * S, b.z), C.HOT, 2);
  },
  // the window closed (fin = null) or a finisher landed (fin = its name): react, then back to idle after a rest
  endStatus(fin) {
    if (Dk.stMine()) Duo.st = null; this.liftCd = FEEL.LIFT_IMMUNE;
    if (this.state !== 'status') return;
    const k = this.stKind;
    this.state = 'recover'; this.cur = 'recover'; this.recoverRest = fin ? FEEL.LINK.rest : FEEL.STATUS_REST;
    boss.turnRate = 0; boss.rootOn = true;
    if (k === 'lift') boss.play('liftDrop', fin ? 1.4 : 1.6);
    else if (k === 'kneel') boss.play('liftDrop', fin ? 1.2 : 1.6, 7);   // up from the knee
    else if (fin === 'pinDown') boss.play('reel', 1.2, 4);             // the sword in its back: a stagger in place
    else boss.play('reel', fin ? 1 : 1.4, fin ? 0 : 5);                 // rocked back (a finisher) / regains its footing
  },
  linkHit() { this.endStatus('link'); },
  // ---- D. grab: the fist closes on the aggro target (dodge it) → held GRAB.hold s → slammed. A partner's hit / cover frees them.
  handPos() { return boss.root.getObjectByName('hdR').localToWorld(V3(0, -0.55, 0)); },
  freesGrab(F) {                                    // a hit on the boss's back, or struck from right under the fist
    const h = this.handPos(), p = F.ch.pos;
    return this.isBack(p) || Math.hypot(p.x - h.x, p.z - h.z) <= FEEL.GRAB.handR;
  },
  holdVictim() {
    const g = this.grab; if (!g) return;
    const v = g.v, h = this.handPos();
    v.ch.pos.set(h.x, Math.max(0, h.y - 1.05), h.z);
    v.ch.face(boss.facing + Math.PI);
  },
  tryGrab() {
    if (Game.mode !== 'fight' || this.state !== 'attack' || this.cur !== 'grab') return;
    this.clearTele();
    const v = this.grabTarget;
    if (!v || !v.alive || v.iframes() || v.state === 'link') return;
    const dx = v.ch.pos.x - boss.pos.x, dz = v.ch.pos.z - boss.pos.z, d = Math.hypot(dx, dz);
    if (d - v.ch.radius > FEEL.GRAB.reach + boss.radius || Math.abs(angDiff(Math.atan2(dx, dz), boss.facing)) > FIGHT.GRAB.half + 0.15) return;
    this.seize(v);
  },
  seize(v) {
    this.state = 'holding'; this.cur = 'hold'; this.t = FEEL.GRAB.hold; this.grab = { v };
    v.state = 'grabbed'; v.t = 0; v.pending = null; v.vel.set(0, 0, 0); v.clearBufs();
    v.ch.rootOn = false; v.ch.turnRate = 0; v.ch.play('held');
    boss.play('hold', 1); boss.turnRate = 0;
    Duo.stats.grabs++;
    const p = v.ch.pos;
    Particles.burst('dust', p, null, 12, 1.4); Particles.burst('shard', V3(p.x, 1.2, p.z), null, 8);
    CamRig.shake(3, 0.25); Sfx.play('grab');
    Game.popup('GRABBED', V3(p.x, 3.1, p.z), C.CRIM2, 2);
    this.setAggro(v, 'auto', true);
    this.holdVictim();
  },
  grabSlamHit() {                                   // the slam frame (clip event 'grabSlam')
    const hand = this.handPos(); hand.y = 0;
    Decals.add(3, { R: FIGHT.SLAM.r, x: hand.x, z: hand.z, rot: Math.random() * TAU, life: 6, fadeIn: 0.01, fadeOut: 1.5 });
    Particles.burst('dust', hand, null, 30, 2.2); Particles.burst('debris', hand, null, 14); CamRig.shake(4, 0.4); Sfx.play('slam');
    if (Game.mode !== 'fight' || !this.grab) return;
    const v = this.grab.v, c = Duo.coverFor(v);
    if (c) { Duo.cover(c, v, boss.pos, 'melee', this.hitId); this.release('cover', hand); return; }
    this.grab = null; Duo.stats.grabSlams++;
    v.ch.pos.set(hand.x, 0, hand.z); collide(v.ch);
    v.ch.rootOn = true; v.ch.turnRate = 16; v.state = 'hit';
    Game.hurtPlayer(v, FEEL.GRAB.dmg, boss.pos.clone(), true, null, true, 'melee');
  },
  release(why, at) {
    const g = this.grab; if (!g) return;
    this.grab = null;
    const v = g.v, h = at || this.handPos();
    const fx = Math.sin(boss.facing), fz = Math.cos(boss.facing), r = boss.radius + v.ch.radius + 0.35;
    v.ch.pos.set(boss.pos.x + fx * r, 0, boss.pos.z + fz * r); collide(v.ch);
    if (v.state === 'grabbed') { v.state = 'hit'; v.t = 0; v.invuln = Math.max(v.invuln, 1.0); v.ch.rootOn = true; v.ch.turnRate = 16; v.ch.play('hit'); }
    Duo.stats.grabFrees++;
    Game.popup('FREED', V3(v.ch.pos.x, 2.8, v.ch.pos.z), C.BONE2);
    Particles.burst('spark', h, null, 16, 1.4); Particles.burst('shard', h, null, 8);
    if (why !== 'cover') Sfx.play('cover');
    if (this.state === 'holding' || (this.state === 'attack' && this.cur === 'grabSlam')) {
      this.state = 'attack'; this.cur = 'release'; boss.play('grabRelease', 1); boss.turnRate = 0; boss.rootOn = true;
    }
  },
  start(name) {
    this.state = 'attack'; this.cur = name; this.swingHit = new Set(); this.volley = 0; this.sinceFloor++; this.rushing = false; this.airborne = false;
    this.atkSeq++; this.hitId = this.atkSeq;
    this.clearTele();
    const S = FIGHT;
    this.curWave = Waves.patternWave(name);         // 'red' = parryable · null = neutral
    const wc = Waves.code(this.curWave);
    Rush.tint(this.isMelee(name) && this.curWave ? this.curWave : null);
    if (Bell.owns(name) && Bell.start(name)) return;   // 2단계 보스 3: 맥놀이 · 당목 치기 · 종 내려찍기
    if (Dk.owns(name) && Dk.start(name)) return;     // 2단계 보스 4: 합동기 · 뚝딱
    if (name === 'combo') { this.startCombo(); return; }
    if (name === 'shuttle') { this.shThrown = false; boss.play('orbThrow', this.speed); Sfx.play('warn'); Game.banner('SHUTTLE', 1.0); this.aim = this.toPlayer().a; return; }
    if (name === 'mark') { this.mkOn = false; boss.play('mark', this.speed); Sfx.play('warn'); Game.banner('MARK', 1.0); return; }
    boss.play(name, this.speed);
    if (name === 'grab') {                          // unparryable: a neutral sector in front — dash out of it
      this.grabTarget = this.target;
      this.tele.push(Decals.add(1, { R: FEEL.GRAB.reach + boss.radius, half: FIGHT.GRAB.half, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: 3 }));
    }
    if (name === 'bash') this.tele.push(Decals.add(1, { R: S.BASH.r, half: S.BASH.half, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: wc }));
    if (this.isRush(name)) {                        // lane from the boss toward its target; its length follows until it locks
      boss.rootOn = false; this.rushFrom = boss.pos.clone(); this.rushL = FIGHT.CHARGE.minL; this.rushPrev = boss.pos.clone();
      this.tele.push(Decals.add(2, { L: FIGHT.CHARGE.maxL, W: FIGHT.CHARGE.wid, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: wc }));
    }
    if (name === 'leap') {                          // landing circle follows the target until take-off
      boss.rootOn = false; this.leapFrom = boss.pos.clone(); this.leapTo = this.leapTarget(); this.landed = false;
      this.tele.push(Decals.add(0, { R: FIGHT.LEAP.r, x: this.leapTo.x, z: this.leapTo.z, wave: wc }));
    }
    if (name !== 'shot') Sfx.play('warn');
    if (name === 'slam') { const c = toWorld(boss, SLAM_AT); this.tele.push(Decals.add(0, { R: S.SLAM.r, x: c.x, z: c.z, wave: wc })); }
    if (name === 'sweep') this.tele.push(Decals.add(1, { R: S.SWEEP.r, half: S.SWEEP.half, x: boss.pos.x, z: boss.pos.z, rot: boss.facing, wave: wc }));
    if (name === 'nova') {                          // one short ray per shard: the dark gaps are the safe lines
      this.novaRot = SR() * TAU;
      const n = S.NOVA.n[this.phase - 1];
      for (let i = 0; i < n; i++) this.tele.push(Decals.add(2, { L: S.NOVA.len, W: S.NOVA.wid, x: boss.pos.x, z: boss.pos.z,
        rot: this.novaRot + i * TAU / n, kind: 'ray', wave: wc }));
    }
    if (name === 'spiral') {                        // one ray per arm, turning with the emission
      this.spinA = SR() * TAU; this.spinN = 0;
      const arms = S.SPIRAL.arms[this.phase - 1];
      for (let k = 0; k < arms; k++) this.tele.push(Decals.add(2, { L: S.SPIRAL.R, W: 0.4, x: boss.pos.x, z: boss.pos.z, kind: k, wave: wc }));
    }
    this.aim = this.toPlayer().a;
  },
  // ---- C. alternating combo: N spikes, each aimed at the OTHER player (tag solo: whoever is out) — the rally's heartbeat
  startCombo() {
    const ph = this.phase - 1, Cb = FIGHT.COMBO;
    const gap = Game.tagMode ? Math.max(Cb.gap[ph], Cb.soloGap) : Cb.gap[ph];   // tag solo: room for a tag (TAG_CD) on every beat
    this.cmb = { n: Cb.hits[ph], k: 0, t: 0, gap, sweep: Cb.sweepAfter[ph], hits: [], who: null, arm: 0 };
    boss.play('idle'); boss.rootOn = true;
    Game.popup(`X${Cb.hits[ph]}`, V3(boss.pos.x, 4.5 * Rush.scale(), boss.pos.z), C.CRIM2, 2);
  },
  comboTarget(prev) {
    const alive = fighters.filter(f => f.alive);
    if (!alive.length) return null;
    if (!prev) return this.target;
    return alive.find(f => f !== prev) || alive[0];
  },
  updateCombo(gdt) {
    const c = this.cmb, Cb = FIGHT.COMBO;
    c.t += gdt;
    while (c.k < c.n && c.t >= c.k * c.gap) {        // the next spike's circle appears `lead` s before it lands
      const who = this.comboTarget(c.who); c.who = who;
      const p = who ? who.ch.pos : boss.pos;
      const col = Dk.on ? Dk.col() : Game.tagMode || (who && Slots.color(who) === 'both') ? WAVE_COLORS[c.k % 2] : who ? Slots.color(who) : WAVE_COLORS[1];   // 1.6: each spike in its target's colour (tag solo: alternating) · 2단계 도깨비: its own colour
      const d = Decals.add(0, { R: Cb.r, x: p.x, z: p.z, wave: Waves.code(col) });
      this.tele.push(d);
      c.hits.push({ k: c.k, at: c.k * c.gap + Cb.lead, who, col, x: p.x, z: p.z, d, locked: false, anim: false, done: false, id: this.atkSeq * 16 + c.k });
      c.k++;
    }
    const lead = Math.ceil(Cb.jabF / this.speed - 1e-6) * ANIM_DT;   // the strike clip's impact frame lands exactly on `at`
    let face = null;
    for (const h of c.hits) {
      if (h.done) continue;
      if (!h.locked) {                              // tracks its target until it locks
        let w = h.who;
        if (Game.tagMode || !w || !w.alive) w = fighters.find(f => f.alive) || w;
        h.who = w;
        if (w) { h.x = w.ch.pos.x; h.z = w.ch.pos.z; }
        const r = Math.hypot(h.x, h.z); if (r > 7.1) { h.x *= 7.1 / r; h.z *= 7.1 / r; }
        if (c.t >= h.at - Cb.lock) { h.locked = true; Sfx.play('lock'); }
      }
      h.d.m.position.set(h.x, 0.022, h.z);
      const u = h.d.mat.uniforms; u.uLock.value = h.locked ? 1 : 0; u.uProg.value = h.locked ? Math.min(1, (c.t - (h.at - Cb.lock)) / Cb.lock) : 0;
      if (face === null) face = Math.atan2(h.x - boss.pos.x, h.z - boss.pos.z);
      if (!h.anim && c.t >= h.at - lead) { h.anim = true; boss.play(c.arm++ % 2 ? 'jabL' : 'jabR', this.speed); }
      if (c.t >= h.at) { h.done = true; this.comboStrike(h); }
    }
    if (face !== null) { boss.turnRate = 7; boss.facingTo = face; }
    const lastH = c.hits[c.hits.length - 1];
    if (c.k >= c.n && lastH && lastH.done && c.t >= lastH.at + Cb.recover) {
      this.cmb = null;
      if (this.brk >= FIGHT.BREAK_MAX) { this.toGroggy('BREAK!'); return; }   // poise ends: the stored break lands
      if (c.sweep && fighters.some(f => f.alive)) { this.clearTele(); this.start(Rush.boss.rig === 'bell' ? 'strike' : 'sweep'); this.chained = true; return; }   // (the bell: its striker)
      this.finish();
    }
  },
  comboStrike(h) {
    const Cb = FIGHT.COMBO, c = V3(h.x, 0, h.z);
    Decals.kill(h.d); this.tele = this.tele.filter(t => t !== h.d);
    Decals.add(3, { R: Cb.r + 0.2, x: c.x, z: c.z, rot: Math.random() * TAU, life: 4, fadeIn: 0.01, fadeOut: 1.2 });
    const cracks = Decals.list.filter(d => d.mat.uniforms.uShape.value === 3);
    if (cracks.length > 6) Decals.remove(cracks[0]);
    Spikes.add(c.x, c.z);
    Particles.burst('dust', c, null, 18, 1.8); Particles.burst('debris', c, null, 8, 1.1);
    Particles.burst('shard', V3(c.x, 0.4, c.z), V3(0, 1, 0), 10, 1.3); Particles.burst(h.col === 'blue' ? 'auraB' : 'auraR', V3(c.x, 0.2, c.z), null, 12, 2);
    CamRig.shake(2, 0.15); Sfx.play('stomp'); Sfx.play('burst');
    this.hitId = h.id;
    for (const f of fighters) if (f.alive && Math.hypot(f.ch.pos.x - c.x, f.ch.pos.z - c.z) < Cb.r + f.ch.radius)
      Game.hurtPlayer(f, Cb.dmg * Dk.fireK(), boss.pos.clone(), false, h.col || 'red', false, 'melee', false, h.id);   // (2단계 도깨비불: 70 %부터 강해짐)
  },
  lanes(v = 0) {                                     // shot aim offsets; phase 2+ second volley fills the gaps
    if (this.phase === 1) return [-0.25, 0, 0.25];
    return v === 0 ? [-0.38, -0.19, 0, 0.19, 0.38] : [-0.285, -0.095, 0.095, 0.285];
  },
  aimFrom(org) {                                     // aim through the target, never back under the arm
    const fx = Math.sin(boss.facing), fz = Math.cos(boss.facing);
    const tp = this.target.ch.pos;
    let tx = tp.x, tz = tp.z;
    const ahead = (tx - org.x) * fx + (tz - org.z) * fz;
    if (ahead < 1.5) { tx += fx * (1.5 - ahead); tz += fz * (1.5 - ahead); }
    return Math.atan2(tx - org.x, tz - org.z);
  },
  setTele(t, f, lockF, hitF) {                       // lock cue + fill progress (+ an audible tick on lock)
    const u = t.mat.uniforms;
    if (f >= lockF && !t.locked) {
      t.locked = true; Sfx.play('lock');
      if ((this.isMelee(this.cur) || this.cur === 'grab') && this.tele[0] === t) {   // committed: "!" + the whole body flashes
        const col = this.cur === 'grab' ? C.BONE1 : C.CRIM2;
        Game.popup(this.cur === 'grab' ? 'GRAB' : '!', V3(boss.pos.x, 4.6 * Rush.scale(), boss.pos.z), col, this.cur === 'grab' ? 2 : 3);
        boss.flash(0.12, col);
      }
    }
    u.uLock.value = f >= lockF ? 1 : 0;
    u.uProg.value = Math.min(1, Math.max(0, (f - lockF) / (hitF - lockF)));
  },
  // parryable energy gathers on the striking limb until the attack goes off (neutral patterns: none)
  aura() {
    const f = boss.f, S = FIGHT, cur = this.cur;
    if (!this.curWave) return;
    const n = FEEL.WAVE_AURA, k = this.curWave === 'blue' ? 'auraB' : 'auraR';
    if (cur === 'slam' && f < S.SLAM.hitF) Particles.burst(k, boss.root.getObjectByName('hdR').localToWorld(V3(0, -0.4, 0)), null, n, 1.4);
    else if ((this.isRush(cur) && f < S.CHARGE.rushF1) || (cur === 'leap' && f < S.LEAP.landF) || (cur === 'bash' && f < S.BASH.hitF)) {
      Particles.burst(k, boss.root.getObjectByName('hdR').localToWorld(V3(0, -0.4, 0)), null, n, 1.4);
      if (cur === 'leap') Particles.burst(k, boss.root.getObjectByName('hdL').localToWorld(V3(0, -0.2, 0)), null, 1, 1.2);
    }
    else if (cur === 'sweep' && f < S.SWEEP.hitF + 2) {
      Particles.burst(k, boss.root.getObjectByName('hdR').localToWorld(V3(0, -0.4, 0)), null, n, 1.4);
      Particles.burst(k, boss.root.getObjectByName('weapon').localToWorld(V3(0, Dk.on ? 0.8 : 2.2, 0)), null, 1, 1.2);
    } else if (cur === 'shot' && f < S.SHOT.fireF) Particles.burst(k, boss.weak[0].obj.getWorldPosition(V3()), null, 1, 1.2);
  },
  leapTarget() {                                    // where the leap lands: on the target, inside the arena, within reach
    const tp = this.target.ch.pos, from = boss.pos, L = FIGHT.LEAP;
    let x = tp.x, z = tp.z, dx = x - from.x, dz = z - from.z, d = Math.hypot(dx, dz);
    if (d > L.maxD) { x = from.x + dx / d * L.maxD; z = from.z + dz / d * L.maxD; }
    const r = Math.hypot(x, z); if (r > 6.4) { x *= 6.4 / r; z *= 6.4 / r; }
    return V3(x, 0, z);
  },
  markOn() { if (Game.mode !== 'fight' || this.cur !== 'mark' || this.state !== 'attack') return; this.mkOn = true; Mark.begin(this.target); },
  bashHit(ch) {                                     // the shield slams forward (clip event 'bash'): the sector in front, a shove
    const P = ch.pos, B = FIGHT.BASH;
    Particles.burst('dust', toWorld(ch, V3(0, 0, 1.6 * Rush.scale())), null, 14, 1.6); CamRig.shake(3, 0.25); Sfx.play('slam');
    if (Game.mode !== 'fight') return;
    this.clearTele();
    for (const f of fighters) {
      if (!f.alive || this.swingHit.has(f)) continue;
      const dx = f.ch.pos.x - P.x, dz = f.ch.pos.z - P.z, d = Math.hypot(dx, dz);
      if (d < B.r + f.ch.radius && Math.abs(angDiff(Math.atan2(dx, dz), ch.facing)) < B.half + 0.15) {
        const r = Game.hurtPlayer(f, B.dmg, P, true, this.curWave, false, 'melee');
        if (r) this.swingHit.add(f);
        if (r === true) { f.ch.pos.x += dx / d * B.push; f.ch.pos.z += dz / d * B.push; collide(f.ch); }   // shoved back
      }
    }
  },
  // the throw frame (clip event 'orb'): the orb leaves the crystal fist for the aggro target
  throwOrb(ch) {
    const hand = ch.root.getObjectByName('hdR').localToWorld(V3(0, -0.5, 0));
    Particles.burst('spark', hand, null, 10, 1.2);
    if (Game.mode !== 'fight' || this.cur !== 'shuttle') return;
    // the orb is born in the chest core (the huge arm releases right over a close player's head — too short a flight to read)
    const org = ch.weak[0].obj.getWorldPosition(V3()); Particles.burst('shard', org, null, 10, 1.2);
    this.shThrown = true; Shuttle.launch(org, this.target);
  },
  updateAttack(a, gdt) {
    if (Bell.owns(this.cur)) { Bell.updateAttack(a, gdt); return; }
    if (Dk.owns(this.cur)) { Dk.updateAttack(a, gdt); return; }   // 2단계 보스 4
    if (this.cur === 'combo') { if (this.cmb) this.updateCombo(gdt); else this.finish(); return; }
    if (this.cur === 'mark') {                        // the mark: the sword points, then N strikes the partner must cover
      if (this.mkOn) { if (Mark.active) Mark.update(gdt); else this.finish(); }
      else if (boss.done) this.finish();
      return;
    }
    if (this.cur === 'shuttle') {                    // conducting the orb: faces whoever must take it, open to hits, can't be broken
      const o = Shuttle.o; boss.turnRate = 2.2 * FIGHT.TEMPO;
      if (o) { const q = o.recv.onField ? o.recv.ch.pos : o.p; boss.facingTo = Math.atan2(q.x - boss.pos.x, q.z - boss.pos.z); } else boss.facingTo = a;
      if (this.shThrown && boss.done && !boss.is('cast')) boss.play('cast');
      if (this.shThrown && !o) this.finish();
      else if (!this.shThrown && boss.done) this.finish();   // (the throw never happened)
      return;
    }
    if (this.cur === 'grabSlam') { this.holdVictim(); if (boss.done) this.finish(); return; }
    if (this.cur === 'release') { if (boss.done) this.finish(); return; }
    const f = boss.f, S = FIGHT;
    if (this.cur === 'grab') {
      const G = FIGHT.GRAB, t = this.tele[0];
      if (f < G.lockF) { const tp = this.target.ch.pos; this.grabTarget = this.target; boss.turnRate = 5; boss.facingTo = Math.atan2(tp.x - boss.pos.x, tp.z - boss.pos.z); }
      else { boss.turnRate = 0; boss.facingTo = boss.facing; }
      if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; this.setTele(t, f, G.lockF, G.hitF); }
      if (boss.done) this.finish();
      return;
    }
    this.aura();
    const fe = boss.f + (boss.done ? 0 : boss.acc / ANIM_DT * (boss.speed || 1));   // smooth frame for movement
    if (this.isRush(this.cur)) {
      const Cg = S.CHARGE, t = this.tele[0];
      if (f < Cg.lockF) {                           // aim at the target, lane reaches just past it (inside the arena)
        const tp = this.target.ch.pos, dx = tp.x - boss.pos.x, dz = tp.z - boss.pos.z;
        boss.turnRate = 7; boss.facingTo = Math.atan2(dx, dz);
        let L = Math.max(Cg.minL, Math.min(Cg.maxL, Math.hypot(dx, dz) + 1.0));
        for (let k = 0; k < 12; k++) { const ex = boss.pos.x + Math.sin(boss.facing) * L, ez = boss.pos.z + Math.cos(boss.facing) * L; if (Math.hypot(ex, ez) < 6.9) break; L -= 0.4; }
        this.rushL = Math.max(1.2, L); this.rushFrom.copy(boss.pos); this.rushPrev.copy(boss.pos);
      } else { boss.turnRate = 0; boss.facingTo = boss.facing; }
      if (t) {
        t.m.position.set(this.rushFrom.x, 0.022, this.rushFrom.z); t.m.rotation.y = boss.facing; t.m.scale.z = this.rushL / Cg.maxL;
        this.setTele(t, f, Cg.lockF, Cg.rushF0 + 1);
      }
      if (fe >= Cg.rushF0 && fe <= Cg.rushF1 + 0.5) {
        if (!this.rushing) { this.rushing = true; Sfx.play('sweep'); }
        const u = Math.min(1, (fe - Cg.rushF0) / (Cg.rushF1 - Cg.rushF0)), e = 1 - (1 - u) * (1 - u);
        const D = Math.max(0.3, this.rushL - 0.6);
        boss.pos.x = this.rushFrom.x + Math.sin(boss.facing) * D * e; boss.pos.z = this.rushFrom.z + Math.cos(boss.facing) * D * e;
        Particles.burst('dust', boss.pos, null, 2, 1.2);
        for (const fi of fighters) {                // everyone the body sweeps through (segment test)
          if (!fi.alive || this.swingHit.has(fi)) continue;
          const px = fi.ch.pos.x, pz = fi.ch.pos.z, ax = this.rushPrev.x, az = this.rushPrev.z, bx = boss.pos.x - ax, bz = boss.pos.z - az;
          const l2 = bx * bx + bz * bz || 1e-6, k = Math.max(0, Math.min(1, ((px - ax) * bx + (pz - az) * bz) / l2));
          if (Math.hypot(px - ax - bx * k, pz - az - bz * k) < boss.radius + fi.ch.radius + 0.25)
            if (Game.hurtPlayer(fi, Cg.dmg, boss.pos.clone(), false, this.curWave, false, 'melee')) this.swingHit.add(fi);
        }
        this.rushPrev.copy(boss.pos);
        if (u >= 1 && t) this.clearTele();
      } else if (fe > Cg.rushF1 + 0.5) this.rushing = false;
    } else if (this.cur === 'leap') {
      const L = S.LEAP, t = this.tele[0];
      if (f < L.lockF) {
        this.leapTo = this.leapTarget(); this.leapFrom.copy(boss.pos);
        boss.turnRate = 6; boss.facingTo = Math.atan2(this.leapTo.x - boss.pos.x, this.leapTo.z - boss.pos.z);
      } else { boss.turnRate = 0; boss.facingTo = boss.facing; }
      if (t) { t.m.position.set(this.leapTo.x, 0.022, this.leapTo.z); this.setTele(t, f, L.lockF, L.landF); }
      if (fe >= L.upF && !this.landed) {
        if (!this.airborne) { this.airborne = true; Particles.burst('dust', boss.pos, null, 18, 1.6); Sfx.play('stomp'); }
        const u = Math.min(1, (fe - L.upF) / (L.landF - L.upF));
        boss.pos.x = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * u; boss.pos.z = this.leapFrom.z + (this.leapTo.z - this.leapFrom.z) * u;
        boss.pos.y = L.h * Rush.size() * 4 * u * (1 - u);
        if (u >= 1) {                                // crash down: shockwave on the landing circle
          this.landed = true; this.airborne = false; boss.pos.y = 0;
          const c = this.leapTo;
          Decals.add(3, { R: L.r, x: c.x, z: c.z, rot: Math.random() * TAU, life: 6, fadeIn: 0.01, fadeOut: 1.5 });
          Particles.burst('dust', c, null, 34, 2.4); Particles.burst('debris', c, null, 16);
          Particles.burst('auraR', V3(c.x, 0.2, c.z), null, 24, 3);
          CamRig.shake(4, 0.4); Sfx.play('slam'); this.clearTele();
          for (const fi of fighters) if (fi.alive && Math.hypot(fi.ch.pos.x - c.x, fi.ch.pos.z - c.z) < L.r + fi.ch.radius)
            Game.hurtPlayer(fi, L.dmg, c.clone(), true, this.curWave, false, 'melee');
        }
      }
    }
    const track = f < (this.cur === 'slam' ? S.SLAM.lockF : this.cur === 'sweep' ? S.SWEEP.lockF : this.cur === 'nova' ? S.NOVA.lockF
                     : this.cur === 'bash' ? S.BASH.lockF : this.cur === 'spiral' ? 0 : S.SHOT.lockF);
    if (!this.isRush(this.cur) && this.cur !== 'leap') {
      if (track) { boss.turnRate = 2.6; boss.facingTo = a; } else { boss.turnRate = 0; boss.facingTo = boss.facing; }
    }
    if (this.cur === 'nova') {
      for (const t of this.tele) {
        t.m.position.set(boss.pos.x, 0.022, boss.pos.z);
        if (t.kind === 'ray2') this.setTele(t, f, S.NOVA.fireF, S.NOVA.fireF + 3); else this.setTele(t, f, S.NOVA.lockF, S.NOVA.fireF);
      }
    } else if (this.cur === 'spiral') {
      const arms = S.SPIRAL.arms[this.phase - 1];
      this.tele.forEach((t, i) => {
        t.m.position.set(boss.pos.x, 0.022, boss.pos.z);
        t.m.rotation.y = this.spinA + i * TAU / arms;
        this.setTele(t, f, S.SPIRAL.lockF, S.SPIRAL.fromF);
      });
      if (f >= S.SPIRAL.toF + 1 && this.tele.length) this.clearTele();
    } else if (this.cur === 'slam') {
      const t = this.tele[0];
      if (t) { const c = toWorld(boss, SLAM_AT); t.m.position.set(c.x, 0.022, c.z); this.setTele(t, f, S.SLAM.lockF, S.SLAM.hitF); }
    } else if (this.cur === 'bash') {
      const t = this.tele[0];
      if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; this.setTele(t, f, S.BASH.lockF, S.BASH.hitF); }
    } else if (this.cur === 'sweep') {
      const t = this.tele[0];
      if (t) { t.m.position.set(boss.pos.x, 0.022, boss.pos.z); t.m.rotation.y = boss.facing; this.setTele(t, f, S.SWEEP.lockF, S.SWEEP.hitF); }
      if (f >= S.SWEEP.hitF + 2) this.clearTele();
    } else if (this.cur === 'shot') {
      const two = this.phase >= 2;
      const [tf, lf, ff] = this.volley === 0 ? [S.SHOT.teleF, S.SHOT.lockF, S.SHOT.fireF] : [S.SHOT.tele2F, S.SHOT.tele2F, S.SHOT.fire2F];
      if (f >= tf && f < ff && this.tele.length === 0 && this.volley < (two ? 2 : 1)) {
        const L = this.lanes(this.volley), wc = Waves.code(this.curWave);
        L.forEach(o => this.tele.push(Decals.add(2, { L: S.SHOT.len, W: S.SHOT.wid, x: 0, z: 0, kind: o, fadeIn: 0.06, wave: wc })));
        Sfx.play('warn');
      }
      const org = toWorld(boss, SHOT_AT);           // each lane = the exact ground track of one shard
      if (f < lf && this.volley === 0) this.aim = this.aimFrom(org);
      for (const t of this.tele) {
        t.m.position.set(org.x, 0.022, org.z); t.m.rotation.y = this.aim + t.kind;
        this.setTele(t, f, lf, ff);
      }
    }
    if (boss.done) this.finish();
  },
  // ring of shards from the core (second = the phase-2+ follow-up ring, offset half a step) — neutral: dodge, don't parry
  fireNova(ch, second) {
    const fight = Game.mode === 'fight', ph = fight ? this.phase : 1, N = FIGHT.NOVA;
    const n = N.n[ph - 1], off = (fight ? this.novaRot || 0 : ch.facing) + (second ? 0.5 * TAU / n : 0);
    const dirs = [];
    for (let i = 0; i < n; i++) { const a = off + i * TAU / n; dirs.push(V3(Math.sin(a), 0, Math.cos(a))); }
    Shots.fire(V3(ch.pos.x, 1.0, ch.pos.z), dirs, N.speed[ph - 1], ch.coreMat, fight ? N.dmg : 0,
               { start: 0.55, hitR: N.hitR, life: N.life, waves: fight ? Waves.list(this.curWave, n) : null });
    Particles.burst('spark', V3(ch.pos.x, 1.7 * FEEL.BOSS_SCALE, ch.pos.z), null, 26, 1.4);
    CamRig.shake(2, 0.15); Sfx.play('burst');
    if (fight) {
      this.clearTele();
      if (!second && ph >= 2)                      // rays for the follow-up ring, aimed into the gaps
        for (let i = 0; i < n; i++) this.tele.push(Decals.add(2, { L: N.len, W: N.wid, x: ch.pos.x, z: ch.pos.z,
          rot: off + (i + 0.5) * TAU / n, kind: 'ray2', fadeIn: 0.04, wave: Waves.code(this.curWave) }));
    }
  },
  emitSpiral(ch) {                                   // one emission of the spiral: a shard on every arm
    const fight = Game.mode === 'fight', ph = fight ? this.phase : 1, P = FIGHT.SPIRAL;
    if (!fight && this.spinA === undefined) this.spinA = 0;
    this.spinA += P.step[ph - 1];
    const arms = P.arms[ph - 1], dirs = [];
    for (let k = 0; k < arms; k++) { const a = this.spinA + k * TAU / arms; dirs.push(V3(Math.sin(a), 0, Math.cos(a))); }
    Shots.fire(V3(ch.pos.x, 1.0, ch.pos.z), dirs, P.speed[ph - 1], ch.coreMat, fight ? P.dmg : 0,
               { start: 0.55, hitR: P.hitR, life: P.life, waves: fight ? Waves.list(this.curWave, arms) : null });
    this.spinN = (this.spinN || 0) + 1;
    if (this.spinN % 2 === 0) Sfx.play('emit');
  },
  fireVolley(ch) {                                   // crystal shot: red shards (parryable)
    const hand = ch.root.getObjectByName('hdR'), org = hand.localToWorld(V3(0, -0.4, 0));
    const fight = Game.mode === 'fight';
    const base = fight ? this.aim : ch.facing;
    const tp = this.target.ch.pos;
    const dist = fight ? Math.max(2.5, Math.hypot(tp.x - org.x, tp.z - org.z)) : 6;
    const drop = (1.0 - org.y) / dist;                       // aim down to chest height at the target
    const dirs = (fight ? this.lanes(this.volley) : [-0.28, 0, 0.28]).map(o => V3(Math.sin(base + o), drop, Math.cos(base + o)).normalize());
    Shots.fire(org, dirs, fight ? [9, 11, 12][this.phase - 1] : 9, ch.coreMat, fight ? FIGHT.SHOT.dmg : 0,
               { waves: fight ? Waves.list(this.curWave, dirs.length) : null });
    Particles.burst('spark', org, V3(Math.sin(base), 0, Math.cos(base)), 10);
    Sfx.play('shot');
    this.clearTele(); this.volley++;
  },
  finish() {
    this.clearTele(); this.ground(); this.rushing = false; this.airborne = false; this.cmb = null;
    const ph = this.phase - 1, noChain = ['shot', 'spiral', 'combo', 'grab', 'grabSlam', 'release', 'shuttle', 'mark', 'beat', 'strike', 'bellSlam', 'dkLink', 'dkThrow', 'dkSwap', 'dkCoin', 'dkUlt', 'dkRevive'];
    if (this.deferPhase) { this.deferPhase = false; this.deferGroggy = null; this.startTransform(this.phase + 1); return; }   // a held phase change goes first
    if (this.deferGroggy || (this.brk >= FIGHT.BREAK_MAX && (this.cur === 'shuttle' || this.cur === 'mark' || this.cur === 'beat'))) {   // poise ends: a stored groggy lands now
      const lab = this.deferGroggy || 'BREAK!'; this.deferGroggy = null; this.toGroggy(lab); return;
    }
    if (!Rush.boss.rig && !this.chained && this.chainN < FIGHT.CHAIN_MAX[ph] && !noChain.includes(this.cur) && SR() < FIGHT.CHAIN[ph] && fighters.some(f => f.alive)) {   // (2단계: the bell never chains — its pool is its own)
      const d = this.toPlayer().d, r = SR();
      let next = d < FIGHT.D_CLOSE ? (this.cur === 'slam' ? (r < 0.6 ? 'sweep' : 'nova') : this.cur === 'sweep' ? (r < 0.6 ? 'slam' : 'grab') : (r < 0.5 ? 'slam' : 'sweep'))
               : d >= FIGHT.CHARGE_MIN_D ? 'charge' : (r < 0.5 ? 'nova' : 'combo');
      if (!FIGHT.POOLS[ph].includes(next)) next = d < FIGHT.D_CLOSE ? 'slam' : 'nova';
      this.chainN++; this.hist.push(next); if (this.hist.length > 4) this.hist.shift();
      this.start(next); return;
    }
    this.chainN = 0;
    this.toIdle(srnd(...FIGHT.GAP[ph]) * (Rush.boss.gapMul || 1));   // (2단계: gapMul — the twins rest longer, there are two of them)
  },
  // weak point: only from behind (B), and only while the boss is committed (attacking · casting · groggy · in a status · holding)
  weakFor(from) {
    if (Rush.boss.rig === 'bell') {                 // 2단계 보스 3: no back weak point — the weeping crystal in its mouth, while the bell is lifted / dropped / groggy
      const open = this.state === 'groggy' || (this.state === 'status' && (this.stKind === 'lift' || this.stKind === 'kneel'));
      if (!open) return null;
      const w = boss.weak[0]; w.obj.getWorldPosition(_a); return { w, p: _a.clone() };
    }
    if (['idle', 'walk', 'dead', 'away'].includes(this.state) || !this.isBack(from)) return null;
    const w = boss.weak[2]; w.obj.getWorldPosition(_a);
    return { w, p: _a.clone() };
  },
  // A = the hit's feel (hitstop / kick / fx); F = who hit. Returns the (local) hit-stop this hit deserves.
  hurt(dmg, brk, weak, hitP, dir, A, F) {
    this.lastDmg = 0;
    if (!this.targetable()) return 0;
    const groggy = this.state === 'groggy', fx = A ? A.fx : 1;
    const total = Math.round(dmg * (weak ? FIGHT.WEAK_MUL : 1) * (groggy ? FIGHT.GROGGY_MUL : 1));
    this.hp = Math.max(0, this.hp - total); this.chipWait = 0.6; this.lastDmg = total;
    Dk.onHurt(total, F);                            // 2단계 보스 4: breaks a revive · frees a held one
    const hs = (A ? A.hitstop : 0.08) + (weak ? FEEL.HITSTOP_WEAK_ADD : 0);
    boss.flash();
    boss.shudder(FEEL.SHUDDER_PX + (weak || fx > 1.5 ? 1 : 0), FEEL.SHUDDER_T, Math.sign(-dir.x * CamRig.R.x - dir.z * CamRig.R.z) || 1);
    CamRig.kick(V3(-dir.x, 0, -dir.z), (A ? A.kick : 1) + (weak ? 1 : 0));
    if (weak) {
      Particles.burst('spark', hitP, dir, Math.round(14 * fx), 1.2); Particles.burst('shard', hitP, dir, Math.round(8 * fx));
      Game.popup('WEAK', hitP, C.EMBER); CamRig.shake(2, 0.18); Sfx.play('weak');
    } else {
      Particles.burst('metal', hitP, dir, Math.round(7 * fx)); Particles.burst('spark', hitP, dir, Math.round(4 * fx));
      if (fx > 1.5) CamRig.shake(2, 0.14); Sfx.play('hit', fx > 1.5 ? 1.25 : 1);
    }
    if (F && F !== this.aggro && F.alive) {          // B. the other one's damage piles up → aggro swap
      F.aggroDmg = (F.aggroDmg || 0) + total;
      if (F.aggroDmg >= FEEL.AGGRO_SWAP_DMG) this.setAggro(F, 'dmg');
    }
    if (this.grab && F && F !== this.grab.v && (this.state === 'holding' || this.cur === 'grabSlam') && this.freesGrab(F)) this.release('hit');   // D. partner frees the held one
    if (this.hp <= 0) { this.die(); Game.stopAll(FEEL.HITSTOP_KILL); return 0; }
    if (this.phase < 3 && this.state !== 'transform' && Dk.frac() <= FIGHT.PHASE_AT[this.phase - 1]) {   // (2단계 도깨비: the pair's combined health)
      if (this.holdsGroggy()) this.deferPhase = true;   // shuttle / mark: the boss holds — the phase change waits for the pattern to end
      else { this.startTransform(this.phase + 1); return hs; }
    }
    if (!groggy && this.state !== 'transform') {
      this.brk = Math.min(FIGHT.BREAK_MAX, this.brk + brk);
      if (this.brk >= FIGHT.BREAK_MAX && !this.poised()) this.toGroggy('BREAK!');
    }
    return hs;
  },
  die() {
    if (this.grab) this.release('dead');
    if (Dk.stMine()) Duo.st = null; this.cmb = null; this.pinT = 0; Shuttle.clear(); Mark.clear(); this.deferGroggy = null;
    this.clearTele(); this.ground(); this.state = 'dead'; this.cur = null; boss.turnRate = 0; boss.play('death'); Bell.endBeat();
    for (const w of boss.weak) Particles.burst('shard', w.obj.getWorldPosition(V3()), null, 14, 1.2);
    CamRig.shake(3, 0.5); Sfx.play('kill');
    if (!Dk.onDie()) Rush.onBossDead();             // 2단계 보스 4: one dokkaebi down → the other revives it; both → beaten
  },
};
