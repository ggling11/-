/* =============================================================================
 * 17. GAME — mode switch, tag solo ⇄ duo, the one hit-resolution function, animation events, restart
 *     + online prep: per-frame input snapshots (record / replay) and a state hash
 * ========================================================================== */
const Rec = {
  mode: null, frames: null, frame: 0, cur: null,
  get playing() { return this.mode === 'play'; },
  start(mode, frames) { this.mode = mode; this.frames = mode === 'play' ? frames : []; this.frame = 0; this.cur = null; },
  stop() { const f = this.frames; this.mode = null; this.frames = null; this.cur = null; return f; },
  beginFrame() {
    if (this.mode === 'rec') { this.cur = {}; this.frames.push(this.cur); }
    else if (this.mode === 'play') this.cur = this.frames[this.frame] || {};
    else this.cur = null;
    this.frame++;
  },
  // what this fighter's input source says this frame, frozen (pressed actions · held interact · world direction)
  frameInput(f, src) {
    if (this.mode === 'play') { const s = this.cur && this.cur[f.idx]; return s ? this.wrap(s) : NULL_INP; }
    const h = []; for (const a of ACTS) if (src.hit(a)) h.push(a);
    const d = src.dir(), s = { h, i: src.held('interact') ? 1 : 0, d: d ? [d.x, d.z] : null };
    if (this.mode === 'rec' && this.cur) this.cur[f.idx] = s;
    return this.wrap(s);
  },
  wrap(s) { return { hit: a => s.h.includes(a), held: a => a === 'interact' && !!s.i, dir: () => (s.d ? V3(s.d[0], 0, s.d[1]) : null) }; },
};
function stateHash() {                           // everything that decides the fight, as one string + FNV-1a hash
  const n = v => (typeof v === 'number' ? v.toFixed(5) : String(v));
  const parts = [Game.frame, Game.state, Sim.a, AI.hp, AI.state, AI.phase, AI.brk, boss.pos.x, boss.pos.z, boss.facing, Duo.rally,
                 ...fighters.flatMap(f => [f.hp, f.state, f.bench, f.ch.pos.x, f.ch.pos.z, f.slots.length]), ...Dk.hash()];   // (2단계: both dokkaebi)
  const s = parts.map(n).join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { hash: (h >>> 0).toString(16).padStart(8, '0'), state: s };
}

