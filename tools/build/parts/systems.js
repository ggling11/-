/* =============================================================================
 * 15b. DUO — 패리 판정 · 듀오 동사 4개 · 바닥 패턴 · 보스 러시
 *      A 걸고 받기(시동 스킬 → 보스 상태 → 다른 사람의 U·I = 마무리 8종) · B 자리 나누기(어그로 · 등 뒤)
 *      C 번갈아 패리 랠리(0~5, 공유) · D 커버(파트너 곁에서 대신 패리)
 *      패리 가능한 보스 공격 = 붉은 표시 · 패리 불가(장판 · 원형탄 · 붙잡기) = 중립 경고색(뼈색)
 * ========================================================================== */
const WAVE = {
  red:     { col: C.CRIM2, dim: C.CRIM0, spark: 'spark', label: 'RED' },
  blue:    { col: C.CYAN, dim: C.SLATE2, spark: 'sparkB', label: 'BLUE' },
  purple:  { col: C.PURP1, dim: C.PURP0, spark: 'sparkP', label: 'PURPLE' },
  neutral: { col: C.BONE1, dim: C.STONE2, spark: 'metal', label: '' },
};
// shard materials (parryable shards glow red; the boss's own crystal colour = unparryable)
const SHOTMAT = {
  red:  toon({ chr: true, ramp: [C.CRIM0, C.CRIM2, C.EMBER, C.HOT], emit: [1.3, 0.34, 0.2], pl: 0, bias: 0.1 }),
  blue: toon({ chr: true, ramp: [C.SLATE2, C.CYAN, C.CYAN, C.BONE2], emit: [0.35, 1.0, 1.35], pl: 0, bias: 0.1 }),
};

// ---- parry resolution. (The old wave-absorb entry keeps its name: tryAbsorb = "this hit was parried".)
const Waves = {
  stats: { parry: 0, em: { red: 0, blue: 0 } },
  patternWave(name) { const W = Rush.boss.waves || {}, w = W[name] ?? null; return w === 'self' ? Dk.col() : w; },   // 'red' = 패리 가능 · null = 패리 불가 · 2단계 'self' = 그 도깨비 색
  resolve(w) { return w; },
  list(w, n) { return Array.from({ length: n }, () => w); },
  at(w) { return w; },
  code(w) { return w === 'blue' ? 1 : w === 'purple' ? 2 : w === 'red' ? 0 : 3; },   // decal colour · 3 = 중립(패리 불가)
  parryWindow() { return FEEL.PARRY_WINDOW; },
  // a parryable boss hit touching f while its parry is up → parried: no damage. o.late = pressed during the impact freeze
  tryAbsorb(f, wave, src, kind, o = {}) {
    if (!wave || wave === 'neutral' || kind === 'floor' || f.state !== 'parry') return false;
    if (!f.parried && !o.late && f.t > this.parryWindow(f)) return false;
    const p = f.ch.pos;
    if (!f.parried) {                            // the parry itself: clang, local freeze, face the blow
      f.parried = true; f.parriedAt = f.t;
      if (src) f.ch.face(Math.atan2(src.x - p.x, src.z - p.z));
      const perfect = !o.late && !f.tagParry && f.t <= FEEL.PERFECT_WINDOW;   // pressed ≤ 0.1 s before contact
      f.perfect = perfect;
      Game.stop(FEEL.PARRY_HITSTOP, [f, 'boss']); f.ch.flash(0.12);
      const bp = V3(p.x + Math.sin(f.ch.facing) * 0.45, 1.15, p.z + Math.cos(f.ch.facing) * 0.45);
      Particles.burst('metal', bp, null, perfect ? 26 : 16, perfect ? 1.6 : 1.2); CamRig.shake(2, 0.12);
      if (perfect) {                             // one player's own skill: a flourish, small numbers
        Game.slowT = FEEL.PERFECT_SLOW;
        Particles.burst('spark', bp, null, 18, 1.8); Particles.burst('flame', V3(bp.x, 0.4, bp.z), null, 8, 1.0);
        Game.popup('PERFECT', V3(p.x, 2.9, p.z), C.HOTW, 2); Sfx.play('perfect');
        if (kind === 'melee') AI.addBreak(FEEL.PERFECT_BRK);
        Duo.stats.perfect++;
      } else Game.popup(f.tagParry ? 'TAG PARRY' : 'PARRY', V3(p.x, 2.7, p.z), C.HOTW);
      Sfx.play('parry');
      this.stats.parry++;
      if (kind === 'melee') AI.addBreak(FEEL.PARRY_BRK);
      Duo.onParry(f, { tag: !!f.tagParry, hitId: o.hitId, shuttle: !!o.shuttle });
    }
    Slots.absorb(f, wave, o.hitId);               // 1.6: my colour → into my slots (once per boss hit)
    return true;
  },
  update() {},
};

