// ---- 3단계 시작 화면 · Esc 설정 메뉴 · 2P 참가/나가기 (꾹 누르기)
//      title: the arena with the two characters and the first boss, PRESS ANY KEY / BUTTON (also gives focus · unlocks sound · wakes the pads)
//      menu (Esc / pad START, pauses the fight — paused frames are not recorded, so replays stay identical):
//      RESUME · CONTROLS (1P / 2P / PAD tabs, the real keys of the current mode) · PLAYERS · GAMEPAD (status + live buttons) ·
//      RENDER SCALE · EFFECTS (name only / cut-ins) · SHAKE · 2P KEYS ON HUD · SOUND · RESTART · CHARACTER SELECT
const KEYLABEL = code => ({ Space: 'SPACE', Enter: 'ENTER', NumpadEnter: 'NUM ENT', Backspace: 'BKSP', Escape: 'ESC', Slash: '/', Period: '.', ShiftRight: 'R-SHIFT',
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' }[code] || code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM'));
const keyList = codes => (codes && codes.length ? codes.map(KEYLABEL).join(' / ') : '-');
const Join3 = {
  t: 0, held: false,
  // hold the 2P confirm keys (or the 2nd pad's A) for UI.joinHold s → 2P joins · returns 0..1 progress
  step(dt, codes) {
    const pad2 = Input.pads[1] && Input.pads[1].on && !!Input.padPrev[1][0];
    const h = codes.some(c => keys.has(c)) || pad2;
    this.t = h ? this.t + dt : 0; this.held = h;
    if (this.t >= UI.joinHold) { this.t = -1e9; return 1; }
    return Math.max(0, this.t / UI.joinHold);
  },
  reset() { this.t = 0; this.held = false; },
};
const Title3 = {
  tap: false, t: 0,
  open() {
    Game.state = 'title'; this.tap = false; this.t = 0;
    Select.on = false; Shots.clear(); Decals.clear(); Hazards.clear(); Game.popups = []; Game.bannerT = 0; Game.noteT = 0;
    Arena3.set(0);
    boss.root.visible = true; boss.place(1.2, -3.0, Math.atan2(-1.2, 5.0)); boss.play('idle');
    const F = fighters;
    for (const f of F) f.ch.root.visible = true;
    F[0].ch.place(-1.4, 2.0, Math.atan2(CamRig.B.x, CamRig.B.z) - 0.35); F[1].ch.place(1.5, 1.6, Math.atan2(CamRig.B.x, CamRig.B.z) + 0.35);
    F[0].ch.play('idle'); F[1].ch.play('idle');
  },
  frame(dt) {
    this.t += dt;
    for (const f of fighters) { f.ch.update(dt, null); f.ch.updateFlash(dt, CamRig.R); }
    boss.update(dt, null);
    Particles.update(dt);
    CamRig.zoom = 1.18; CamRig.update(dt, V3(0, 1.1, 0.2));
    const padAny = [0, 1].some(s => Input.pads[s].on && Input.padPrev[s].some(Boolean));
    if ((this.tap || padAny) && this.t > 0.4) { this.tap = false; CamRig.zoom = 1; Sfx.play('join'); Select.open(); }
    this.tap = false;
    Input.endFrame();
  },
  draw(dt) {
    const W = CFG.BASE_W, H = CFG.BASE_H, blink = Math.floor(clock.t / UI.title.blink) % 2 === 0;
    hctx.fillStyle = S3COL.ink;
    for (let i = 0; i < 58; i++) hctx.fillRect(Math.round(-10 + i * 0.45), 24 + i, W + 20, 1);
    t7(UI.title.name, W / 2, 30, S3COL.paper, { al: 'c', sc: 4, ol: S3COL.ink });
    t7(UI.title.sub, W / 2, 63, S3COL.orange, { al: 'c', sc: 2, ol: S3COL.ink });
    if (blink) t7('PRESS ANY KEY', W / 2, 222, S3COL.paper, { al: 'c', sh: S3COL.ink });
    txtC('KEYBOARD  OR  ANY GAMEPAD BUTTON', W / 2, 234, '#e6c9ec', 1, S3COL.ink);
    const pads = padStatusLines();
    txt(pads[0], 8, H - 12, pads.ok ? S3COL.yellow : '#9a7ba8');
    t7('ESC', W - 8 - t7w('ESC') - 4 - tw('SETTINGS'), H - 14, S3COL.orange); txt('SETTINGS', W - 8 - tw('SETTINGS'), H - 13, S3COL.paper);
  },
};
// pad lines for the title / menu (Pads3 adds detail when present)
function padStatusLines() {
  if (typeof Pads3 !== 'undefined' && Pads3.lines) return Pads3.lines();
  const on = [0, 1].filter(s => Input.pads[s].on);
  const out = [on.length ? `PAD ${on.map(s => s + 1).join(' + ')} READY` : 'NO PAD - PRESS A BUTTON ON IT'];
  out.ok = on.length > 0; return out;
}
const Menu3 = {
  on: false, page: 'main', cur: 0, tab: 0, taps: [], padPrev: [{}, {}],
  open() { this.on = true; this.page = 'main'; this.cur = 0; this.taps.length = 0; for (let s = 0; s < 2; s++) this.padPrev[s] = { a: true, b: true, st: true, x: 0, y: 0 }; Sfx.play('step'); },
  close() { this.on = false; Input.endFrame(); Sfx.play('step'); },
  playersLabel() { return Game.tagMode ? 'ALONE (TAG SOLO)' : fighters[1].bot ? 'AI PARTNER' : '2P PLAYER'; },
  setPlayers(dir) {
    const order = ['solo', 'ai', 'duo'], now = Game.tagMode ? 'solo' : fighters[1].bot ? 'ai' : 'duo';
    const next = order[(order.indexOf(now) + (dir < 0 ? 2 : 1)) % 3];
    if (Game.state === 'select') { Select.mode = next; Select.resetPanel(1); return; }
    if (next === 'solo') { if (!Game.tagMode) Game.leave(); }
    else if (next === 'ai') { if (Game.tagMode) Game.join(1, true); else { fighters[1].bot = { inp: new BotInput(), mode: 'coop' }; Game.note('2P AI TAKES OVER'); } }
    else { if (Game.tagMode) Game.join(1, false); else { fighters[1].bot = null; Game.note('2P TAKES OVER'); } }
    Sfx.play('join');
  },
  items() {
    const fight = Game.state === 'play' || Game.state === 'won' || Game.state === 'lost', pct = v => `${Math.round(v * 100)}%`;
    const L = [
      { k: 'RESUME', act: () => this.close() },
      { k: 'CONTROLS', act: () => { this.page = 'keys'; this.tab = 0; } },
      { k: 'PLAYERS', v: () => this.playersLabel(), set: d => this.setPlayers(d), act: () => this.setPlayers(1) },
      { k: 'GAMEPAD', v: () => padStatusLines()[0], act: () => { this.page = 'pad'; } },
      { k: 'RENDER SCALE', v: () => (Perf3.auto ? `AUTO ${pct(STYLE.scale)}` : pct(STYLE.scale)), set: d => { const o = [null, 1, 0.75, 0.5], cur = Perf3.auto ? 0 : Math.max(0, o.indexOf(STYLE.scale)); Perf3.setManual(o[(cur + (d < 0 ? 3 : 1)) % 4]); } },   // (성능: AUTO = 프레임 시간을 보고 자동)
      { k: 'EFFECTS', v: () => (UI.cutins ? 'CUT-INS' : 'NAME ONLY'), set: () => { UI.cutins = !UI.cutins; } },
      { k: 'SHAKE', v: () => pct(UI.shake), set: d => { const o = [1, 0.5, 0]; UI.shake = o[(o.indexOf(UI.shake) + (d < 0 ? 2 : 1)) % 3]; } },
      { k: '2P KEYS ON HUD', v: () => (UI.keys2P ? 'ON' : 'OFF'), set: () => { UI.keys2P = !UI.keys2P; } },
      { k: 'SOUND', v: () => (Sfx.muted ? 'OFF' : 'ON'), set: () => { Sfx.toggle(); } },
    ];
    if (fight) L.push({ k: 'RESTART', act: () => { this.close(); Game.reset(); } });
    if (Game.state !== 'select' && Game.state !== 'title') L.push({ k: 'CHARACTER SELECT', act: () => { this.close(); Select.open(); } });
    return L;
  },
  event(r) {
    if (this.page !== 'main') {
      if (r.back || r.ok) { this.page = 'main'; Sfx.play('step'); return; }
      if (this.page === 'keys' && (r.left || r.right)) { this.tab = (this.tab + (r.right ? 1 : 2)) % 3; Sfx.play('step'); }
      return;
    }
    const L = this.items();
    if (r.back) { this.close(); return; }
    if (r.up || r.down) { this.cur = (this.cur + (r.down ? 1 : L.length - 1)) % L.length; Sfx.play('step'); }
    const it = L[this.cur];
    if ((r.left || r.right) && it.set) { it.set(r.right ? 1 : -1); Sfx.play('step'); }
    if (r.ok) { if (it.act) it.act(); else if (it.set) it.set(1); Sfx.play('lock'); }
  },
  keyEvent(code) {
    const any = l => l.includes(code);
    const r = { up: any(['KeyW', 'ArrowUp']), down: any(['KeyS', 'ArrowDown']), left: any(['KeyA', 'ArrowLeft']), right: any(['KeyD', 'ArrowRight']),
                ok: any(['Space', 'Enter', 'NumpadEnter', 'KeyJ', 'KeyG', 'KeyL', 'Numpad1']), back: any(['Escape', 'Backspace', 'KeyH', 'KeyK', 'Numpad0']) };
    return Object.values(r).some(Boolean) ? r : null;
  },
  frame(dt) {
    for (const code of this.taps.splice(0)) { const r = this.keyEvent(code); if (r) this.event(r); if (!this.on) break; }
    for (let s = 0; s < 2 && this.on; s++) {                // pads: A ok · B back · START close · stick / d-pad edges
      const pd = Input.pads[s], pp = this.padPrev[s]; if (!pd || !pd.on) continue;
      const a = !!Input.padPrev[s][0], b = !!Input.padPrev[s][1], st = !!Input.padPrev[s][9];
      const x = pd.x > 0.5 ? 1 : pd.x < -0.5 ? -1 : 0, y = pd.y > 0.5 ? 1 : pd.y < -0.5 ? -1 : 0;
      const r = { ok: a && !pp.a, back: (b && !pp.b) || (st && !pp.st), left: x < 0 && x !== pp.x, right: x > 0 && x !== pp.x, up: y > 0 && y !== pp.y, down: y < 0 && y !== pp.y };
      Object.assign(pp, { a, b, st, x, y });
      if (Object.values(r).some(Boolean)) this.event(r);
    }
    Input.endFrame();
  },
  draw() {
    const W = CFG.BASE_W, H = CFG.BASE_H;
    hctx.fillStyle = 'rgba(10,4,20,0.72)'; hctx.fillRect(0, 0, W, H);
    hctx.fillStyle = S3COL.ink;
    for (let i = 0; i < H; i++) hctx.fillRect(Math.round(90 + i * 0.12), i, 300, 1);
    if (this.page === 'keys') return this.drawKeys();
    if (this.page === 'pad') return this.drawPad();
    t7(Game.state === 'title' ? 'SETTINGS' : 'PAUSED', W / 2 + 14, 14, S3COL.orange, { al: 'c', sc: 2 });
    const L = this.items();
    L.forEach((it, i) => {
      const y = 44 + i * 16, sel = i === this.cur;
      if (sel) { hctx.fillStyle = S3COL.orange; for (let k = 0; k < 13; k++) hctx.fillRect(Math.round(112 + k * 0.3), y - 3 + k, 270, 1); }
      t7(it.k, 124, y, sel ? S3COL.ink : S3COL.paper, { ol: sel ? null : S3COL.ink });
      if (it.v) { const v = it.v(); txt(it.set ? `< ${v} >` : v, 372 - tw(it.set ? `< ${v} >` : v), y + 1, sel ? S3COL.ink : S3COL.yellow); }
    });
    txtC('W S / ARROWS / STICK  MOVE     A D  CHANGE     SPACE / ENTER / A  OK     ESC / B  BACK', W / 2 + 14, H - 12, '#c9a4d8', 1, null);
  },
  drawKeys() {
    const W = CFG.BASE_W, H = CFG.BASE_H, tabs = ['1P KEYBOARD', '2P KEYBOARD', 'GAMEPAD'];
    t7('CONTROLS', W / 2 + 14, 10, S3COL.orange, { al: 'c', sc: 2 });
    tabs.forEach((t, i) => { const x = 130 + i * 86; if (i === this.tab) { hctx.fillStyle = S3COL.orange; hctx.fillRect(x - 3, 33, t7w(t) + 6, 11); } t7(t, x, 35, i === this.tab ? S3COL.ink : S3COL.paper, { ol: i === this.tab ? null : S3COL.ink }); });
    const rowsK = [['MOVE', 'up'], ['ATTACK', 'attack'], ['PARRY', 'parry'], ['DASH', 'dodge'], ['SKILL U', 'skill1'], ['SKILL I', 'skill2'], ['TAG (SOLO)', 'tag'], ['REVIVE (HOLD)', 'interact']];
    let cols, head;
    const mv = M => (M === PKEYS_SPLIT[1] || M === PKEYS[1] ? 'ARROWS' : 'WASD');
    if (this.tab === 0) { head = ['ALONE / AI', 'SHARED KEYBOARD']; cols = [PKEYS[0], PKEYS_SPLIT[0]]; }
    else if (this.tab === 1) { head = ['SHARED KEYBOARD', 'NUMPAD']; cols = [PKEYS_SPLIT[1], PKEYS[1]]; }
    if (this.tab < 2) {
      head.forEach((h, j) => t7(h, 222 + j * 110, 54, S3COL.yellow));
      rowsK.forEach(([n, a], i) => {
        const y = 70 + i * 13; t7(n, 120, y, S3COL.paper);
        cols.forEach((M, j) => txt(a === 'up' ? mv(M) : keyList(M[a]).slice(0, 26), 222 + j * 110, y + 1, S3COL.paper));
      });
    } else {
      const P = [['MOVE', 'LEFT STICK / D-PAD'], ['ATTACK', 'X'], ['PARRY', 'B'], ['DASH', 'A'], ['SKILL U', 'RT / LB'], ['SKILL I', 'LT'], ['TAG (SOLO)', 'RB'], ['REVIVE (HOLD)', 'Y'], ['MENU', 'START'], ['CHARACTERS (END)', 'Y / BACK']];
      P.forEach(([n, k], i) => { const y = 58 + i * 13; t7(n, 120, y, S3COL.paper); txt(k, 270, y + 1, S3COL.yellow); });
    }
    const y0 = H - 46;
    txt('MENU  ESC / START     RESTART  HOLD R     LEAVE 2P  F4 OR PLAYERS', 112, y0, '#c9a4d8');
    txt(`JOIN 2P  HOLD ENTER (OR 2ND PAD A) ${UI.joinHold}S     AI PARTNER  F3`, 112, y0 + 9, '#c9a4d8');
    txtC('A D  TAB     ESC / B  BACK', W / 2 + 14, H - 12, '#c9a4d8', 1, null);
  },
  drawPad() {
    const W = CFG.BASE_W, H = CFG.BASE_H;
    t7('GAMEPAD', W / 2 + 14, 10, S3COL.orange, { al: 'c', sc: 2 });
    const L = padStatusLines();
    L.forEach((s, i) => txt(String(s).slice(0, 60), 116, 40 + i * 10, i === 0 ? S3COL.yellow : S3COL.paper));
    for (let s = 0; s < 2; s++) {                   // live buttons: lit while held
      const y = 130 + s * 34, on = Input.pads[s].on;
      t7(`PAD ${s + 1}`, 116, y, on ? S3COL.paper : '#6a4a78');
      for (let b = 0; b < 17; b++) { const lit = on && !!Input.padPrev[s][b]; inkRect(170 + b * 12, y - 1, 9, 9, lit ? S3COL.yellow : '#2f1a3b'); txtC(String(b), 174 + b * 12, y + 1, lit ? S3COL.ink : '#8a6a98', 1, null); }
      const p = Input.pads[s]; if (on) txt(`STICK ${p.x.toFixed(2)} ${p.y.toFixed(2)}`, 170, y + 12, '#c9a4d8');
    }
    txtC('PRESS BUTTONS TO TEST     ESC / B  BACK', W / 2 + 14, H - 12, '#c9a4d8', 1, null);
  },
};
// fight: hold 2P confirm to join (no more accidental drop-in) · progress hint at the bottom while held
function joinHold3(dt) {
  if (!(Game.tagMode || fighters[1].bot) || Relics.open || Game.state !== 'play') { Join3.reset(); return; }
  const k = Join3.step(dt, ['Enter', 'NumpadEnter', 'Numpad1']);
  if (k >= 1) { Game.join(1, false); Join3.reset(); }
}
function joinHint3() {
  if (!Join3.held || Join3.t <= 0) return;
  const W = CFG.BASE_W, k = Math.min(1, Join3.t / UI.joinHold);
  t7(Game.state === 'select' && Select.mode === 'duo' ? 'HOLD: 2P LEAVES' : 'HOLD: 2P JOINS', W / 2, 186, S3COL.paper, { al: 'c' });
  inkRect(W / 2 - 30, 197, 60, 3, S3COL.dark); hctx.fillStyle = S3COL.yellow; hctx.fillRect(W / 2 - 30, 197, Math.round(60 * k), 3);
}
