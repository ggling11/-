// ---- 1.6 청파·적파 3칸: 사람마다 메인 색 하나 (A 세검 = 청파 · B 대검 = 적파, FEEL.WAVE.color)
//      보스 공격은 적파(붉음) / 청파(푸름) 색을 띰 · 패리는 누구나 할 수 있지만 흡수는 자기 색만 (커버·셔틀 받아치기 포함)
//      칸은 최대 FEEL.WAVE.max — 넘치면 가장 오래된 것이 밀려 사라짐 · 스킬(시동·마무리)을 쓰면 가장 오래된 칸 하나로 강화, 비면 기본 스킬
//      강화 시동 → 파트너 마무리도 강해짐 · 강화 시동 + 강화 마무리 = 자파(청 + 적) · 평타가 맞으면 스킬 쿨타임이 조금씩 줄어듦
const Slots = {
  color(f) { return CHARS[f.char].color; },     // 2단계: per character (CHARS.color) — 'both' = twin blades (absorbs either)
  // 2단계: 0 = blue · 1 = red — the shuttle orb's colour / shape for f (twin blades = the colour opposite the partner's ★3)
  k(f) {
    const c = this.color(f);
    if (c !== 'both') return c === 'blue' ? 0 : 1;
    const o = fighters.find(q => q !== f), oc = o ? this.color(o) : 'both';
    return oc === 'blue' ? 1 : oc === 'red' ? 0 : f.idx;
  },
  max(f) { return Relics.list(f, 'slots').reduce((m, r) => Math.max(m, r.v), FEEL.WAVE.max); },   // slots per fighter (relic FOURTH SLOT: 4)
  col(w) { return w === 'blue' ? C.CYAN : w === 'violet' ? C.PURP1 : C.CRIM2; },        // HUD colour of a wave
  pk(w) { return w === 'blue' ? 'waveB' : w === 'violet' ? 'sparkP' : 'waveR'; },       // particle kind of a wave
  // 2단계 쌍검: 강화로 늘어나는 몫 × FEEL.WAVE.twinK (1 + (배율 − 1) × k) · 다른 캐릭터는 그대로
  empK(f) { return f && CHARS[f.char].color === 'both' ? FEEL.WAVE.twinK : 1; },
  scaleE(E, k) { if (!E || k === 1) return E; const o = {}; for (const key in E) o[key] = typeof E[key] === 'number' && key !== 'rally' ? 1 + (E[key] - 1) * k : E[key]; return o; },
  startE(f) { return f.castEmp ? this.scaleE(FEEL.WAVE.start[f.castEmp], this.empK(f)) : null; },
  // a parried / covered boss hit: mine if it's my colour (the shuttle orb is always the receiver's colour) — once per boss hit
  absorb(f, wave, hitId) {
    if (!f || !wave || Game.mode !== 'fight') return false;
    const w = wave === 'shuttle' ? WAVE_COLORS[this.k(f)] : wave;   // (the orb is the receiver's colour · twin blades: Slots.k)
    if (w !== this.color(f) && this.color(f) !== 'both') return false;   // twin blades absorb either colour
    if (hitId !== undefined && hitId !== null && f.slotHit === hitId) return false;
    f.slotHit = hitId;
    return this.push(f, w);
  },
  // relic HANDOFF: a covered wave goes to the partner whatever its colour (it fills as the partner's own colour; the twin blades keep the wave's)
  give(f, wave) { if (!f || !wave || Game.mode !== 'fight') return false; const w = wave === 'shuttle' ? WAVE_COLORS[this.k(f)] : wave; return this.push(f, this.color(f) === 'both' ? w : this.color(f)); },
  push(f, w) {
    const V = FEEL.WAVE, S = f.slots, st = Duo.stats.wave;
    if (S.length >= this.max(f)) { S.shift(); st.lost++; f.slotFx.push({ k: 'out', t: 0 }); }   // full: the oldest is pushed out
    S.push(w); st.absorb[f.idx]++;
    f.slotFx.push({ k: 'in', i: S.length - 1, t: 0 });
    const p = f.ch.pos;
    Particles.burst(this.pk(w), V3(p.x, 1.2, p.z), null, 14, 1.3);
    Sfx.play('absorb', w === 'blue' ? 1 : 0.8);
    return true;
  },
  // a skill press (starter or finisher): the oldest slot powers it · null = empty → the plain skill
  take(f) {
    if (!f.slots.length) return null;
    const w = f.slots.shift(); f.slotFx.push({ k: 'use', t: 0, w });
    Duo.stats.wave.used[f.idx]++;
    const p = f.ch.pos;
    Particles.burst(this.pk(w), V3(p.x, 0.9, p.z), null, 18, 1.6); f.ch.flash(0.1, this.col(w));
    Sfx.play('empower', w === 'blue' ? 1 : 0.8);
    return w;
  },
  // a basic swing landed on the boss: both skill cooldowns tick down a little (the greatsword more per hit — it swings slower)
  onBasicHit(F) { const d = CHARS[F.char].cdHit * Relics.mul(F, 'cdHit'); F.cd[0] = Math.max(0, F.cd[0] - d); F.cd[1] = Math.max(0, F.cd[1] - d); },
  // the finisher's multipliers: plain · partner's empowered starter (pass) · my own wave (fin) · both = violet
  finMul(L) {
    const V = FEEL.WAVE;
    if (L.violet) return { dmg: V.violet.dmg + Relics.teamSum('violetMul'), brk: V.violet.brk, rally: V.violet.rally, stop: V.violet.stop };   // (relic VIOLET CORE +0.3)
    const m = { dmg: 1, brk: 1, rally: 0, stop: 0 };
    if (L.stEmp) m.dmg *= 1 + (V.pass - 1) * this.empK(L.by);   // (the twin blades' empowered starter passes on × twinK of the bonus)
    if (L.emp) { const E = this.scaleE(V.fin[L.emp], this.empK(L.f)); m.dmg *= E.dmg; m.brk *= E.brk; m.rally = E.rally; }
    return m;
  },
  update(dt) {
    for (const f of fighters) {
      if (f.slotFx.length) f.slotFx = f.slotFx.filter(e => (e.t += dt) < 0.4);
      // full (3): a faint aura of my colour at my feet — readable from across the arena (cosmetic)
      if (Game.mode === 'fight' && f.onField && f.state !== 'down' && f.slots.length >= this.max(f) && f.slots.length && Math.random() < dt * 9) {
        const p = f.ch.pos, c = this.color(f), w = c === 'both' ? f.slots[Math.floor(Math.random() * f.slots.length)] : c;   // (twin blades: the colours it holds)
        Particles.burst(w === 'blue' ? 'auraB' : 'auraR', V3(p.x + rnd(-0.3, 0.3), 0.1, p.z + rnd(-0.3, 0.3)), null, 1, 0.6);
      }
    }
  },
};
// HUD: three circles (filled = a stored wave in my colour · the leftmost goes first, ticked) — not on the HP bar
function hudDisc(cx, cy, r, col) { hctx.fillStyle = PAL_HEX[col]; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); hctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function hudRing(cx, cy, r, col, dotted = false) {
  hctx.fillStyle = PAL_HEX[col]; const n = Math.max(12, Math.round(r * 6.5));
  for (let i = 0; i < n; i++) { if (dotted && i % 2) continue; const a = i / n * TAU; hctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
}
function drawSlots(f, cx, cy, small = false) {
  const V = FEEL.WAVE, r = small ? 2 : 4, gap = small ? 6 : 11, n = f.slots.length, max = Slots.max(f);
  const x0 = Math.round(cx - (max - 1) / 2 * gap);   // 2단계: each circle in the colour it holds (twin blades mix) · max = 3 (4 with the FOURTH SLOT relic)
  const blink = Math.floor(clock.t * 6) % 2 === 0;
  for (let i = 0; i < max; i++) {
    const x = x0 + i * gap, on = i < n, pop = f.slotFx.some(e => e.k === 'in' && e.i === i && e.t < 0.2);
    const w = on ? f.slots[i] : Slots.color(f) === 'both' ? 'violet' : Slots.color(f), fill = Slots.col(w), edge = w === 'blue' ? C.BONE2 : w === 'violet' ? C.PURP1 : C.HOT;
    const rr = r + (pop ? 1 : 0);
    hudDisc(x, cy, rr + 1, C.VOID);
    hudDisc(x, cy, rr, on ? fill : C.ABYSS);
    if (!small) hudRing(x, cy, rr, on ? (pop ? C.HOTW : edge) : C.DUSK);
    if (on && !small) { hctx.fillStyle = PAL_HEX[C.HOTW]; hctx.fillRect(x - 1, cy - 2, 1, 1); }   // glint
    if (on && i === 0 && !small && blink) { hctx.fillStyle = PAL_HEX[C.HOTW]; hctx.fillRect(x - 1, cy - r - 3, 3, 1); }   // next to go
  }
  for (const e of f.slotFx) {                     // used: a bright ring bursts from the first slot · pushed out: a grey ring breaks apart
    if (e.k !== 'use' && e.k !== 'out') continue;
    const k = e.t / 0.4;
    hudRing(x0, cy, r + 1 + k * (small ? 4 : 7), e.k === 'use' ? (k < 0.5 ? C.HOTW : Slots.col(e.w)) : C.STONE2, e.k === 'out');
  }
}