const Game = {
  mode: 'fight', state: 'play', t: 0, endT: 0, hitstop: 0, popups: [], noteT: 0, noteText: '', winTime: 0,
  slowT: 0, edgeFlash: null, bannerT: 0, bannerText: '', seed: 1, frame: 0, rHold: 0,
  tagMode: true, tagCd: 0, tagBot: null,
  note(s) { this.noteText = s; this.noteT = 1.2; },
  banner(s, t = 1.5) { this.bannerText = s; this.bannerT = t; },
  popup(text, p, col, sc = 1) {
    const q = p.clone();
    if (q.y > 1.6 && q.y < 2.65) q.y = 2.65;
    this.popups.push({ text, p: q, col, t: 0, sc });
  },
  get active() { return fighters.filter(f => f.onField); },
  reset() {
    Sim.reseed(this.seed);
    Shots.clear(); Decals.clear(); Particles.clear(); Hazards.clear(); Spikes.clear(); Duo.reset(); Shuttle.clear(true); Mark.clear(); Mark.seq = 0; Stage.reset(); SkillFx.clear(); Relics.reset(); Bell.endBeat();
    this.slowT = 0; this.edgeFlash = null; this.bannerT = 0; this.popups = []; this.hitstop = 0; this.state = 'play'; this.endT = 0;
    this.t = 0; this.tagCd = 0; this.frame = 0;
    Rush.reset();
    const [px, pz] = FIGHT.START_P, [bx, bz] = FIGHT.START_B;
    fighters[1].active = true; fighters[0].bench = false; fighters[1].bench = this.tagMode;
    fighters.forEach((f, i) => {
      const x = px + (i && !this.tagMode ? 1.2 : 0), z = pz + (i && !this.tagMode ? -0.6 : 0);
      f.reset(x, z, Math.atan2(bx - x, bz - z)); f.hs = 0; f.fgdt = 0;
    });
    Rigs.sync();                                   // 2단계: rigs no fighter uses stay hidden
    boss.place(bx, bz, Math.atan2(px - bx, pz - bz)); boss.root.visible = true;
    AI.reset(); Dk.reset();                        // 2단계 보스 4: the second dokkaebi's own AI state
    CamRig.target.copy(this.focus()); CamRig.apply();
  },
  // ---- tag solo (no partner): one person owns both characters; only one is on the field
  tagInput() { return this.tagBot ? this.tagBot.inp : Input.of(0); },
  botFor(f) { return this.tagMode ? this.tagBot : f.bot; },
  tagThreat(f) {                                 // a parryable hit lands on this spot within TAG_PARRY_LEAD
    const e = Dk.minEta(f), s = Companion.shardEta(f, true), L = FEEL.TAG_PARRY_LEAD;   // (2단계: either dokkaebi · their joint blows)
    return (e !== null && e <= L && e > -0.05) || (s !== null && s <= L) || Shuttle.tagThreat(f) || Bell.tagThreat(f);
  },
  // o.finish = skill slot: the starter's U / I during its own status → the benched character comes in with that finisher (no tag cooldown)
  tagSwap(out, o = {}) {
    if (!this.tagMode || (this.tagCd > 0 && !o.finish) || this.state !== 'play' || this.mode !== 'fight') return false;
    const inc = fighters.find(q => q !== out && q.active && q.bench && q.state !== 'down');
    if (!inc) return false;
    const grabbed = out.state === 'grabbed', pend = out.pending;
    const markCover = !grabbed && !o.finish && Mark.tagThreat(out);   // the marked one tags out right before the hit → the incoming covers
    const threat = !grabbed && !o.finish && (!!pend || this.tagThreat(out) || markCover);
    const p = out.ch.pos, face = out.ch.facing;
    let x = p.x, z = p.z;
    if (grabbed) { const r = boss.radius + 0.9; x = boss.pos.x + Math.sin(boss.facing) * r; z = boss.pos.z + Math.cos(boss.facing) * r; }
    // the outgoing one leaves the field
    Duo.fins = Duo.fins.filter(L => L.f !== out);
    out.pending = null; out.bench = true; out.ch.root.visible = false; out.ch.pos.y = 0; out.fin = null;
    out.state = 'move'; out.vel.set(0, 0, 0); out.clearBufs(); out.ch.rootOn = true; out.ch.play('idle');
    // the incoming one takes its place
    inc.bench = false; inc.ch.root.visible = true;
    inc.ch.place(x, z, face); inc.state = 'move'; inc.t = 0; inc.vel.set(0, 0, 0); inc.pending = null; inc.tagParry = false;
    inc.clearBufs(); inc.ch.rootOn = true; inc.ch.turnRate = 16; inc.ch.rootScale = 1; inc.ch.play('idle');
    inc.enteredAt = this.frame;
    this.tagCd = FEEL.TAG_CD; Duo.stats.tags++;
    Dk.each(() => AI.setAggro(inc, 'tag', true));
    Particles.burst('spark', V3(x, 1.0, z), null, 14, 1.2); Particles.burst('trail', V3(x, 0, z), null, 10);
    Sfx.play('tag');
    if (grabbed) {                               // tag rescue: the incoming one strikes the fist (counts as a cover)
      AI.release('tag');
      inc.ch.face(Math.atan2(boss.pos.x - x, boss.pos.z - z)); inc.startAttack(2, null);
      Duo.cover(inc, out, boss.pos, 'melee', undefined, true); Duo.stats.tagRescue++;
    } else if (o.finish) {                       // tag finisher: the incoming one goes straight into the finisher
      Duo.startFinish(inc, o.finish); Duo.stats.tagLink++; Duo.stats.tagFin++;
    } else if (threat) {                         // tag parry: the incoming one parries automatically
      Duo.stats.tagParryTry++;
      inc.startParry(null); inc.tagParry = true;
      if (markCover) Mark.tagCover(out, inc);
      if (pend && pend.kind !== 'shuttle') for (const w of pend.waves) Waves.tryAbsorb(inc, w, pend.src, pend.kind, { late: true, hitId: pend.hitId });   // (the orb is colour-locked)
    } else Game.popup('TAG', V3(x, 2.8, z), PCOL[inc.idx]);
    return true;
  },
  autoTag(down) {                                // the one on the field went down: the benched one steps in
    if (!this.tagMode) return;
    const inc = fighters.find(o => o !== down && o.active && o.bench && o.state !== 'down');
    if (!inc) return;
    this.tagCd = 0; const ok = this.tagSwap(down);
    if (ok) { inc.invuln = Math.max(inc.invuln, 1.5); down.state = 'down'; }
  },
  setTag(on) { if (on) this.leave(1); else this.join(1, true); },
  // 2P drop-in (a human pressing a 2P key, or the AI partner with F3): tag solo → duo
  join(i, bot, mode = 'coop') {
    const f = fighters[i];
    if (!this.tagMode) { if (!bot && f.bot) { f.bot = null; this.note('2P TAKES OVER'); if (Input.split()) this.banner('1P G H T Y   2P L K O I', 3); } return; }
    const lead = fighters.find(o => o.onField) || fighters[0], other = fighters.find(o => o !== lead);
    this.tagMode = false; this.tagBot = null;
    for (const o of fighters) o.active = true;
    other.bench = false; other.ch.root.visible = true;
    const a = lead.ch.facing + Math.PI / 2;
    other.ch.place(lead.ch.pos.x + Math.sin(a) * 1.2, lead.ch.pos.z + Math.cos(a) * 1.2, lead.ch.facing);
    if (other.state === 'down') other.revive(); else { other.state = 'move'; other.ch.play('idle'); }
    other.invuln = 1.0; other.pending = null;
    fighters[1].bot = bot ? { inp: new BotInput(), mode } : null;
    if (!bot) Input.pressed2.clear();             // the join press doesn't also swing
    Particles.burst('spark', V3(other.ch.pos.x, 0.8, other.ch.pos.z), null, 16, 1.0);
    Dk.each(() => AI.rescaleHp()); Sfx.play('join');
    this.note(bot ? '2P AI PARTNER' : '2P JOINED');
    if (!bot && Input.split()) this.banner('1P G H T Y   2P L K O I', 3);   // 1.6 한 키보드 2인: 1P 키가 두 칸 왼쪽으로
  },
  leave() {                                      // back to tag solo: 1P owns both
    if (this.tagMode) return;
    const f2 = fighters[1];
    this.tagMode = true; f2.bot = null; fighters[0].bot = null;
    const out = fighters[0].state === 'down' && f2.state !== 'down' ? fighters[0] : f2;
    Dk.each(() => { if (AI.grab && AI.grab.v === out) AI.release('leave'); });
    Duo.fins = Duo.fins.filter(L => L.f !== out);
    out.bench = true; out.ch.root.visible = false; out.pending = null; out.ch.pos.y = 0;
    if (out.state !== 'down') { out.state = 'move'; out.ch.play('idle'); }
    Dk.each(() => { AI.rescaleHp(); AI.aggro = null; AI.pickAggro(); }); this.note('TAG SOLO');
  },
  checkWipe() { if (this.state === 'play' && !fighters.some(f => f.active && f.state !== 'down')) this.lose(); },
  toggleMode() {
    if (this.mode === 'fight') {
      this.mode = 'showcase';
      Shots.clear(); Decals.clear(); Hazards.clear(); Spikes.clear(); AI.clearTele(); this.popups = []; boss.pos.y = 0;
      player.turnRate = player.baseTurn; boss.turnRate = boss.baseTurn; player.rootOn = true; player.pos.y = 0;
      player.flashT = boss.flashT = 0; boss.glowMul = 1; this.hitstop = 0;
      Dk.use(false); Bell.use(false);                // (the showcase is the golem's)
      for (const g of Rigs.list) g.root.visible = false;   // 2단계: every character rig off the stand, then the showcase pair
      player.root.visible = true; boss.root.visible = true; CamRig.zp = null; CamRig.zoom = 1;   // (the select screen zooms in)
      const [px, pz] = CFG.PLAYER_START, [bx, bz] = CFG.BOSS_START;
      player.place(px, pz, Math.atan2(bx - px, bz - pz)); boss.place(bx, bz, Math.atan2(px - bx, pz - bz));
      Show.idx = [0, 0, 0]; Show.sel = 0; Show.restart = true;
    } else { this.mode = 'fight'; if (Select.on) Select.open(); else this.reset(); }   // 2단계: back to the select screen if we came from it
  },
  // Camera framing: centre on every player on the field (feet→head) and the boss (base→crown), players kept clear of the HUD
  focus() {
    if (this.mode === 'showcase') { const f = Show.cur; return V3(f.pos.x, f.focus, f.pos.z); }
    const R = CamRig.R, U = CamRig.U, px = 1 / CFG.PPU;
    const HW = CFG.BASE_W / 2 * px, HH = CFG.BASE_H / 2 * px;
    const act = this.active.length ? this.active : [fighters[0]];
    let pr0 = 1e9, pr1 = -1e9, pu0 = 1e9, pu1 = -1e9;
    for (const f of act) {
      const r = f.ch.pos.dot(R), u = f.ch.pos.dot(U);
      pr0 = Math.min(pr0, r - 0.6); pr1 = Math.max(pr1, r + 0.6); pu0 = Math.min(pu0, u - 0.4); pu1 = Math.max(pu1, u + 2.0 * U.y);
    }
    const crown = (AI.state === 'dead' ? 2.2 : 5.4) * Rush.scale();
    const E = Dk.extent(R, U, crown);              // 2단계: the boss's span (the twin dokkaebi: both of them)
    const axis = (lo, hi, plo, phi, half, mlo, mhi, qlo, qhi) => {
      const c = (lo + hi) / 2 - ((mlo - mhi) / 2);
      const cMin = phi - half + qhi, cMax = plo + half - qlo;
      return cMin > cMax ? (cMin + cMax) / 2 : Math.max(cMin, Math.min(cMax, c));
    };
    const bossIn = boss.root.visible;
    const cx = axis(Math.min(pr0, bossIn ? E.r0 : pr0), Math.max(pr1, bossIn ? E.r1 : pr1), pr0, pr1, HW, 12 * px, 12 * px, 70 * px, 70 * px);
    const cy = axis(Math.min(pu0, bossIn ? E.u0 : pu0), Math.max(pu1, bossIn ? E.u1 : pu1), pu0, pu1, HH, 20 * px, 30 * px, 44 * px, 40 * px);
    return V3().addScaledVector(R, cx).addScaledVector(U, cy);
  },
  // hit-stop: a regular hit freezes only who was involved (the hitter / the hit one + the boss) when two are on the field.
  // Big moments (groggy, link, perfect rally, phase change, kill) use stopAll = the whole world.
  stop(t, who) {
    const two = !this.tagMode && fighters.filter(f => f.onField).length > 1;
    if (!FEEL.LOCAL_HITSTOP || !two) { this.hitstop = Math.max(this.hitstop, t); return; }
    for (const w of who) {
      if (w === 'boss') { if (AI.state !== 'attack') AI.hs = Math.max(AI.hs, t * FEEL.LOCAL_BOSS_STOP); }   // never mid-attack: its timing stays readable for parries
      else if (w) w.hs = Math.max(w.hs || 0, t);
    }
  },
  stopAll(t) { this.hitstop = Math.max(this.hitstop, t); },
  // THE hit-resolution function: every boss hit on a player is decided here, on the side of the one being hit
  // (parry → cover → late-parry freeze → damage). Online: this is the call that moves to the victim's machine.
  // wave: 'red' = parryable · null = not. kind: 'melee' | 'shot' | 'floor' | 'blast' | 'shuttle' | 'mark'.
  // Returns true (hurt) · 'absorb' (parried) · 'cover' · 'pending' · false. o.cb: told how a late-parry freeze ended ('absorb' / 'hurt' / 'miss')
  hurtPlayer(f, dmg, src, heavy = false, wave = null, force = false, kind = 'melee', late = false, hitId = AI.hitId, o = {}) {
    if (!f.alive) return false;
    this.hurtKind = AI.cur && (kind === 'melee' || kind === 'blast') ? AI.cur : kind;   // 2단계: what hit (stats · tuning)
    dmg = Math.round(dmg * FEEL.BOSS_DMG);
    if (kind === 'shuttle') {                      // 셔틀 수정구: 받을 사람 본인의 패리만 (색 잠금 → 커버 X)
      if (!late && Waves.tryAbsorb(f, 'shuttle', src, kind, { hitId, shuttle: true })) return 'absorb';
      if (!late && FEEL.PARRY_LATE > 0 && !f.iframes() && !f.pending) {
        f.pending = { dmg, src: src.clone(), heavy, kind, t: FEEL.PARRY_LATE, waves: new Set(['shuttle']), wave: 'shuttle', hitId, cb: o.cb, dk: Dk.ci };
        this.stop(FEEL.PARRY_LATE, [f, 'boss']); f.ch.shudder(1, FEEL.PARRY_LATE, 1);
        return 'pending';
      }
      return this.hurtFx(f, dmg, src, heavy, force, late) ? true : false;
    }
    if (kind === 'beat') {                         // 2단계 맥놀이: 막기·보호는 Bell.cross가 먼저 판정 — 여기까지 오면 맞음 (회피 무적 관통 · 랠리 끊김)
      if (!this.hurtFx(f, dmg, src, heavy, true, false)) return false;
      Duo.onMiss(f); return true;
    }
    if (kind === 'mark') {                         // 표식 공격: 표식 대상 본인은 패리 불가 · 파트너의 커버만 · 회피 무적도 뚫음
      const c = Duo.coverFor(f); if (c) { Duo.cover(c, f, src, 'mark', hitId); return 'cover'; }
      if (!this.hurtFx(f, dmg, src, heavy, true, false)) return false;
      Duo.onMiss(f); return true;
    }
    const parryable = !force && !!wave && wave !== 'neutral' && (kind === 'melee' || kind === 'shot');
    if (parryable && Waves.tryAbsorb(f, wave, src, kind, { hitId })) return 'absorb';
    if (parryable) { const c = Duo.coverFor(f); if (c) { Duo.cover(c, f, src, kind, hitId, false, wave); return 'cover'; } }
    if (f.pending && parryable) { f.pending.waves.add(wave); return 'pending'; }   // same impact: a parry now takes this one too
    if (parryable && !late && FEEL.PARRY_LATE > 0 && !f.iframes()) {
      // contact: a PARRY_LATE freeze (local); the damage lands after it unless parry is pressed meanwhile (Fighter.update)
      f.pending = { dmg, src: src.clone(), heavy, kind, t: FEEL.PARRY_LATE, waves: new Set([wave]), wave, hitId, dk: Dk.ci };   // (2단계: which dokkaebi hit)
      this.stop(FEEL.PARRY_LATE, [f, 'boss']);
      f.ch.shudder(1, FEEL.PARRY_LATE, 1);
      return 'pending';
    }
    if (!this.hurtFx(f, dmg, src, heavy, force, late)) return false;
    if (parryable || late) Duo.onMiss(f);          // a parryable hit went through: the rally breaks
    return true;
  },
  hurtFx(f, dmg, src, heavy, force, late) {        // damage + the hurt feedback (part of hurtPlayer)
    if (!f.hurt(dmg, src, force)) return false;
    const HK = Duo.stats.hurtKind || (Duo.stats.hurtKind = {}); HK[this.hurtKind || 'other'] = (HK[this.hurtKind || 'other'] || 0) + dmg;
    const p = f.ch;
    p.flash(); this.stop(late ? FEEL.HITSTOP_HURT * 0.5 : heavy ? FEEL.HITSTOP_HURT_HEAVY : FEEL.HITSTOP_HURT, [f, 'boss']);
    CamRig.shake(heavy ? 3 : 2, 0.22);
    const d = V3(p.pos.x - src.x, 0, p.pos.z - src.z).normalize();
    CamRig.kick(d, 1);
    Particles.burst('blood', V3(p.pos.x, 1.1, p.pos.z), d, heavy ? 22 : 16);
    Sfx.play('hurt');
    return true;
  },
  win() { this.state = 'won'; this.endT = 0; this.winTime = this.t; this.stinger = false; },
  lose() { if (this.state === 'play') { this.state = 'lost'; this.endT = 0; this.stinger = false; } },
  update(gdt, dt) {
    if (this.state === 'play') this.t += dt; else this.endT += dt;
    const endAt = this.state === 'won' ? 2.2 : this.state === 'lost' ? 1.6 : -1;
    if (endAt > 0 && this.endT > endAt && !this.stinger) { this.stinger = true; Sfx.play(this.state === 'won' ? 'win' : 'lose'); }
    for (let i = this.popups.length - 1; i >= 0; i--) { this.popups[i].t += dt; if (this.popups[i].t > 0.8) this.popups.splice(i, 1); }
  },
  onEvent(ch, e) {                               // fired by clips on the exact animation frame
    const fight = this.mode === 'fight';
    const P = ch.pos;
    switch (e.type) {
      case 'step': Particles.burst('dust', P, null, 2, 0.5); Sfx.play('step'); break;
      case 'dust': if (P.y < 0.3) Particles.burst('dust', P, null, 7, 0.9); break;   // (not in mid-air: a skill motion reused by an aerial finisher)
      case 'land': Particles.burst('dust', P, null, 10, 1.1); Sfx.play('land'); break;
      case 'stomp': Particles.burst('dust', P, null, 8, 1.4); Sfx.play('stomp'); break;
      case 'kneel': Particles.burst('dust', P, null, 22, 1.8); CamRig.shake(2, 0.25); Sfx.play('boom', 0.7); break;
      case 'fall': Particles.burst('dust', toWorld(ch, V3(0, 0, 1.8 * Rush.scale())), null, 34, 2.2); CamRig.shake(3, 0.4); Sfx.play('boom', 1.3); break;
      case 'jab': Sfx.play('swing3'); break;
      case 'gsSlam': {                           // the greatsword's third hit bites the floor in front
        const tip = toWorld(ch, V3(0, 0, 1.55)); tip.y = 0;
        Decals.add(3, { R: 1.05, x: tip.x, z: tip.z, rot: Math.random() * TAU, life: 4, fadeIn: 0.01, fadeOut: 1.2 });
        const cracks = Decals.list.filter(d => d.mat.uniforms.uShape.value === 3);
        if (cracks.length > 6) Decals.remove(cracks[0]);
        Particles.burst('dust', tip, null, 14, 1.4); Particles.burst('debris', tip, null, 6, 0.9); CamRig.shake(2, 0.18); Sfx.play('stomp');
        break;
      }
      case 'hit': {                              // player sword hit frame
        if (e.f === ch.clip.events.find(x => x.type === 'hit').f) Sfx.play(ch.clip.name === 'combo3' || ch.clip.name === 'gs3' ? 'swing3' : 'swing');
        const F = ch.fighter;
        if (!fight || !F || F.state !== 'attack' || F.swingHit || !AI.targetable()) break;
        const S = F.atk(F.combo);
        const dx = boss.pos.x - P.x, dz = boss.pos.z - P.z, dist = Math.hypot(dx, dz);
        if (dist - boss.radius > S.reach) break;
        const tol = Math.asin(Math.min(1, boss.radius / Math.max(dist, boss.radius)));
        if (Math.abs(angDiff(Math.atan2(dx, dz), ch.facing)) > S.half + tol) break;
        F.swingHit = true;
        const n = V3(dx, 0, dz).normalize(), weak = !!AI.weakFor(P);
        Duo.hitBoss(F, S.dmg, weak ? (F.combo === F.comboLen() ? FIGHT.WEAK_BRK3 : FIGHT.WEAK_BRK) : S.brk, P, V3(n.x, 0.4, n.z).normalize(), S);
        Slots.onBasicHit(F);                       // 1.6: basic hits shorten the skill cooldowns
        break;
      }
      case 'impact': {                           // boss slam lands
        const fist = ch.root.getObjectByName('hdR').localToWorld(V3(0, -0.4, 0));
        fist.y = 0;
        Decals.add(3, { R: FIGHT.SLAM.r, x: fist.x, z: fist.z, rot: Math.random() * TAU, life: 7, fadeIn: 0.01, fadeOut: 1.5 });
        const cracks = Decals.list.filter(d => d.mat.uniforms.uShape.value === 3);
        if (cracks.length > 6) Decals.remove(cracks[0]);
        Particles.burst('dust', fist, null, 30, 2.2); Particles.burst('debris', fist, null, 14);
        CamRig.shake(3, 0.35); Sfx.play('slam');
        if (fight) {
          AI.clearTele();
          for (const f of fighters) if (f.alive && Math.hypot(f.ch.pos.x - fist.x, f.ch.pos.z - fist.z) < FIGHT.SLAM.r + f.ch.radius)
            this.hurtPlayer(f, FIGHT.SLAM.dmg, fist, true, AI.waveOf('slam'), false, 'melee');
        }
        break;
      }
      case 'sweep': {                            // boss sweep active frames
        if (e.f === 11) Sfx.play('sweep');
        if (!fight) break;
        for (const f of fighters) {
          if (!f.alive || AI.swingHit.has(f)) continue;
          const dx = f.ch.pos.x - P.x, dz = f.ch.pos.z - P.z;
          if (Math.hypot(dx, dz) < FIGHT.SWEEP.r + f.ch.radius && Math.abs(angDiff(Math.atan2(dx, dz), ch.facing)) < FIGHT.SWEEP.half)
            if (this.hurtPlayer(f, FIGHT.SWEEP.dmg, P, false, AI.waveOf('sweep'), false, 'melee')) AI.swingHit.add(f);
        }
        break;
      }
      case 'grab': if (fight) AI.tryGrab(); else Sfx.play('grab'); break;
      case 'grabSlam': AI.grabSlamHit(); break;
      case 'shoot': AI.fireVolley(ch); break;
      case 'nova': AI.fireNova(ch, false); break;
      case 'nova2': if (fight && AI.phase >= 2) AI.fireNova(ch, true); break;
      case 'spin': AI.emitSpiral(ch); break;
      case 'shoot2': if (fight && AI.phase >= 2) AI.fireVolley(ch); break;
      case 'cast': Duo.onSkillFrame(ch.fighter, e); break;   // a starter skill's strike frame (2단계: e.k = which one of a multi-strike skill)
      case 'orb': AI.throwOrb(ch); break;                    // the shuttle orb leaves the boss's fist
      case 'markOn': AI.markOn(); break;                     // the Warden's sword points: the mark lands
      case 'bash': AI.bashHit(ch); break;                    // the Warden's shield slams forward
      case 'fin': Duo.finEvent(ch.fighter, e); break;        // a finisher's hit frame (e.k = which hit)
      case 'bstrike': case 'bslam': case 'ring': Bell.onEvent(e); break;   // 2단계 보스 3 (the bell's clips)
      case 'dkImpact': case 'dkCoin': Dk.onEvent(ch, e); break;            // 2단계 보스 4 (the dokkaebi's clips)
    }
  },
};