// ---- the duo layer: rally · cover · launch → link · player hits on the boss (back rule) · stats
const Duo = {
  rally: 0, last: null, lastHitId: null, rallyT: 0, buffT: 0, popT: 0, fullT: 0, brokeT: 0,
  st: null, fins: [], stats: null,              // st: the boss status { kind, by = the starter, fin = the running finisher } · fins: running finishers
  newStats() {
    return { parryPress: 0, parry: 0, perfect: 0, late: 0, rallyUps: 0, rallyMax: 0, rally2: 0, fullRally: 0, rallyBreaks: 0,
      covers: 0, launches: 0, launchHits: 0, lifts: 0, links: 0, linkHits: 0, linkDmg: 0,     // (1단계 이름 유지: 시동 · 시동 적중 · 상태 · 마무리 시작 · 마무리 적중 · 마무리 피해)
      tags: 0, tagParryTry: 0, tagParry: 0, tagLink: 0, tagRescue: 0,
      grabs: 0, grabFrees: 0, grabSlams: 0, splitOK: 0, splitFail: 0, backHits: 0, weakHits: 0, hits: 0, aggroSwaps: 0,
      dmgTaken: 0, downs: 0, revives: 0, groggyN: 0, dmgBy: [0, 0], t: 0, freeze: 0, bossActive: 0, bossAttack: 0,
      // 1.5단계
      starts: 0, startHits: 0, startBy: { thrust: 0, spin: 0, launch: 0, smash: 0 }, statusN: 0, status: { lift: 0, kneel: 0, stagger: 0, turn: 0 },
      fin: { 'lift:1': 0, 'lift:2': 0, 'kneel:1': 0, 'kneel:2': 0, 'stagger:1': 0, 'stagger:2': 0, 'turn:1': 0, 'turn:2': 0 }, finN: 0, finDmg: 0, tagFin: 0,
      shuttle: { start: 0, smash: 0, fail: 0, returns: 0 }, mark: { start: 0, atk: 0, cover: 0, fail: 0, tagCover: 0 }, bossT: [], restN: 0,
      // 1.6 청파·적파: 흡수(사람별) · 사용(사람별) · 넘쳐서 밀려난 것 · 강화 시동 · 강화 마무리 · 자파 · 컷인
      wave: { absorb: [0, 0], used: [0, 0], lost: 0, empStart: 0, empFin: 0, violet: 0, cut: 0 } };
  },
  reset() {
    this.rally = 0; this.last = null; this.lastHitId = null; this.rallyT = 0; this.buffT = 0; this.popT = 0; this.fullT = 0; this.brokeT = 0;
    this.st = null; this.fins = []; this.stats = this.newStats();
  },
  // C. rally: +1 only when the previous successful parry was the OTHER person (a tag parry always counts) · at most once per boss hit
  onParry(f, o = {}) {
    this.stats.parry++;
    if (o.tag) this.stats.tagParry++;
    const fresh = o.hitId === undefined || o.hitId !== this.lastHitId;
    const alt = o.tag || o.shuttle || (this.last !== null && this.last !== f);   // the shuttle forces the alternation itself
    const offbeat = !o.tag && Game.t - (f.whiffAt ?? -99) < FEEL.RALLY_WHIFF_T;   // mashing: this one came right after my own whiff
    if (fresh) this.lastHitId = o.hitId;
    this.last = f; this.rallyT = 0;
    if (offbeat && alt && fresh) { this.stats.offbeat = (this.stats.offbeat || 0) + 1; Game.popup('OFF BEAT', V3(f.ch.pos.x, 3.35, f.ch.pos.z), C.STONE2); }
    else if (alt && fresh) this.rallyUp(1, f);
  },
  rallyUp(n, f) {
    for (let k = 0; k < n && this.rally < FEEL.RALLY_MAX; k++) {
      const prev = this.rally;
      this.rally++; this.stats.rallyUps++;
      if (prev < 2 && this.rally >= 2) this.stats.rally2++;
      this.stats.rallyMax = Math.max(this.stats.rallyMax, this.rally);
      AI.addBreak(FEEL.RALLY_BRK * this.rally);                    // every step: groggy +10 × rally
      if (this.rally >= FEEL.RALLY_BUFF_AT) { if (this.buffT <= 0) this.buffOn(); this.buffT = FEEL.RALLY_BUFF_T; }
    }
    this.popT = 0.45; this.rallyT = 0;
    Sfx.play('rally', this.rally);
    const p = f ? f.ch.pos : boss.pos, hot = this.rally >= FEEL.RALLY_BUFF_AT;
    Game.popup(`RALLY ${this.rally}`, V3(p.x, 3.35, p.z), hot ? C.HOT : C.BONE2, hot ? 2 : 1);
    if (this.rally >= FEEL.RALLY_MAX) this.fullRally();
  },
  buffOn() {
    for (const q of fighters) if (q.onField && q.state !== 'down') { Particles.burst('flame', V3(q.ch.pos.x, 0.1, q.ch.pos.z), null, 14, 1.2); q.ch.flash(0.12, C.HOT); }
    Game.banner('RALLY  DMG X1.3  SPEED X1.15', 1.4);
  },
  fullRally() {                                  // 5: 'perfect rally' — instant groggy, a big shared moment, back to 0
    this.stats.fullRally++; this.fullT = 1.6;
    this.rally = 0; this.last = null;
    Game.stopAll(FEEL.RALLY_FULL_STOP); Game.edgeFlash = { t: 0.24, col: C.HOTW };
    CamRig.shake(5, 0.5); Sfx.play('fullRally');
    for (const q of fighters) if (q.onField && q.state !== 'down') { Particles.burst('spark', V3(q.ch.pos.x, 1.0, q.ch.pos.z), null, 24, 1.6); q.ch.flash(0.2, C.HOTW); }
    Particles.burst('spark', V3(boss.pos.x, 2.6 * Rush.scale() / 0.56, boss.pos.z), null, 40, 2.4);
    Particles.burst('flame', V3(boss.pos.x, 0.1, boss.pos.z), null, 30, 2.4);
    Dk.each(() => {                                                 // (2단계 도깨비: both of them ★)
      if (AI.holdsGroggy()) AI.deferGroggy = 'PERFECT RALLY';        // shuttle / mark: lands when the pattern ends
      else if (AI.state !== 'dead' && AI.state !== 'transform' && AI.state !== 'away') AI.forceGroggy('PERFECT RALLY');
    });
  },
  // a parryable hit went through: the rally drops (the shuttle hit the floor)
  onMiss(f) {
    const had = this.rally > 0;
    this.last = null;
    if (!FEEL.RALLY_HIT_RESET || !had) return;
    this.stats.rallyBreaks++; this.rally = 0; this.brokeT = 0.8;
    Game.popup('RALLY BROKEN', V3(f.ch.pos.x, 3.35, f.ch.pos.z), C.STONE2);
  },
  // D. cover: my partner is about to be hit and I'm parrying within COVER_R of them → I take it for them
  coverFor(p) {
    for (const c of fighters)
      if (c !== p && c.alive && c.state === 'parry' && (c.parried || c.t <= Waves.parryWindow(c)) && c.ch.pos.distanceTo(p.ch.pos) <= Unique.coverR(c)) return c;   // 2단계: shield lift ×2
    return null;
  },
  cover(c, p, src, kind, hitId, rescue = false, wave = null) {
    const cp = c.ch.pos, pp = p.ch.pos;
    if (!c.parried && c.state === 'parry') { c.parried = true; c.parriedAt = c.t; }
    if (src) c.ch.face(Math.atan2(src.x - cp.x, src.z - cp.z));
    Game.stop(FEEL.PARRY_HITSTOP, [c, p, 'boss']); c.ch.flash(0.14, C.HOTW); p.ch.flash(0.1, C.BONE2);
    const mid = V3((cp.x + pp.x) / 2, 1.1, (cp.z + pp.z) / 2);
    Particles.burst('metal', mid, null, 22, 1.4); Particles.burst('spark', V3(pp.x, 1.0, pp.z), null, 12, 1.1);
    CamRig.shake(3, 0.16); Sfx.play('cover');
    Game.popup(rescue ? 'RESCUE' : 'COVER', V3(pp.x, 3.0, pp.z), C.HOT, 2);
    if (kind === 'melee') AI.addBreak(FEEL.PARRY_BRK);
    this.stats.covers++;
    const fresh = hitId === undefined || hitId !== this.lastHitId;
    const offbeat = !rescue && !c.tagParry && Game.t - (c.whiffAt ?? -99) < FEEL.RALLY_WHIFF_T;   // OFF BEAT (1단계 규칙) applies to covers too: mashing K next to a partner builds no rally
    if (fresh) this.lastHitId = hitId;
    if (fresh && offbeat) { this.stats.offbeat = (this.stats.offbeat || 0) + 1; Game.popup('OFF BEAT', V3(cp.x, 3.35, cp.z), C.STONE2); }
    else if (fresh) this.rallyUp(FEEL.COVER_RALLY, c);
    this.last = c; this.rallyT = 0;
    if (wave) { if (Relics.has(c, 'handoff')) Slots.give(p, wave); else Slots.absorb(c, wave, hitId); }   // 1.6: the one who covered takes the wave if it's their colour (relic HANDOFF: the partner gets it)
    AI.setAggro(c, 'cover');
  },
  // ---- player → boss: back rule (×1.5 dmg / groggy, weak points only from behind) · rally buff · local hit-stop
  hitBoss(F, dmg, brk, from, dir, A, o = {}) {
    if (!AI.targetable()) return { hs: 0, dmg: 0, back: false, weak: false };
    const back = AI.isBack(from), wk = o.weakAll ? { p: boss.weak[0].obj.getWorldPosition(V3()) } : o.weak !== false && back ? AI.weakFor(from) : null;   // 2단계 weakAll: the chest crystal from any side
    const guard = !back && !o.fin && AI.state === 'attack' && AI.cur === 'shieldRush';   // the Warden's shield charge: the front is walled off
    const mul = (back ? FEEL.BACK_MUL : 1) * (this.buffT > 0 ? FEEL.RALLY_BUFF_DMG : 1) * (AI.state === 'status' && !o.fin ? FEEL.STATUS_HIT_MUL : 1) * (guard ? FEEL.WARDEN.blockMul : 1);
    if (guard) { brk = 0; if (F && (F.backPopT || 0) <= 0) { Game.popup('BLOCKED', V3(from.x, 2.4, from.z), C.CYAN); F.backPopT = 0.6; } Particles.burst('sparkB', V3((from.x + boss.pos.x) / 2, 1.2, (from.z + boss.pos.z) / 2), null, 6, 1.0); }
    const n = V3(from.x - boss.pos.x, 0, from.z - boss.pos.z).normalize();
    const hitP = wk ? wk.p : o.hitP || V3(boss.pos.x + n.x * boss.radius * 0.9, boss.pos.y + 1.3 * Rush.scale() / 0.56, boss.pos.z + n.z * boss.radius * 0.9);
    const hs = AI.hurt(dmg * mul, brk * (back ? FEEL.BACK_BRK_MUL : 1), !!wk, hitP, dir, A, F);
    const S = this.stats; S.hits++; if (back) S.backHits++; if (wk) S.weakHits++;
    if (F) S.dmgBy[F.idx] += AI.lastDmg;
    if (back && !wk && F && (F.backPopT || 0) <= 0) { Game.popup('BACK', hitP, C.BONE0); F.backPopT = 0.9; }
    if (o.global) Game.stopAll(hs); else Game.stop(hs, [F, 'boss']);
    return { hs, dmg: AI.lastDmg, back, weak: !!wk };
  },
  update(gdt, dt, bgdt) {
    if (Game.mode !== 'fight') return;
    this.popT -= dt; this.fullT -= dt; this.brokeT -= dt;
    for (const f of fighters) f.backPopT = (f.backPopT || 0) - dt;
    if (gdt > 0) {
      this.buffT = Math.max(0, this.buffT - gdt);
      if (this.rally > 0) {
        this.rallyT += gdt;
        if (this.rallyT >= FEEL.RALLY_DECAY * Relics.teamMul('rallyDecay')) { this.rally--; this.rallyT = 0; if (!this.rally) this.last = null; }   // (relic RALLY EMBER ×1.5)
      }
    }
    if (this.st && Dk.stState() !== 'status') this.st = null;   // (2단계: the status of the dokkaebi it's on)
    this.updateFins(gdt);
    if (Game.state === 'play' && Rush.state === 'fight' && Rush.entT <= 0) {   // test stats (fight time only — the rest between bosses is left out)
      const S = this.stats; S.t += dt;
      if (Game.hitstop > 0) S.freeze += dt;
      if (bgdt > 0 && Dk.anyState(s => !['groggy', 'status', 'recover', 'dead', 'away'].includes(s))) S.bossActive += dt;   // (2단계 도깨비: either one)
      if (bgdt > 0 && Dk.anyState(s => ['attack', 'cast', 'holding', 'transform'].includes(s))) S.bossAttack += dt;
    }
  },
};

