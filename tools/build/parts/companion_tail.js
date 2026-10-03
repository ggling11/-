  // ---- 듀오 1단계 봇 ----------------------------------------------------------------------------
  //  mode 'coop' 합 봇 · 'ignore' 파트너 무시 봇 · 'selfish' 무시 봇 + 부활도 안 함 · 'spam' K 연타 봇 · 'tag' 태그 솔로 봇 (coop 행동 + 교대 패리·교대 연계)
  parrySkill: 0.85,                               // share of melee hits / imminent shards the bot parries (rest: dash out)
  grabSkill: 0.65,                                // share of grabs the bot reads and dashes out of (humans get caught sometimes)
  shuttleSkill: 0.96,                             // share of shuttle-orb receptions the bot times right (coop / ignore / tag)
  coverSkill: 0.92,                               // share of mark hits the coop bot covers in time
  bellSkill: 0.9,                                 // 2단계: share of its own-colour bell waves the coop bot parries in time
  shardEta(f, parryable = false) {                // seconds until a shard connects with f (null: none on course) · parryable: red shards only
    const me = f.ch.pos; let tHit = null;
    for (const s of Shots.list) {
      if (s.dmg <= 0 || (parryable && !s.wave)) continue;
      const px = s.m.position.x - me.x, pz = s.m.position.z - me.z, sp = Math.hypot(s.v.x, s.v.z) || 1;
      if (px * s.v.x + pz * s.v.z >= 0) continue;
      const tc = -(px * s.v.x + pz * s.v.z) / (sp * sp), cd = Math.hypot(px + s.v.x * tc, pz + s.v.z * tc);
      if (cd < s.hitR + f.ch.radius) { const t = Math.max(0, (Math.hypot(px, pz) - s.hitR - f.ch.radius) / sp); if (tHit === null || t < tHit) tHit = t; }
    }
    return tHit;
  },
  // which starter to throw now (null: none ready / in reach) — any ready one in reach, picked at random (varied statuses)
  pickStarter(f, bot, surf) {
    const ok = [1, 2].filter(sl => {
      const k = f.skillKind(sl), S = FEEL.SKILLS[k];
      if (f.cd[sl - 1] > 0 || !f.ch.clips[SKILL_CLIP[k]]) return false;
      return surf < (k === 'thrust' ? S.lunge + S.reach - 0.8 : S.reach - 0.4);
    });
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null;
  },
  // which finisher (skill slot) to answer a status with — one decision per status, by the situation (spec: 상황별 선택):
  //   체력이 낮으면(누구든 50% 미만) 그로기형으로 보스를 멈춤 · 랠리가 낮으면(2 미만) 랠리형 · 평소는 피해형
  //   돌아섬: 파트너가 이미 등 뒤면 피해형(등 올려베기), 아니면 위치형(등 찍어 박기 → 둘 다 등 뒤로) · 가끔(15%)은 사람처럼 다른 쪽
  pickFinisher(f, bot) {
    if (bot.finSt === Duo.st) return bot.finV;
    bot.finSt = Duo.st;
    const k = Duo.st.kind, starter = Duo.st.by;
    const lowHp = fighters.some(q => q.active && q.state !== 'down' && q.hp < FIGHT.PLAYER_HP * 0.5);
    let v;
    if (Duo.exclusive(f, k, f.skillKind(1)) && Duo.exclusive(f, k, f.skillKind(2))) {   // 전용 합동기 둘 (1.5 규칙 그대로)
      if (k === 'lift') v = Duo.rally < 2 ? 2 : 1;          // 공중 난도(랠리형) / 공중 관통(피해형)
      else if (k === 'kneel') v = lowHp ? 1 : 2;            // 정수리 찌르기(그로기형) / 등 타기 베기(등 약점 연타)
      else if (k === 'stagger') v = lowHp ? 2 : 1;          // 넘어뜨리기(그로기형) / 날아가 박치기(피해형)
      else v = AI.isBack(starter.ch.pos) ? 1 : 2;           // 등 올려베기(피해형) / 등 찍어 박기(위치형)
    } else {                                              // 2단계 공통 마무리: 내 두 스킬의 FIN2 칸을 상황으로 점수 매김 (체력 낮으면 그로기 · 랠리 낮으면 랠리 · 등 뒤가 아니면 선회 봉인)
      const score = sl => {
        const E = FIN2[k][SKILLS2[f.skillKind(sl)].shape];
        return E.dmg * (E.weak ? 2 : 1) * (E.weakAll ? 3 : 1) + E.brk * E.hits * (lowHp ? 6 : 1.5)
          + (E.rally ? (Duo.rally < 2 ? 250 : 60) : 0) + (E.pinT && !AI.isBack(starter.ch.pos) ? 150 : 0) + (E.push ? 40 : 0);
      };
      v = score(2) > score(1) ? 2 : 1;
    }
    if (Math.random() < 0.15) v = 3 - v;
    bot.finV = v; return v;
  },
  pick(bot, id) {                                 // one parry-or-dash decision per incoming hit
    if (bot.pickId !== id) { bot.pickId = id; bot.pickV = Math.random() < this.parrySkill ? 'parry' : 'dash'; }
    return bot.pickV;
  },
  backSpot(extra = 1.3) {                         // a spot behind the boss (B: split front / back)
    const bx = boss.pos.x - Math.sin(boss.facing) * (boss.radius + extra), bz = boss.pos.z - Math.cos(boss.facing) * (boss.radius + extra);
    const r = Math.hypot(bx, bz), R = 6.6; return r > R ? V3(bx * R / r, 0, bz * R / r) : V3(bx, 0, bz);
  },
  think(f, dt) {
    const bot = Game.botFor(f); if (!bot) return;
    const inp = bot.inp, me = f.ch.pos, mode = bot.mode || 'coop', T = clock.t;
    inp.d = null; inp.holding.clear();
    if (f.state === 'down' || Game.state !== 'play' || Game.mode !== 'fight' || !f.onField) return;
    bot.tick = (bot.tick || 0) + 1;
    const coop = mode === 'coop' || mode === 'tag';
    const partner = Game.tagMode ? null : fighters.find(o => o !== f && o.onField);
    const bench = Game.tagMode ? fighters.find(o => o !== f && o.active && o.bench && o.state !== 'down') : null;
    const canTag = Game.tagMode && !!bench && Game.tagCd <= 0 && mode === 'tag';
    const toV = (t, s = 1) => { const v = V3(t.x - me.x, 0, t.z - me.z); const l = v.length(); return l > 1e-3 ? v.multiplyScalar(s / l) : null; };
    const canDash = f.state === 'move' && f.sinceRoll >= FEEL.DODGE_MIN_GAP;
    const dBoss = Math.hypot(boss.pos.x - me.x, boss.pos.z - me.z), surf = dBoss - boss.radius;
    const done = () => { if (mode === 'spam') this.spam(f, bot, inp); };
    // 0) held by the boss: a tag bot swaps out (the incoming character strikes the hand)
    if (f.state === 'grabbed') { if (canTag) inp.pressed.add('tag'); return; }
    // 0b) 2단계 보스 4 합동기: cover the link strike · counter the throw · parry my colour's half of the twin strike (tag: swap in for the other)
    if (Dk.botStep(f, bot, inp, toV, canTag)) return done();
    // 1) floor patterns · the two safe zones: coop bots take one each (aggro holder the nearer one)
    const soon = Hazards.list.filter(h => h.t < h.at + h.dur && h.at - h.t < 1.8);
    const split = soon.find(h => h.split && !h.fired);
    if (split) {
      const holes = split.holes.map(H => V3(split.x + H[0], 0, split.z + H[1]));
      const near = p => holes.reduce((a, h) => (h.distanceTo(p) < a.distanceTo(p) ? h : a), holes[0]);
      let goal = near(me);
      if (coop && partner && partner.alive && holes.length > 1) {
        const lead = AI.target === partner ? partner : f, other = lead === f ? partner : f;
        const hl = near(lead.ch.pos), ho = holes.find(h => h !== hl) || hl;
        goal = f === lead ? hl : ho; void other;
      }
      const d = goal.distanceTo(me);
      if (d > split.holes[0][2] - 0.55) {
        inp.d = toV(goal);
        if (canDash && d > 2.4 && split.at - split.t < d / FEEL.MOVE_SPEED + 0.25) inp.pressed.add('dodge');
        return done();
      }
    }
    const other = soon.filter(h => !h.split);
    const spot = other.length ? this.safeSpot(f, other) : null;
    if (spot) {
      const d = Math.hypot(spot.x - me.x, spot.z - me.z);
      inp.d = toV(spot);
      let tl = 9; for (const h of other) if (this.danger(me.x, me.z, 0.3, [h])) tl = Math.min(tl, Math.max(0, h.at - h.t));
      if (canDash && ((d > 2.6 && d < 5.4 && tl < d / FEEL.MOVE_SPEED + 0.15) || tl < 0.14)) inp.pressed.add('dodge');
      return done();
    }
    // 2) a partner held by the boss: go hit it (any hit frees them)
    if (coop && partner && partner.state === 'grabbed') {
      if (surf > 1.6) inp.d = toV(boss.pos); else if (bot.tick % 6 === 0) inp.pressed.add('attack');
      return done();
    }
    // 3) the shuttle orb: only the one whose colour it shows can take it — parry on its beat; the other keeps working
    const so = Shuttle.o;
    if (so && so.phase !== 'smash' && mode !== 'spam') {
      const e = Shuttle.etaFor(f);
      if (e !== null) {
        const ok = bot.shId === so.hitId ? bot.shV : (bot.shId = so.hitId, bot.shV = Math.random() < this.shuttleSkill);
        if (ok && e < 0.14 && (f.state === 'move' || (f.state === 'parry' && f.parried) || ['attack', 'dodge', 'hit'].includes(f.state))) { inp.pressed.add('parry'); return done(); }
        if (e < 0.75 && (f.state === 'move' || f.state === 'attack' || f.state === 'parry')) return done();   // hold for the beat
      } else if (so.phase === 'late' && so.recv === f && bot.shV) { inp.pressed.add('parry'); return done(); }
      else if (Game.tagMode && so.phase === 'fly' && so.recv !== f && mode === 'tag') {       // tag solo: it's coming for the benched one
        const left = so.T - so.t;
        if (canTag && left < 0.2 && left > 0.03) { inp.pressed.add('tag'); return; }
        if (left < 0.6 && f.state === 'move') return done();
      }
    }
    // 3c) 2단계 보스 3 맥놀이: the coop / tag bot goes to its colour's side and parries its colour's ring (tag: swaps in the right colour just before)
    if (Bell.beat && (mode === 'coop' || mode === 'tag')) {
      if (Game.tagMode && canTag && bench) { const e = Bell.eta(me); if (e && e.e < 0.2 && e.e > 0.03 && !Bell.mine(f, e.col) && Bell.mine(bench, e.col)) { inp.pressed.add('tag'); return; } }
      if (Bell.botStep(f, bot, inp, toV)) return done();
    }
    // 3b) the mark: the marked one can't parry it — the partner steps in close and parries on its beat (coop); tag bot swaps out right before it
    if (Mark.active && mode !== 'spam') {
      const w = Mark.marked(), e = Mark.eta();
      if (w === f && Game.tagMode) { if (mode === 'tag' && canTag && e !== null && e < 0.2 && e > 0.03) { inp.pressed.add('tag'); return; } }
      else if (w === f) { if (coop && partner && partner.alive && me.distanceTo(partner.ch.pos) > 1.8 && e !== null && e < 1.3) { inp.d = toV(partner.ch.pos); return done(); } }
      else if (coop && w && partner === w && e !== null && e < 1.35) {
        const dp = me.distanceTo(w.ch.pos), id = Mark.st.id * 16 + Mark.st.hits.filter(h => h.done).length;
        const ok = bot.mkId === id ? bot.mkV : (bot.mkId = id, bot.mkV = Math.random() < this.coverSkill);
        if (dp > FEEL.COVER_R - 0.5) { inp.d = toV(w.ch.pos); if (f.state === 'move' || f.state === 'attack') return done(); }
        if (ok && e < 0.14 && e > -0.08 && (f.state === 'move' || (f.state === 'parry' && f.parried) || ['attack', 'dodge', 'hit'].includes(f.state))) { inp.pressed.add('parry'); return done(); }
        if (e < 0.6) return done();                   // in range: hold for the beat
      }
    }
    // 4) A: the boss is in a status the partner started — finish it (tag bot: the starter's own U / I swaps the benched one in)
    if (Duo.st && !Duo.st.fin && AI.state === 'status') {
      if (coop && Duo.st.by !== f && f.state !== 'parry' && dBoss < FEEL.FINISH_MAXD) { inp.pressed.add(`skill${this.pickFinisher(f, bot)}`); return done(); }
      if (Duo.st.by === f && mode === 'tag' && Duo.benchFor(f) && dBoss < FEEL.FINISH_MAXD) { inp.pressed.add(`skill${this.pickFinisher(f, bot)}`); return; }
    }
    // 5) the grab reaching for me: it can't be parried → dash out sideways
    if (AI.state === 'attack' && AI.cur === 'grab' && AI.grabTarget === f && this.teleAt(me)
        && (bot.grabId === AI.atkSeq ? bot.grabV : (bot.grabId = AI.atkSeq, bot.grabV = Math.random() < this.grabSkill))) {
      const left = AI.grabEta();
      if (left !== null && left < 0.24 && canDash) { const t = this.teleAt(me), a = t ? t.m.rotation.y : boss.facing; inp.d = V3(Math.cos(a), 0, -Math.sin(a)); inp.pressed.add('dodge'); return done(); }
      if (f.state !== 'parry') inp.d = toV(boss.pos, -1);
      return done();
    }
    // 5b) shard ring winding up (neutral: can't be parried): stand on a dark gap line between its rays, no swinging
    if (AI.state === 'attack' && AI.cur === 'nova' && boss.f < FIGHT.NOVA.fireF + (AI.phase >= 2 ? 3 : 0) && mode !== 'spam') {
      const n = FIGHT.NOVA.n[AI.phase - 1], step = TAU / n, a = Math.atan2(me.x - boss.pos.x, me.z - boss.pos.z);
      // phase 2+: once the first ring has passed me, the follow-up ring fills its gaps → step back onto the first ring's lines
      const passed = boss.f >= FIGHT.NOVA.fireF && Shots.list.every(q => q.dmg <= 0 || Math.hypot(q.m.position.x - boss.pos.x, q.m.position.z - boss.pos.z) > dBoss + 0.9);
      const off = (AI.novaRot || 0) + (passed ? 0 : 0.5 * step), k = Math.round((a - off) / step), ga = off + k * step;
      const rSafe = (FIGHT.NOVA.hitR + f.ch.radius) * 2.2 / step;   // a gap is only wide enough this far out
      const r = Math.min(6.3, Math.max(dBoss, rSafe)), gx = boss.pos.x + Math.sin(ga) * r, gz = boss.pos.z + Math.cos(ga) * r;
      if (Math.hypot(gx - me.x, gz - me.z) > 0.12) inp.d = toV(V3(gx, 0, gz));
      if (f.state === 'attack' && dBoss < rSafe - 0.5 && f.sinceRoll >= FEEL.DODGE_MIN_GAP) inp.pressed.add('dodge');   // caught mid-swing: dash-cancel out
      return done();
    }
    // 6) a hit coming at me: parry on the beat (tag bot: tag in so the other character takes it), or dash out
    const eta = AI.etaFor(f);
    if (eta !== null) {
      if (canTag && eta < 0.2 && eta > 0.03) { inp.pressed.add('tag'); return; }
      // D (합 봇): the partner is right here and free → let them cover it (+2 rally) instead of parrying myself
      const dpp = partner ? partner.ch.pos.distanceTo(me) : 99;
      if (coop && partner && partner.alive && Game.botFor(partner) && dpp <= FEEL.COVER_R - 0.1 && dpp >= 1.7
          && AI.etaFor(partner) === null && (partner.state === 'move' || partner.state === 'parry') && f.state !== 'parry') return done();
      // C+D (합 봇): my spike hasn't locked yet — walk it over toward the partner so we end up in cover range
      if (coop && partner && partner.alive && AI.cur === 'combo' && eta > FIGHT.COMBO.lock + 0.12 && me.distanceTo(partner.ch.pos) > FEEL.COVER_R - 0.15) { inp.d = toV(partner.ch.pos); return done(); }
      const pk = mode === 'spam' ? 'none' : this.pick(bot, AI.threatId(f));
      if (pk === 'parry' && eta < 0.14 && eta > -0.1 && (f.state === 'move' || f.state === 'parry' && f.parried)) { inp.pressed.add('parry'); return done(); }
      if (pk === 'parry' && eta < 0.14 && ['attack', 'dodge', 'hit', 'revive'].includes(f.state)) { inp.pressed.add('parry'); return done(); }   // buffered: fires at the cancel frame (or as a late parry)
      if (pk === 'dash' && canDash && eta < 0.2) { inp.d = toV(boss.pos, -1) || this.dirs8()[0]; inp.pressed.add('dodge'); return done(); }
      if (f.state === 'parry' || pk === 'parry' || mode === 'spam') return done();   // hold still for the beat
    }
    // 6b) downed partner (after the parry check: a hit on me comes first): go stand next to them and hold the interact key
    const calm = !Shots.list.length || this.score(f, 'move', null) > 0.3;
    if (partner && partner.state === 'down' && calm && mode !== 'selfish') { if (me.distanceTo(partner.ch.pos) > 0.9) inp.d = toV(partner.ch.pos); else inp.holding.add('interact'); return done(); }
    // 7) D: cover a partner about to be hit (stand close, parry on their beat)
    //    during the alternating combo the pair keeps ≈1.9 apart: just outside each other's spike, inside cover range
    if (coop && partner && partner.alive) {
      const etaP = AI.etaFor(partner), dp = me.distanceTo(partner.ch.pos), inCombo = AI.state === 'attack' && AI.cur === 'combo';
      if (eta === null && (etaP !== null || inCombo)) {
        if (dp <= FEEL.COVER_R - 0.15 && dp >= 1.7) {     // in the cover ring: hold, parry on the partner's beat
          if (etaP !== null && etaP < 0.16 && etaP > -0.08 && (f.state === 'move' || (f.state === 'parry' && f.parried))) inp.pressed.add('parry');
          if (f.state === 'move' || f.state === 'parry') return done();
        } else if (dp < 1.7 && inCombo) { inp.d = toV(partner.ch.pos, -1); return done(); }   // too close: step out of their spike
        else if (dp < 7 && (inCombo || (dp - 1.9) / FEEL.MOVE_SPEED < etaP - 0.15)) { inp.d = toV(partner.ch.pos); return done(); }
      }
    }
    // 8) shards: parry the one about to connect, otherwise weave
    if (Shots.list.length) {
      const tHit = this.shardEta(f, true);          // only red shards can be parried; the rest are weaved
      if (tHit !== null && tHit < 0.1 && f.state === 'move' && mode !== 'spam') {
        if (canTag) { inp.pressed.add('tag'); return; }
        if (Math.random() < this.parrySkill) { inp.pressed.add('parry'); return done(); }
      }
      if (f.state === 'parry') return done();
      const tAny = this.shardEta(f);                // an unparryable shard about to connect: dash through it (i-frames)
      if (tAny !== null && tAny < 0.1 && (canDash || (f.state === 'attack' && f.sinceRoll >= FEEL.DODGE_MIN_GAP)) && mode !== 'spam') {
        const q = Shots.list.reduce((b, s) => (s.dmg > 0 && (!b || s.m.position.distanceTo(me) < b.m.position.distanceTo(me)) ? s : b), null);
        inp.d = q ? V3(-q.v.z, 0, q.v.x).normalize() : this.dirs8()[0]; inp.pressed.add('dodge'); return done();
      }
      let bestS = this.score(f, 'move', null), bestD = null, dash = false;
      if (bestS < 0.25) {
        for (const d of this.dirs8()) { const s = this.score(f, 'move', d); if (s > bestS) { bestS = s; bestD = d; } }
        if (canDash && bestS < 0.05) for (const d of this.dirs8()) { const s = this.score(f, 'dash', d); if (s > bestS) { bestS = s; bestD = d; dash = true; } }
        inp.d = bestD; if (dash) inp.pressed.add('dodge');
        return done();
      }
    }
    // 9) lanes and other telegraphs under me: step aside
    const tele = this.teleAt(me);
    if (tele && eta === null) {
      const sh = tele.mat.uniforms.uShape.value, c = tele.m.position;
      inp.d = sh === 2 ? V3(-Math.cos(tele.m.rotation.y), 0, Math.sin(tele.m.rotation.y)) : (toV(c, -1) || this.dirs8()[0]);
      return done();
    }
    if (!AI.targetable()) { if (partner && me.distanceTo(partner.ch.pos) > 3) inp.d = toV(partner.ch.pos); return done(); }
    const S = FIGHT, cur = AI.cur, bf = boss.f;
    const recov = AI.state === 'attack' && ((cur === 'slam' && bf > S.SLAM.hitF + 0.5) || (cur === 'sweep' && bf > S.SWEEP.hitF + 1.5)
      || (cur === 'shot' && bf > S.SHOT.fireF + 1) || (cur === 'nova' && bf > S.NOVA.fireF + 1) || cur === 'spiral' || (cur === 'grab' && bf > 9) || cur === 'shuttle');
    const open = AI.state === 'idle' || AI.state === 'walk' || AI.state === 'groggy' || AI.state === 'cast' || AI.state === 'status' || AI.state === 'holding' || recov;
    // 10) A: throw a starter when the boss is open and someone can finish it
    const linker = mode === 'ignore' || mode === 'selfish' || (partner && partner.alive && partner.ch.pos.distanceTo(boss.pos) < FEEL.FINISH_MAXD - 1) || (Game.tagMode && bench);
    const sl = f.state === 'move' && open && AI.state !== 'status' && AI.state !== 'groggy' && linker && AI.canStatus() ? this.pickStarter(f, bot, surf) : null;
    if (sl) { inp.d = toV(boss.pos); inp.pressed.add(`skill${sl}`); return done(); }
    // 11) B: the one the boss is not watching works from behind; the aggro holder keeps the front
    const behind = coop && partner && partner.alive && AI.target !== f;
    if (behind) {
      const bp = this.backSpot(), db = bp.distanceTo(me);
      if (db > 0.8) inp.d = toV(bp);
      if (surf < 2.2 && bot.tick % 8 === 0 && (open || AI.isBack(me))) inp.pressed.add('attack');
      return done();
    }
    if (open) { if (surf > 1.4) inp.d = toV(boss.pos); if (surf < 2.2 && bot.tick % 8 === 0) inp.pressed.add('attack'); return done(); }
    if (surf < 2.6) inp.d = toV(boss.pos, -1);
    else if (surf > 4.2) inp.d = toV(boss.pos);
    else if (partner && me.distanceTo(partner.ch.pos) > 4.5) inp.d = toV(partner.ch.pos);
    return done();
  },
  // K mashing with no timing at all: every 0.55 s while the boss attacks or shards are close (standing still)
  spam(f, bot, inp) {
    inp.pressed.delete('parry');
    const me = f.ch.pos;
    const coming = AI.state === 'attack' || AI.state === 'cast' || Shots.list.some(q => q.dmg > 0 && q.m.position.distanceTo(me) < 4);
    if (coming && !inp.d && !inp.pressed.has('dodge') && clock.t >= (bot.nextK || 0)) { inp.pressed.add('parry'); inp.pressed.delete('attack'); bot.nextK = clock.t + 0.55; }
  },
};