// Showcase (F1): Tab switches character, ←/→ cycles its clips; one-shot clips replay
// from their start position. WASD still drives the player (plays RUN).
const Show = {
  chars: [player, player2, boss], sel: 0, idx: [0, 0, 0], restart: false,   // TAB: 1P (rapier) · 2P (greatsword) · boss
  get cur() { return this.chars[this.sel]; },
  toggle() {
    this.sel = (this.sel + 1) % this.chars.length;
    player.root.visible = this.sel !== 1; player2.root.visible = this.sel === 1;   // one player on the stand at a time
    player2.place(player.pos.x, player.pos.z, player.facing);
  },
  step(d) { const n = this.cur.order.length; this.idx[this.sel] = (this.idx[this.sel] + d + n) % n; this.restart = true; },
  update(dt) {
    if (Input.hit('switch')) this.toggle();
    if (Input.hit('next')) this.step(1);
    if (Input.hit('prev')) this.step(-1);
    const wdir = Input.dir(), moving = !!wdir;
    const me = this.sel === 1 ? player2 : player;       // WASD drives whichever player is shown
    if (moving) { me.pos.addScaledVector(wdir, FEEL.MOVE_SPEED * dt); me.face(Math.atan2(wdir.x, wdir.z)); }
    this.chars.forEach((ch, i) => {
      let want = i === this.sel ? ch.order[this.idx[i]] : 'idle';
      if (ch === me && moving) want = 'run';
      ch.rootOn = !(ch === me && moving);
      if (!ch.clip || !ch.is(want) || (i === this.sel && this.restart)) {
        ch.play(want, want === 'run' && moving ? FEEL.MOVE_SPEED / FEEL.RUN_STRIDE : 1);
        if (i === this.sel) this.restart = false;
      } else if (ch.done) {
        ch.wait += dt;
        if (ch.wait > (want === 'death' ? 1.6 : 0.7)) { ch.pos.copy(ch.anchor); ch.facing = ch.anchorFacing; ch.play(want); }
      }
    });
    if (this.autoFace && (boss.is('idle') || boss.is('walk'))) boss.facingTo = Math.atan2(me.pos.x - boss.pos.x, me.pos.z - boss.pos.z);
  },
  autoFace: true,
};