// removed systems (적파·청파 방출, 강화 스킬, 쿨타임 스킬, 시너지, 포션, 애드온): empty shells so old hooks never throw
const Skills = { pending: [], fx: [], barriers: [], rings: [], moves: [], spins: [], stats: {}, reset() {}, update() {}, cancel() {}, interrupt() {} };
const World = { slowT: 0, slowK: 1, enemySlow() { return 1; }, update() {} };
const Addons = { orbs: [], has: () => false, justBonus: () => 0, dmgMul: () => 1, reviveHp: () => FEEL.REVIVE_HP, clear() {}, update() {} };
const Flyers = { list: [], add() {}, draw() {} };

// ---- floor patterns (Lost Ark style). Each builds a timeline [[spawn time, hazard | () => hazard(s)], …]
//      hazard: circle / lane (centred laser) / ring (band r0..r1, inv = everything but the band, holes = safe circles)
//      / checker / rotor. All unparryable → neutral warning colour. Randomness goes through the seeded Sim RNG.
const FLOORS = {
  // 두 안전지대: 멀리 떨어진 원 2개에 한 명씩 (솔로 1개). 원 밖 = 피해, 빈 원이 있으면 전원 큰 피해
  split: { label: 'SPLIT UP', build: () => [[0, () => Hazards.split()]] },
  // 연쇄 원: 살아 있는 모든 플레이어의 발밑을 0.36초마다 6번 추적 (멈추면 맞음)
  chain: { label: 'CHAIN', build: () => Array.from({ length: 6 }, (_, i) => [i * 0.36, () => Hazards.onTargets(t => ({ shape: 'circle', x: t.x, z: t.z, r: 1.25, tele: 0.8, dmg: 16 }))]) },
  // 도넛: 보스 곁만 안전
  donut: { label: 'DONUT', build: () => [[0, () => ({ shape: 'ring', x: boss.pos.x, z: boss.pos.z, r0: boss.radius + 1.35, r1: 30, tele: 1.5, dmg: 28, heavy: true })]] },
  // 역도넛 → 도넛
  rdonut: { label: 'RINGS', build: () => [
    [0, () => ({ shape: 'ring', inv: true, x: boss.pos.x, z: boss.pos.z, r0: boss.radius + 1.45, r1: boss.radius + 3.85, tele: 1.4, dmg: 24 })],
    [1.45, () => ({ shape: 'ring', x: boss.pos.x, z: boss.pos.z, r0: boss.radius + 1.35, r1: 30, tele: 1.0, dmg: 24 })]] },
  // 십자 → X 레이저 (보스 중심)
  cross: { label: 'CROSS', build: () => { const a = SR() * TAU;
    return [[0, () => Hazards.lasers(a, 2, 1.0)], [1.05, () => Hazards.lasers(a + Math.PI / 4, 2, 0.9)]]; } },
  xcross: { label: 'CROSSFIRE', build: () => { const a = SR() * TAU;
    return [[0, () => Hazards.lasers(a, 2, 0.85)], [0.8, () => Hazards.lasers(a + Math.PI / 4, 2, 0.8)], [1.6, () => Hazards.lasers(a, 3, 0.8)]]; } },
  // 체크무늬: 칸이 번갈아 두 번 터짐
  checker: { label: 'CHECKER', build: () => { const par = SR() < 0.5 ? 0 : 1, rot = SR() * 0.8;
    return [[0, { shape: 'checker', x: 0, z: 0, cell: 2.4, par, rot, tele: 1.2, dmg: 22 }],
            [1.3, { shape: 'checker', x: 0, z: 0, cell: 2.4, par: 1 - par, rot, tele: 0.9, dmg: 22 }]]; } },
  // 단일 안전지대: 아레나 전체가 터지고 한 곳만 안전 (대시 무적으로 못 버팀)
  safe: { label: 'SANCTUARY', build: () => [[0, () => { const s = Hazards.safeSpot();
    return { shape: 'ring', inv: true, x: 0, z: 0, r0: 0, r1: 0, R: 8.3, holes: [[s.x, s.z, 1.7]], tele: 1.9, dmg: 34, heavy: true, pierce: true }; }]] },
  // 회전 레이저: 보스에서 뻗은 레이저가 4초간 회전 (계속 피해)
  rotor: { label: 'ROTOR', build: () => [[0, () => ({ shape: 'rotor', x: boss.pos.x, z: boss.pos.z, n: AI.phase >= 2 ? 4 : 3, L: 9, W: 0.8,
    rot0: SR() * TAU, w: (SR() < 0.5 ? -1 : 1) * (AI.phase >= 2 ? 1.0 : 0.8), tele: 1.0, dur: 4.0, tick: 0.5, dmg: 12 })]] },
};

