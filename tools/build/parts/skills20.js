// ---- 2단계 날아가는 시동 스킬: 바람 찌르기(검풍 3연발 · 'gust') · 대지 가르기(바닥을 달리는 균열 → 3번 터짐 · 'crack')
//      스킬 동작의 'cast' 프레임마다 하나씩 나감 · 맞으면 그 스킬 피해 · 마지막 것이 끝났을 때(맞았든 빗나갔든) 한 번이라도 맞았으면 상태 (★11)
//      판정·이동은 게임 시간(gdt)만 써서 결정적 · 입자·바닥 금은 꾸밈
const CLIP_SKILL = Object.fromEntries(Object.keys(SKILLS2).map(k => [SKILLS2[k].clip, k]));
const SkillFx = {
  list: [], seqs: [],
  clear() { this.list = []; this.seqs = []; },
  // a strike frame of a projectile starter: spawn one emitter (showcase: the look only)
  cast(f, S, e) {
    const p = f.ch, P = p.pos, kind = Game.mode === 'fight' ? f.castKind : CLIP_SKILL[p.clip && p.clip.name];
    if (!S || !S.proj) return;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing), live = Game.mode === 'fight' && f.state === 'cast' && f.castKind === kind;
    const E = live && f.castEmp ? Slots.startE(f) : null;
    let seq = null;
    if (live) {
      if (!f.castFired) { f.castFired = true; this.stats().casts++; }
      seq = this.seqs.find(q => q.f === f && q.id === f.castId);
      if (!seq) { seq = { f, id: f.castId, kind, S, E, emp: f.castEmp, need: S.proj === 'gust' ? this.castCount(p) : 1, spawned: 0, resolved: 0, hits: 0, hitP: null, dk: Dk.on ? Dk.ci : undefined }; this.seqs.push(seq); }   // (2단계: aimed at that dokkaebi)
      if (seq.spawned >= seq.need) return;
      seq.spawned++;
    }
    const reach = S.reach * (E ? E.reach : 1);
    if (S.proj === 'gust') {                      // a wind blade off the rapier's point, level with the chest
      const o = V3(P.x + fx * 0.9, 1.1, P.z + fz * 0.9);
      this.list.push({ type: 'gust', seq, f, o, p: o.clone(), d: V3(fx, 0, fz), left: Math.max(0.5, reach - 0.9 - (S.w || 0.3)), k: e ? e.k || 0 : 0, dk: seq ? seq.dk : undefined });   // flies until the boss surface would be `reach` from the fighter
      Particles.burst(f.castEmp && live ? Slots.pk(f.castEmp) : 'waveB', o, V3(fx, 0, fz), 10, 1.6);
      CamRig.shake(1, 0.08); Sfx.play('dash', 1.3);
    } else {                                      // the greatsword bites the floor: a crack runs out along the facing
      const o = V3(P.x + fx * 1.4, 0, P.z + fz * 1.4);
      this.list.push({ type: 'crack', seq, f, o, p: o.clone(), d: V3(fx, 0, fz), left: Math.max(0.5, reach - 1.2), run: 0, mark: 0, burst: -1, bursts: 0, at: null, met: false, dk: seq ? seq.dk : undefined });   // meets a boss whose surface is within `reach`
      Decals.add(3, { R: 1.1, x: o.x, z: o.z, rot: Math.random() * TAU, life: 5, fadeIn: 0.01, fadeOut: 1.4 });
      Particles.burst('dust', o, null, 16, 1.5); Particles.burst('debris', o, null, 8, 1.0); CamRig.shake(3, 0.2); Sfx.play('slam');
    }
  },
  castCount(p) { return Math.max(1, p.clip ? p.clip.events.filter(e => e.type === 'cast').length : 1); },
  stats() { const S = Duo.stats; return S.proj || (S.proj = { casts: 0, out: 0, hit: 0, seqHit: 0 }); },
  // one hit of an emitter on the boss (the starter's numbers, empowered wave included)
  hit(g, hitP) {
    const seq = g.seq, f = g.f, S = seq.S, E = seq.E;
    if (!AI.targetable()) return false;
    const n = V3(boss.pos.x - g.o.x, 0, boss.pos.z - g.o.z).normalize();
    Duo.hitBoss(f, S.dmg * (E ? E.dmg : 1), S.brk * (E ? E.brk : 1), V3(g.o.x, 0, g.o.z), V3(n.x, g.type === 'crack' ? 0.9 : 0.2, n.z).normalize(),
                { hitstop: S.hitstop, kick: 1, fx: 1.5 }, { hitP });
    seq.hits++; seq.hitP = hitP; this.stats().hit++;
    if (seq.emp) Particles.burst(Slots.pk(seq.emp), hitP, null, 12, 1.6);
    return true;
  },
  update(gdt) {
    if (gdt <= 0 && !this.seqs.length) return;
    for (let i = this.list.length - 1; i >= 0; i--) { const g = this.list[i]; if (Dk.with(g.dk, () => this.step(g, gdt))) this.list.splice(i, 1); }   // (2단계: on the dokkaebi it was aimed at)
    this.resolve();
  },
  // one emitter's frame → true when it's finished
  step(g, gdt) {
    {
      if (g.type === 'gust') {
        const S = g.seq ? g.seq.S : SKILLS2.windThrust, step = Math.min(g.left, (S.speed || 18) * gdt);   // (no overshoot past the reach)
        g.p.addScaledVector(g.d, step); g.left -= step;
        if (gdt > 0) { Particles.burst(g.seq && g.seq.emp ? Slots.pk(g.seq.emp) : 'waveB', g.p, g.d, 3, 0.8); Particles.burst('trail', g.p, null, 1); }
        let done = g.left <= 0;
        if (!done && g.seq && Game.mode === 'fight' && AI.targetable()) {
          const dx = boss.pos.x - g.p.x, dz = boss.pos.z - g.p.z;
          if (Math.hypot(dx, dz) <= boss.radius + (S.w || 0.3)) {
            const hp = V3(boss.pos.x - g.d.x * boss.radius * 0.9, g.p.y + boss.pos.y, boss.pos.z - g.d.z * boss.radius * 0.9);
            if (this.hit(g, hp)) { Particles.burst('spark', hp, V3(-g.d.x, 0.3, -g.d.z), 10, 1.4); Particles.burst('waveB', hp, null, 8, 1.2); Sfx.play('hit'); }
            done = true;
          }
        }
        if (done) { if (g.seq) g.seq.resolved++; return true; }
        return false;
      }
      // crack: run along the floor until it meets the boss (or runs out), then burst three times there
      const S = g.seq ? g.seq.S : SKILLS2.earthSplit;
      if (g.burst < 0) {
        const step = Math.min(g.left, (S.speed || 16) * gdt);
        g.p.addScaledVector(g.d, step); g.left -= step; g.run += step;
        if (g.run - g.mark >= 0.7) { g.mark = g.run; Decals.add(3, { R: 0.55, x: g.p.x, z: g.p.z, rot: Math.random() * TAU, life: 3, fadeIn: 0.01, fadeOut: 1.0 }); }
        if (gdt > 0) Particles.burst('dust', g.p, null, 2, 0.8);
        const meet = g.seq && Game.mode === 'fight' && AI.targetable() && Math.hypot(boss.pos.x - g.p.x, boss.pos.z - g.p.z) <= boss.radius + 0.2;
        if (meet || g.left <= 0) { g.burst = 0; g.at = g.p.clone(); g.met = !!meet; }   // ran out: it still bursts, but only a met boss is hit
        return false;
      }
      g.burst += gdt;
      while (g.bursts < (S.hits || 3) && g.burst >= g.bursts * (S.gap || 0.12)) {
        const a = g.at; g.bursts++;
        Decals.add(3, { R: 0.9 + 0.2 * g.bursts, x: a.x, z: a.z, rot: Math.random() * TAU, life: 4, fadeIn: 0.01, fadeOut: 1.2 });
        Particles.burst('dust', a, null, 14, 1.8); Particles.burst('debris', V3(a.x, 0.2, a.z), V3(0, 1, 0), 8, 1.4); Particles.burst('spark', V3(a.x, 0.5, a.z), V3(0, 1, 0), 8, 1.6);
        CamRig.shake(3, 0.18); Sfx.play('stomp');
        if (g.seq && g.met && Game.mode === 'fight' && Math.hypot(boss.pos.x - a.x, boss.pos.z - a.z) <= boss.radius + (S.burstR || 0.9))
          this.hit(g, V3(a.x + (boss.pos.x - a.x) * 0.5, 0.9 + boss.pos.y, a.z + (boss.pos.z - a.z) * 0.5));
      }
      if (g.bursts >= (S.hits || 3)) { if (g.seq) g.seq.resolved++; return true; }
      return false;
    }
  },
  // a starter's emitters all done (and no more coming): its status, once, if anything hit
  resolve() {
    for (let i = this.seqs.length - 1; i >= 0; i--) {
      const q = this.seqs[i], f = q.f, closed = q.spawned >= q.need || f.castId !== q.id || f.state !== 'cast';
      if (!closed || q.resolved < q.spawned) continue;
      this.seqs.splice(i, 1);
      if (!q.hits) continue;
      this.stats().seqHit++; Duo.stats.startHits++; Duo.stats.launchHits++;
      Dk.with(q.dk, () => {
        if (Game.mode === 'fight' && Game.state === 'play' && AI.canStatus()) {
          AI.startStatus(q.S.status, f);
          if (Duo.st) { Duo.st.emp = q.emp || null; Duo.st.win = FEEL.LINK_WINDOW * (q.E ? q.E.win : 1) * Relics.mul(f, 'statusT'); }
          Stage.onStatus(Duo.st);
        }
      });
    }
  },
};
// ---- 2단계 고유 행동: 사슬 잡아채기 = 파트너를 보스 등 뒤로 끌어옴(무적 · 잡혀 있으면 빼냄) · 방패 올려치기 = 1초 커버 범위 2배
const Unique = {
  coverR(c) { return FEEL.COVER_R * (c.coverBoostT > 0 ? FEEL.COVER_BOOST.mul : 1) * Relics.mul(c, 'coverR'); },   // (relic WARD RADIUS ×1.4)
  partnerOf(f) { return fighters.find(q => q !== f && q.onField && q.state !== 'down') || null; },
  onHit(f, S) {
    if (S.coverBoost) {
      f.coverBoostT = FEEL.COVER_BOOST.t; Duo.stats.coverBoost = (Duo.stats.coverBoost || 0) + 1;
      const p = f.ch.pos; Particles.burst('sparkB', V3(p.x, 1.0, p.z), null, 16, 1.4); Game.popup('GUARD UP', V3(p.x, 2.6, p.z), C.BONE1);
    }
    if (S.pull) {
      const o = this.partnerOf(f);
      if (o && AI.grab && AI.grab.v === o) { AI.release('snatch'); this.pull(f, o); Duo.stats.snatchRescue = (Duo.stats.snatchRescue || 0) + 1; }
      else if (o && Dk.J && Dk.J.name === 'dkThrow' && Dk.J.ph === 'hold' && Dk.J.v === o) { Dk.releaseThrow(); this.pull(f, o); Duo.stats.snatchRescue = (Duo.stats.snatchRescue || 0) + 1; }   // (2단계: out of a dokkaebi's fist too)
    }
  },
  onStatus(f, S) { if (S.pull) { const o = this.partnerOf(f); if (o && !o.pull) this.pull(f, o); } },
  // the partner hauled on the chain round the boss to just behind it (invulnerable on the way) · not mid-finisher / reviving / benched (★13)
  pull(f, o) {
    if (['finish', 'revive', 'down'].includes(o.state) || (o.state === 'cast' && o.castKind === 'fin')) return;
    const to = FP.back(FEEL.PULL.gap);
    o.pull = { by: f, from: o.ch.pos.clone(), to, t: 0, dk: Dk.on ? Dk.ci : undefined }; o.state = 'pulled'; o.vel.set(0, 0, 0); o.pending = null; o.clearBufs();
    o.invuln = Math.max(o.invuln, FEEL.PULL.t + 0.15); o.ch.rootOn = false; o.ch.turnRate = 0; o.ch.play('dash', 1, 0);
    Duo.stats.pulls = (Duo.stats.pulls || 0) + 1; Sfx.play('grab'); Game.popup('PULL', V3(o.ch.pos.x, 2.6, o.ch.pos.z), C.CYAN);
  },
  update(gdt) {
    for (const f of fighters) {
      if (f.coverBoostT > 0) {
        f.coverBoostT = Math.max(0, f.coverBoostT - gdt);
        if (gdt > 0 && Math.random() < gdt * 20) { const p = f.ch.pos, a = Math.random() * TAU, r = this.coverR(f); Particles.burst('sparkB', V3(p.x + Math.sin(a) * r, 0.15, p.z + Math.cos(a) * r), null, 1, 0.5); }
      }
      const P = f.pull; if (!P) continue;
      if (f.state !== 'pulled' || !f.onField) { f.pull = null; continue; }
      P.t += gdt;
      const u = Math.min(1, P.t / FEEL.PULL.t), q = Dk.with(P.dk, () => FP.around(P, P.to, u)), p = f.ch;
      p.pos.set(q.x, Math.sin(Math.PI * u) * 0.5, q.z); Dk.with(P.dk, () => FP.faceBoss(p));
      if (gdt > 0) {                                   // the chain: a dotted line from the puller's hand to the one being hauled
        const a = P.by.ch.pos, n = 6;
        for (let i = 1; i < n; i++) if (Math.random() < 0.6) Particles.burst('trail', V3(a.x + (p.pos.x - a.x) * i / n, 1.1, a.z + (p.pos.z - a.z) * i / n), null, 1);
      }
      if (u >= 1) { p.pos.y = 0; f.pull = null; f.state = 'move'; p.rootOn = true; p.turnRate = 16; p.play('idle'); Particles.burst('dust', p.pos, null, 10, 1.1); }
    }
  },
};
