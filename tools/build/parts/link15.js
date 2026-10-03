// ---- 1.5단계 A. 걸고 받기: 시동 스킬(캐릭터별 2개) → 보스 상태(뜸·무릎·휘청·돌아섬) → 다른 사람의 U·I = 마무리 (2 × 2 × 2 = 8가지)
//      누가 먼저(A/B) × 시동 스킬(1/2) × 받는 사람의 스킬(1/2). 자기 시동은 자기가 못 받음 · 상태 면역(LIFT_IMMUNE)은 네 상태 공유
const FIN = {                                     // status → [receiver's skill 1, skill 2]
  lift:    ['skyPierce', 'skyDance'],             // B 올려치기 → A가 받음
  kneel:   ['crownThrust', 'spineRide'],          // B 내려찍기 → A가 받음
  stagger: ['ramLink', 'topple'],                 // A 섬광 찌르기 → B가 받음
  turn:    ['backRiser', 'pinDown'],              // A 역회전 베기 → B가 받음
};
const FIN_LABEL = { skyPierce: 'SKY PIERCE', skyDance: 'SKY DANCE', crownThrust: 'CROWN THRUST', spineRide: 'SPINE RIDE',
                    ramLink: 'RAM LINK', topple: 'TOPPLE', backRiser: 'BACK RISER', pinDown: 'PIN DOWN' };
const STATUS_LABEL = { lift: 'LIFTED', kneel: 'KNEEL', stagger: 'STAGGER', turn: 'TURNED' };
const SKILL_CLIP = Object.fromEntries(Object.keys(SKILLS2).map(k => [k, SKILLS2[k].clip]));   // 2단계: from the skill table
const SKILL_LABEL = { thrust: 'THRUST', spin: 'SPIN', launch: 'LAUNCH', smash: 'SMASH' };