const Hazards = {
  list: [], seq: null, stats: { spawned: 0, hits: 0, minTele: 9 },
  clear() { for (const h of this.list) for (const d of h.decal) Decals.kill(d); this.list = []; this.seq = null; },
  cancelSeq() { this.seq = null; },
  onTargets(fn) { return fighters.filter(f => f.alive).map(f => fn(f.ch.pos)); },
  lasers(a, n, tele) {                            // n centred lasers through the boss, evenly spread from angle a
    const out = [];
    for (let k = 0; k < n; k++) out.push({ shape: 'lane', x: boss.pos.x, z: boss.pos.z, rot: a + k * Math.PI / n, L: 22, W: 1.3, tele, dmg: 22 });
    return out;
  },
  clearance(x, z) {                               // room around a floor spot: pillars, the boss, the arena edge
    let d = Math.min(7.0 - Math.hypot(x, z), Math.hypot(x - boss.pos.x, z - boss.pos.z) - boss.radius);
    for (const c of arena.colliders) d = Math.min(d, Math.hypot(x - c.x, z - c.z) - c.r);
    return d;
  },
  safeSpot() {                                    // far from the boss, inside the arena, reachable in time
    let best = null, bs = -1;
    for (let i = 0; i < 24; i++) {
      const a = SR() * TAU, r = srnd(2.5, 5.0), x = Math.sin(a) * r, z = Math.cos(a) * r;
      let d = Math.hypot(x - boss.pos.x, z - boss.pos.z);
      if (d < boss.radius + 2) continue;
      for (const c of arena.colliders) d = Math.min(d, Math.hypot(x - c.x, z - c.z) * 1.5);
      const far = Math.max(...fighters.filter(f => f.alive).map(f => Math.hypot(x - f.ch.pos.x, z - f.ch.pos.z)), 0);
      const s = Math.min(d, 4) - Math.max(0, far - 7) * 2;
      if (s > bs) { bs = s; best = { x, z }; }
    }
    return best || { x: 0, z: 0 };
  },
  // two safe circles far apart (one in tag solo): the pair must split up, one each
  split() {
    const S = FEEL.SPLIT, solo = Game.tagMode || fighters.filter(f => f.alive).length < 2;
    let best = null, bs = -1e9;
    for (let i = 0; i < 20; i++) {
      const a = SR() * TAU, cx = srnd(-0.9, 0.9), cz = srnd(-0.9, 0.9), sx = Math.sin(a) * S.d, sz = Math.cos(a) * S.d;
      const holes = solo ? [[cx + sx, cz + sz]] : [[cx + sx, cz + sz], [cx - sx, cz - sz]];
      const s = Math.min(...holes.map(([x, z]) => this.clearance(x, z) - S.r));
      if (s > bs) { bs = s; best = holes; }
    }
    return { shape: 'ring', inv: true, x: 0, z: 0, r0: 0, r1: 0, R: 8.3, holes: best.map(([x, z]) => [x, z, S.r]),
             tele: S.tele, dmg: S.dmg, failDmg: S.failDmg, heavy: true, pierce: true, split: !solo };
  },
  startSeq(name) {
    this.seq = { name, t: 0, steps: FLOORS[name].build(), i: 0 };
    Game.banner(FLOORS[name].label, 1.0);
  },
  // called by the boss AI while it holds the casting pose; returns to idle once everything has landed
  bossCast(gdt) {
    const s = this.seq;
    if (s) {
      s.t += gdt;
      while (s.i < s.steps.length && s.steps[s.i][0] <= s.t) { this.spawn(s.steps[s.i][1]); s.i++; }
      if (s.i >= s.steps.length) this.seq = null;
    }
    if (!this.seq && !this.list.some(h => h.t < h.at + h.dur)) AI.toIdle(srnd(...FIGHT.GAP[AI.phase - 1]));
  },
  spawn(spec) {
    const specs = typeof spec === 'function' ? spec() : spec;
    for (const sp of [].concat(specs)) this.add({ ...sp, wave: FEEL.FLOOR_WAVE_COLOR ? 'red' : 'neutral' });
  },
  add(o) {
    const h = { ...o, t: 0, at: o.tele, dur: o.dur || 0, cd: new Map(), fired: false, dmg: Math.round(o.dmg * FEEL.HAZ_DMG) };
    h.decal = this.makeDecal(h);
    this.list.push(h); this.stats.spawned++; this.stats.minTele = Math.min(this.stats.minTele, h.at);
    return h;
  },
  holesOf(h) { return h.holes || (h.hole ? [h.hole] : []); },
  makeDecal(h) {
    const c = { wave: Waves.code(h.wave), lock: 1, prog: 0, fadeIn: 0.08, fadeOut: 0.22, life: h.at + h.dur + 0.3 };
    switch (h.shape) {
      case 'circle': return [Decals.add(0, { R: h.r, x: h.x, z: h.z, ...c })];
      case 'lane': return [Decals.add(2, { L: h.L, W: h.W, x: h.x - Math.sin(h.rot) * h.L / 2, z: h.z - Math.cos(h.rot) * h.L / 2, rot: h.rot, ...c })];
      case 'ring': { const H = this.holesOf(h);
        return [Decals.add(5, { R: h.R || 8.3, R0: h.r0, R1: h.r1, inv: h.inv ? 1 : 0, hole: H[0], hole2: H[1], x: h.x, z: h.z, ...c })]; }
      case 'checker': return [Decals.add(4, { R: 7.8, cell: h.cell, par: h.par, x: h.x, z: h.z, rot: h.rot || 0, ...c })];
      case 'rotor': return Array.from({ length: h.n }, (_, k) => Decals.add(2, { L: h.L, W: h.W, x: h.x, z: h.z, rot: h.rot0 + k * TAU / h.n, ...c }));
    }
    return [];
  },
  rotorAngle(h, t = h.t) { return h.rot0 + h.w * Math.max(0, t - h.at); },
  inLane(dx, dz, rot, L, W, pad, centred) {
    const s = Math.sin(rot), c = Math.cos(rot), along = dx * s + dz * c, side = Math.abs(dx * c - dz * s);
    return side < W / 2 + pad && (centred ? Math.abs(along) < L / 2 + pad : along > -pad && along < L + pad);
  },
  inHole(h, x, z, pad = 0) {
    for (const H of this.holesOf(h)) if (Math.hypot(x - h.x - H[0], z - h.z - H[1]) < H[2] - pad) return true;
    return false;
  },
  // is (x,z) inside the hazard's hit area? (t: evaluate a rotor at another time)
  inside(h, x, z, pad = 0, t = h.t) {
    const dx = x - h.x, dz = z - h.z;
    switch (h.shape) {
      case 'circle': return Math.hypot(dx, dz) < h.r + pad;
      case 'lane': return this.inLane(dx, dz, h.rot, h.L, h.W, pad, true);
      case 'rotor': { const a = this.rotorAngle(h, t); for (let k = 0; k < h.n; k++) if (this.inLane(dx, dz, a + k * TAU / h.n, h.L, h.W, pad, false)) return true; return false; }
      case 'ring': {
        if (this.inHole(h, x, z, pad)) return false;
        const r = Math.hypot(dx, dz);
        if (h.inv) return !(r > h.r0 + pad && r < h.r1 - pad);
        return r > h.r0 - pad && r < h.r1 + pad;
      }
      case 'checker': {
        const c = Math.cos(h.rot || 0), s = Math.sin(h.rot || 0);
        for (const [ox, oz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]) {
          const lx = (dx + ox) * c - (dz + oz) * s, lz = (dx + ox) * s + (dz + oz) * c;
          const cx = Math.floor(lx / h.cell), cz = Math.floor(lz / h.cell);
          if (Math.hypot(lx, lz) < 7.8 && (((cx + cz) % 2) + 2) % 2 === h.par) return true;
        }
        return false;
      }
    }
    return false;
  },
  hits(h, f) { const p = f.ch.pos; return this.inside(h, p.x, p.z, f.ch.radius * 0.8); },
  fire(h) {
    if (h.coin && Dk.coinFire(h)) return;          // 2단계 보스 4: 금화 (내 색은 줍고, 다른 색은 터짐)
    const sp = WAVE[h.wave] ? WAVE[h.wave].spark : 'metal';
    if (h.shape === 'circle') { Particles.burst('dust', V3(h.x, 0, h.z), null, 14, 1.4); Particles.burst(sp, V3(h.x, 0.3, h.z), null, 8, 1); }
    else if (h.shape === 'lane') for (let k = -4; k <= 4; k++) Particles.burst(sp, V3(h.x + Math.sin(h.rot) * k * 1.6, 0.3, h.z + Math.cos(h.rot) * k * 1.6), null, 3, 1);
    else if (h.shape !== 'rotor') for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, r = rnd(1, 7); Particles.burst('dust', V3(Math.sin(a) * r, 0, Math.cos(a) * r), null, 5, 1.2); }
    CamRig.shake(h.heavy ? 3 : 2, 0.2); Sfx.play(h.heavy ? 'slam' : 'floor');
    if (h.split) { this.splitResolve(h); return; }
    if (h.dur > 0) return;
    for (const f of fighters) if (f.alive && this.hits(h, f)) { if (Game.hurtPlayer(f, h.dmg, V3(h.x, 0, h.z), !!h.heavy, null, !!h.pierce, 'floor') === true) this.stats.hits++; }
  },
  // the two safe circles: outside = hit; a circle left empty = everyone takes the failure blast
  splitResolve(h) {
    const alive = fighters.filter(f => f.alive);
    const empty = this.holesOf(h).some(H => !alive.some(f => Math.hypot(f.ch.pos.x - h.x - H[0], f.ch.pos.z - h.z - H[1]) < H[2]));
    if (empty) {
      Duo.stats.splitFail++; Game.banner('SPLIT FAILED', 1.2); Game.edgeFlash = { t: 0.16, col: C.CRIM2 }; CamRig.shake(4, 0.35);
      for (const f of alive) if (Game.hurtPlayer(f, h.failDmg, V3(h.x, 0, h.z), true, null, true, 'floor') === true) this.stats.hits++;
      return;
    }
    Duo.stats.splitOK++;
    for (const f of alive) if (this.hits(h, f) && Game.hurtPlayer(f, h.dmg, V3(h.x, 0, h.z), true, null, true, 'floor') === true) this.stats.hits++;
    for (const H of this.holesOf(h)) Particles.burst('spark', V3(h.x + H[0], 0.4, h.z + H[1]), null, 14, 1.0);
  },
  update(bgdt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      h.t += bgdt;
      for (const d of h.decal) { const u = d.mat.uniforms; u.uProg.value = Math.min(1, h.t / h.at); u.uActive.value = h.t >= h.at ? 1 : 0; }
      if (h.shape === 'rotor') { const a = this.rotorAngle(h); h.decal.forEach((d, k) => { d.m.rotation.y = a + k * TAU / h.n; }); }
      if (!h.fired && h.t >= h.at) { h.fired = true; this.fire(h); }
      if (h.dur > 0 && h.t >= h.at && h.t <= h.at + h.dur && Game.state === 'play')
        for (const f of fighters) if (f.alive && (h.cd.get(f) || 0) <= h.t && this.hits(h, f)) {
          h.cd.set(f, h.t + h.tick);
          if (Game.hurtPlayer(f, h.dmg, V3(h.x, 0, h.z), false, null, false, 'floor') === true) this.stats.hits++;
        }
      if (h.t > h.at + h.dur + 0.35) this.list.splice(i, 1);    // decals fade out on their own life
    }
  },
};

