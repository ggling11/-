// ---- 1.6 연계 연출: "내가 시동 → 파트너가 날아옴"이 한 동작으로 읽히게
//      시동 적중(상태) → 두 사람을 잇는 빛줄(시동 건 사람 색 → 받을 사람 색) · 받을 사람 번쩍 · 부르는 소리
//      마무리 시작 → 대답하는 소리 · 짧은 전체 정지 · 둘 사이로 줌인 · 흔들림 · 두 색이 섞인 궤적 (자파면 보라)
//      큰 순간(그 보스전에서 처음 나온 마무리 · 자파) → 컷인: 두 사람 초상 + 마무리 이름, 그동안 게임 시간은 느리게 (FEEL.STAGE)
const Stage = {
  link: null, cut: null, slowT: 0, lastCut: -99, seen: new Set(),
  reset() { this.link = null; this.cut = null; this.slowT = 0; this.lastCut = -99; this.seen = new Set(); CamRig.zp = null; CamRig.zoom = 1; CamRig.zw = 0; },
  recvOf(by) { return Game.tagMode ? Duo.benchFor(by) : fighters.find(o => o !== by && o.alive) || null; },
  // a starter landed and the boss took a status: the call
  onStatus(st) {
    if (Game.mode !== 'fight' || !st) return;
    const by = st.by, recv = this.recvOf(by), w = Slots.color(by);
    this.link = { by, recv, t: 0, emp: st.emp };
    Sfx.play('call');
    if (recv) {
      recv.flashHud = 0.25;
      if (recv.onField) { recv.ch.flash(0.18, Slots.col(w)); const p = recv.ch.pos; Particles.burst(Slots.pk(w), V3(p.x, 1.4, p.z), null, 12, 1.2); }
    }
  },
  // a finisher started: the answer · freeze · zoom toward it · shake · a cut-in for the big ones
  onFinish(L) {
    const S = FEEL.STAGE, f = L.f, by = L.by;
    this.link = null;
    Sfx.play('answer'); if (L.violet) Sfx.play('violet');
    Game.stopAll(S.freeze);
    const fp = f.ch.pos, b = boss.pos;
    CamRig.zoomPunch(L.violet ? S.violetZoom : S.zoom, V3((fp.x + b.x) / 2, 1.2, (fp.z + b.z) / 2));
    const sh = L.violet ? S.violetShake : S.shake; CamRig.shake(sh[0], sh[1]);
    if (by && by.onField) {                         // a burst of both colours between the two of them
      const bp = by.ch.pos, m = V3((bp.x + fp.x) / 2, 1.2, (bp.z + fp.z) / 2);
      Particles.burst(L.violet ? 'sparkP' : Slots.pk(L.byCol), m, null, 14, 1.5);
      Particles.burst(L.violet ? 'sparkP' : Slots.pk(Slots.color(f)), V3(fp.x, 1.2, fp.z), null, 14, 1.5);
    }
    if (L.violet) { Game.edgeFlash = { t: 0.22, col: C.PURP1 }; Duo.stats.wave.violet++; }
    const key = `${Rush.idx}:${L.name}`, first = !this.seen.has(key);
    this.seen.add(key);
    if ((first || L.violet) && Game.t - this.lastCut >= S.cutGap) {
      this.cut = { L, by, f, t: 0 }; this.slowT = S.cutT; this.lastCut = Game.t; Duo.stats.wave.cut++;
      Sfx.play('cutin');
    }
  },
  // a finisher's first hit: the punch
  onFinHit(L) {
    CamRig.shake(L.violet ? 6 : 4, L.violet ? 0.4 : 0.28);
    if (L.violet) { const c = boss.weak[0].obj.getWorldPosition(V3()); Particles.burst('sparkP', c, null, 30, 2.2); Particles.burst('spark', c, null, 16, 1.8); }
  },
  update(dt, gdt) {
    if (this.cut) { this.cut.t += dt; if (this.cut.t >= FEEL.STAGE.cutT) this.cut = null; }
    const k = this.link;
    if (k) { k.t += dt; if (AI.state !== 'status' || !Duo.st || Duo.st.fin || !k.by.onField) this.link = null; }
    if (gdt > 0) for (const L of Duo.fins) {          // finisher trail: motes of both colours (violet when both were empowered)
      if (L.f.state !== 'finish') continue;
      const p = L.f.ch.pos, w = L.violet ? 'violet' : (Math.random() < 0.5 ? L.byCol : Slots.color(L.f));
      Particles.burst(Slots.pk(w), V3(p.x, p.y + 1.0, p.z), null, 2, 0.5);
    }
  },
  // HUD: the tether from the one who started it to the one who should finish (tag solo: to the benched portrait)
  drawLink() {
    const k = this.link; if (!k || !k.recv) return;
    const by = k.by, r = k.recv, ca = Slots.col(Slots.color(by)), cb = Slots.col(Slots.color(r));
    const [ax, ay] = toHud(by.ch.pos.x, by.ch.pos.y + 1.2, by.ch.pos.z);
    let bx, by2;
    if (Game.tagMode) { bx = 18 + r.idx * 30; by2 = 186; } else [bx, by2] = toHud(r.ch.pos.x, r.ch.pos.y + 1.2, r.ch.pos.z);
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by2 - ay) / 3)), ph = Math.floor(k.t * 24);
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = Math.round(ax + (bx - ax) * u), y = Math.round(ay + (by2 - ay) * u);
      const lit = (((i - ph) % 6) + 6) % 6 < 2;      // pulses flowing from the starter to the receiver
      hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(x, y + 1, 2, 1);
      hctx.fillStyle = PAL_HEX[lit ? C.HOTW : (u < 0.5 ? ca : cb)]; hctx.fillRect(x, y, lit ? 2 : 1, 1);
    }
    if (!Game.tagMode && r.onField) {                 // a pulsing ring at the receiver's feet: "this is yours"
      const [fx, fy] = toHud(r.ch.pos.x, 0.05, r.ch.pos.z), rr = 9 + (Math.floor(k.t * 10) % 3);
      for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; hctx.fillStyle = PAL_HEX[i % 2 ? ca : C.HOTW]; hctx.fillRect(Math.round(fx + Math.cos(a) * rr), Math.round(fy + Math.sin(a) * rr * 0.55), 1, 1); }
    }
  },
  // HUD: the cut-in band — both portraits slide in, the finisher's name in the middle
  drawCut() {
    const c = this.cut; if (!c) return;
    const S = FEEL.STAGE, W = CFG.BASE_W, T = S.cutT, t = c.t, L = c.L;
    const e0 = t < 0.12 ? t / 0.12 : t > T - 0.16 ? Math.max(0, (T - t) / 0.16) : 1, e = e0 * e0 * (3 - 2 * e0);
    const cy = 118, H = Math.max(2, Math.round(30 * e));
    const ca = L.violet ? C.PURP1 : Slots.col(L.byCol), cb = L.violet ? C.PURP1 : Slots.col(Slots.color(c.f));
    hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(0, cy - H, W, H * 2);
    for (let i = 0; i < 9; i++) {                    // speed lines streaming across the band
      const y = cy - H + 3 + ((i * 37) % Math.max(1, H * 2 - 6)), x = Math.round(((i * 97 + t * 900) % (W + 80)) - 40);
      hctx.fillStyle = PAL_HEX[i % 3 ? C.DEEP : C.DUSK]; hctx.fillRect(W - x, y, 30 + (i % 4) * 8, 1);
    }
    hctx.fillStyle = PAL_HEX[ca]; hctx.fillRect(0, cy - H - 1, W / 2, 1); hctx.fillRect(0, cy + H, W / 2, 1);
    hctx.fillStyle = PAL_HEX[cb]; hctx.fillRect(W / 2, cy - H - 1, W / 2, 1); hctx.fillRect(W / 2, cy + H, W / 2, 1);
    if (H < 20) return;
    const slide = 1 - e, by = c.by;
    if (by) bigFace(Math.round(64 - slide * 120), cy, by, ca);
    bigFace(Math.round(W - 64 + slide * 120), cy, c.f, cb);
    const name = c.hap ? 'HAP DAE HAP' : finLabel(L.name), sub = c.hap ? 'TWIN PARRY  BOTH DOKKAEBI DOWN' : L.violet ? 'VIOLET LINK' : `${by ? by.label : ''} ${STATUS_LABEL[L.kind]}  >>  ${c.f.label}`;   // (2단계: 합동 필살 동시 패리)
    txtC(name, W / 2, cy - 11, PAL_HEX[L.violet ? C.PURP1 : C.HOTW], 3, PAL_HEX[C.CRIM0]);
    txtC(sub, W / 2, cy + 9, PAL_HEX[L.violet ? C.PURP1 : C.STONE3]);
  },
};
// a portrait three times the HUD face, framed in the given colour (cut-in)
function bigFace(cx, cy, f, edge) {
  const sc = 2, pal = facePal(f);                // 2단계: the character's colours
  diamond(cx, cy, 6 * sc + 9, null, C.VOID); diamond(cx, cy, 6 * sc + 8, C.ABYSS, edge);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const ch = FACE[y][x]; if (ch === '.') continue;
    hctx.fillStyle = PAL_HEX[pal[ch]]; hctx.fillRect(cx - 6 * sc + x * sc, cy - 6 * sc + y * sc, sc, sc);
  }
}
// the new sounds (WebAudio synth like the rest)
Object.assign(Sfx.bank, {
  absorb(t, r, k) {                               // a glassy chime as a wave goes in (청파 higher, 적파 lower)
    const f0 = 1320 * k;
    this.tn(t, { f0: r(f0), f1: r(f0 * 1.5), w: 'triangle', a: 0.004, d: 0.18, g: 0.12 }); this.tn(t + 0.05, { f0: r(f0 * 2), d: 0.14, g: 0.05 });
    this.nz(t, { f0: 5000, f1: 2500, type: 'highpass', d: 0.1, g: 0.08 });
  },
  empower(t, r, k) {                              // a rising whoosh as a wave powers a skill
    this.nz(t, { f0: r(600), f1: r(3600), q: 1.3, a: 0.02, d: 0.22, g: 0.35 });
    this.tn(t, { f0: r(440 * k), f1: r(880 * k), w: 'sawtooth', a: 0.01, d: 0.16, g: 0.06 });
  },
  call(t, r) {                                    // the starter calls: two rising notes
    this.tn(t, { f0: r(660), w: 'square', a: 0.003, d: 0.08, g: 0.07 }); this.tn(t + 0.09, { f0: r(990), w: 'square', a: 0.003, d: 0.12, g: 0.08 });
  },
  answer(t, r) {                                  // the partner answers: the same two notes a fifth higher + a push of air
    this.tn(t, { f0: r(990), w: 'square', a: 0.003, d: 0.07, g: 0.08 }); this.tn(t + 0.07, { f0: r(1485), w: 'square', a: 0.003, d: 0.14, g: 0.09 });
    this.nz(t, { f0: r(400), f1: r(2600), q: 1.2, a: 0.01, d: 0.15, g: 0.4 });
  },
  cutin(t, r) {                                   // the cut-in: a long swish + a bright triad
    this.nz(t, { f0: r(300), f1: r(5000), q: 0.9, a: 0.04, d: 0.3, g: 0.45 });
    for (const [f, d] of [[392, 0.4], [587, 0.36], [784, 0.32]]) this.tn(t + 0.03, { f0: r(f), w: 'triangle', d, g: 0.06 });
  },
  violet(t, r) {                                  // 자파: a dark full chord under everything
    for (const [f, d] of [[220, 0.6], [277, 0.55], [330, 0.5], [440, 0.45]]) this.tn(t, { f0: r(f), f1: r(f) * 0.99, w: 'sawtooth', a: 0.01, d, g: 0.035 });
    this.nz(t, { f0: 1800, f1: 300, type: 'lowpass', d: 0.4, g: 0.3 });
  },
});