/* =============================================================================
 * 18. MAIN LOOP — simulation (update: inputs + dt only) is separate from drawing (render · HUD)
 * ========================================================================== */
const clock = { t: 0, animAcc: 0 };
function update(dt) {
  clock.t += dt;
  Input.poll();
  if (Input.hit('show')) Game.toggleMode();
  if (Game.mode === 'fight' && Game.state === 'select') { selectFrame(dt); return; }   // 2단계: character select (no fight simulation)
  // R: 끝 화면에서는 한 번 · 싸우는 중엔 FEEL.RESTART_HOLD초 꾹 (재시작 뒤엔 손을 뗄 때까지 다시 안 셈) · 패드 START는 그대로 한 번
  if (Game.mode === 'fight' && Game.state === 'play' && keys.has('KeyR')) { if (Game.rHold >= 0) Game.rHold += dt; } else if (!keys.has('KeyR')) Game.rHold = 0;
  if (Game.rHold >= FEEL.RESTART_HOLD) { Game.reset(); Game.rHold = -1; }
  if ((Input.hit('restart') || Input.hit('restartAll')) && Game.mode === 'fight') { Game.reset(); Game.rHold = -1; }
  if (Game.mode === 'fight' && Relics.open) Input.p2Touched = false;   // 2단계: no drop-in / mode switch while the rest screen is choosing
  if (Game.mode === 'fight' && !Relics.open) {
    if (Input.hit('ai2')) {                        // F3: AI partner on / off (tag solo ⇄ duo with the AI)
      const f2 = fighters[1];
      if (!Game.tagMode && f2.bot) Game.leave();
      else if (!Game.tagMode) { f2.bot = { inp: new BotInput(), mode: 'coop' }; Game.note('2P AI TAKES OVER'); Game.banner('1P KEYS  J K U I', 2.2); }
      else Game.join(1, true);
    }
    if (Input.hit('tagSolo') && !Game.tagMode) Game.leave();
    if (Input.p2Touched) { Input.p2Touched = false; if (Game.tagMode || fighters[1].bot) Game.join(1, false); }
    const toSel = Select.endInput();               // 2단계: end screen C (pad Y) → character select
    if (toSel && (Game.state === 'won' || Game.state === 'lost') && Game.endT > (Game.state === 'won' ? 2.2 : 1.6)) { Select.open(); Input.endFrame(); return; }
  }
  const ts = (Game.slowT > 0 ? FEEL.ABSORB_TIMESCALE : 1) * (Stage.slowT > 0 ? FEEL.STAGE.cutSlow : 1);   // PERFECT parry / 1.6 cut-in: brief slow motion
  Game.slowT = Math.max(0, Game.slowT - dt); Stage.slowT = Math.max(0, Stage.slowT - dt);
  const gdt = Game.hitstop > 0 ? 0 : dt * ts;      // global hit-stop (big moments) freezes gameplay; camera, shake & flash keep running
  Game.hitstop = Math.max(0, Game.hitstop - dt);
  const bgdt0 = gdt * World.enemySlow();
  const bgdt = Dk.on ? bgdt0 : AI.hs > 0 ? 0 : bgdt0;   // the boss's own (local) hit-stop (2단계 도깨비: each its own, in Dk.updateAI)
  if (!Dk.on) AI.hs = Math.max(0, AI.hs - dt);

  if (Game.mode === 'fight') {
    Rec.beginFrame(); Game.frame++;
    Game.tagCd = Math.max(0, Game.tagCd - gdt);
    let thought = false;
    for (const f of fighters) {
      if (!f.active) continue;
      f.fgdt = f.hs > 0 ? 0 : gdt; f.hs = Math.max(0, (f.hs || 0) - dt);
      const bot = Game.botFor(f);
      Dk.with(Dk.forF(f), () => {                  // 2단계 보스 4: this fighter's hits / skills / bot go to the dokkaebi it's fighting
        if (bot && f.onField && !Rec.playing && !thought) { Companion.think(f, f.fgdt); if (Game.tagMode) thought = true; }
        f.update(f.fgdt, dt);
      });
    }
    for (const f of fighters) if (f.bot) f.bot.inp.endFrame();
    if (Game.tagBot) Game.tagBot.inp.endFrame();
    Rush.update(dt); Relics.update(dt); Dk.with(Dk.main(), () => Relics.tick(gdt)); Dk.updateAI(bgdt0, bgdt, dt); Shuttle.update(gdt);
    Dk.with(Dk.main(), () => Duo.update(gdt, dt, bgdt)); Game.update(gdt, dt); Hazards.update(bgdt0); Spikes.update(bgdt0);   // (2단계: two AIs · the status's dokkaebi)
    Slots.update(dt); Dk.with(Dk.main(), () => Stage.update(dt, gdt));   // 1.6
    SkillFx.update(gdt); Unique.update(gdt);       // 2단계: wind blades · ground cracks · chain pulls · shield cover
  } else { Show.update(dt); SkillFx.update(dt); }   // (showcase: the wind blades / crack of a played skill clip, look only)
  for (const f of fighters) if ((f.active && !f.bench) || f.idx === 0) Dk.with(Dk.forF(f), () => f.ch.update(Game.mode === 'fight' ? f.fgdt ?? gdt : gdt, collide));   // (2단계: hit frames on its dokkaebi)
  if (!Dk.updateRigs()) boss.update(bgdt, collide);
  Shots.update(bgdt0); Particles.update(gdt); Decals.update(gdt);
  for (const f of fighters) f.ch.updateFlash(dt, CamRig.R);
  Dk.flash(dt);                                    // (= boss.updateFlash · 2단계: both dokkaebi)

  // floor seal: stepped (12 fps) pulsing emission
  clock.animAcc += gdt;
  if (clock.animAcc >= ANIM_DT) {
    clock.animAcc %= ANIM_DT;
    const pulse = 0.82 + 0.18 * Math.sin(clock.t * 3.1);
    MAT.crystal.uniforms.uEmit.value.set(0.95, 0.16, 0.2).multiplyScalar(pulse);
    G.uPLInt.value = 0.5 * (0.9 + 0.1 * pulse);
  }
  G.uPLPos.value.copy(arena.crystal.position);

  CamRig.update(dt, Game.focus());
  const L = G.uLightDir.value;                     // crease highlights go to the side facing the key light (view space)
  compositeMat.uniforms.uBias.value.set(L.dot(CamRig.R), L.dot(CamRig.U), L.dot(CamRig.B) + 0.35).normalize();
  Input.endFrame();
}