// ---- the boss rush: THE SCARLET COLOSSUS (shuttle) → rest → THE AZURE WARDEN (mark). Relics (stage 2) will go in `relics`.
const Rush = {
  idx: 0, state: 'fight', t: 0, lock: false, cards: null, startIdx: 0, enterT: 0, entT: 0,
  relics: [],                                     // 2단계: 보스 처치 보상(유물) · 시너지 빌드 자리 (데이터 구조만)
  get boss() { return BOSSES[this.idx]; },
  get count() { return BOSSES.length; },
  size() { return this.boss.size; },
  scale() { return FEEL.BOSS_SCALE * this.boss.size; },
  hpMul() { return this.boss.hp; },
  speedMul() { return this.boss.speed; },
  title() { return this.boss.name; },
  reset() { this.idx = this.startIdx || 0; this.state = 'fight'; this.t = 0; this.lock = false; this.cards = null; this.enterT = 0; this.entT = 0; this.apply(this.idx); },
  // paint + size the boss rig: material ramps, glow colour, attachments, measured reach
  apply(i) {
    if (BOSSES[i].rig === 'dk') { Bell.use(false); Dk.use(true); Dk.apply(); this.tintW = undefined; return; }   // 2단계 보스 4: the pair of dokkaebi rigs
    Dk.use(false);
    Bell.use(BOSSES[i].rig === 'bell');            // 2단계 보스 3: its own rig (the shared AI only sees `boss`)
    if (BOSSES[i].rig === 'bell') {
      const B = BOSSES[i], S = FEEL.BOSS_SCALE * B.size, px = boss.pos.x, pz = boss.pos.z, pf = boss.facing;
      boss.root.scale.setScalar(S); boss.radius = 1.35 * S; boss.focus = 2.5 * S;
      this.tintW = undefined; this.tint(null); boss.place(px, pz, pf); boss.play('idle');
      return;
    }
    const B = BOSSES[i], K = SKINS[B.skin], M = boss.M, S = FEEL.BOSS_SCALE * B.size;
    for (const n in K.ramps) M[n].uniforms.uRamp.value.set(...K.ramps[n]);
    boss.glowMats[0].base = K.emit; M.core.uniforms.uEmit.value.set(...K.emit);
    const sm = boss.smear.mat.uniforms; sm.uA.value = PAL_RGB[K.smear[0]]; sm.uB.value = PAL_RGB[K.smear[1]]; sm.uEmit.value.set(...K.smearEmit);
    for (const n in boss.att) boss.att[n].visible = B.attach.includes(n);
    this.tintW = undefined; this.tint(null);
    const px = boss.pos.x, pz = boss.pos.z, pf = boss.facing;
    boss.root.scale.setScalar(S); boss.radius = 1.25 * S; boss.focus = 2.5 * S;
    SLAM_AT.copy(measureJoint(boss, 'slam', FIGHT.SLAM.hitF, 'hdR'));
    SHOT_AT.copy(measureJoint(boss, 'shot', FIGHT.SHOT.fireF, 'hdR'));
    boss.place(px, pz, pf); boss.play('idle');
    FIGHT.SHOT.minD = Math.hypot(SHOT_AT.x, SHOT_AT.z) + 1.6;
    FIGHT.SWEEP.r = 4.3 * S * 1.2 + 0.1; FIGHT.REACH_H = 3.35 * S;
  },
  // melee attacks glow red (= parryable); null = the boss's own skin
  tint(w) {
    if (Dk.on) { Dk.tint(w); return; }            // 2단계 보스 4: per dokkaebi
    if (w === this.tintW) return;
    this.tintW = w;
    const K = SKINS[this.boss.skin];
    const emit = w === 'red' ? [1.15, 0.22, 0.2] : w === 'blue' ? [0.3, 0.85, 1.15] : K.emit;   // 1.6: 청파 공격은 푸르게
    const sm = w === 'red' ? [C.HOT, C.CRIM1, [0.9, 0.16, 0.12]] : w === 'blue' ? [C.CYAN, C.SLATE3, [0.2, 0.6, 0.9]] : [K.smear[0], K.smear[1], K.smearEmit];
    boss.glowMats[0].base = emit; boss.M.core.uniforms.uEmit.value.set(...emit);
    const u = boss.smear.mat.uniforms; u.uA.value = PAL_RGB[sm[0]]; u.uB.value = PAL_RGB[sm[1]]; u.uEmit.value.set(...sm[2]);
    boss.M.core.uniforms.uRamp.value.set(...(w === 'red' ? RAMP.crystal : w === 'blue' ? RAMP.crystalB : K.ramps.core));
  },
  onBossDead() {
    Hazards.clear(); Shots.clear(); Shuttle.clear(); Mark.clear(); Bell.endBeat();
    Duo.stats.bossT[this.idx] = +(Game.t - this.enterT).toFixed(2);
    if (this.idx < BOSSES.length - 1) this.startRest(); else Game.win();
  },
  // between bosses: the fallen boss crumbles, everyone gets some health back, the downed get up (tag solo: the benched one too)
  startRest() {
    const R = FEEL.RUSH;
    this.state = 'rest'; this.t = 0; Duo.st = null; Duo.stats.restN++; this.relicT = false;
    Game.banner(`BOSS ${this.idx + 1} DOWN`, 2.2);
    for (const f of fighters) {
      if (!f.active) continue;
      if (f.state === 'down') { if (!f.bench) f.revive(); else { f.state = 'move'; } f.hp = f.chip = Math.max(f.hp, Math.round(FIGHT.PLAYER_HP * R.reviveHp)); }
      else f.hp = f.chip = Math.min(FIGHT.PLAYER_HP, Math.round(f.hp + FIGHT.PLAYER_HP * R.healFrac));
      if (f.onField) Particles.burst('heal', V3(f.ch.pos.x, 0.3, f.ch.pos.z), null, 16, 1.2);
    }
    Sfx.play('revive');
  },
  // the next boss drops into the arena
  enter(i) {
    const [px, pz] = FIGHT.START_P, [bx, bz] = FIGHT.START_B;
    this.idx = i; this.state = 'fight'; this.apply(i);
    const tgt = fighters.find(f => f.onField) || fighters[0];
    boss.place(bx, bz, Math.atan2(tgt.ch.pos.x - bx, tgt.ch.pos.z - bz)); boss.root.visible = true;
    AI.reset(); AI.state = 'away'; boss.pos.y = 6; this.entT = FEEL.RUSH.entT;
    Dk.reset(true);                                // 2단계 보스 4: the second dokkaebi drops in beside the first
    this.enterT = Game.t;
    Game.banner(this.boss.name, 2.4); Sfx.play('p2charge');
    void px; void pz;
  },
  update(dt) {
    if (Game.mode !== 'fight' || Game.state !== 'play') return;
    if (this.state === 'rest') {
      const R = FEEL.RUSH; this.t += dt;
      if (this.t >= R.hideT && boss.root.visible) { boss.root.visible = false; AI.state = 'away'; Particles.burst('dust', boss.pos, null, 30, 2.2); }
      if (this.t >= R.hideT && !this.relicT) { this.relicT = true; Relics.start(); }   // 2단계: the relic cards (+ loadout) once the boss is gone
      if (this.t >= R.restT && Relics.done()) this.enter(this.idx + 1);
      return;
    }
    if (this.entT > 0) {                          // entrance: a heavy drop onto the arena floor
      this.entT -= dt; const u = Math.max(0, this.entT / FEEL.RUSH.entT);
      Dk.each(() => { boss.pos.y = 6 * u * u; });  // (2단계 도깨비: both)
      if (this.entT <= 0) {
        this.entT = 0;
        Dk.each(i => {
          boss.pos.y = 0; AI.state = 'idle'; AI.t = 1.2 + (Dk.on ? i * FEEL.DK.offset : 0);
          Decals.add(3, { R: 2.4, x: boss.pos.x, z: boss.pos.z, rot: Math.random() * TAU, life: 6, fadeIn: 0.01, fadeOut: 1.5 });
          Particles.burst('dust', boss.pos, null, 46, 3.0); Particles.burst('debris', boss.pos, null, 20, 1.6);
        });
        CamRig.shake(5, 0.5); Sfx.play('slam'); Game.stopAll(0.12);
      }
    }
  },
  startEntrance() {},
};

