// ---- 3단계 패드 입력 (레퍼런스: MDN Using the Gamepad API · Permissions-Policy: gamepad · "The Gamepad API Lies to You" · gamecontroller.js)
//      · connect / disconnect events only track which pads exist; the state is re-read from navigator.getGamepads() every frame (no stale snapshots)
//      · player slots keep the gamepad.index of the pad that pressed first (1P, then 2P) — a pad dropping out never swaps 1P and 2P;
//        a slot waits PAD.keep s for the same pad to come back
//      · getGamepads() throwing (embedded page with the gamepad policy off) = "blocked", retried every PAD.retry s (never given up for good)
//      · mapping 'standard' → PAD.std, anything else → PAD.fallback (button order is not defined there)
//      · triggers count when value ≥ PAD.trig · round dead zone PAD.dead, rescaled · a stick is trusted only after it has rested once
const Pads3 = {
  slots: [null, null], known: {}, blocked: false, lastTry: -1e9, seen: false,
  listen() {
    if (typeof addEventListener !== 'function') return;
    addEventListener('gamepadconnected', e => { this.known[e.gamepad.index] = this.known[e.gamepad.index] || { rest: false }; this.seen = true; });
    addEventListener('gamepaddisconnected', e => { for (const s of this.slots) if (s && s.index === e.gamepad.index) s.lost = clock.t; });
  },
  read() {
    if (this.blocked && clock.t - this.lastTry < PAD.retry) return [];
    this.lastTry = clock.t;
    try {
      const l = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : [];
      this.blocked = false; return l.filter(p => p && p.connected);
    } catch (e) { this.blocked = true; return []; }
  },
  btn(gp, i) { const b = gp.buttons[i]; return !!b && (b.pressed || b.value >= PAD.trig); },
  table(gp) { return gp.mapping === 'standard' ? PAD.std : PAD.fallback; },
  // one pad → standard-shaped button array (0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 BACK · 9 START · 12-15 d-pad) + stick
  state(gp) {
    const T = this.table(gp), on = l => l.some(i => this.btn(gp, i)), S = [];
    S[0] = on(T.dodge); S[1] = on(T.parry); S[2] = on(T.attack); S[3] = on(T.interact); S[4] = this.btn(gp, T.skill1[1] ?? -1); S[5] = on(T.tag);
    S[6] = on(T.skill2); S[7] = this.btn(gp, T.skill1[0]); S[8] = on(T.back); S[9] = on(T.menu);
    S[12] = on(T.up); S[13] = on(T.down); S[14] = on(T.left); S[15] = on(T.right);
    for (let i = 0; i < 17; i++) S[i] = !!S[i];
    const K = this.known[gp.index] || (this.known[gp.index] = { rest: false });
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0; const m = Math.hypot(x, y);
    if (m < PAD.dead) K.rest = true;
    if (!K.rest || m < PAD.dead) { x = 0; y = 0; } else { const k = Math.min(1, (m - PAD.dead) / (1 - PAD.dead)) / m; x *= k; y *= k; }
    const raw = gp.buttons.map((b, i) => this.btn(gp, i));
    return { S, x, y: -y, raw, any: raw.some(Boolean) || (K.rest && m > PAD.on) };
  },
  // slots: keep · re-attach · assign the next pad that presses something
  assign(list) {
    for (let s = 0; s < 2; s++) {
      const sl = this.slots[s]; if (!sl) continue;
      const gp = list.find(p => p.index === sl.index);
      if (gp) { sl.lost = null; continue; }
      const back = list.find(p => p.id === sl.id && !this.slots.some(o => o && o.index === p.index));
      if (back) { sl.index = back.index; sl.lost = null; continue; }
      if (sl.lost === null || sl.lost === undefined) sl.lost = clock.t;
      if (clock.t - sl.lost > PAD.keep) this.slots[s] = null;
    }
    for (const gp of list) {
      if (this.slots.some(o => o && o.index === gp.index)) continue;
      if (!this.state(gp).any) continue;
      const free = this.slots[0] ? (this.slots[1] ? -1 : 1) : 0;
      if (free >= 0) { this.slots[free] = { index: gp.index, id: gp.id, mapping: gp.mapping, lost: null }; Sfx.play('step'); }
    }
  },
  poll(I) {
    const list = this.read();
    this.assign(list);
    I.padOn = this.slots.some(Boolean);
    const show = Game.mode === 'showcase';
    for (let s = 0; s < 2; s++) {
      const P = I.pads[s], sl = this.slots[s], gp = sl && list.find(p => p.index === sl.index);
      P.x = P.y = 0; P.on = !!gp; P.hold = {};
      if (!gp) { I.padPrev[s] = []; continue; }
      const st = this.state(gp), B = st.S;
      P.x = st.x; P.y = st.y; P.raw = st.raw;
      if (B[12]) P.y = 1; if (B[13]) P.y = -1; if (B[14]) P.x = -1; if (B[15]) P.x = 1;
      const map = show ? [[4, 'prev'], [5, 'next'], [3, 'switch'], [8, 'show']]
                       : [[2, 'attack'], [0, 'dodge'], [1, 'parry'], [7, 'skill1'], [4, 'skill1'], [6, 'skill2'], [5, 'tag'], [9, 'menu'], [8, 'chars']];   // BACK = 끝 화면에서 캐릭터 선택 (2단계는 개발용 동작 보기 전환 — 싸우다 눌리면 헷갈려서 뺌, 동작 보기는 F1)
      P.hold.interact = B[3];
      for (const [i, act] of map) {
        if (B[i] && !I.padPrev[s][i]) {
          const global = act === 'show' || act === 'prev' || act === 'next' || act === 'switch' || act === 'menu' || act === 'chars';
          if (s === 1 && act === 'tag') continue;
          (s === 1 && !global ? I.pressed2 : I.pressed).add(act);
        }
      }
      I.padPrev[s] = B.slice();
    }
  },
  rumble(s, ms = 60, k = 0.6) {                     // optional: a short buzz (no actuator = nothing)
    const sl = this.slots[s]; if (!sl) return;
    try { const gp = navigator.getGamepads()[sl.index]; const a = gp && gp.vibrationActuator; if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: k, weakMagnitude: k }); } catch (e) { /* not supported */ }
  },
  lines() {
    const out = [];
    if (this.blocked) out.push('PADS BLOCKED BY THIS PAGE - RETRYING');
    else if (!this.slots.some(Boolean)) out.push('NO PAD - PRESS A BUTTON ON IT');
    else out.push(this.slots.map((sl, s) => `${s + 1}P ${sl ? (sl.lost !== null && sl.lost !== undefined ? 'RECONNECT' : 'READY') : '-'}`).join('   '));
    let list = []; try { list = this.blocked ? [] : this.read(); } catch (e) { list = []; }
    for (const gp of list) {
      const s = this.slots.findIndex(o => o && o.index === gp.index);
      out.push(`#${gp.index} ${gp.mapping === 'standard' ? 'STANDARD' : 'NON-STANDARD'} ${s >= 0 ? (s + 1) + 'P' : 'PRESS TO JOIN'} ${String(gp.id).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').slice(0, 28)}`);
    }
    out.ok = this.slots.some(Boolean);
    return out;
  },
};
Pads3.listen();