function frame(dt) {
  update(dt);
  updateCut();
  renderFrame(scene, lightCam);
  drawHud(dt);
}

resize();
addEventListener('resize', resize);
Game.reset();
// one invisible decal (plus its on-top overlay) is kept alive forever: every decal owns its material, and disposing the
// last one would release the shared shader program → the next telegraph would recompile it mid-fight (a hitch)
{ const k = Decals.add(0, { R: 0.05, x: 0, z: 0, life: Infinity, fadeIn: 1e9 }); Decals.list.splice(Decals.list.indexOf(k), 1); }
renderer.compile(scene, camera);
Select.open();                                     // 2단계: the game opens on character select

const PC = fighters[0];
const PIPE = window.PIPE = {           // dev hook (console / automated checks) — keys are only ever added
  CFG, FIGHT, Pipe, CamRig, Show, Game, PC, AI, player, player2, boss, arena, renderer, camera, finalRT, clock, Decals, Shots, Particles, Input, keys, fps, SLAM_AT, SHOT_AT, FEEL, Sfx, Dev, xrayRT,
  fighters, Companion, Waves, Skills, Hazards, Rush, Addons, World, BotInput, Fighter, BOSSES, FLOORS, ADDONS, SHOTMAT, parryThreat, Flyers,
  Duo, Rec, Sim, Spikes, stateHash,
  FIN, FINDEF, FIN_LABEL, STATUS_LABEL, SKILL_CLIP, finOffer, Shuttle, Mark,          // 1.5단계 (키는 추가만)
  PKEYS, GKEYS, keyNames, PKEYS_SPLIT, Slots, Stage,                                  // 1.6 (키는 추가만)
  CHARS, SKILLS2, FIN2, RELICS, START_CHARS, WAVE_COLORS,                              // 2단계 데이터 (키는 추가만)
  Select, Rigs, duoRule, assignChar, autoPartner, SELECT_KEYS, facePal,                // 2단계 캐릭터 선택 (키는 추가만)
  Unique, buildWeapon20, sampleTrack,                                                  // 2단계 새 캐릭터 (키는 추가만)
  Relics, wrapTxt,                                                                     // 2단계 유물 (키는 추가만)
  Bell, buildBell, BELL_CLIPS,                                                         // 2단계 보스 3 (키는 추가만)
  get bossNow() { return boss; },                                                       // 2단계: the rig the rush is using now (PIPE.boss = the golem, captured at boot)
  SkillFx, CLIP_SKILL,                                                                 // 2단계 날아가는 시동 (키는 추가만)
  FIN2_PREFIX, FIN_EX, FinC, finName, finLabel,                                        // 2단계 공통 마무리 (키는 추가만)
  Dk, buildDokkaebi, DK_CLIPS, DK_COL,                                                 // 2단계 보스 4 (키는 추가만)
  drawFightHud, skillGlyph,                                                            // 2단계 4체 러시 HUD 점검 (키는 추가만)                                                            // 노트북 2인 키 점검용 (키는 추가만)
  paused: false,
  step(dt = 1 / 60, render = true) { if (render) frame(dt); else update(dt); },
  readFinal() {
    const buf = new Uint8Array(Pipe.rtW * Pipe.rtH * 4);
    renderer.readRenderTargetPixels(finalRT, 0, 0, Pipe.rtW, Pipe.rtH, buf);
    return buf;
  },
  // test setup · mode 'duo' | 'tag' · bots: per player 'coop' | 'ignore' | 'spam' | 'tag' | null (= human) · seed
  setup(o = {}) {
    Game.seed = o.seed ?? 1; Rush.startIdx = o.boss || 0;   // o.boss: start the rush at that boss (focused tests)
    Select.on = false;                             // 2단계: o.chars [1P, 2P] (tag: [A, B]) · o.loadouts [[U, I], [U, I]] — default START_CHARS + CHARS.def
    const cs = o.chars || START_CHARS, lo = o.loadouts || [];
    assignChar(fighters[0], cs[0], lo[0]); assignChar(fighters[1], cs[1], lo[1]);
    Duo.exAll = !!o.exclusive;                     // 2단계: o.exclusive = the 1.5 rapier + greatsword arts for every status (as if all four relics)
    Relics.botRule = o.relicBot || 'random';       // 2단계: the bots' relic pick — 'random' (card weights) · 'wave' (wave relics first)
    const B = m => (m ? { inp: new BotInput(), mode: m } : null), bots = o.bots || [];
    if (o.mode === 'duo') { if (Game.tagMode) Game.join(1, true); fighters[0].bot = B(bots[0]); fighters[1].bot = B(bots[1]); }
    else { if (!Game.tagMode) Game.leave(); Game.tagBot = B(bots[0]); }
    Game.reset();
  },
  // online prep: record every frame's inputs, replay them into a fresh fight → same final state hash
  record(o, n) { this.setup(o); Rec.start('rec'); for (let i = 0; i < n; i++) update(1 / 60); const frames = Rec.stop(); return { o, n, frames, end: stateHash() }; },
  replay(rec) { this.setup(rec.o); Rec.start('play', rec.frames); for (let i = 0; i < rec.n; i++) update(1 / 60); Rec.stop(); return stateHash(); },
};

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);                 // schedule first: one bad frame can never freeze the game
  const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
  if (!PIPE.paused) frame(dt);
}
document.getElementById('boot').remove();
addEventListener('pointerdown', () => { window.focus(); Sfx.unlock(); });   // embedded (iframe): a click gives the game the keyboard
requestAnimationFrame(loop);