// ---- parry timing ring: a parryable hit on you (a combo spike / melee in its telegraph / a red shard on course)
//      shrinks onto a fixed ring at your feet; white + key = press now. Tag solo: the tag key does it too.
function parryThreat(f) {
  const mine = Slots.col(Slots.color(f));         // 1.6: the shuttle orb / a hit in my colour shows my wave colour
  if (f.pending) return { eta: 0, col: f.pending.kind === 'shuttle' ? mine : f.pending.wave === 'blue' ? C.CYAN : C.CRIM2, late: true };   // touching now: last chance
  let { eta, col } = Dk.etaCol(f);                 // (2단계: either dokkaebi · their joint blows)
  const s = Companion.shardEta(f, true);
  if (s !== null && (eta === null || s < eta)) eta = s;
  const o = Shuttle.etaFor(f);                     // the shuttle orb coming for me: the ring in my own colour
  if (o !== null && (eta === null || o < eta)) { eta = o; col = mine; }
  if (eta === null && Game.tagMode && Shuttle.o && Shuttle.o.phase === 'fly' && Shuttle.o.recv !== f) { eta = Shuttle.o.T - Shuttle.o.t; col = Slots.col(Slots.color(Shuttle.o.recv)); }   // tag solo: for the benched one → tag
  return eta === null || eta > FEEL.PARRY_RING_LEAD || eta < -0.08 ? null : { eta, col };
}
function drawParryCue(f) {
  if (f.state === 'parry' && f.parried) return;
  const th = parryThreat(f);
  if (!th) return;
  const [x, y] = toHud(f.ch.pos.x, 0.05, f.ch.pos.z), now = th.late || th.eta <= Math.min(0.34, Waves.parryWindow(f) - 0.04);
  const ell = (rx, col, dotted) => {
    const n = Math.max(16, Math.round(rx * 5)); hctx.fillStyle = col;
    for (let i = 0; i < n; i++) { if (dotted && i % 2) continue; const a = i / n * TAU; hctx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * rx * 0.55), 1, 1); }
  };
  ell(8, PAL_HEX[now ? C.HOTW : C.STONE2], !now);                          // target ring
  const k = Math.max(0, th.eta) / FEEL.PARRY_RING_LEAD, rx = 8 + 18 * k;  // approach ring
  ell(rx, PAL_HEX[now ? C.HOTW : th.col], false); ell(rx + 1, PAL_HEX[C.VOID], true);
  if (now) {
    ell(rx - 1, PAL_HEX[th.col], false);
    const K = keyNames(f), tagOK = Game.tagMode && Game.tagCd <= 0 && fighters.some(o => o !== f && o.active && o.bench && o.state !== 'down');
    txtC(tagOK ? `${K.parry}/${K.tag}` : K.parry, x, Math.round(y + 7), PAL_HEX[C.HOTW], 2);
  }
}
// ---- top centre: the shared rally (5 cells · lit from 3 = buff · 5 = perfect rally)
function drawRally(dt) {
  const W = CFG.BASE_W, n = FEEL.RALLY_MAX, gap = 14, cy = 13, cx = W / 2;
  const hot = Duo.rally >= FEEL.RALLY_BUFF_AT, full = Duo.fullT > 0, blink = Math.floor(clock.t * 10) % 2 === 0;
  txtC('RALLY', cx, 1, PAL_HEX[hot ? C.HOT : C.STONE3]);
  for (let i = 0; i < n; i++) {
    const x = Math.round(cx + (i - (n - 1) / 2) * gap), on = i < Duo.rally, pop = on && i === Duo.rally - 1 && Duo.popT > 0;
    const fill = full ? (blink ? C.HOTW : C.HOT) : on ? (hot ? (i === n - 1 ? C.HOTW : C.HOT) : C.BONE1) : C.ABYSS;
    const edge = full ? C.HOTW : on ? (hot ? C.HOTW : C.BONE2) : C.DUSK;
    diamond(x, cy, pop ? 6 : 5, null, C.VOID);
    diamond(x, cy, pop ? 5 : 4, fill, edge);
    if (on && hot) { hctx.fillStyle = PAL_HEX[C.HOTW]; hctx.fillRect(x - 1, cy - 2, 1, 1); }
  }
  // decay warning: the top cell blinks during the last second before it drops
  if (Duo.rally > 0 && Duo.rallyT > FEEL.RALLY_DECAY - 1 && blink) {
    const x = Math.round(cx + (Duo.rally - 1 - (n - 1) / 2) * gap); diamond(x, cy, 4, C.DEEP, C.STONE1);
  }
  if (Duo.buffT > 0) {                           // buff timer under the cells
    const bw = 58, bx = Math.round(cx - bw / 2);
    hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(bx - 1, 20, bw + 2, 3);
    hctx.fillStyle = PAL_HEX[C.EMBER]; hctx.fillRect(bx, 21, Math.round(bw * Duo.buffT / FEEL.RALLY_BUFF_T), 1);
    txtC('DMG X1.3  SPD X1.15', cx, 25, PAL_HEX[C.HOT]);
  }
  if (Duo.brokeT > 0) txtC('BROKEN', cx, 25, PAL_HEX[C.STONE2]);
  if (full) txtC('PERFECT RALLY', cx, 40, PAL_HEX[blink ? C.HOTW : C.HOT], 2, PAL_HEX[C.CRIM0]);
}
// ---- tag solo: two portraits bottom-left (the one on the field lit), tag key + cooldown
function drawTagHud() {
  const cy = 186, K = keyNames(fighters[0]);
  fighters.forEach((f, i) => {
    const cx = 18 + i * 30, on = f.onField, down = f.state === 'down', r = on ? 11 : 9;
    diamond(cx, cy, r + 1, null, C.VOID); diamond(cx, cy, r, C.ABYSS, down ? C.CRIM0 : on ? PCOL[f.idx] : C.DUSK);
    const pal = facePal(f);                       // 2단계: the character's colours
    for (let y = 2; y < 11; y++) for (let x = 1; x < 11; x++) {
      const ch = FACE[y][x]; if (ch === '.') continue;
      const px = cx - 6 + x, py = cy - 6 + y;
      if (Math.abs(px - cx) + Math.abs(py - cy) > r - 1) continue;
      hctx.fillStyle = PAL_HEX[down ? C.DUSK : on ? pal[ch] : (ch === 's' ? C.STONE1 : C.DUSK)]; hctx.fillRect(px, py, 1, 1);
    }
    const bw = 20, bx = cx - 10, by = cy + r + 3;
    hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(bx - 1, by - 1, bw + 2, 4);
    hctx.fillStyle = PAL_HEX[down ? C.CRIM0 : on ? C.CRIM1 : C.BLOOD2]; hctx.fillRect(bx, by, Math.round(bw * f.hp / FIGHT.PLAYER_HP), 2);
    txtC(down ? 'DOWN' : f.label, cx, by + 4, PAL_HEX[down ? C.CRIM2 : on ? PCOL[f.idx] : C.STONE1], 1, null);
    drawSlots(f, cx, cy - r - 6, true);           // 1.6: each character's wave slots over its portrait
  });
  const k = Game.tagCd / FEEL.TAG_CD, x0 = 58, ready = k <= 0 && fighters.some(o => o.active && o.bench && o.state !== 'down');
  txt(`${K.tag} TAG`, x0, cy - 3, PAL_HEX[ready ? C.BONE1 : C.STONE1]);
  hctx.fillStyle = PAL_HEX[C.DEEP]; hctx.fillRect(x0, cy + 4, 22, 1);
  hctx.fillStyle = PAL_HEX[ready ? C.HOT : C.STONE2]; hctx.fillRect(x0, cy + 4, Math.round(22 * (1 - Math.max(0, k))), 1);
}
function drawSystemsHud(dt) {
  const W = CFG.BASE_W, S = Rush.scale() / 0.56, blink = Math.floor(clock.t * 8) % 2 === 0;
  const onF = fighters.filter(f => f.onField && f.state !== 'down');
  drawRally(dt);
  if (Game.tagMode) drawTagHud();
  drawShuttleHud(); drawMarkHud(); Stage.drawLink();
  // B. aggro: a dotted line from the boss's eye to its target + an eye mark over the target (only with two on the field)
  const tgt = AI.aggro;
  if (Dk.on) Dk.drawAggro(onF);                  // 2단계 보스 4: one line per dokkaebi, in its colour
  else if (AI.targetable() && boss.root.visible && tgt && tgt.alive && onF.length > 1) {
    const [ax, ay] = toHud(boss.pos.x, boss.pos.y + 3.9 * Rush.scale(), boss.pos.z), [bx, by] = toHud(tgt.ch.pos.x, tgt.ch.pos.y + 2.25, tgt.ch.pos.z);
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4)), ph = Math.floor(clock.t * 10) % 2;
    for (let i = ph; i <= n; i += 2) { hctx.fillStyle = PAL_HEX[C.CRIM0]; hctx.fillRect(Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n), 1, 1); }
  }
  for (const f of fighters) {
    if (!f.onField || f.state === 'down') continue;
    const [x, y] = toHud(f.ch.pos.x, f.ch.pos.y + 2.25, f.ch.pos.z), X = Math.round(x), Y = Math.round(y);
    if ((Dk.on ? Dk.watching(f) : tgt === f && AI.targetable()) && onF.length > 1) {   // eye mark: the boss is watching this one
      hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(X - 4, Y - 3, 9, 5);
      hctx.fillStyle = PAL_HEX[C.CRIM1]; hctx.fillRect(X - 3, Y - 2, 7, 3);
      hctx.fillStyle = PAL_HEX[C.HOT]; hctx.fillRect(X - 1, Y - 2, 3, 3);
      hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(X, Y - 1, 1, 1);
    }
    const offer = finOffer(f);
    if (offer) {                                 // A. this one can finish right now: both keys + finisher names over the head
      const K = keyNames(f);
      offer.names.forEach((n, i) => txtC(`${K[`s${i + 1}`]} ${finLabel(n)}`, X, Y - 22 + i * 8, PAL_HEX[i ? (blink ? C.HOT : C.HOTW) : (blink ? C.HOTW : C.HOT)], 1));
      if (offer.tag) txtC(`TAG ${offer.who.label}`, X, Y - 30, PAL_HEX[C.STONE3]);
    }
    if (f.state === 'grabbed' && AI.grab) {      // D. held: how long before the slam
      const k = Math.max(0, AI.t / FEEL.GRAB.hold);
      hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(X - 13, Y - 22, 26, 4);
      hctx.fillStyle = PAL_HEX[C.CRIM2]; hctx.fillRect(X - 12, Y - 21, Math.round(24 * k), 2);
      txtC(Game.tagMode ? `${keyNames(f).tag} RESCUE` : 'HELP!', X, Y - 30, PAL_HEX[blink ? C.HOTW : C.CRIM2]);
    }
    if (!Game.botFor(f)) drawParryCue(f);
  }
  Dk.each(() => {                                // (2단계: per dokkaebi)
  if (AI.state === 'status') {                   // the status window closing (holds while a finisher is on its way)
    const win = (Duo.st && Duo.st.win) || FEEL.LINK_WINDOW, emp = Duo.st && Duo.st.emp;
    const [x, y] = toHud(boss.pos.x, boss.pos.y + 4.3 * Rush.scale(), boss.pos.z), k = Math.max(0, 1 - AI.t / win);
    hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(Math.round(x) - 17, Math.round(y) - 1, 34, 4);
    hctx.fillStyle = PAL_HEX[emp ? Slots.col(emp) : C.HOT]; hctx.fillRect(Math.round(x) - 16, Math.round(y), Math.round(32 * k), 2);   // 1.6: empowered → the wave's colour
    txtC(STATUS_LABEL[AI.stKind], Math.round(x), Math.round(y) - 8, PAL_HEX[C.HOT]);
  }
  if (AI.pinT > 0 && AI.targetable()) {          // PIN DOWN: how long it can't turn
    const [x, y] = toHud(boss.pos.x, boss.pos.y + 4.3 * Rush.scale(), boss.pos.z), k = Math.min(1, AI.pinT / FEEL.FINISH.pinDown.pinT);
    hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(Math.round(x) - 17, Math.round(y) + 5, 34, 4);
    hctx.fillStyle = PAL_HEX[C.BONE1]; hctx.fillRect(Math.round(x) - 16, Math.round(y) + 6, Math.round(32 * k), 2);
    txtC('PINNED', Math.round(x), Math.round(y) + 11, PAL_HEX[C.BONE2]);
  }
  });
  if (Game.bannerT > 0) { txtC(Game.bannerText, W / 2, 52, PAL_HEX[C.BONE2], 2); Game.bannerT -= dt; }
  // flash: a 1px frame in the moment's colour
  const E = Game.edgeFlash;
  if (E && E.t > 0) {
    hctx.fillStyle = PAL_HEX[E.col];
    hctx.fillRect(0, 0, W, 1); hctx.fillRect(0, CFG.BASE_H - 1, W, 1); hctx.fillRect(0, 0, 1, CFG.BASE_H); hctx.fillRect(W - 1, 0, 1, CFG.BASE_H);
    E.t -= dt;
  }
  void S;
}
