// ---- 1.5단계 강제 교대 패턴 2: 표식 넘기기 (보스 2)
//      보스가 한 사람에게 표식(머리 위 흰 문양 + 몸 테두리, 1.6에서 청록 → 흰색: 청록은 청파 색)을 붙임 → 표식 대상을 노린 이 공격은 본인이 패리할 수 없음(봉인)
//      표식 없는 파트너의 커버로만 막음 → 막은 사람에게 표식이 넘어감 → 다음 공격은 새 대상 → 둘이 서로 커버를 주고받음
//      회피 무적도 뚫음 · 못 막으면 표식 대상 피해 + 랠리 끊김(표식 유지) · 커버마다 랠리 +2 (1단계 커버 규칙)
//      태그 솔로: 표식이 붙은 캐릭터가 공격 직전에 교대하면 들어오는 캐릭터가 커버한 것 → 표식이 넘어감
const Mark = {
  st: null, seq: 0,
  get active() { return !!this.st; },
  clear() { const s = this.st; if (s) { for (const h of s.hits) if (h.d) Decals.kill(h.d); if (s.ring) Decals.kill(s.ring); } this.st = null; },
  // boss clip event: the sword points — the mark lands on the aggro target
  begin(who) {
    const M = FEEL.MARK, ph = AI.phase - 1;
    const gap = Game.tagMode ? Math.max(M.gap, M.soloGap) : M.gap;
    this.st = { who, n: M.n[ph], k: 0, t: 0, gap, hits: [], id: ++this.seq, arm: 0, ring: null, flashT: 0 };
    this.setRing();
    Duo.stats.mark.start++;
    Game.popup('MARKED', V3(who.ch.pos.x, 3.2, who.ch.pos.z), C.BONE1, 2); Sfx.play('lock'); who.ch.flash(0.15, C.BONE1);
    Particles.burst('metal', V3(who.ch.pos.x, 1.6, who.ch.pos.z), null, 16, 1.2);
  },
  setRing() {                                     // a cyan sparkle ring under the marked one's feet (follows them)
    const s = this.st; if (s.ring) Decals.kill(s.ring);
    s.ring = Decals.add(0, { R: 0.75, x: s.who.ch.pos.x, z: s.who.ch.pos.z, ally: 1, wave: 4, life: 1e9, fadeIn: 0.05 });
  },
  // the marked one on the field (tag solo: the mark rides whoever is out there)
  marked() { const s = this.st; if (!s) return null; return Game.tagMode ? fighters.find(f => f.onField) || s.who : s.who; },
  pass(to, why) {                                  // the mark moves to whoever covered
    const s = this.st; if (!s || s.who === to) return;
    s.who = to; this.setRing(); to.ch.flash(0.15, C.BONE1);
    Particles.burst('metal', V3(to.ch.pos.x, 1.6, to.ch.pos.z), null, 14, 1.2);
    if (why) Game.popup('MARK PASSED', V3(to.ch.pos.x, 3.4, to.ch.pos.z), C.BONE1);
  },
  // seconds until the next mark hit lands (null: none) — bots / HUD
  eta() { const s = this.st; if (!s) return null; const h = s.hits.find(q => !q.done); return h ? h.at - s.t : (s.k < s.n ? s.k * s.gap + FEEL.MARK.lead - s.t : null); },
  // tag solo: the marked character tags out right before a hit → the incoming one covers (the mark goes with it)
  tagThreat(out) { const s = this.st; if (!s || !Game.tagMode || s.who !== out) return false; const e = this.eta(); return e !== null && e <= FEEL.TAG_PARRY_LEAD && e > -0.05; },
  tagCover(out, inc) {
    const s = this.st, h = s.hits.find(q => !q.done); if (!h) return;
    h.tagCover = inc; s.who = inc; this.setRing(); Duo.stats.mark.tagCover++;
  },
  update(gdt) {
    const s = this.st; if (!s || gdt <= 0) return;
    const M = FEEL.MARK, Cb = FIGHT.COMBO;
    // ends early: nobody to cover with (partner down / nobody on the bench) or the marked one is down
    const two = Game.tagMode ? !!fighters.find(f => f.active && f.bench && f.state !== 'down') : fighters.filter(f => f.alive).length > 1;
    const w = this.marked();
    if (!w || w.state === 'down' || !two) { this.clear(); return; }
    s.t += gdt;
    if (s.ring) { s.ring.m.position.set(w.ch.pos.x, 0.022, w.ch.pos.z); }
    s.flashT -= gdt; if (s.flashT <= 0) { s.flashT = M.flashEvery; w.ch.flash(0.07, C.BONE1); }   // the marked body keeps blinking white
    while (s.k < s.n && s.t >= s.k * s.gap) {        // the next hit's circle shows `lead` s before it lands, tracking the mark
      const d = Decals.add(0, { R: M.r, x: w.ch.pos.x, z: w.ch.pos.z, wave: 4 });   // 1.6: white 'seal' (cyan is now 청파)
      s.hits.push({ k: s.k, at: s.k * s.gap + M.lead, d, locked: false, anim: false, done: false, id: 300000 + s.id * 16 + s.k });
      s.k++;
    }
    const lead = Math.ceil(Cb.jabF / AI.speed - 1e-6) * ANIM_DT;
    for (const h of s.hits) {
      if (h.done) continue;
      const m = this.marked();
      h.d.m.position.set(m.ch.pos.x, 0.022, m.ch.pos.z);   // follows the mark to the end (it's aimed at the mark, not the floor)
      if (!h.locked && s.t >= h.at - M.lock) { h.locked = true; Sfx.play('lock'); }
      const u = h.d.mat.uniforms; u.uLock.value = h.locked ? 1 : 0; u.uProg.value = h.locked ? Math.min(1, (s.t - (h.at - M.lock)) / M.lock) : 0;
      if (!h.anim && s.t >= h.at - lead) { h.anim = true; boss.play(s.arm++ % 2 ? 'jabL' : 'jabR', AI.speed); }
      boss.turnRate = 7; boss.facingTo = Math.atan2(m.ch.pos.x - boss.pos.x, m.ch.pos.z - boss.pos.z);
      if (s.t >= h.at) { h.done = true; this.strike(h); }
      break;                                          // one live hit at a time
    }
    const last = s.hits[s.hits.length - 1];
    if (s.k >= s.n && last && last.done && s.t >= last.at + M.recover) this.clear();
  },
  strike(h) {
    const s = this.st, M = FEEL.MARK, w = this.marked(), c = V3(w.ch.pos.x, 0, w.ch.pos.z);
    Decals.kill(h.d);
    Decals.add(3, { R: M.r + 0.2, x: c.x, z: c.z, rot: Math.random() * TAU, life: 4, fadeIn: 0.01, fadeOut: 1.2 });
    Spikes.add(c.x, c.z); Particles.burst('metal', V3(c.x, 0.4, c.z), V3(0, 1, 0), 14, 1.4); Particles.burst('dust', c, null, 14, 1.5);
    CamRig.shake(2, 0.15); Sfx.play('stomp'); Sfx.play('burst');
    Duo.stats.mark.atk++;
    if (h.tagCover && h.tagCover.onField) {           // tag solo: the incoming character took it
      const inc = h.tagCover; Duo.cover(inc, inc, boss.pos.clone(), 'mark', h.id); Duo.stats.mark.cover++; return;
    }
    const r = Game.hurtPlayer(w, M.dmg, boss.pos.clone(), false, 'mark', true, 'mark', false, h.id);
    if (r === 'cover') { const c2 = Duo.last; Duo.stats.mark.cover++; if (c2) this.pass(c2, true); }
    else Duo.stats.mark.fail++;
  },
};
// HUD: the rune over the marked head · COVER! over the partner while a hit is coming
function drawMarkHud() {
  const s = Mark.st; if (!s) return;
  const blink = Math.floor(clock.t * 8) % 2 === 0, w = Mark.marked(), e = Mark.eta();
  const [x, y] = toHud(w.ch.pos.x, w.ch.pos.y + 2.5, w.ch.pos.z), X = Math.round(x), Y = Math.round(y) - 8;
  // rune: a cyan eye-in-diamond, 9 px
  diamond(X, Y, 5, null, C.VOID); diamond(X, Y, 4, C.DEEP, blink ? C.HOTW : C.BONE0);
  hctx.fillStyle = PAL_HEX[C.BONE2]; hctx.fillRect(X - 1, Y, 3, 1); hctx.fillRect(X, Y - 1, 1, 3);
  if (e === null || e > 1.2) return;
  if (Game.tagMode) { txtC(`${keyNames(w).tag} COVER`, X, Y - 16, PAL_HEX[blink ? C.HOTW : C.BONE1]); return; }
  for (const o of fighters) if (o !== w && o.alive) {
    const [px, py] = toHud(o.ch.pos.x, o.ch.pos.y + 2.5, o.ch.pos.z);
    txtC('COVER!', Math.round(px), Math.round(py) - 14, PAL_HEX[blink ? C.HOTW : C.BONE1], 1);
    if (!Game.botFor(o)) txtC(keyNames(o).parry, Math.round(px), Math.round(py) - 6, PAL_HEX[C.HOTW]);
  }
}
