class BotInput {                                   // same interface as a human's input source
  constructor() { this.pressed = new Set(); this.holding = new Set(); this.d = null; }
  hit(a) { return this.pressed.has(a); }
  held(a) { return this.holding.has(a); }
  dir() { return this.d; }
  endFrame() { this.pressed.clear(); }
}
const NULL_INP = { hit: () => false, held: () => false, dir: () => null };
class Fighter {
  constructor(idx, ch) {
    this.idx = idx; this.ch = ch; ch.fighter = this;
    this.char = START_CHARS[idx];                     // 2단계: which of the five characters (CHARS) · 1P rapier / 2P greatsword until picked
    this.loadout = CHARS[this.char].def.slice();      // the two equipped skills [U, I] (SKILLS2 names)
    this.vel = V3(); this.active = idx === 0; this.bench = false; this.bot = null;
    this.hp = this.chip = FIGHT.PLAYER_HP; this.state = 'move';
    this.waves = { red: 0, blue: 0 }; this.addons = [];              // (호환용, 듀오 1단계에서는 쓰지 않음)
    this.dashFrom = V3(); this.cd = [0, 0]; this.castKind = null; this.castFired = false; this.castId = 0;   // cd: skill 1 / skill 2 cooldowns
    this.reviveOf = null; this.pending = null; this.bufParry = 0; this.bufS = [0, 0]; this.parried = false; this.parriedAt = 0; this.fin = null;
    this.fizzleT = 0; this.hs = 0; this.fgdt = 0; this.aggroDmg = 0; this.grabbedT = 0; this.tagParry = false; this.enteredAt = -1;
    this.slots = []; this.slotFx = []; this.slotHit = null; this.castEmp = null;   // 1.6 wave slots (FEEL.WAVE)
    this.castN = 0; this.castHitAny = false; this.pull = null; this.coverBoostT = 0;   // 2단계: multi-hit starters · chain pull · shield cover boost
  }
  get inp() {                                     // who drives this fighter right now
    if (Relics.open) return NULL_INP;              // 2단계: the rest screen has the keys (relic cards · loadout)
    if (Game.tagMode) return this.bench ? NULL_INP : Game.tagInput();
    return this.bot ? this.bot.inp : Input.of(this.idx);
  }
  get onField() { return this.active && !this.bench; }
  get alive() { return this.active && !this.bench && this.state !== 'down'; }
  get label() { return Game.tagMode ? ['A', 'B'][this.idx] : `${this.idx + 1}P`; }   // tag solo: characters A / B
  reset(x, z, face) {
    const p = this.ch;
    this.hp = this.chip = FIGHT.PLAYER_HP; this.chipWait = 0;
    this.state = 'move'; this.combo = 0; this.bufAtk = 0; this.bufDodge = 0; this.t = 0; this.invuln = 0; this.swingHit = false;
    this.vel.set(0, 0, 0); this.sinceRoll = 9; this.reviveT = 0;
    this.dashFrom.set(x, 0, z); this.bufParry = 0; this.bufS = [0, 0]; this.parried = false; this.perfect = false;
    this.cd = [0, 0]; this.castKind = null; this.castFired = false; this.fin = null;
    this.reviveOf = null; this.pending = null; this.fizzleT = 0; this.hs = 0; this.fgdt = 0; this.aggroDmg = 0; this.grabbedT = 0;
    this.whiffAt = -99; this.whiffed = false; this.tagParry = false; this.enteredAt = -1; this.backPopT = 0; this.perfect = false;   // nothing carries over between fights
    this.slots = []; this.slotFx = []; this.slotHit = null; this.castEmp = null;
    this.castN = 0; this.castHitAny = false; this.pull = null; this.coverBoostT = 0;
    p.place(x, z, face); p.turnRate = 16; p.rootOn = true; p.rootScale = 1; p.play('idle');
    p.root.visible = this.onField;
  }
  iframes() { return (this.state === 'dodge' && this.t >= FEEL.IFRAME[0] && this.t <= FEEL.IFRAME[1]) || this.invuln > 0 || this.state === 'down' || this.state === 'finish' || this.state === 'grabbed' || this.state === 'juggled'; }   // (2단계 juggled: thrown about by a dokkaebi joint attack)
  atk(n) { return FEEL[CHARS[this.char].combo][n]; }                 // this character's basic swing n (CHARS.combo → FEEL table)
  comboLen() { return Object.keys(FEEL[CHARS[this.char].combo]).length; }   // hits in this character's basic string (greatsword 2 · twin blades 4 · …)
  skillKind(slot) { return this.loadout[slot - 1]; }                   // U = slot 1 · I = slot 2 (equipped skills)
  setChar(id, loadout) { this.char = id; this.loadout = (loadout || CHARS[id].def).slice(); }
  clearBufs() { this.bufAtk = this.bufDodge = this.bufParry = 0; this.bufS[0] = this.bufS[1] = 0; }
  // Input is remembered for BUF_* seconds; while attacking it is held (not aged) until the cancel frame
  // it waits for, so one early press is never lost and never fires twice.
  press(a) { if (a === 'attack') this.bufAtk = FEEL.BUF_ATTACK; else this.bufDodge = FEEL.BUF_DODGE; }
  cancelFrames() {                                // [chain, dodge] frames for the current swing
    const A = this.atk(this.combo), bonus = this.swingHit ? FEEL.HIT_CANCEL_BONUS : 0;
    return [A.chain - bonus, A.dodge - bonus];
  }
  update(gdt, dt) {
    const p = this.ch, inp = Rec.frameInput(this, this.inp);   // one snapshot per frame (recorded / replayed for online prep)
    if (!this.onField || (Game.tagMode && this.enteredAt === Game.frame)) return;   // benched / just tagged in this frame
    if (Game.tagMode && inp.hit('tag')) { if (Game.tagSwap(this)) return; }
    if (inp.hit('attack')) this.press('attack');
    if (inp.hit('dodge')) this.press('dodge');
    if (inp.hit('parry')) this.bufParry = FEEL.PARRY_BUF;
    if (inp.hit('skill1')) { this.bufS[0] = FEEL.BUF_ATTACK; this.bufS[1] = 0; }   // the latest skill press wins
    if (inp.hit('skill2')) { this.bufS[1] = FEEL.BUF_ATTACK; this.bufS[0] = 0; }
    this.fizzleT -= dt; this.flashHud = (this.flashHud || 0) - dt;
    if (this.chipWait > 0) this.chipWait -= dt; else this.chip = Math.max(this.hp, this.chip - 60 * dt);
    if (this.pending) Dk.with(this.pending.dk, () => {   // a parryable hit touched us: the impact freeze is the late-parry window (2단계: on the dokkaebi that hit)
      const H = this.pending;
      // late parry counts only when we are not recovering from a whiffed parry (no mashing through the gap)
      if (this.bufParry > 0 && this.alive && !(this.state === 'parry' && !this.parried)) {
        this.pending = null; this.startParry(null); Duo.stats.late++;
        for (const w of H.waves) Waves.tryAbsorb(this, w, H.src, H.kind, { late: true, hitId: H.hitId, shuttle: H.kind === 'shuttle' });
        if (H.cb) H.cb('absorb');
      } else if ((H.t -= dt) <= 0) {
        this.pending = null; const r = Game.hurtPlayer(this, H.dmg, H.src, H.heavy, null, false, H.kind, true);
        if (H.cb) H.cb(r === true ? 'hurt' : 'miss');
      }
    });
    if (gdt <= 0) return;                         // hit-stop: inputs are buffered, nothing moves
    let holdA = false, holdD = false;
    // the finisher has no follow-up: a press during it is only kept from its recovery on (no surprise re-attack)
    if (this.state === 'attack') { const [c, d] = this.cancelFrames(); holdA = p.f < (this.combo < this.comboLen() ? c : d); holdD = p.f < d; }
    if (!holdA) this.bufAtk -= gdt;
    if (!holdD) this.bufDodge -= gdt;
    this.t += gdt; this.invuln -= gdt; this.sinceRoll += gdt; this.bufS[0] -= gdt; this.bufS[1] -= gdt;
    this.cd[0] = Math.max(0, this.cd[0] - gdt); this.cd[1] = Math.max(0, this.cd[1] - gdt);
    const wdir = inp.dir(), f = p.f;
    const rollOK = this.bufDodge > 0 && this.sinceRoll >= FEEL.DODGE_MIN_GAP;
    this.bufParry -= gdt;
    if (this.state === 'grabbed' || this.state === 'finish' || this.state === 'juggled') return;   // held by the boss / in a finisher / thrown by a dokkaebi (driven by AI / Duo / Dk)
    if (this.bufParry > 0) {                      // parry: from move, or cancelling an attack / dash / flinch / skill
      const canParry = this.state === 'move' || (this.state === 'attack' && (f >= this.cancelFrames()[1] || this.t < FEEL.ATK_EARLY_DODGE * ANIM_DT))
        || (this.state === 'dodge' && f >= FEEL.DODGE_REROLL_F) || (this.state === 'hit' && f >= FEEL.HURT_DODGE_F)
        || (this.state === 'cast' && this.castFired && this.t >= this.castLock()) || (this.state === 'parry' && this.parried && this.t >= this.parriedAt + 0.05)
        || this.state === 'revive';
      if (canParry) { this.startParry(wdir); return; }
    }
    if (this.bufS[0] > 0 || this.bufS[1] > 0) {   // U / I: my starter skill, or a finisher while the partner's starter has the boss in a status
      const canCast = this.state === 'move' || (this.state === 'attack' && f >= this.cancelFrames()[1])
        || (this.state === 'dodge' && f >= FEEL.DODGE_ATTACK_F) || (this.state === 'hit' && f >= FEEL.HURT_DODGE_F)
        || (this.state === 'cast' && this.castFired && this.t >= this.castLock()) || this.state === 'revive'
        || (this.state === 'parry' && this.parried && this.t >= this.parriedAt + 0.05);
      if (canCast) { const slot = this.bufS[0] > 0 ? 1 : 2; this.bufS[0] = this.bufS[1] = 0; if (Duo.skill(this, slot, wdir)) return; }
    }
    const helpee = this.reviveCandidate();
    switch (this.state) {
      case 'move': {
        if (rollOK) { this.startDodge(wdir); break; }
        if (this.bufAtk > 0 && this.bufDodge <= 0) { this.startAttack(1, wdir); break; }
        if (helpee && inp.held('interact')) { this.startRevive(helpee); break; }
        // short accel / decel ramps; facing snaps to the input at once (no 12 fps turn lag)
        const max = FEEL.MOVE_SPEED, v = this.vel;
        const tx = wdir ? wdir.x * max : 0, tz = wdir ? wdir.z * max : 0;
        const rate = max / Math.max(1e-3, wdir ? FEEL.MOVE_ACCEL : FEEL.MOVE_DECEL) * gdt;
        const dx = tx - v.x, dz = tz - v.z, dl = Math.hypot(dx, dz);
        if (dl <= rate) v.set(tx, 0, tz); else v.set(v.x + dx / dl * rate, 0, v.z + dz / dl * rate);
        if (wdir && FEEL.TURN_SNAP) { const a = Math.atan2(wdir.x, wdir.z); if (Math.abs(angDiff(a, p.facing)) > 0.01) { p.face(a); v.set(wdir.x, 0, wdir.z).multiplyScalar(Math.max(Math.hypot(v.x, v.z), max * 0.5)); } }
        else if (wdir) p.facingTo = Math.atan2(wdir.x, wdir.z);
        p.pos.addScaledVector(v, gdt);
        const sp = Math.hypot(v.x, v.z);
        if (wdir) { if (!p.is('run')) p.play('run', FEEL.MOVE_SPEED / FEEL.RUN_STRIDE); }
        else if (sp < max * 0.3 && !p.is('idle')) p.play('idle');
        break;
      }
      case 'attack': {
        const A = this.atk(this.combo), [chainF, dodgeF] = this.cancelFrames();
        if (f < A.strike && wdir) { p.turnRate = FEEL.STEER_RATE; p.facingTo = Math.atan2(wdir.x, wdir.z); }   // slight steering
        // compressed timing: fast wind-up, the strike (+ smear) at normal speed, fast recovery · rally buff speeds it up
        p.speed = (f < A.strike ? A.up : f < A.strike + A.active ? 1 : A.down) * (Duo.buffT > 0 ? FEEL.RALLY_BUFF_SPD : 1);
        const early = this.t < FEEL.ATK_EARLY_DODGE * ANIM_DT;                 // mis-press forgiveness
        if (rollOK && (early || f >= dodgeF)) { this.startDodge(wdir); break; }
        if (this.bufAtk > 0 && this.combo < this.comboLen() && f >= chainF) { this.startAttack(this.combo + 1, wdir); break; }
        if (p.done) this.toMove(wdir);
        break;
      }
      case 'dodge':                               // the dash
        if (f < 2) for (let i = 0; i < FEEL.DASH_TRAIL; i++) Particles.burst('trail', p.pos, null, 1);
        if (f >= FEEL.DODGE_ATTACK_F && this.bufAtk > 0) { this.startAttack(1, wdir); break; }
        if (f >= FEEL.DODGE_REROLL_F && rollOK) { this.startDodge(wdir); break; }
        if ((f >= FEEL.DODGE_MOVE_F && wdir) || p.done) {
          this.invuln = Math.max(this.invuln, FEEL.IFRAME[1] - this.t);   // running out keeps the dash's i-frames
          this.toMove(wdir);
        }
        break;
      case 'hit':
        if (f >= FEEL.HURT_DODGE_F && rollOK) { this.startDodge(wdir); break; }
        if (f >= FEEL.HURT_CONTROL_F || p.done) this.toMove(wdir);
        break;
      case 'parry': {                             // window → (whiff) recovery; a successful parry frees you fast
        if (!this.parried && !this.whiffed && this.t > FEEL.PARRY_WINDOW) { this.whiffed = true; this.whiffAt = Game.t; }   // caught nothing: a whiff
        const end = this.parried ? this.parriedAt + 0.1 : FEEL.PARRY_WINDOW + FEEL.PARRY_RECOVER;
        if (this.t >= end) {
          if (this.parried && this.bufAtk > 0) { this.startAttack(1, wdir); break; }
          if (this.parried && rollOK) { this.startDodge(wdir); break; }
          this.toMove(wdir);
        }
        break;
      }
      case 'cast':                                // a starter skill (or a finisher's tail): locked until just after the strike, then dash / attack cancel it
        if (this.castFired && this.t >= this.castLock()) {
          if (rollOK) { this.startDodge(wdir); break; }
          if (this.bufAtk > 0) { this.startAttack(1, wdir); break; }
        }
        if (p.done) this.toMove(wdir);
        break;
      case 'down': {                              // a partner holding the interact key next to you brings you back
        const helper = fighters.find(o => o !== this && o.alive && o.state === 'revive' && o.reviveOf === this);
        this.reviveT = helper ? this.reviveT + gdt : Math.max(0, this.reviveT - gdt * 0.5);
        if (this.reviveT >= FEEL.REVIVE_T) this.revive();
        break;
      }
      case 'revive': {                            // kneeling over a downed ally while the key is held
        const o = this.reviveOf;
        if (!o || o.state !== 'down' || !inp.held('interact') || o.ch.pos.distanceTo(p.pos) > FEEL.REVIVE_R + 0.3) { this.reviveOf = null; this.toMove(wdir); break; }
        if (rollOK) { this.startDodge(wdir); break; }
        if (this.bufAtk > 0) { this.startAttack(1, wdir); break; }
        p.facingTo = Math.atan2(o.ch.pos.x - p.pos.x, o.ch.pos.z - p.pos.z);
        if (Math.random() < 0.5) {                // warm motes drifting from the hands onto the ally
          const a = Math.random() * TAU, q = o.ch.pos;
          Particles.spawn(q.x + Math.sin(a) * 0.5, 0.15, q.z + Math.cos(a) * 0.5, -Math.sin(a) * 0.4, rnd(0.8, 1.6), -Math.cos(a) * 0.4, rnd(0.4, 0.7), Math.random() < 0.4 ? 2 : 1, PK.heal);
        }
        break;
      }
    }
  }
  reviveCandidate() {                             // a downed ally within reach (the interact key revives them)
    for (const o of fighters) if (o !== this && o.onField && o.state === 'down' && o.ch.pos.distanceTo(this.ch.pos) < FEEL.REVIVE_R) return o;
    return null;
  }
  startRevive(o) {
    const p = this.ch;
    this.state = 'revive'; this.reviveOf = o; this.t = 0; this.vel.set(0, 0, 0); this.bufAtk = 0;
    p.rootOn = true;
    p.face(Math.atan2(o.ch.pos.x - p.pos.x, o.ch.pos.z - p.pos.z)); p.turnRate = 8; p.play('kneel');
  }
  castLock() { const S = FEEL.SKILLS[this.castKind]; return S ? S.lock : this.castKind === 'link' ? FEEL.LINK.lock : this.castKind === 'fin' ? 0.1 : 0.22; }
  toMove(wdir) {
    const p = this.ch;
    this.state = 'move'; p.turnRate = 16; p.rootScale = 1; p.rootOn = true;
    // carry some momentum into the run so leaving a dash/attack never stalls
    if (wdir) { this.vel.set(wdir.x, 0, wdir.z).multiplyScalar(FEEL.MOVE_SPEED * 0.6); p.face(Math.atan2(wdir.x, wdir.z)); p.play('run', FEEL.MOVE_SPEED / FEEL.RUN_STRIDE); }
    else { this.vel.set(0, 0, 0); p.play('idle'); }
  }
  aimAtBoss(wdir, cone = 1.2) {                   // stick direction, snapped onto the boss when roughly toward it
    const p = this.ch, tb = Math.atan2(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z), db = p.pos.distanceTo(boss.pos);
    let aim = wdir ? Math.atan2(wdir.x, wdir.z) : p.facing;
    if (AI.targetable() && db < FEEL.AIM_RANGE + 2 && (!wdir || Math.abs(angDiff(tb, aim)) < cone)) aim = tb;
    p.face(aim);
  }
  startAttack(n, wdir) {
    const p = this.ch;
    this.state = 'attack'; this.combo = n; this.bufAtk = 0; this.swingHit = false; this.t = 0; this.vel.set(0, 0, 0);
    p.rootOn = true;
    const A = this.atk(n);
    let aim = wdir ? Math.atan2(wdir.x, wdir.z) : null;
    const tb = Math.atan2(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z);
    const db = Math.hypot(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z);
    const locked = AI.targetable() && db < FEEL.AIM_RANGE &&
      Math.abs(angDiff(tb, aim === null ? p.facing : aim)) < (aim === null ? FEEL.AIM_CONE_IDLE : FEEL.AIM_CONE_INPUT);
    if (locked) aim = tb;
    if (aim !== null) p.face(p.facing + Math.max(-FEEL.AIM_MAX_SNAP, Math.min(FEEL.AIM_MAX_SNAP, angDiff(aim, p.facing))));
    p.turnRate = FEEL.STEER_RATE;
    p.play(A.clip, A.up, A.start);
    // step magnetism: stretch/shrink the lunge so it ends MAGNET_GAP short of the boss surface
    const clip = p.clip;
    if (locked && clip.root) {
      const nominal = sampleRoot(clip, clip.frames) - sampleRoot(clip, A.start);
      const want = db - boss.radius - p.radius - FEEL.MAGNET_GAP;
      p.rootScale = nominal > 0.05 ? Math.max(nominal * FEEL.MAGNET_MIN, Math.min(nominal * FEEL.MAGNET_MAX, want)) / nominal : 1;
    }
  }
  startParry(wdir) {
    const p = this.ch;
    this.state = 'parry'; this.t = 0; this.bufParry = 0; this.bufAtk = 0; this.bufDodge = 0; this.vel.set(0, 0, 0);
    p.rootOn = true;
    this.parried = false; this.parriedAt = 0; this.perfect = false; this.tagParry = false; this.whiffed = false;
    if (wdir) p.face(Math.atan2(wdir.x, wdir.z));
    p.turnRate = 0; p.play('parry', 1, 0);
    Sfx.play('guard'); Duo.stats.parryPress++;
  }
  startDodge(wdir) {
    const p = this.ch;
    this.state = 'dodge'; this.t = 0; this.bufDodge = 0; this.bufAtk = 0; this.vel.set(0, 0, 0); this.sinceRoll = 0;
    p.rootOn = true; this.dashFrom.copy(p.pos);
    if (wdir) p.face(Math.atan2(wdir.x, wdir.z));
    p.turnRate = 0;
    p.play('dash', 1, 0);
    const c = p.clip; p.rootScale = FEEL.DASH_DIST / (sampleRoot(c, c.frames) || 1);
    Sfx.play('dash');
  }
  // returns true when damage went through
  hurt(dmg, src, force = false) {                 // force: pattern hits that ignore i-frames (sealed safe zones, the grab slam)
    if (!force && this.iframes()) return false;
    const p = this.ch;
    this.hp = Math.max(0, this.hp - dmg); this.chipWait = 0.5; this.vel.set(0, 0, 0); this.flashHud = 0.15;
    p.rootOn = true;
    p.face(Math.atan2(src.x - p.pos.x, src.z - p.pos.z));
    p.turnRate = 0;
    Duo.stats.dmgTaken += dmg;
    if (this.hp <= 0) this.down();
    else { this.state = 'hit'; this.invuln = FEEL.HURT_INVULN; p.play('hit'); }
    return true;
  }
  down() {
    this.pending = null;
    this.state = 'down'; this.reviveT = 0; this.ch.play('death'); this.ch.turnRate = 0;
    Game.popup('DOWN', V3(this.ch.pos.x, 1.6, this.ch.pos.z), C.CRIM2);
    Duo.stats.downs++;
    if (Game.tagMode) Game.autoTag(this);            // tag solo: the benched partner steps in
    Game.checkWipe();
  }
  revive() {
    const p = this.ch;
    this.hp = this.chip = Math.round(FIGHT.PLAYER_HP * FEEL.REVIVE_HP); this.state = 'move'; this.invuln = 1.5; this.reviveT = 0;
    p.play('idle'); p.turnRate = 16; p.rootOn = true;
    Particles.burst('spark', V3(p.pos.x, 0.6, p.pos.z), null, 20, 1.0); Particles.burst('dust', p.pos, null, 12, 1.2);
    Game.popup('REVIVED', V3(p.pos.x, 1.8, p.pos.z), C.BONE2); Sfx.play('revive'); Duo.stats.revives++;
  }
}