// ---- finishers: each drives its own path (the fighter's root motion is off) and lands its hits on clip events ('fin', k)
//      start(L) · update(L, dt) → true when it no longer needs driving · hit(L, k) for clip events
const FINDEF = {
  // 휘청 + B 스킬 1: 날아가 박치기 (1단계 연계기) — coil, fly at the boss body-first, ram, back-flip away
  ramLink: {
    start(L) { L.f.ch.play('link', 1, 0); L.phase = 'wind'; Sfx.play('dash'); },
    update(L, dt) {
      const f = L.f, p = f.ch;
      if (L.phase === 'wind') {                    // coil: a beat of anticipation before the jump
        if (L.t >= FEEL.LINK.wind) { L.phase = 'fly'; L.t = 0; Particles.burst('dust', p.pos, null, 16, 1.7); Sfx.play('swing3'); CamRig.shake(2, 0.12); }
        return false;
      }
      if (L.phase === 'fly') {                     // flying at the boss, invulnerable
        const tx = boss.pos.x - p.pos.x, tz = boss.pos.z - p.pos.z, d = Math.hypot(tx, tz) || 1e-6;
        p.face(Math.atan2(tx, tz));
        const step = FEEL.LINK.speed * dt, reach = boss.radius + p.radius + 0.1;
        p.pos.y = Math.min(0.55 + boss.pos.y * 0.9, p.pos.y + dt * 7);
        Particles.burst('trail', V3(p.pos.x, p.pos.y, p.pos.z), null, 3); Particles.burst('spark', V3(p.pos.x, p.pos.y + 1.0, p.pos.z), V3(-tx / d, 0, -tz / d), 1, 0.6);
        if (d - step <= reach || L.t >= FEEL.LINK.maxT) {
          L.phase = 'land'; L.t = 0; L.y0 = p.pos.y;
          const n = V3(tx / d, 0, tz / d), hitP = V3(boss.pos.x - n.x * boss.radius * 0.8, p.pos.y + 1.0, boss.pos.z - n.z * boss.radius * 0.8);
          if (Duo.finStrike(L, { hitP, dir: V3(n.x, 0.5, n.z).normalize(), kick: 4, fx: 3, weak: false })) {
            Particles.burst('metal', hitP, V3(-n.x, 0.4, -n.z), 26, 1.8); Particles.burst('spark', hitP, null, 30, 2.2); Particles.burst('shard', hitP, null, 12, 1.2);
            CamRig.shake(5, 0.45); CamRig.kick(n, 4); Game.edgeFlash = { t: 0.14, col: C.HOT }; Sfx.play('link');
            AI.endStatus(L.name, f);                // the boss crashes down (unless the hit broke it or killed it)
          }
          Duo.finRelease(L, 'link'); p.face(Math.atan2(n.x, n.z)); p.play('linkEnd', 1, 0);
        } else { p.pos.x += tx / d * step; p.pos.z += tz / d * step; }
        return false;
      }
      const u = Math.min(1, L.t / 0.42);           // 'land': fall back to the floor during the back-flip
      p.pos.y = L.y0 * (1 - u * u);
      if (u >= 1) { p.pos.y = 0; return true; }
      return false;
    },
  },
};
// ---- path helpers (positions around the boss; frames = the finisher clip's 12 fps frames, fr = L.t × 12)
const FP = {
  fwd() { return V3(Math.sin(boss.facing), 0, Math.cos(boss.facing)); },
  back(off) { const f = this.fwd(); return V3(boss.pos.x - f.x * (boss.radius + off), 0, boss.pos.z - f.z * (boss.radius + off)); },
  toward(from, off) {                              // the boss surface point facing `from`, `off` outside it
    const d = V3(from.x - boss.pos.x, 0, from.z - boss.pos.z).normalize();
    return V3(boss.pos.x + d.x * (boss.radius + off), 0, boss.pos.z + d.z * (boss.radius + off));
  },
  head() { return boss.root.getObjectByName('head').getWorldPosition(V3()); },
  chest() { return boss.weak[0].obj.getWorldPosition(V3()); },
  crystal() { return boss.weak[2].obj.getWorldPosition(V3()); },   // the back crystal
  ease(u) { u = Math.max(0, Math.min(1, u)); return 1 - (1 - u) * (1 - u); },
  bez(a, c, b, u) { const v = 1 - u; return v * v * a + 2 * v * u * c + u * u * b; },
  set(p, x, y, z) { p.pos.set(x, y, z); },
  faceBoss(p) { p.face(Math.atan2(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z)); },
  // run round the boss (never through it) from L.from to point `to` (0..1)
  around(L, to, u) {
    const b = boss.pos, a0 = Math.atan2(L.from.x - b.x, L.from.z - b.z), a1 = Math.atan2(to.x - b.x, to.z - b.z);
    const r0 = Math.hypot(L.from.x - b.x, L.from.z - b.z), r1 = Math.hypot(to.x - b.x, to.z - b.z), e = this.ease(u);
    const a = a0 + angDiff(a1, a0) * e, r = Math.max(boss.radius + 0.45, r0 + (r1 - r0) * e) - (u >= 1 ? 0 : 0);
    return u >= 1 ? to.clone() : V3(b.x + Math.sin(a) * r, 0, b.z + Math.cos(a) * r);
  },
  trail(p, n = 3) { Particles.burst('trail', V3(p.pos.x, p.pos.y, p.pos.z), null, n); },
};
Object.assign(FINDEF, {
  // 뜸 + A 스킬 1: 공중 관통 — coil, then a lance-straight flight through the floating boss's chest and out the far side
  skyPierce: {
    start(L) { L.f.ch.play('fSkyPierce', 1, 0); L.dir = V3(boss.pos.x - L.from.x, 0, boss.pos.z - L.from.z).normalize(); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12, b = boss.pos, d = L.dir, far = boss.radius + 1.5;
      if (fr < 3) { FP.faceBoss(p); return false; }
      const P2x = b.x + d.x * far, P2z = b.z + d.z * far;
      if (fr < 6) {                                 // through the chest: a flat-topped arc, the blade leading
        const u = (fr - 3) / 3, peak = Math.max(1.2, FP.chest().y - 1.0);
        FP.set(p, L.from.x + (P2x - L.from.x) * u, peak * (1 - Math.pow(2 * u - 1, 4)), L.from.z + (P2z - L.from.z) * u);
        p.face(Math.atan2(d.x, d.z)); FP.trail(p, 4); L.y6 = p.pos.y;
        return false;
      }
      const u = Math.min(1, (fr - 6) / 3);          // out the far side: drop and skid
      FP.set(p, P2x + d.x * 0.8 * FP.ease(u), (L.y6 || 0) * (1 - u) * (1 - u), P2z + d.z * 0.8 * FP.ease(u));
      if (u < 1) return false;
      Particles.burst('dust', p.pos, null, 14, 1.4);
      return true;
    },
    hit(L) {
      const c = FP.chest();
      if (!Duo.finStrike(L, { from: L.from, hitP: c, dir: L.dir, kick: 4, fx: 3, weak: false })) return;
      const d = L.dir;
      for (let k = 0; k < 6; k++) Particles.burst('spark', V3(c.x + d.x * k * 0.35, c.y, c.z + d.z * k * 0.35), d, 5, 1.6);   // out through the back
      Particles.burst('shard', c, d, 14, 1.4); CamRig.shake(5, 0.4); CamRig.kick(d, 4); Game.edgeFlash = { t: 0.12, col: C.HOTW }; Sfx.play('link');
      AI.endStatus(L.name);
    },
  },
  // 뜸 + A 스킬 2: 공중 난도 — leap up and circle the floating boss with four cuts (rally +2 on the last)
  skyDance: {
    start(L) { L.f.ch.play('fSkyDance', 1, 0); L.a0 = Math.atan2(L.from.x - boss.pos.x, L.from.z - boss.pos.z); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12, b = boss.pos, r = boss.radius + 0.6, h = Math.max(1.0, FP.chest().y - 1.3);
      if (fr < 3) { FP.faceBoss(p); return false; }
      const ang = fr < 4.5 ? L.a0 : L.a0 + Math.min(1, (fr - 4.5) / 10.5) * 1.6 * Math.PI;
      if (fr < 4.5) {                                // up onto the orbit
        const u = (fr - 3) / 1.5, ox = b.x + Math.sin(ang) * r, oz = b.z + Math.cos(ang) * r;
        FP.set(p, L.from.x + (ox - L.from.x) * u, h * FP.ease(u), L.from.z + (oz - L.from.z) * u); FP.faceBoss(p); return false;
      }
      if (fr < 15) {                                 // circling: cut on f5 · f8 · f11 · f14
        FP.set(p, b.x + Math.sin(ang) * r, h + Math.sin(fr * 1.3) * 0.08, b.z + Math.cos(ang) * r); FP.faceBoss(p); FP.trail(p, 2); L.aEnd = ang; return false;
      }
      const u = Math.min(1, (fr - 15) / 2.5), a = L.aEnd ?? ang, rr = r + 0.8 * u;   // drop outward
      FP.set(p, b.x + Math.sin(a) * rr, h * (1 - u * u), b.z + Math.cos(a) * rr);
      if (u < 1) return false;
      Particles.burst('dust', p.pos, null, 12, 1.2);
      return true;
    },
    hit(L, k) {
      const p = L.f.ch;
      if (!Duo.finStrike(L, { from: p.pos.clone(), kick: 2, fx: 2, weak: false })) return;
      Particles.burst('metal', V3(boss.pos.x, p.pos.y + 1.0, boss.pos.z), null, 10, 1.4); Sfx.play(k === 3 ? 'swing3' : 'swing');
      if (k === 3) { Duo.rallyUp(FEEL.FINISH.skyDance.rally, L.f); AI.endStatus(L.name); }
    },
  },
  // 무릎 + A 스킬 1: 정수리 찌르기 — a high jump over the kneeling boss, the rapier driven down into its crown, kick off and land
  crownThrust: {
    start(L) { L.f.ch.play('fCrown', 1, 0); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12, hd = FP.head();
      if (fr < 3) { FP.faceBoss(p); return false; }
      const top = hd.y + 0.25;
      if (fr < 7.5) {                                // up and over: quadratic arc to just above the head
        const u = (fr - 3) / 4.5;
        FP.set(p, FP.bez(L.from.x, (L.from.x + hd.x) / 2, hd.x, u), FP.bez(0, top + 2.6, top + 0.9, u), FP.bez(L.from.z, (L.from.z + hd.z) / 2, hd.z, u));
        FP.faceBoss(p); FP.trail(p, 2); return false;
      }
      if (fr < 9.5) { FP.set(p, hd.x, fr < 8 ? top + 0.9 - (fr - 7.5) * 1.3 : top + 0.25, hd.z); return false; }   // the plunge, then stuck a beat
      if (!L.land) L.land = FP.toward(L.from, 1.7);
      const u = Math.min(1, (fr - 9.5) / 3.5);       // kick off backwards, land in front of it
      FP.set(p, FP.bez(hd.x, (hd.x + L.land.x) / 2, L.land.x, u), FP.bez(top + 0.25, top + 1.6, 0, u), FP.bez(hd.z, (hd.z + L.land.z) / 2, L.land.z, u));
      p.face(Math.atan2(hd.x - p.pos.x, hd.z - p.pos.z));
      return u >= 1;
    },
    hit(L) {
      const hd = FP.head();
      if (!Duo.finStrike(L, { from: L.from, hitP: hd, dir: V3(0, -1, 0), kick: 5, fx: 3, weak: false })) return;
      Particles.burst('spark', hd, V3(0, 1, 0), 30, 2.2); Particles.burst('shard', hd, null, 14, 1.4); Particles.burst('metal', hd, null, 16, 1.6);
      CamRig.shake(5, 0.45); Game.edgeFlash = { t: 0.12, col: C.HOTW }; Sfx.play('weak'); Sfx.play('link');
      AI.endStatus(L.name);
    },
  },
  // 무릎 + A 스킬 2: 등 타기 베기 — sprint round to the back, run up it cutting the back crystal three times, back-flip off
  spineRide: {
    start(L) { L.f.ch.play('fSpine', 1, 0); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12;
      if (fr < 4) { const q = FP.around(L, FP.back(0.35), fr / 4); FP.set(p, q.x, 0, q.z); FP.faceBoss(p); FP.trail(p, 3); return false; }
      if (fr < 13) {                                 // on its back: climbing toward the crystal
        const u = (fr - 4) / 9, q0 = FP.back(0.3), q1 = FP.back(-0.35), cy = FP.crystal().y;
        FP.set(p, q0.x + (q1.x - q0.x) * u, 0.6 + (Math.max(1.4, cy - 0.9) - 0.6) * FP.ease(u * 1.4), q0.z + (q1.z - q0.z) * u); FP.faceBoss(p); L.top = p.pos.clone();
        return false;
      }
      const u = Math.min(1, (fr - 13) / 4), q = FP.back(1.9), t0 = L.top || p.pos;
      FP.set(p, FP.bez(t0.x, (t0.x + q.x) / 2, q.x, u), FP.bez(t0.y, t0.y + 1.2, 0, u), FP.bez(t0.z, (t0.z + q.z) / 2, q.z, u));
      FP.faceBoss(p);
      return u >= 1;
    },
    hit(L, k) {
      const p = L.f.ch;
      if (!Duo.finStrike(L, { from: p.pos.clone(), kick: 2, fx: 2, weak: true })) return;
      const c = FP.crystal(); Particles.burst('spark', c, V3(0, 1, 0), 12, 1.5); Sfx.play('swing');
      if (k === 2) AI.endStatus(L.name);
    },
  },
  // 휘청 + B 스킬 2: 넘어뜨리기 — rush in low and sweep the reeling boss's legs out: it goes straight down (a short groggy)
  topple: {
    start(L) { L.f.ch.play('fTopple', 1, 0); L.to = FP.toward(L.from, 1.0); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12, to = FP.toward(L.from, 1.0);
      if (fr < 3) { const u = FP.ease(fr / 3); FP.set(p, L.from.x + (to.x - L.from.x) * u, 0, L.from.z + (to.z - L.from.z) * u); FP.faceBoss(p); FP.trail(p, 3); return false; }
      FP.faceBoss(p);
      return fr >= 9;
    },
    hit(L) {
      const n = V3(boss.pos.x - L.f.ch.pos.x, 0, boss.pos.z - L.f.ch.pos.z).normalize();
      const hitP = V3(boss.pos.x - n.x * boss.radius * 0.9, 0.7, boss.pos.z - n.z * boss.radius * 0.9);
      if (!Duo.finStrike(L, { hitP, dir: V3(n.x, -0.2, n.z).normalize(), kick: 4, fx: 3, weak: false })) return;
      Particles.burst('metal', hitP, n, 18, 1.6);
      if (AI.state === 'dead' || AI.state === 'transform') return;
      AI.toGroggy('KNOCKED DOWN'); AI.t = FEEL.FINISH.topple.groggyT;
      Particles.burst('dust', boss.pos, null, 40, 2.6); Particles.burst('debris', boss.pos, null, 14, 1.4); CamRig.shake(5, 0.45); Sfx.play('boom', 1.3);
    },
  },
  // 돌아섬 + B 스킬 1: 등 올려베기 — dash in behind the turned boss and rip a huge rising cut up its back crystal
  backRiser: {
    start(L) { L.f.ch.play('fBackRiser', 1, 0); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12, q = FP.back(0.8);
      if (fr < 3) { const r = FP.around(L, q, fr / 3); FP.set(p, r.x, 0, r.z); FP.faceBoss(p); FP.trail(p, 3); return false; }
      FP.set(p, q.x, fr > 6 && fr < 10 ? 0.55 * Math.sin(Math.PI * (fr - 6) / 4) : 0, q.z); FP.faceBoss(p);
      return fr >= 10;
    },
    hit(L) {
      const p = L.f.ch;
      if (!Duo.finStrike(L, { from: p.pos.clone(), dir: V3(0, 1, 0), kick: 5, fx: 3, weak: true })) return;
      const c = FP.crystal(); Particles.burst('spark', c, V3(0, 1, 0), 30, 2.2); Particles.burst('shard', c, V3(0, 1, 0), 16, 1.5);
      CamRig.shake(5, 0.4); Game.edgeFlash = { t: 0.12, col: C.HOT }; Sfx.play('link');
      AI.endStatus(L.name);
    },
  },
  // 돌아섬 + B 스킬 2: 등 찍어 박기 — leap onto the turned boss's back and drive the greatsword in: it can't turn for PIN_T s
  pinDown: {
    start(L) { L.f.ch.play('fPin', 1, 0); Sfx.play('dash'); },
    update(L) {
      const p = L.f.ch, fr = L.t * 12, c = FP.crystal(), fw = FP.fwd(), st = V3(c.x - fw.x * 0.35, c.y - 0.35, c.z - fw.z * 0.35);
      if (fr < 3) { const r = FP.around(L, FP.back(0.6), fr / 3); FP.set(p, r.x, 0, r.z); FP.faceBoss(p); FP.trail(p, 3); L.b0 = r; return false; }
      if (fr < 7) {                                  // leap up and over the stake point, then drop onto it
        const u = (fr - 3) / 4, b0 = L.b0;
        FP.set(p, FP.bez(b0.x, st.x - fw.x * 0.4, st.x, u), FP.bez(0, st.y + 2.2, st.y, u), FP.bez(b0.z, st.z - fw.z * 0.4, st.z, u)); FP.faceBoss(p); return false;
      }
      if (fr < 12) { FP.set(p, st.x, st.y, st.z); FP.faceBoss(p); if (Math.random() < 0.5) Particles.burst('spark', c, null, 2, 0.8); L.top = p.pos.clone(); return false; }
      const u = Math.min(1, (fr - 12) / 4), q = FP.back(2.0), t0 = L.top || p.pos;
      FP.set(p, FP.bez(t0.x, (t0.x + q.x) / 2, q.x, u), FP.bez(t0.y, t0.y + 1.3, 0, u), FP.bez(t0.z, (t0.z + q.z) / 2, q.z, u)); FP.faceBoss(p);
      return u >= 1;
    },
    hit(L) {
      const p = L.f.ch;
      if (!Duo.finStrike(L, { from: V3(p.pos.x, 0, p.pos.z), dir: V3(0, -1, 0), kick: 4, fx: 3, weak: true })) return;
      const c = FP.crystal(); Particles.burst('spark', c, null, 26, 1.8); Particles.burst('shard', c, null, 12, 1.2); Particles.burst('metal', c, null, 14, 1.4);
      CamRig.shake(5, 0.4); Sfx.play('slam');
      AI.pinT = FEEL.FINISH.pinDown.pinT;
      AI.endStatus(L.name);
    },
  },
});

