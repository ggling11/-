// ---- 2단계 유물 (최소판): 보스 처치 뒤 휴식에서 캐릭터마다 3장 중 1장 (시드 → 같은 시드면 같은 3장) + 장착 다시 고르기
//      태그 솔로 = 한 사람이 A → B 차례로 · AI 파트너 = 자동 · 고른 것은 입력 기록(Rec)에 남아 재생이 같음
//      효과는 훅 하나 (Relics.mul / sum / has / team) — 각 시스템이 '이 사람이 이 종류를 가졌나'만 물음
const Relics = {
  owned: [[], []], open: false, P: null, t: 0, stats: null,
  echoes: [],
  reset() { this.owned = [[], []]; this.open = false; this.P = null; this.t = 0; this.echoes = []; },
  // ECHO MASK: my partner's finisher lands → v.delay s later my shadow repeats it at v.mul (one ghost hit of that finisher's total)
  onFin(L) {
    const F = L.E ? { dmg: L.E.dmg, brk: L.E.brk * L.E.hits } : (() => { const X = FEEL.FINISH[L.name]; return { dmg: X.dmg * X.hits, brk: X.brk * X.hits }; })();
    for (const o of fighters) for (const R of this.list(o, 'echo'))
      if (o !== L.f && o.active) this.echoes.push({ o, t: R.v.delay, dmg: F.dmg * R.v.mul, brk: F.brk * R.v.mul, from: L.f.ch.pos.clone(), dk: L.dk });   // (2단계: on the same dokkaebi)
  },
  tick(gdt) {
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const e = this.echoes[i]; e.t -= gdt; if (e.t > 0) continue;
      this.echoes.splice(i, 1);
      Dk.with(e.dk, () => {
        if (!AI.targetable()) return;
        const src = e.o.onField ? e.o.ch.pos : e.from, c = FP.chest(), n = V3(boss.pos.x - src.x, 0, boss.pos.z - src.z).normalize();
        for (let k = 0; k < 8; k++) Particles.burst('sparkP', V3(src.x + (c.x - src.x) * k / 8, 1.1 + (c.y - 1.1) * k / 8, src.z + (c.z - src.z) * k / 8), null, 2, 0.8);
        Duo.hitBoss(e.o, e.dmg, e.brk, V3(src.x, 0, src.z), V3(n.x, 0.3, n.z).normalize(), { hitstop: 0.06, kick: 1, fx: 1.5 }, { hitP: c, fin: true });
        Game.popup('ECHO', V3(c.x, c.y + 0.6, c.z), C.PURP1); Duo.stats.echo = (Duo.stats.echo || 0) + 1;
      });
    }
  },
  get(id) { return RELICS.find(r => r.id === id); },
  // ---- the hook: what fighter f's relics add up to for one effect kind
  list(f, kind) { return f ? this.owned[f.idx].map(id => this.get(id)).filter(r => r && r.kind === kind) : []; },
  has(f, kind) { return this.list(f, kind).length > 0; },
  mul(f, kind) { return this.list(f, kind).reduce((m, r) => m * r.v, 1); },
  sum(f, kind) { return this.list(f, kind).reduce((m, r) => m + r.v, 0); },
  team(kind, v) { return fighters.some(f => f.active && this.list(f, kind).some(r => v === undefined || r.v === v)); },   // either character holds it
  teamMul(kind) { return fighters.reduce((m, f) => m * (f.active ? this.mul(f, kind) : 1), 1); },
  teamSum(kind) { return fighters.reduce((m, f) => m + (f.active ? this.sum(f, kind) : 0), 0); },
  // ---- the three cards for fighter i after boss b: own seeded draw (Game.seed · boss · character), never the game's Sim RNG
  offer(i, b) {
    const pair = fighters.map(q => q.char).sort().join(), mine = this.owned[i], both = [...this.owned[0], ...this.owned[1]];
    const pool = RELICS.filter(r => !mine.includes(r.id) && (!r.pair || (r.pair.slice().sort().join() === pair && !both.includes(r.id))));
    let a = (Game.seed * 7919 + b * 131 + i * 17 + 3) >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const p = pool.slice();
    for (let k = p.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [p[k], p[j]] = [p[j], p[k]]; }
    return p.slice(0, 3).map(r => r.id);
  },
  // the rest screen opens once the fallen boss is gone (Rush 'rest' at hideT)
  start() {
    this.open = true; this.t = 0;
    const solo = Game.tagMode;
    this.P = fighters.map((f, i) => ({ cards: this.offer(i, Rush.idx), cur: 0, phase: 'relic', eq: 0, eqs: this.orders(f), bot: !!Game.botFor(f) && !solo, delay: FEEL.RELIC.botT + i * 0.2 }));
    if (Game.tagBot) this.P.forEach(q => { q.bot = true; });
    Select.taps.length = 0; Select.padPrev = [{}, {}];
  },
  // the loadout options at rest: the current [U, I] first, then every other ordered pair of this character's ready skills
  orders(f) {
    const k = CHARS[f.char].skills.filter(s => SKILLS2[s].ready), out = [f.loadout.slice()];
    for (const a of k) for (const b of k) if (a !== b && !(a === f.loadout[0] && b === f.loadout[1])) out.push([a, b]);
    return out;
  },
  done() { return !this.open || this.P.every(q => q.phase === 'done'); },
  // which panel a key / pad belongs to (duo: own · tag solo: A then B · AI partner: 1P only)
  owner(s) {
    if (Game.tagMode) { if (s !== 0) return -1; return this.P[0].phase !== 'done' ? 0 : 1; }
    return this.P[s] && !this.P[s].bot ? s : -1;
  },
  update(dt) {
    if (!this.open) return;
    this.t += dt;
    const evs = [];
    if (Rec.playing) { for (const e of (Rec.cur && Rec.cur.ev) || []) evs.push(e); }
    else {
      for (const code of Select.taps.splice(0)) { const e = Select.keyEvent(code); if (e) this.menu(e, evs); }
      for (let s = 0; s < 2; s++) { const e = Select.padEvent(s); if (e) this.menu(e, evs); }
      this.P.forEach((q, i) => {                   // bots: a short beat, then a weighted pick (input side: Math.random, recorded below)
        if (!q.bot || q.phase !== 'relic' || (Game.tagMode && i === 1 && this.P[0].phase !== 'done')) return;
        q.delay -= dt; if (q.delay > 0) return;
        let c = -1;
        if (this.botRule === 'wave') { const wf = FEEL.RELIC.waveFirst; let bp = 99; q.cards.forEach((id, k) => { const p = wf.indexOf(id); if (p >= 0 && p < bp) { bp = p; c = k; } }); }   // 2단계 규칙 봇: 파장 관련 먼저
        if (c < 0) { const w = q.cards.map(id => this.get(id).w || 1), tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot; c = 0; while (c < w.length - 1 && (r -= w[c]) > 0) c++; }
        evs.push(['relic', i, c]); evs.push(['equip', i, 0]);
      });
      if (this.t >= FEEL.RUSH.restT - FEEL.RUSH.hideT + FEEL.RELIC.autoT)   // nobody at the keys: the first card, loadout kept
        this.P.forEach((q, i) => { if (q.phase === 'relic') evs.push(['relic', i, 0]); if (q.phase !== 'done') evs.push(['equip', i, 0]); });
      if (evs.length && Rec.mode === 'rec' && Rec.cur) (Rec.cur.ev = Rec.cur.ev || []).push(...evs);
    }
    for (const e of evs) this.apply(e);
  },
  // one menu input on panel o (cursor moves are look only; the decisions become events)
  menu(e, evs) {
    const o = this.owner(e.s); if (o < 0) return;
    const q = this.P[o], r = e.r;
    if (q.phase === 'relic') {
      if (r.left || r.right) { q.cur = (q.cur + (r.right ? 1 : 2)) % 3; Sfx.play('step'); }
      if (r.ok) evs.push(['relic', o, q.cur]);
    } else if (q.phase === 'equip') {
      if (r.left || r.right || r.up || r.down) { q.eq = (q.eq + (r.right || r.down ? 1 : q.eqs.length - 1)) % q.eqs.length; Sfx.play('step'); }
      if (r.ok) evs.push(['equip', o, q.eq]);
    }
  },
  apply(e) {
    const [k, i, v] = e, q = this.P && this.P[i], f = fighters[i];
    if (!q || !f) return;
    if (k === 'relic' && q.phase === 'relic') {
      const id = q.cards[Math.max(0, Math.min(q.cards.length - 1, v))];
      if (id) { this.owned[i].push(id); Duo.stats.relics = Duo.stats.relics || {}; Duo.stats.relics[id] = (Duo.stats.relics[id] || 0) + 1; }
      q.phase = 'equip'; q.eq = 0; Sfx.play('lock');
      const p = f.ch.pos; if (f.onField) Particles.burst('spark', V3(p.x, 1.2, p.z), null, 16, 1.4);
    } else if (k === 'equip' && q.phase === 'equip') {
      const lo = q.eqs[Math.max(0, Math.min(q.eqs.length - 1, v))];
      if (v) { f.setChar(f.char, lo); Duo.stats.reequip = (Duo.stats.reequip || 0) + 1; }
      q.phase = 'done'; Sfx.play('join');
    }
    if (this.done()) { this.open = false; Select.taps.length = 0; }
  },
  // ---- HUD: the rest screen (cards · loadout) and the little icons under each HP bar
  draw() {
    if (!this.open) return;
    const W = CFG.BASE_W, y0 = 52, y1 = 150, blink = blinkOn();
    hudDither(0, y0 - 2, W, y1 - y0 + 4);
    txtC('CHOOSE A RELIC', W / 2, y0 + 1, PAL_HEX[C.BONE1], 1);
    const panels = Game.tagMode ? [this.P[0].phase !== 'done' ? 0 : 1] : [0, 1];
    panels.forEach((i, k) => {
      const q = this.P[i], f = fighters[i], solo = panels.length === 1, x = solo ? W / 2 - 117 : k ? W / 2 + 4 : 4, w = solo ? 234 : W / 2 - 8;
      const who = Game.tagMode ? `${f.label} ${CHARS[f.char].label}` : `${f.label}${q.bot ? ' AI' : ''} ${CHARS[f.char].label}`;
      txt(who, x + 2, y0 + 10, PAL_HEX[PCOL[i]]);
      if (q.phase === 'relic') {
        q.cards.forEach((id, c) => {
          const R = this.get(id), cw = Math.floor((w - 8) / 3), cx = x + 2 + c * (cw + 2), cy = y0 + 19, sel = c === q.cur && !q.bot;
          box(cx, cy, cw, 76); hctx.fillStyle = PAL_HEX[R.col]; hctx.fillRect(cx + 1, cy + 1, cw - 2, 2);
          if (sel) { hctx.fillStyle = PAL_HEX[blink ? C.HOTW : C.HOT]; hctx.fillRect(cx, cy - 2, cw, 1); hctx.fillRect(cx, cy + 77, cw, 1); }
          relicIcon(cx + cw / 2, cy + 11, R, true);
          txtC(R.name, cx + cw / 2, cy + 21, PAL_HEX[sel ? C.HOTW : C.BONE1]);
          wrapTxt(R.en, Math.floor((cw - 4) / 4)).forEach((l, n) => txtC(l, cx + cw / 2, cy + 31 + n * 7, PAL_HEX[C.STONE3]));
        });
        txtC(q.bot ? 'CHOOSING...' : 'LEFT RIGHT  OK TAKES', x + w / 2, y0 + 99, PAL_HEX[C.STONE2]);
      } else {
        const taken = this.owned[i].map(id => this.get(id).name);
        txt(`TAKEN  ${taken[taken.length - 1] || ''}`, x + 2, y0 + 20, PAL_HEX[C.HOT]);
        if (q.phase === 'equip') {
          const lo = q.eqs[q.eq];
          txt('SKILLS FOR THE NEXT BOSS', x + 2, y0 + 34, PAL_HEX[C.STONE3]);
          txt(`< U ${SKILLS2[lo[0]].name}`, x + 6, y0 + 46, PAL_HEX[blink ? C.HOTW : C.BONE1]);
          txt(`  I ${SKILLS2[lo[1]].name} >`, x + 6, y0 + 54, PAL_HEX[blink ? C.HOTW : C.BONE1]);
          txt(q.eq ? 'OK CHANGES' : 'OK KEEPS', x + 6, y0 + 66, PAL_HEX[C.STONE2]);
        } else txt('READY', x + 2, y0 + 34, PAL_HEX[C.BONE1]);
      }
    });
  },
};
// split text into lines of at most n characters (word wrap)
function wrapTxt(s, n) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  if (line) out.push(line);
  return out;
}
// a relic's little mark: a framed diamond in its colour with its initial (big = on a card)
function relicIcon(cx, cy, R, big = false) {
  const r = big ? 7 : 4;
  diamond(Math.round(cx), Math.round(cy), r + 1, null, C.VOID); diamond(Math.round(cx), Math.round(cy), r, C.ABYSS, R.col);
  if (big) txtC(R.name[0], Math.round(cx), Math.round(cy) - 2, PAL_HEX[R.col], 1, null);
  else { hctx.fillStyle = PAL_HEX[R.col]; hctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2); }
}
function drawRelicIcons(f, x, y, right) {
  Relics.owned[f.idx].forEach((id, k) => { const R = Relics.get(id); relicIcon(right ? x - k * 11 : x + k * 11, y, R); });
}
