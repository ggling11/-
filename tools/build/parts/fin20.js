// ---- 2단계 공통 호응 마무리: 상태가 걸리면 받는 사람의 장착 스킬 2개가 마무리로 → 상태별 접근(호응) + 그 스킬의 기존 동작 + FIN2 효과
//      뜸 = 떠 있는 보스에게 도약 → 공중에서 스킬 · 무릎 = 머리 위로 뛰어올라 내려오며 스킬 · 휘청 = 직선 돌진 → 부딪히며 스킬 · 돌아섬 = 등 뒤로 반원 → 스킬
//      효과 = FIN2[상태][스킬 모양] (피해 · 그로기 · 정지 · 랠리 · 약점 · 밀어내기 · 선회 봉인) · 이름 = FIN2_PREFIX + 스킬 이름
//      전용 합동기(세검 + 대검 + 유물)일 때만 1.5 전용 동작(FINDEF)
// the finisher this fighter fires with this slot right now: an exclusive FINDEF name or 'kind:skill' (common)
function finName(f, kind, slot) { const sk = f.skillKind(slot); return Duo.exclusive(f, kind, sk) || `${kind}:${sk}`; }
function finLabel(name) {
  if (FIN_LABEL[name]) return FIN_LABEL[name];
  const [k, sk] = name.split(':');
  return `${FIN2_PREFIX[k] || ''} ${SKILLS2[sk] ? SKILLS2[sk].name : sk}`;
}
const FinC = {
  common: true,
  // L: f · kind · sk (skill) · E (FIN2 cell) · air · phase 'go' → 'skill' → ('out') · castF / nCast (the skill clip's strike frames) · cast (strike events seen)
  start(L) {
    const p = L.f.ch, clip = p.clips[(p.remap && p.remap[SKILL_CLIP[L.sk]]) || SKILL_CLIP[L.sk]];
    const casts = clip.events.filter(e => e.type === 'cast').map(e => e.f);
    L.clipName = SKILL_CLIP[L.sk]; L.castF = casts.length ? casts[0] : 4; L.nCast = Math.max(1, casts.length); L.cast = 0; L.nextT = -1; L.lastT = -1;
    L.air = L.kind === 'lift' || L.kind === 'kneel'; L.phase = 'go'; L.s0 = 0;
    p.play(L.air ? 'link' : 'dash', 1, 0); Sfx.play('dash');
  },
  // the skill motion starts `lead` frames before its first strike frame (in the air: height corrected by the path)
  toSkill(L) {
    const C2 = FEEL.FIN_COMMON, lead = L.kind === 'stagger' ? C2.leadDash : C2.lead;
    L.phase = 'skill'; L.s0 = L.t; L.from2 = L.f.ch.pos.clone();
    L.f.ch.play(L.clipName, 1, Math.max(0, L.castF - lead));
  },
  update(L, dt) {
    const p = L.f.ch, C2 = FEEL.FIN_COMMON, b = boss.pos;
    if (L.t >= C2.maxT && L.phase !== 'out') { L.phase = 'out'; L.o0 = L.t; L.top = p.pos.clone(); }
    if (L.push) {                                   // stagger: the boss slides back after the hit (collision keeps it in the arena)
      const P = L.push, k = Math.min(dt, P.left) / C2.pushT;
      b.x += P.n.x * P.d * k; b.z += P.n.z * P.d * k; P.left -= dt; if (P.left <= 0) L.push = null;
    }
    if (L.nextT >= 0 && L.t >= L.nextT) { L.nextT = -1; this.strike(L); }   // timed extra hits (more hits than strike frames)
    if (L.phase === 'go') return this.go(L, dt);
    if (L.phase === 'skill') {
      const u = (L.t - L.s0) * 12;                  // frames since the skill motion began
      if (L.kind === 'lift') {                     // hold beside the floating chest (a slight bob)
        const a = this.liftPoint(L); FP.set(p, a.x, a.y + Math.sin(L.t * 9) * 0.04, a.z);
      } else if (L.kind === 'kneel') {             // falling while it swings: down to the floor in front by two frames after the strike
        const lead = C2.lead, n = lead + 2, v = Math.min(1, u / n), land = L.land || (L.land = FP.toward(L.from, C2.kneelGap));
        FP.set(p, L.from2.x + (land.x - L.from2.x) * v, L.from2.y * (1 - v * v), L.from2.z + (land.z - L.from2.z) * v);
      }
      FP.faceBoss(p);
      const done = L.hits >= L.E.hits && L.nextT < 0 && L.lastT >= 0 && L.t - L.lastT >= C2.tail;
      if (done || (p.done && L.hits === 0)) {     // ground: hand control back (the clip's tail is the recovery) · air: drop down
        if (L.kind === 'lift') { L.phase = 'out'; L.o0 = L.t; L.top = p.pos.clone(); p.play('linkEnd', 1, 2); return false; }
        if (L.hits === 0) this.strike(L);           // (the strike frame never came: still land the finisher)
        return true;
      }
      return false;
    }
    const u = Math.min(1, (L.t - L.o0) / C2.drop), t0 = L.top, d = V3(t0.x - b.x, 0, t0.z - b.z).normalize();   // 'out': drop outward
    FP.set(p, t0.x + d.x * 0.8 * FP.ease(u), t0.y * (1 - u) * (1 - u), t0.z + d.z * 0.8 * FP.ease(u));
    if (u < 1) return false;
    Particles.burst('dust', p.pos, null, 12, 1.2);
    if (L.hits === 0) this.strike(L);
    return true;
  },
  liftPoint(L) { const c = FP.chest(), q = FP.toward(L.from, FEEL.FIN_COMMON.liftGap); return V3(q.x, Math.max(0.6, c.y - 1.0), q.z); },
  go(L, dt) {
    const p = L.f.ch, C2 = FEEL.FIN_COMMON, fr = L.t;
    if (L.kind === 'stagger') {                    // a straight dash at the reeling boss
      const to = FP.toward(L.from, C2.dashGap), dx = to.x - p.pos.x, dz = to.z - p.pos.z, d = Math.hypot(dx, dz);
      if (L.dashV === undefined) L.dashV = Math.max(C2.dashSpeed, Math.hypot(to.x - L.from.x, to.z - L.from.z) / C2.dashMax);
      const step = L.dashV * dt;
      FP.faceBoss(p); FP.trail(p, 3);
      if (d <= step + 1e-3 || fr >= C2.dashMax + 0.05) { FP.set(p, to.x, 0, to.z); this.toSkill(L); }
      else FP.set(p, p.pos.x + dx / d * step, 0, p.pos.z + dz / d * step);
      return false;
    }
    if (L.kind === 'turn') {                       // a half circle round to its back
      const u = fr / C2.turnT, q = FP.around(L, FP.back(C2.backGap), Math.min(1, u));
      FP.set(p, q.x, 0, q.z); FP.faceBoss(p); FP.trail(p, 3);
      if (u >= 1) this.toSkill(L);
      return false;
    }
    if (fr < C2.coil) { FP.faceBoss(p); return false; }   // lift / kneel: coil, then leap
    const u = Math.min(1, (fr - C2.coil) / C2.leap);
    let to;
    if (L.kind === 'lift') to = this.liftPoint(L);
    else { const hd = FP.head(), q = FP.toward(L.from, 0.2); to = V3(q.x, Math.max(1.0, hd.y + C2.kneelUp - 1.0), q.z); }
    const top = Math.max(to.y + 0.6, 1.4);
    FP.set(p, FP.bez(L.from.x, (L.from.x + to.x) / 2, to.x, u), FP.bez(0, top + 0.6, to.y, u), FP.bez(L.from.z, (L.from.z + to.z) / 2, to.z, u));
    FP.faceBoss(p); FP.trail(p, 2);
    if (u >= 1) this.toSkill(L);
    return false;
  },
  // a strike frame of the skill clip ('cast' event) while finishing
  onCast(L) {
    if (L.phase !== 'skill' || L.cast >= L.nCast) return;
    L.cast++;
    if (L.hits < L.E.hits) this.strike(L);
  },
  // one finisher hit: FIN2 damage through finStrike (back / weak rules, wave multipliers, rally, popup) + the cell's own effect
  strike(L) {
    if (L.hits >= L.E.hits) return;
    const f = L.f, p = f.ch, E = L.E, C2 = FEEL.FIN_COMMON;
    const hitP = L.kind === 'lift' ? FP.chest() : L.kind === 'kneel' ? FP.head() : L.kind === 'turn' ? FP.crystal() : null;
    const n = V3(boss.pos.x - p.pos.x, 0, boss.pos.z - p.pos.z).normalize();
    const dir = L.kind === 'kneel' ? V3(n.x * 0.3, -1, n.z * 0.3).normalize() : L.kind === 'lift' ? V3(n.x, 0.5, n.z).normalize() : V3(n.x, 0.25, n.z).normalize();
    const big = E.hits === 1, ok = Duo.finStrike(L, { from: V3(p.pos.x, 0, p.pos.z), hitP: hitP || undefined, dir, kick: big ? 4 : 2, fx: big ? 3 : 2, weak: !!E.weak, weakAll: !!E.weakAll });
    L.lastT = L.t;
    if (L.hits < E.hits && L.cast >= L.nCast) L.nextT = L.t + C2.multiGap;   // the clip has no more strike frames: time the rest
    if (!ok) { L.hits = E.hits; L.nextT = -1; return; }
    this.fx(L, hitP || V3(boss.pos.x - n.x * boss.radius * 0.8, p.pos.y + 1.0, boss.pos.z - n.z * boss.radius * 0.8), n);
    if (E.push && L.hits === 1) L.push = { n, d: E.push, left: C2.pushT };
    if (E.pinT && L.hits === E.hits) AI.pinT = E.pinT;
    if (L.hits >= E.hits) { L.nextT = -1; AI.endStatus(E.pinT ? 'pinDown' : L.name); }
  },
  // the look of a hit: by shape (one big burst · small sparks · a ring) · bigger in the air (airFx) · a floor crack for a ground area hit
  fx(L, c, n) {
    const E = L.E, k = L.air ? FEEL.FIN_COMMON.airFx : 1, shape = L.S.shape;
    if (shape === 'single') {
      Particles.burst('spark', c, V3(n.x, 0.4, n.z), Math.round(28 * k), 2.0 * k); Particles.burst('shard', c, null, Math.round(12 * k), 1.3 * k);
      CamRig.shake(5, 0.4); CamRig.kick(n, 4); Game.edgeFlash = { t: 0.12, col: C.HOTW }; Sfx.play('link');
    } else if (shape === 'multi') {
      Particles.burst('spark', c, null, Math.round(10 * k), 1.4 * k); Particles.burst('metal', c, null, Math.round(6 * k), 1.2); Sfx.play(L.hits >= E.hits ? 'swing3' : 'swing');
      if (L.hits >= E.hits) CamRig.shake(4, 0.3);
    } else {
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = boss.radius + 0.4; Particles.burst('spark', V3(boss.pos.x + Math.sin(a) * r, c.y, boss.pos.z + Math.cos(a) * r), V3(Math.sin(a), 0.2, Math.cos(a)), Math.round(3 * k), 1.4 * k); }
      Particles.burst('shard', c, null, Math.round(14 * k), 1.5 * k); CamRig.shake(5, 0.4); Sfx.play('slam');
      if (!L.air) {
        const fp = V3(boss.pos.x - n.x * boss.radius, 0, boss.pos.z - n.z * boss.radius);
        Decals.add(3, { R: 1.4, x: fp.x, z: fp.z, rot: Math.random() * TAU, life: 5, fadeIn: 0.01, fadeOut: 1.4 });
        Particles.burst('dust', fp, null, 22, 2.0); Particles.burst('debris', fp, null, 10, 1.2);
      }
    }
    if (E.weakAll) { const w = FP.chest(); Particles.burst('spark', w, null, 18, 1.8); }
  },
};
Object.assign(Duo, {
  exAll: false,                                    // test / dev: every exclusive art on (= the 1.5 · 1.6 finishers)
  // the 1.5 rapier + greatsword art for this status + skill — only that pair, and only with the matching relic (8단계)
  exclusive(f, kind, sk) {
    const ex = FIN_EX[kind] && FIN_EX[kind][sk];
    if (!ex) return null;
    const pair = fighters.map(q => q.char).sort().join();
    if (pair !== 'great,rapier') return null;
    return this.exAll || this.exOwned(kind) ? ex : null;
  },
  exOwned(kind) { return Relics.team('exclusive', kind); },   // 8단계: either character holds that status' art relic
});
