// ---- 2단계 캐릭터 선택 · 장착 (판 시작 전 · 끝 화면에서 C)
//      각자 캐릭터 1명 + 스킬 3개 중 2개 (먼저 고른 것 = U 칸, 다음 = I 칸)
//      혼자 = 태그 솔로(한 사람이 두 캐릭터를 차례로) · 2P 키를 누르면 2인 · F3 = AI 파트너(빈 자리를 규칙에 맞게 자동)
//      듀오 규칙: 청 1 + 적 1, 또는 쌍검 + 아무나 · 같은 캐릭터 X (duoRule)
// one rig per character, built the first time it's needed (1P rapier / 2P greatsword already exist)
//   list: every character rig (cut-out) · bodies: rigs + boss in the 1.6 order (collision — same order = same pushes)
const Rigs = {
  map: { rapier: player, great: player2 }, list: [player, player2], bodies: [player, player2, boss],
  get(id) {
    if (this.map[id]) return this.map[id];
    const R = CHARS[id].rig;
    const ch = buildPlayer({ cloak: R.cloak || undefined, hair: R.hair || undefined, blade: R.blade || undefined, name: CHARS[id].label });
    if (R.remap) ch.remap = R.remap;
    ch.post = ch.root.userData.post || null;       // (the chain-sickle's flying head)
    ch.order = ch.order.filter(n => ch.clips[n] || (ch.remap && ch.clips[ch.remap[n]]));
    ch.root.visible = false; scene.add(ch.root);
    this.list.push(ch); this.bodies.splice(this.bodies.length - (Dk.on ? 2 : 1), 0, ch);   // (characters first, the boss rig(s) last)
    return (this.map[id] = ch);
  },
  // rigs no fighter uses are hidden (they'd still collide / cut out otherwise)
  sync() { for (const g of this.list) if (!fighters.some(f => f.ch === g)) g.root.visible = false; },
};
// HUD portrait colours of fighter f's character (hair · hair shadow · cloak from CHARS rig.face)
function facePal(f) { const F = CHARS[f.char].rig.face; return { H: F.H, h: F.h, s: C.BONE0, r: C.CRIM2, d: C.STONE2, c: F.c }; }
// null = this duo is allowed · otherwise the reason (HUD text)
function duoRule(a, b) {
  if (!a || !b) return null;
  if (a === b) return 'SAME CHARACTER';
  const ca = CHARS[a].color, cb = CHARS[b].color;
  if (ca === 'both' || cb === 'both' || ca !== cb) return null;
  return ca === 'blue' ? 'TWO BLUES: ONE BLUE + ONE RED, OR TWIN' : 'TWO REDS: ONE BLUE + ONE RED, OR TWIN';
}
// put character id (+ its two equipped skills [U, I]) on fighter f: swaps the rig in place
function assignChar(f, id, loadout) {
  const rig = Rigs.get(id), old = f.ch;
  if (old !== rig) {
    const other = fighters.find(q => q !== f && q.ch === rig);
    if (other) { other.ch = old; old.fighter = other; }          // (never in play: the duo rule forbids one character twice)
    else { old.root.visible = false; if (old.fighter === f) old.fighter = null; }
    rig.place(old.pos.x, old.pos.z, old.facing);
    f.ch = rig; rig.fighter = f; rig.root.visible = f.onField;
  }
  f.setChar(id, loadout && loadout.length === 2 ? loadout : null);
  Xray.targets = fighters.map(q => q.ch);
}
// the AI partner's pick: a ready character that keeps the duo legal (the opposite colour first, START_CHARS order, then the twin blades)
function autoPartner(id) {
  const ok = Object.keys(CHARS).filter(k => CHARS[k].ready && k !== id && !duoRule(id, k));
  const opp = ok.filter(k => CHARS[k].color !== 'both' && CHARS[k].color !== CHARS[id].color);
  return START_CHARS.find(k => opp.includes(k)) || opp[0] || ok[0] || null;
}
const SHAPE_LABEL = { single: 'ONE HIT', multi: 'MULTI HIT', area: 'WIDE' };
const COLOR_LABEL = { blue: 'BLUE WAVE', red: 'RED WAVE', both: 'BLUE + RED' };
const colorCol = c => (c === 'blue' ? C.CYAN : c === 'red' ? C.CRIM2 : C.PURP1);
const Select = {
  on: false, mode: 'solo', P: null, taps: [], padPrev: [{}, {}], startT: 0, msg: '', msgT: 0, placed: new Map(),
  ids() { return Object.keys(CHARS); },
  open() {
    this.on = true; Game.state = 'select';
    Shots.clear(); Decals.clear(); Hazards.clear(); Spikes.clear(); Shuttle.clear(true); Mark.clear(); Stage.reset(); AI.clearTele(); SkillFx.clear();
    Dk.use(false);                                 // 2단계 보스 4: back to the one-rig boss (the select screen shows no boss)
    Game.popups = []; Game.bannerT = 0; Game.noteT = 0; Game.hitstop = 0; Game.slowT = 0; Game.rHold = 0; boss.root.visible = false;
    for (const f of fighters) f.ch.root.visible = false;
    this.mode = Game.tagMode ? 'solo' : fighters[1].bot ? 'ai' : 'duo';
    const ids = this.ids();
    this.P = fighters.map(f => ({ cur: Math.max(0, ids.indexOf(f.char)), char: null, sk: 0, picks: [], phase: 'char' }));
    this.taps.length = 0; this.startT = 0; this.msgT = 0; this.placed.clear(); Input.p2Touched = false;
    for (let s = 0; s < 2; s++) this.padPrev[s] = Input.pads[s].on ? { a: !!Input.padPrev[s][0], b: !!Input.padPrev[s][1], x: 0, y: 0 } : {};   // a button already held (C on the end screen) isn't a press
    this.stand();
  },
  // which panel 1P drives in tag solo (A first, then B)
  soloPanel() { return this.P[0].phase === 'ready' ? 1 : 0; },
  owner(i) { return this.mode === 'duo' ? i : this.mode === 'ai' ? (i === 0 ? 0 : -1) : (i === this.soloPanel() ? 0 : -1); },
  say(t) { this.msg = t; this.msgT = 1.6; Sfx.play('fizzle'); },
  // menu input: every key tap is its own event, in the order pressed (slow frames never merge two taps) · pad buttons / stick edges once a frame
  keyEvent(code) {
    for (let s = 0; s < 2; s++) {
      const K = SELECT_KEYS[s], back = K.back.concat((this.mode === 'duo' ? K.backDuo : K.backSolo) || []);
      const r = { left: K.left.includes(code), right: K.right.includes(code), up: K.up.includes(code), down: K.down.includes(code), ok: K.ok.includes(code), back: back.includes(code) };
      if (r.left || r.right || r.up || r.down || r.ok || r.back) return { s, r };
    }
    return null;
  },
  padEvent(s) {                                   // pad s: A ok · B back · stick / d-pad edges
    const pd = Input.pads[s], pp = this.padPrev[s];
    if (!pd || !pd.on) { this.padPrev[s] = {}; return null; }
    const a = !!Input.padPrev[s][0], b = !!Input.padPrev[s][1], x = pd.x > 0.5 ? 1 : pd.x < -0.5 ? -1 : 0, y = pd.y > 0.5 ? 1 : pd.y < -0.5 ? -1 : 0;
    const r = { ok: a && !pp.a, back: b && !pp.b, left: x < 0 && x !== pp.x, right: x > 0 && x !== pp.x, up: y > 0 && y !== pp.y, down: y < 0 && y !== pp.y };
    Object.assign(pp, { a, b, x, y });
    return r.left || r.right || r.up || r.down || r.ok || r.back ? { s, r } : null;
  },
  handle(e, ids) {
    if (!e) return;
    if (e.s === 1 && this.mode !== 'duo') { this.mode = 'duo'; this.resetPanel(1); Sfx.play('join'); return; }   // 2P joins by pressing any 2P key
    for (let i = 0; i < 2; i++) if (this.owner(i) === e.s) { this.drive(i, e.r, ids); return; }   // one panel per event (A's last press never also drives B)
  },
  update(dt) {
    const ids = this.ids();
    if (Input.hit('ai2')) { this.mode = this.mode === 'ai' ? 'solo' : 'ai'; this.resetPanel(1); Sfx.play('join'); }   // F3: AI partner ⇄ tag solo
    for (const code of this.taps.splice(0)) this.handle(this.keyEvent(code), ids);
    for (let s = 0; s < 2; s++) this.handle(this.padEvent(s), ids);
    if (this.mode === 'ai') {                     // the AI partner picks to fit once 1P is ready (and lets go if 1P backs out)
      const A = this.P[0], B = this.P[1];
      if (A.phase !== 'ready' && B.char) this.resetPanel(1);
      if (A.phase === 'ready' && B.phase !== 'ready') {
        const id = autoPartner(A.char);
        if (id) { B.char = id; B.cur = ids.indexOf(id); B.picks = CHARS[id].def.filter(k => SKILLS2[k].ready).slice(0, 2); B.phase = 'ready'; }
      }
    }
    const ready = this.P.every(q => q.phase === 'ready') && !duoRule(this.P[0].char, this.P[1].char);
    this.startT = ready ? this.startT + dt : 0;
    this.msgT = Math.max(0, this.msgT - dt);
    if (this.startT >= FEEL.SELECT_START) this.start(); else this.stand();
  },
  resetPanel(i) { const P = this.P[i]; P.char = null; P.picks = []; P.phase = 'char'; P.sk = 0; },
  drive(i, r, ids) {
    const P = this.P[i], other = this.P[1 - i];
    if (P.phase === 'char') {
      if (r.left || r.right) { P.cur = (P.cur + (r.right ? 1 : ids.length - 1)) % ids.length; Sfx.play('step'); }
      if (r.ok) {
        const id = ids[P.cur], why = !CHARS[id].ready ? 'COMING SOON' : other.char ? duoRule(id, other.char) : null;
        if (why) this.say(why);
        else { P.char = id; P.phase = 'skill'; P.sk = 0; P.picks = []; Sfx.play('lock'); }
      }
      if (r.back && this.mode === 'solo' && i === 1) { const A = this.P[0]; A.phase = 'skill'; A.picks.pop(); Sfx.play('step'); }   // tag solo: back to A
    } else if (P.phase === 'skill') {
      const sk = CHARS[P.char].skills;
      if (r.up || r.down || r.left || r.right) { P.sk = (P.sk + (r.down || r.right ? 1 : sk.length - 1)) % sk.length; Sfx.play('step'); }
      if (r.ok) {
        const k = sk[P.sk];
        if (!SKILLS2[k].ready) this.say('COMING SOON');
        else if (P.picks.includes(k)) { P.picks = P.picks.filter(q => q !== k); Sfx.play('step'); }
        else { P.picks.push(k); Sfx.play('lock'); if (P.picks.length === 2) P.phase = 'ready'; }
      }
      if (r.back) { if (P.picks.length) P.picks.pop(); else { P.phase = 'char'; P.char = null; } Sfx.play('step'); }
    } else if (P.phase === 'ready') {
      if (r.back) { P.phase = 'skill'; P.picks.pop(); Sfx.play('step'); }
    }
  },
  start() {
    const P = this.P;
    if (this.mode === 'solo') { if (!Game.tagMode) Game.leave(); }
    else if (this.mode === 'duo') { if (Game.tagMode) Game.join(1, false); else fighters[1].bot = null; }
    else { if (Game.tagMode) Game.join(1, true); else fighters[1].bot = { inp: new BotInput(), mode: 'coop' }; }
    assignChar(fighters[0], P[0].char, P[0].picks); assignChar(fighters[1], P[1].char, P[1].picks);
    this.on = false; this.placed.clear(); Game.reset(); Game.noteT = 0; Input.p2Touched = false; Input.p2Num = false;
    if (this.mode === 'duo' && Input.split()) Game.banner('1P G H T Y   2P L K O I', 3);
    Sfx.play('join');
  },
  // end screen: C (or pad Y) → back here
  endInput() {
    const pd = Input.pads[0], y = !!(pd.on && pd.hold && pd.hold.interact), edge = y && !this.yPrev; this.yPrev = y;
    return Input.hit('chars') || edge;
  },
  // the two hovered / picked characters stand in the arena, facing the camera (1P left · 2P right)
  rigs() {
    const out = [];
    for (const P of this.P) { const id = P.char || this.ids()[P.cur]; out.push(CHARS[id].ready ? Rigs.get(id) : null); }
    if (out[0] && out[0] === out[1]) out[1] = null;
    return out;
  },
  stand() {
    const show = this.rigs();
    for (const g of Rigs.list) if (!show.includes(g)) { g.root.visible = false; this.placed.delete(g); }
    const side = V3(CamRig.R.x, 0, CamRig.R.z).normalize(), face = Math.atan2(CamRig.B.x, CamRig.B.z);
    show.forEach((g, i) => {
      if (!g) return;
      const k = i ? 1 : -1, x = side.x * FEEL.SELECT_STAND * k, z = side.z * FEEL.SELECT_STAND * k, key = `${i}`;
      if (this.placed.get(g) !== key) { g.place(x, z, face); g.play('idle'); this.placed.set(g, key); }   // only when it changes (cloth keeps simulating)
      g.root.visible = true;
    });
  },
  focus() { return V3(0, FEEL.SELECT_FOCUS_Y, 0); },
  draw() {
    const W = CFG.BASE_W, ids = this.ids(), blink = Math.floor(clock.t * 6) % 2 === 0, P = this.P;
    hudDither(0, 0, W, 92);                         // darken behind the title + cards (pillars behind them)
    const title = this.mode === 'solo' ? 'CHOOSE TWO  -  TAG SOLO' : this.mode === 'ai' ? 'CHOOSE ONE  -  AI PARTNER' : 'CHOOSE YOUR DUO';
    txtC(title, W / 2, 5, PAL_HEX[C.BONE1], 2);
    ids.forEach((id, i) => {                         // the five cards
      const cx = Math.round(W / 2 + (i - 2) * 76), cy = 46, D = CHARS[id], col = colorCol(D.color), dim = !D.ready;
      const taken = P.findIndex(q => q.char === id);
      const mine = P.findIndex((q, pi) => this.owner(pi) >= 0 && q.phase === 'char');
      const clash = mine >= 0 && P[1 - mine].char && !dim && taken < 0 && duoRule(id, P[1 - mine].char);
      charFace(cx, cy, id, taken >= 0 ? PCOL[taken] : dim ? C.DUSK : col, dim || !!clash);
      if (clash) for (let d = -11; d <= 11; d++) { hctx.fillStyle = PAL_HEX[C.CRIM1]; hctx.fillRect(cx + d, cy + d, 2, 1); hctx.fillRect(cx - d, cy + d, 2, 1); }   // ✕ breaks the duo rule
      txtC(D.label, cx, cy + 24, PAL_HEX[dim ? C.STONE1 : C.BONE1]);
      txtC(dim ? 'SOON' : COLOR_LABEL[D.color], cx, cy + 31, PAL_HEX[dim ? C.DUSK : col]);
      if (taken >= 0) txtC(this.mode === 'solo' ? (taken ? 'B' : 'A') : `${taken + 1}P`, cx + 17, cy - 19, PAL_HEX[PCOL[taken]]);
      P.forEach((q, pi) => {                         // cursors: 1P (A) above, 2P (B) below
        if (q.phase !== 'char' || q.cur !== i || this.owner(pi) < 0) return;
        const lab = this.mode === 'solo' ? (pi ? 'B' : 'A') : `${pi + 1}P`;
        txtC(lab, cx, pi ? cy + 38 : cy - 30, PAL_HEX[blink ? C.HOTW : PCOL[pi]]);
      });
    });
    const pw = 150, py = 96, ph = 128;
    for (let i = 0; i < 2; i++) this.drawPanel(i, i ? W - 4 - pw : 4, py, pw, ph);
    let line = '', col = C.STONE3;
    const rule = duoRule(P[0].char, P[1].char);
    if (this.msgT > 0) { line = this.msg; col = blink ? C.HOTW : C.CRIM2; }
    else if (rule) { line = rule; col = C.CRIM2; }
    else if (this.startT > 0) { line = 'STARTING'; col = C.HOT; }
    else if (this.mode === 'solo') line = 'ANY 2P KEY: 2P JOINS     F3: AI PARTNER';
    else if (this.mode === 'ai') line = 'F3: BACK TO TAG SOLO';
    txtC(line, W / 2, 228, PAL_HEX[col]);
    txtC('FIRST SKILL = U   SECOND = I     DUO = ONE BLUE + ONE RED, OR TWIN + ANYONE', W / 2, 238, PAL_HEX[C.STONE2]);
    const pad1 = Input.pads[0].on, pad2 = Input.pads[1].on, duo = this.mode === 'duo';
    const t1 = pad1 ? '1P STICK  A OK  B BACK' : duo ? '1P WASD  G/J OK  H/ESC BACK' : 'WASD  J/SPACE OK  K/ESC BACK';
    txt(t1, 4, 250, PAL_HEX[C.STONE3]);
    if (duo || pad2) { const t2 = pad2 ? '2P STICK  A OK  B BACK' : '2P ARROWS  L/ENTER OK  K/BKSP BACK'; txt(t2, W - 4 - tw(t2), 250, PAL_HEX[C.STONE3]); }
  },
  drawPanel(i, x, y, w, h) {
    const P = this.P[i], o = this.owner(i), ids = this.ids();
    box(x, y, w, h);
    const who = this.mode === 'solo' ? (i ? 'B' : 'A') : this.mode === 'ai' && i === 1 ? 'AI' : `${i + 1}P`;
    txt(who, x + 5, y + 5, PAL_HEX[PCOL[i]]);
    const id = P.char || (o >= 0 ? ids[P.cur] : null);
    if (!id) { txt(this.mode === 'ai' ? 'PICKS AFTER 1P' : this.mode === 'solo' ? 'AFTER A' : 'WAITING', x + 22, y + 5, PAL_HEX[C.STONE3]); return; }
    const D = CHARS[id], preview = !P.char;
    txt(D.label, x + 22, y + 5, PAL_HEX[preview ? C.STONE3 : colorCol(D.color)]);
    const st = preview ? '' : P.phase === 'ready' ? 'READY' : `PICK ${2 - P.picks.length}`;
    if (st) txt(st, x + w - 5 - tw(st), y + 5, PAL_HEX[P.phase === 'ready' ? (this.startT > 0 && blinkOn() ? C.HOTW : C.HOT) : C.STONE3]);
    const nHit = FEEL[D.combo] ? Object.keys(FEEL[D.combo]).length : 0;   // (characters not built yet have no basic-swing table)
    txt(`${COLOR_LABEL[D.color]}  ${nHit ? `${nHit}-HIT COMBO` : 'COMING SOON'}`, x + 5, y + 14, PAL_HEX[preview ? C.DUSK : C.STONE2]);
    D.skills.forEach((k, j) => {
      const S = SKILLS2[k], yy = y + 26 + j * 26, cur = !preview && P.phase === 'skill' && P.sk === j && o >= 0, pi = P.picks.indexOf(k);
      if (cur) { hctx.fillStyle = PAL_HEX[C.DEEP]; hctx.fillRect(x + 2, yy - 3, w - 4, 24); }
      diamond(x + 12, yy + 7, 7, pi >= 0 ? C.CRIM0 : C.ABYSS, pi >= 0 ? C.HOT : S.ready && !preview ? C.STONE2 : C.DUSK);
      if (pi >= 0) txtC(pi ? 'I' : 'U', x + 12, yy + 5, PAL_HEX[C.HOTW], 1, null);
      const live = S.ready && !preview;
      txt(S.name, x + 24, yy, PAL_HEX[live ? C.BONE1 : S.ready ? C.STONE3 : C.STONE1]);
      if (S.ready) {
        txt(`${STATUS_LABEL[S.status]}  ${SHAPE_LABEL[S.shape]}`, x + 24, yy + 7, PAL_HEX[live ? C.STONE3 : C.DUSK]);
        txt(`${S.hits > 1 ? `${S.dmg}X${S.hits}` : S.dmg} DMG  CD ${S.cd}S`, x + 24, yy + 14, PAL_HEX[live ? C.STONE2 : C.DUSK]);
      } else txt('COMING SOON', x + 24, yy + 7, PAL_HEX[C.DUSK]);
      if (cur) txt('<', x + w - 9, yy + 5, PAL_HEX[C.HOTW]);
    });
    if (!preview && P.phase === 'skill' && o >= 0) txtC('PICK 2  (U FIRST)', x + w / 2, y + h - 10, PAL_HEX[C.STONE2]);
    else if (P.phase === 'ready' && P.picks.length === 2) txtC(`U ${SKILLS2[P.picks[0]].name.split(' ')[0]}   I ${SKILLS2[P.picks[1]].name.split(' ')[0]}`, x + w / 2, y + h - 10, PAL_HEX[C.BONE0]);
  },
};
const blinkOn = () => Math.floor(clock.t * 6) % 2 === 0;
// a 50% checker of VOID over a HUD rectangle (one fill with a 2x2 pattern, anchored to the HUD grid)
let _hudDith = null;
function hudDither(x, y, w, h) {
  if (_hudDith === null) {
    try { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.fillStyle = PAL_HEX[C.VOID]; g.fillRect(0, 0, 1, 1); g.fillRect(1, 1, 1, 1); _hudDith = hctx.createPattern(c, 'repeat'); }
    catch (e) { _hudDith = false; }
  }
  if (!_hudDith) return;
  hctx.fillStyle = _hudDith; hctx.fillRect(x, y, w, h);
}
// a character's face for the select cards (palette from CHARS rig.face) · dim = not selectable (yet / right now)
function charFace(cx, cy, id, edge, dim = false) {
  const F = CHARS[id].rig.face, sc = 2, pal = { H: F.H, h: F.h, s: C.BONE0, r: C.CRIM2, d: C.STONE2, c: F.c };
  diamond(cx, cy, 6 * sc + 9, null, C.VOID); diamond(cx, cy, 6 * sc + 8, C.ABYSS, edge);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const ch = FACE[y][x]; if (ch === '.') continue;
    hctx.fillStyle = PAL_HEX[dim ? (ch === 's' ? C.STONE1 : C.DUSK) : pal[ch]]; hctx.fillRect(cx - 6 * sc + x * sc, cy - 6 * sc + y * sc, sc, sc);
  }
}
// one select-screen frame (instead of the fight simulation): menu input, the two standing rigs, camera, then out
function selectFrame(dt) {
  Select.update(dt);
  for (const g of Rigs.list) if (g.root.visible) { g.update(dt, null); g.updateFlash(dt, CamRig.R); }
  Particles.update(dt);
  if (Game.state === 'select') CamRig.zoom = FEEL.SELECT_ZOOM;   // closer on the two characters (Stage.reset in Game.reset puts it back to 1)
  CamRig.update(dt, Game.state === 'select' ? Select.focus() : Game.focus());
  const L = G.uLightDir.value;
  compositeMat.uniforms.uBias.value.set(L.dot(CamRig.R), L.dot(CamRig.U), L.dot(CamRig.B) + 0.35).normalize();
  Input.endFrame();
}