Object.assign(Duo, {
  benchFor(f) { return Game.tagMode ? fighters.find(o => o !== f && o.active && o.bench && o.state !== 'down') : null; },
  // the boss is in a status the OTHER person started → my U / I are its two finishers
  canFinish(f) {
    if (!this.st || this.st.fin || this.st.by === f) return false;
    return Dk.with(Dk.stIdx(), () => AI.state === 'status' && f.alive && f.ch.pos.distanceTo(boss.pos) <= FEEL.FINISH_MAXD);   // (2단계: the dokkaebi the status is on)
  },
  finisherFor(slot, f) { return this.st ? (f ? finName(f, this.st.kind, slot) : FIN[this.st.kind][slot - 1]) : null; },
  // U / I pressed (from any cancel point): finisher · (tag solo) swap-in finisher · my starter skill
  skill(f, slot, wdir) {
    if (Game.mode !== 'fight' || Game.state !== 'play' || !AI.targetable()) return false;
    if (this.canFinish(f)) { this.startFinish(f, slot); return true; }
    // tag solo: the starter's own U / I bring the benched character in with that finisher (L stays the tag-parry key)
    if (Game.tagMode && this.st && !this.st.fin && this.st.by === f && AI.state === 'status' && this.benchFor(f)
        && boss.pos.distanceTo(f.ch.pos) <= FEEL.FINISH_MAXD && Game.tagSwap(f, { finish: slot })) return true;
    const kind = f.skillKind(slot);
    if (f.cd[slot - 1] > 0) {
      if (f.fizzleT <= 0) { Sfx.play('fizzle'); f.fizzleT = 0.35; Game.popup('COOLDOWN', V3(f.ch.pos.x, 2.0, f.ch.pos.z), C.STONE2); }
      return false;
    }
    this.startSkill(f, slot, kind, wdir); return true;
  },
  startSkill(f, slot, kind, wdir) {
    const p = f.ch, S = FEEL.SKILLS[kind];
    f.state = 'cast'; f.castKind = kind; f.castFired = false; f.castId++; f.t = 0; f.vel.set(0, 0, 0); f.bufAtk = f.bufDodge = 0;
    f.cd[slot - 1] = S.cd;
    f.castEmp = Slots.take(f);                     // 1.6: the oldest wave powers this starter (null = plain)
    f.castN = 0; f.castHitAny = false;             // 2단계: strike frames seen / any of them hit (multi-hit starters)
    if (f.castEmp) this.stats.wave.empStart++;
    f.aimAtBoss(wdir, 1.2);
    p.turnRate = 0; p.rootOn = true; p.play(SKILL_CLIP[kind], 1, 0);
    if (kind === 'thrust' && p.clip.root) {        // the lunge stretches to stop just short of the boss (up to S.lunge)
      const nominal = sampleRoot(p.clip, p.clip.frames) - sampleRoot(p.clip, 0);
      const db = Math.hypot(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z), face = Math.atan2(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z);
      if (AI.targetable() && Math.abs(angDiff(face, p.facing)) < 0.3 && nominal > 0.05)
        p.rootScale = Math.max(nominal * 0.5, Math.min(S.lunge, db - boss.radius - p.radius - FEEL.MAGNET_GAP)) / nominal;
    }
    Sfx.play(kind === 'thrust' ? 'dash' : 'swing3');
    this.stats.starts++; this.stats.launches++; this.stats.startBy[kind] = (this.stats.startBy[kind] || 0) + 1;   // (2단계: every skill, not just the old four)
  },
  // the starter clip's strike frame (event 'cast'): hit test → damage → status (if the boss can take one)
  onSkillFrame(f, e) {
    if (!f) return;
    if (f.state === 'finish' && f.fin && f.fin.D === FinC) { FinC.onCast(f.fin); return; }   // 2단계: a finisher reusing this skill's motion
    const p = f.ch, P = p.pos, kind = f.castKind, S = FEEL.SKILLS[kind];
    const PS2 = SKILLS2[Game.mode === 'fight' ? kind : CLIP_SKILL[p.clip && p.clip.name]];
    if (PS2 && PS2.proj) { SkillFx.cast(f, PS2, e); return; }   // 2단계: wind blades / ground crack (hit · status when they land)
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    const E = f.castEmp && S ? Slots.startE(f) : null;   // 1.6 empowered: 청파 = longer status / wider · 적파 = harder (2단계: 쌍검 × twinK)
    if (E && Game.mode === 'fight' && f.state === 'cast' && f.castKind === kind && !f.castFired)
      Particles.burst(Slots.pk(f.castEmp), V3(P.x + fx * 1.0, 1.0, P.z + fz * 1.0), V3(fx, 0.2, fz), 16, 1.6);
    if (kind === 'smash') {                        // the blade bites the floor: crack + debris either way
      const tip = V3(P.x + fx * 1.45, 0, P.z + fz * 1.45);
      Decals.add(3, { R: 1.25, x: tip.x, z: tip.z, rot: Math.random() * TAU, life: 5, fadeIn: 0.01, fadeOut: 1.4 });
      Particles.burst('dust', tip, null, 18, 1.6); Particles.burst('debris', tip, null, 10, 1.1); CamRig.shake(3, 0.22); Sfx.play('slam');
    } else if (kind === 'launch') {
      const tip = V3(P.x + fx * 0.9, 0.2, P.z + fz * 0.9);
      Particles.burst('dust', tip, null, 10, 1.3); Particles.burst('spark', V3(tip.x, 0.9, tip.z), V3(0, 1, 0), 10, 1.4);
    } else if (kind === 'spin') Particles.burst('trail', P, null, 12);
    else if (kind === 'thrust') Particles.burst('spark', V3(P.x + fx * 1.1, 1.1, P.z + fz * 1.1), V3(fx, 0, fz), 8, 1.4);
    if (Game.mode !== 'fight' || !S) { CamRig.shake(2, 0.14); return; }
    const N = S.hits || 1;                          // 2단계: a multi-hit melee starter hits on each strike frame · its status after the last (★11)
    if (f.state !== 'cast' || f.castKind !== kind || (N === 1 && f.castFired) || f.castN >= N) return;
    f.castFired = true; f.castN++; CamRig.shake(2, 0.14);
    const last = f.castN >= N;
    if (!AI.targetable()) return;
    const dx = boss.pos.x - P.x, dz = boss.pos.z - P.z, dist = Math.hypot(dx, dz);
    const reach = S.reach * (E ? E.reach : 1), half = S.half * (E ? E.half : 1);
    const tol = Math.asin(Math.min(1, boss.radius / Math.max(dist, boss.radius)));
    const inReach = dist - boss.radius <= reach && !(half < Math.PI && Math.abs(angDiff(Math.atan2(dx, dz), p.facing)) > half + tol);
    if (!inReach) { if (last && f.castHitAny) this.starterStatus(f, S, E); return; }
    if (!f.castHitAny) { this.stats.startHits++; this.stats.launchHits++; }
    f.castHitAny = true;
    const n = V3(dx, 0, dz).normalize();
    const hitP = V3(boss.pos.x - n.x * boss.radius * 0.9, kind === 'smash' ? 0.9 : kind === 'launch' ? 1.0 : 1.3, boss.pos.z - n.z * boss.radius * 0.9);
    const up = kind === 'launch' ? 1.4 : kind === 'smash' ? -0.6 : 0.2;
    this.hitBoss(f, S.dmg * (E ? E.dmg : 1), S.brk * (E ? E.brk : 1), P, V3(n.x, up, n.z).normalize(), { hitstop: S.hitstop, kick: 2, fx: 2 }, { hitP });
    if (E) { Particles.burst(Slots.pk(f.castEmp), hitP, null, 22, 2.0); CamRig.shake(3, 0.2); }
    Particles.burst('spark', hitP, V3(n.x * (kind === 'launch' ? 0 : 1), kind === 'launch' ? 1 : 0.3, n.z * (kind === 'launch' ? 0 : 1)), 18, 1.8);
    Particles.burst('shard', hitP, V3(0, 1, 0), 8);
    Unique.onHit(f, S);                             // 2단계: shield lift's cover · chain snatch freeing a grabbed partner
    if (last) this.starterStatus(f, S, E);
  },
  starterStatus(f, S, E) {
    if (!AI.targetable() || !AI.canStatus()) return;
    AI.startStatus(S.status, f);
    if (this.st) { this.st.emp = f.castEmp || null; this.st.win = FEEL.LINK_WINDOW * (E ? E.win : 1) * Relics.mul(f, 'statusT'); }   // (relic LONG BEAT ×1.3)
    Stage.onStatus(this.st);                        // 1.6: the call — tether to the partner
    Unique.onStatus(f, S);                          // 2단계: chain snatch hauls the partner behind the boss
  },
  // ---- finishers
  // 2단계: the pressed slot's skill → a common finisher (approach by status + that skill's motion + FIN2[status][shape]) · exclusive art → the 1.5 FINDEF
  startFinish(f, slot) {
    const st = this.st, sk = f.skillKind(slot), ex = this.exclusive(f, st.kind, sk), name = ex || `${st.kind}:${sk}`, D = ex ? FINDEF[ex] : FinC, p = f.ch;
    f.state = 'finish'; f.t = 0; f.vel.set(0, 0, 0); f.clearBufs(); f.pending = null;
    const L = { f, name, D, slot, kind: st.kind, sk, S: SKILLS2[sk], E: ex ? null : FIN2[st.kind][SKILLS2[sk].shape], t: 0, phase: 'go', hits: 0, y0: 0, from: p.pos.clone(), done: false,
                by: st.by, byCol: Slots.color(st.by), stEmp: st.emp || null, emp: Slots.take(f), dk: Dk.on ? Dk.ci : undefined };   // 1.6: partner's empowered starter · my own wave · 2단계: on which dokkaebi
    L.violet = !!(L.stEmp && L.emp && L.stEmp !== L.emp); if (L.emp) this.stats.wave.empFin++;   // 2단계: violet = the starter's colour ≠ the finisher's (always so for a blue + red pair; the twin blades can match)
    f.fin = L; st.fin = L; this.fins = this.fins.filter(o => o.f !== f); this.fins.push(L);
    p.rootOn = false; p.turnRate = 0; p.rootScale = 1; p.face(Math.atan2(boss.pos.x - p.pos.x, boss.pos.z - p.pos.z));
    this.stats.fin[`${st.kind}:${slot}`]++; this.stats.links++;
    const S2 = this.stats, ck = ex ? `ex:${ex}` : `${st.kind}:${L.S.shape}`, kk = `${st.kind}:${sk}`;   // 2단계: the 12 cells (status × shape) · status × skill · exclusive arts
    S2.fin2 = S2.fin2 || {}; S2.fin2[ck] = (S2.fin2[ck] || 0) + 1; S2.finSk = S2.finSk || {}; S2.finSk[kk] = (S2.finSk[kk] || 0) + 1;
    Stage.onFinish(L);                              // 1.6: the answer — freeze · zoom · shake · maybe a cut-in
    D.start(L);
  },
  // one finisher hit: damage through the usual back / weak rules (hitBoss), its own groggy, a short global stop
  finStrike(L, o = {}) {
    if (!AI.targetable()) return false;
    const f = L.f, p = f.ch, from = o.from || p.pos;
    const F = L.E ? { dmg: L.E.dmg / L.E.hits, brk: L.E.brk, stop: L.E.stop * (L.air ? FEEL.FIN_COMMON.airStop : 1) } : FEEL.FINISH[L.name];   // 2단계: FIN2 cell (common) / FINISH (exclusive)
    const n = V3(boss.pos.x - from.x, 0, boss.pos.z - from.z).normalize();
    const hitP = o.hitP || V3(boss.pos.x - n.x * boss.radius * 0.8, p.pos.y + 1.0, boss.pos.z - n.z * boss.radius * 0.8);
    const M = Slots.finMul(L);                       // 1.6: plain · partner's wave (pass) · my wave · both = violet
    const r = this.hitBoss(f, F.dmg * M.dmg, F.brk * M.brk, from, o.dir || V3(n.x, 0.3, n.z).normalize(), { hitstop: F.stop + M.stop, kick: o.kick ?? 3, fx: o.fx ?? 2.5 },
                           { hitP, global: true, fin: true, weak: o.weak, weakAll: o.weakAll });
    L.hits++; this.stats.linkDmg += r.dmg; this.stats.finDmg += r.dmg;
    if (L.violet || L.emp || L.stEmp) Particles.burst(Slots.pk(L.violet ? 'violet' : L.emp || L.stEmp), hitP, null, 14, 1.6);
    if (L.hits === 1) {
      this.stats.linkHits++; this.stats.finN++;
      Game.popup(L.violet ? `VIOLET ${finLabel(L.name)}` : finLabel(L.name), V3(hitP.x, 3.4, hitP.z), L.violet ? C.PURP1 : C.HOT, 2);
      if (M.rally > 0) this.rallyUp(M.rally, f);
      if (L.E && L.E.rally) this.rallyUp(L.E.rally, f);   // 2단계: FIN2 multi-hit cells
      Relics.onFin(L);                              // 2단계: ECHO MASK on the partner
      Stage.onFinHit(L);
    }
    return true;
  },
  // the fighter gets control back (the clip's tail = recovery; dash / attack / parry can cut it after castLock)
  finRelease(L, kind = 'fin') {
    const f = L.f, p = f.ch;
    f.state = 'cast'; f.castKind = kind; f.castFired = true; f.t = 0; f.invuln = Math.max(f.invuln, 0.45);
    p.rootOn = true; p.turnRate = 0;
    if (p.clip && p.clip.root) p.rootPrev = sampleRoot(p.clip, p.done ? p.clip.frames : Math.min(p.clip.frames, p.f + (p.acc / ANIM_DT) * p.speed));   // 2단계: a skill clip played under path control hands over without a root jump
    if (this.st && this.st.fin === L) this.st.fin = null;
  },
  finEvent(f, e) { const L = f && this.fins.find(o => o.f === f); if (L && L.D.hit) L.D.hit(L, e.k || 0); },
  updateFins(gdt) {
    for (let i = this.fins.length - 1; i >= 0; i--) {
      const L = this.fins[i], f = L.f, p = f.ch, dt = f.fgdt ?? gdt;
      const lost = !f.onField || f.state === 'down' || (f.state !== 'finish' && !(f.state === 'cast' && (f.castKind === 'fin' || f.castKind === 'link')));
      if (lost) { p.pos.y = 0; if (this.st && this.st.fin === L) this.st.fin = null; if (f.fin === L) f.fin = null; this.fins.splice(i, 1); continue; }
      if (dt <= 0) continue;
      L.t += dt;
      if (Dk.with(L.dk, () => L.D.update(L, dt))) { if (f.state === 'finish') this.finRelease(L); p.pos.y = 0; f.fin = null; this.fins.splice(i, 1); }
    }
  },
});
