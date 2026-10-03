function drawVitals(f, right) {
  const W = CFG.BASE_W, pcx = right ? W - 21 : 21, pcy = 21, bw = 118;
  portrait(pcx, pcy, f);
  const ai = Game.botFor(f);
  txtC(ai ? `${f.label} AI` : f.label, pcx, 40, PAL_HEX[PCOL[f.idx]]);
  const hx = right ? W - 42 - bw : 42;
  const hpTxt = `${Math.ceil(f.hp)} / ${FIGHT.PLAYER_HP}`;
  txt(hpTxt, right ? W - 42 - tw(hpTxt) : hx, 5, PAL_HEX[f.state === 'down' ? C.CRIM2 : C.BONE1]);
  if (f.state === 'down') txt('DOWN', right ? hx : hx + bw - tw('DOWN'), 5, PAL_HEX[C.CRIM2]);
  slantBar(hx, 12, bw, 5, f.hp / FIGHT.PLAYER_HP, f.chip / FIGHT.PLAYER_HP, right);
  drawRelicIcons(f, right ? W - 46 : 46, 31, right); // 2단계: relics held, under the bar
  const nm = CHARS[f.char].label;                 // 2단계: character name under the bar, in its wave colour (TARGETED takes the other end)
  txt(nm, right ? hx : hx + bw - tw(nm), 21, PAL_HEX[colorCol(CHARS[f.char].color)]);
  if (Dk.watching(f) && fighters.filter(o => o.onField).length > 1) {   // B. the boss is watching this one (2단계: either dokkaebi)
    const s = 'TARGETED'; txt(s, right ? W - 42 - tw(s) : hx + 6, 21, PAL_HEX[Math.floor(clock.t * 4) % 2 ? C.CRIM2 : C.CRIM1]);
  }
}
function keyNames(f) {                           // what to press, per player / device
  if (Input.pads[Game.tagMode ? 0 : f.idx].on) return { parry: 'B', dodge: 'A', s1: 'RT', s2: 'LT', tag: 'RB', interact: 'Y', attack: 'X' };
  if (!Game.tagMode && f.idx) return Input.p2Num                 // 2P: the key set 2P last used — numpad, or the one-keyboard keys (arrows + L K O I / .)
    ? { parry: '2', dodge: '0', s1: '7', s2: '8', tag: '9', interact: '3', attack: '1' }
    : { parry: 'K', dodge: '/', s1: 'O', s2: 'I', tag: '9', interact: '.', attack: 'L' };   // (tag: 2P has none — tag solo is 1P's keys)
  if (Input.split()) return { parry: 'H', dodge: 'SPC', s1: 'T', s2: 'Y', tag: 'L', interact: 'B', attack: 'G' };   // 1.6 one keyboard, two people: 1P two keys left
  return { parry: 'K', dodge: 'SPC', s1: 'U', s2: 'I', tag: 'L', interact: 'F', attack: 'J' };
}
// finisher names this fighter can fire right now (the partner's status) — tag solo: the benched one's, fired by the same keys
function finOffer(f) {
  if (!Duo.st || Duo.st.fin || Dk.stState() !== 'status') return null;   // (2단계: the dokkaebi the status is on)
  const names = w => [finName(w, Duo.st.kind, 1), finName(w, Duo.st.kind, 2)];   // 2단계: the receiver's own two skills
  if (Duo.canFinish(f)) return { who: f, names: names(f) };
  if (Game.tagMode && Duo.st.by === f && Duo.benchFor(f)) { const w = Duo.benchFor(f); return { who: w, names: names(w), tag: true }; }
  return null;
}
// skill glyphs (7x7-ish, centred on x, y): thrust → · spin ↻ · launch ↑ · smash ↓
function skillGlyph(kind, x, y, col) {
  hctx.fillStyle = col;
  const GL = ['thrust', 'spin', 'launch', 'smash', 'windThrust', 'earthSplit'];
  if (!GL.includes(kind) && SKILLS2[kind]) {        // 2단계: the other skills show their status' glyph (→ stagger · ↻ turn · ↑ lift · ↓ kneel) + two dots if multi-hit
    if (SKILLS2[kind].shape === 'multi') { hctx.fillRect(x + 4, y - 3, 1, 1); hctx.fillRect(x + 4, y - 1, 1, 1); }
    kind = { stagger: 'thrust', turn: 'spin', lift: 'launch', kneel: 'smash' }[SKILLS2[kind].status];
  }
  const px = (a, b) => hctx.fillRect(x + a, y + b, 1, 1);
  if (kind === 'thrust') { for (let k = -3; k <= 3; k++) px(k, 0); px(2, -1); px(2, 1); px(1, -2); px(1, 2); px(-3, -1); px(-3, 1); }
  else if (kind === 'spin') { for (const [a, b] of [[-1, -3], [0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 3], [0, 3], [-1, 3], [-2, 2], [-3, 1], [-3, 0], [-3, -2], [-2, -2], [-2, -3], [-4, -2]]) px(a, b); }
  else if (kind === 'launch') { hctx.fillRect(x, y - 3, 1, 7); hctx.fillRect(x - 1, y - 2, 3, 1); hctx.fillRect(x - 2, y - 1, 5, 1); hctx.fillRect(x - 3, y + 4, 7, 1); }
  else if (kind === 'windThrust') { for (const r of [-3, 0, 3]) { for (let k = -2; k <= 3; k++) px(k, r); px(2, r - 1); px(2, r + 1); } }   // 2단계: three blades
  else if (kind === 'earthSplit') { for (const [a, b] of [[-3, 3], [-2, 2], [-1, 2], [0, 1], [0, 0], [1, -1], [2, -1], [2, -2], [3, -3]]) px(a, b); hctx.fillRect(x - 3, y + 4, 7, 1); px(-3, -1); px(-2, -2); px(3, 1); }
  else { hctx.fillRect(x, y - 4, 1, 6); hctx.fillRect(x - 1, y + 1, 3, 1); hctx.fillRect(x - 2, y, 5, 1); hctx.fillRect(x - 3, y + 3, 7, 1); }
}
// skill cross: top parry · bottom dash · inner side U = skill 1 · outer side I = skill 2 (cooldown sweeps) · finisher names beside it
function drawCross(f, right) {
  const W = CFG.BASE_W, cx = right ? W - 34 : 34, cy = 234, R = 13, D = 19;
  const K = keyNames(f), offer = finOffer(f), fl = Math.floor(clock.t * 10) % 2 === 0;
  diamond(cx, cy, 3, null, C.DUSK);
  const slot = (x, y, fill, edge, r = R) => { diamond(x, y, r + 1, null, C.VOID); diamond(x, y, r, fill, edge); };
  // parry: bright while the window is open, white burst on a successful parry
  const pOpen = f.state === 'parry' && f.t <= Waves.parryWindow(f), pOk = f.state === 'parry' && f.parried;
  slot(cx, cy - D, pOk ? C.HOT : pOpen ? C.BONE0 : C.ABYSS, pOk || pOpen ? C.HOTW : C.STONE2);
  { const gx = cx, gy = cy - D - 4, c = PAL_HEX[pOpen || pOk ? C.VOID : C.BONE1];   // crossed blades glyph
    hctx.fillStyle = c; for (let k = -3; k <= 3; k++) { hctx.fillRect(gx + k, gy + k, 1, 1); hctx.fillRect(gx + k, gy - k, 1, 1); } }
  txtC(K.parry, cx, cy - D + 2, PAL_HEX[pOpen || pOk ? C.VOID : C.BONE1], 1, null);
  // dash: fills back up over the minimum gap between dashes
  const rdy = Math.min(1, f.sinceRoll / FEEL.DODGE_MIN_GAP);
  slot(cx, cy + D, C.ABYSS, rdy >= 1 ? C.STONE3 : C.DUSK);
  { const gy = cy + D - 4, c = PAL_HEX[rdy >= 1 ? C.BONE1 : C.STONE1];                 // >> glyph
    hctx.fillStyle = c; for (const ox of [-3, 1]) for (let k = 0; k < 3; k++) { hctx.fillRect(cx + ox + k, gy + k, 1, 1); hctx.fillRect(cx + ox + k, gy + 4 - k, 1, 1); } }
  if (rdy < 1) { hctx.fillStyle = PAL_HEX[C.DUSK]; hctx.fillRect(cx - 5, cy + D + 9, 11, 1); hctx.fillStyle = PAL_HEX[C.STONE3]; hctx.fillRect(cx - 5, cy + D + 9, Math.round(11 * rdy), 1); }
  txtC(K.dodge, cx, cy + D + 2, PAL_HEX[rdy >= 1 ? C.BONE1 : C.STONE1], 1, null);
  // U / I: my two starters (a finisher is on offer → both slots blaze)
  for (const sl of [1, 2]) {
    const sx = (sl === 1) !== right ? cx + D : cx - D, kind = f.skillKind(sl), cd = f.cd[sl - 1], ready = cd <= 0;
    slot(sx, cy, offer ? C.CRIM0 : ready ? C.ABYSS : C.VOID, offer ? (fl ? C.HOTW : C.HOT) : ready ? C.BONE0 : C.DUSK);
    if (!ready && !offer) {                         // dark sweep: the part of the cooldown still left
      const h = Math.round(26 * cd / FEEL.SKILLS[kind].cd);
      hctx.fillStyle = PAL_HEX[C.DEEP];
      for (let dy = -12; dy <= 12; dy++) if (dy + 13 <= h) { const w = 12 - Math.abs(dy); if (w > 0) hctx.fillRect(sx - w + 1, cy + dy, w * 2 - 1, 1); }
    }
    skillGlyph(kind, sx, cy - 5, PAL_HEX[offer ? C.HOTW : ready ? C.BONE1 : C.STONE1]);
    txtC(offer ? 'FIN' : ready ? K[`s${sl}`] : String(Math.ceil(cd)), sx, cy + 3, PAL_HEX[offer ? C.HOTW : ready ? C.BONE1 : C.STONE2], 1, null);
  }
  if (!Game.tagMode) drawSlots(f, cx, cy - 39);   // 1.6: my three wave slots, above my skill cross
  if (offer) {                                      // beside the cross: U SKY PIERCE / I SKY DANCE (tag solo: marked TAG)
    const x0 = right ? cx - D - 17 : cx + D + 17;
    offer.names.forEach((n, i) => {
      const s = `${K[`s${i + 1}`]} ${finLabel(n)}`, y = cy - 8 + i * 8;
      txt(s, right ? x0 - tw(s) : x0, y, PAL_HEX[fl ? C.HOTW : C.HOT]);
    });
    if (offer.tag) { const s = `TAG ${offer.who.label}`; txt(s, right ? x0 - tw(s) : x0, cy + 9, PAL_HEX[C.STONE3]); }
  }
}
function drawClock() {                           // run clock left of the rally meter · phase right of it
  const W = CFG.BASE_W, s = Math.floor(Game.t), t = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  txt(t, W / 2 - 50 - tw(t), 10, PAL_HEX[C.STONE3]);
  if (Dk.anyAlive()) txt(`PHASE ${['I', 'II', 'III'][AI.phase - 1]}`, W / 2 + 48, 10, PAL_HEX[AI.phase >= 3 ? C.EMBER : AI.phase === 2 ? C.CRIM2 : C.STONE3]);
}
function drawBossBar(dt) {
  const W = CFG.BASE_W, bx = 118, bw = 244, by = 254;
  if (!boss.root.visible) return;
  if (Dk.on) { Dk.drawBars(dt); return; }           // 2단계 보스 4: two bars side by side
  const name = Rush.boss.name;
  txt(name, bx + 1, by - 9, PAL_HEX[C.VOID]); txt(name, bx, by - 10, PAL_HEX[C.BONE1]);
  txtC(`BOSS ${Rush.idx + 1}/${Rush.count}`, bx + bw / 2, by - 10, PAL_HEX[C.STONE3]);   // rush progress
  const ph = ['I', 'II', 'III'][AI.phase - 1]; txt(ph, bx + bw - tw(ph), by - 10, PAL_HEX[AI.phase >= 3 ? C.EMBER : C.STONE3]);
  bar(bx, by, bw, 3, AI.hp / AI.maxHp, AI.chip / AI.maxHp, AI.phase >= 3 ? C.EMBER : AI.phase === 2 ? C.CRIM2 : C.CRIM1, C.HOT, C.BONE0);
  for (const k of FIGHT.PHASE_AT) { hctx.fillStyle = PAL_HEX[C.BONE0]; hctx.fillRect(bx + Math.round(bw * k), by - 1, 1, 5); }   // phase thresholds
  if (AI.brk > 0 || AI.state === 'groggy') {      // groggy gauge
    const f = AI.state === 'groggy' ? 1 : AI.brk / FIGHT.BREAK_MAX;
    hctx.fillStyle = PAL_HEX[C.DEEP]; hctx.fillRect(bx, by + 5, bw, 1);
    hctx.fillStyle = PAL_HEX[AI.state === 'groggy' ? C.HOTW : C.EMBER]; hctx.fillRect(bx, by + 5, Math.round(bw * f), 1);
  }
  if (AI.phaseNoteT > 0) { txtC(AI.phase >= 3 ? 'PHASE III' : 'PHASE II', W / 2, by - 22, PAL_HEX[AI.phase >= 3 ? C.EMBER : C.CRIM2]); AI.phaseNoteT -= dt; }
}
function drawFightHud(dt) {
  if (Game.state === 'select') { Select.draw(); return; }   // 2단계: character select screen
  const duo = !Game.tagMode, W = CFG.BASE_W;
  if (duo) { drawVitals(fighters[0], false); drawCross(fighters[0], false); drawVitals(fighters[1], true); drawCross(fighters[1], true); }
  else { const f = fighters.find(o => o.onField) || fighters[0]; drawVitals(f, false); drawCross(f, false); }
  drawClock();
  drawBossBar(dt);
  Bell.drawArrows();                               // 2단계 보스 3: where the next waves come from
  Dk.drawHud();                                    // 2단계 보스 4: COVER! · PARRY = COUNTER · the twin strike · the revive
  if (Rush.state === 'rest') {                    // between bosses: a breather, then the next one
    const left = Math.max(0, Math.ceil(FEEL.RUSH.restT - Rush.t)), nx = BOSSES[Rush.idx + 1];
    txtC('REST', W / 2, 150, PAL_HEX[C.BONE2], 2);
    txtC(`NEXT  ${nx ? nx.name : ''}  ${left}`, W / 2, 166, PAL_HEX[C.STONE3]);
    txtC(`BOSS ${Rush.idx + 1}/${Rush.count} CLEARED`, W / 2, 174, PAL_HEX[C.STONE2]);
    Relics.draw();                                  // 2단계: relic cards · loadout
  }
  // downed player: revive gauge over the body; everyone off-screen gets an edge arrow
  for (const f of fighters) {
    if (!f.onField) continue;
    const p = f.ch.pos;
    if (f.state === 'down' && duo) {
      const [x, y] = toHud(p.x, 0.9, p.z);
      const k = f.reviveT / FEEL.REVIVE_T;
      hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(Math.round(x) - 11, Math.round(y) - 17, 22, 4);
      hctx.fillStyle = PAL_HEX[C.BONE2]; hctx.fillRect(Math.round(x) - 10, Math.round(y) - 16, Math.round(20 * k), 2);
      const near = fighters.find(o => o !== f && o.alive && o.ch.pos.distanceTo(p) < FEEL.REVIVE_R + 0.6);
      const reviving = fighters.some(o => o.state === 'revive' && o.reviveOf === f);
      txtC(reviving ? 'REVIVING' : near && !near.bot ? `HOLD ${keyNames(near).interact}` : 'HELP!', x, Math.round(y) - 24,
           PAL_HEX[reviving ? C.HOT : near ? (Math.floor(clock.t * 4) % 2 ? C.HOTW : C.HOT) : C.CRIM2], near && !reviving && !near.bot ? 2 : 1);
    }
    const [ax, ay] = toHud(p.x, 0.9, p.z);
    edgeArrow(ax, ay, PAL_HEX[PCOL[f.idx]]);
  }
  if (Dk.on) { for (let i = 0; i < 2; i++) { const r = Dk.rigs[i]; if (r.root.visible && Dk.alive(i)) { const [x, y] = toHud(r.pos.x, 1.4, r.pos.z); edgeArrow(x, y, PAL_HEX[i ? C.CRIM2 : C.CYAN]); } } }
  else if (boss.root.visible && AI.state !== 'dead') { const [x, y] = toHud(boss.pos.x, 1.4, boss.pos.z); edgeArrow(x, y, PAL_HEX[C.CRIM2]); }
  if (Game.state === 'play') {
    const lines = duo ? ['F4  TAG SOLO', 'F3  AI 2P ON/OFF'] : ['2P  O OR NUM7 JOIN', 'F3  AI PARTNER'];
    const hy = duo ? 166 : CFG.BASE_H - 16;          // duo: above 2P's wave circles + skill cross
    txt(lines[0], W - 4 - tw(lines[0]), hy, PAL_HEX[C.STONE1]);
    txt(lines[1], W - 4 - tw(lines[1]), hy + 7, PAL_HEX[C.STONE1]);
  }
  // hit pop-ups: newest keeps its spot; older ones that would overlap it are pushed up (a little feed)
  const placed = [];
  for (let i = Game.popups.length - 1; i >= 0; i--) {
    const p = Game.popups[i], sc = p.sc || 1, v = p.p.clone().project(camera);
    const x = Math.round((v.x * 0.5 + 0.5) * CFG.BASE_W), w = tw(p.text, sc), h = 5 * sc + 1;
    let y = Math.round((1 - (v.y * 0.5 + 0.5)) * CFG.BASE_H - Math.min(10, p.t * 24)) - (sc > 1 ? 6 : 0);
    for (let k = 0; k < 8; k++) {
      const r = placed.find(o => Math.abs(o.x - x) * 2 < o.w + w + 4 && y < o.y + o.h && y + h > o.y);
      if (!r) break;
      y = r.y - h - 1;
    }
    placed.push({ x, y, w, h });
    txtC(p.text, x, y, PAL_HEX[p.col], sc);
  }
  drawSystemsHud(dt);
  if (Game.t < 16 && Game.state === 'play') {
    const pad = Input.pads[0].on, k1 = keyNames(fighters[0]);
    const a = pad ? 'STICK MOVE  X ATTACK  B PARRY  A DASH  RT/LT SKILLS' + (duo ? '' : '  RB TAG')
                  : `WASD MOVE  ${k1.attack} ATTACK  ${k1.parry} PARRY  SPACE DASH  ${k1.s1}/${k1.s2} SKILLS` + (duo ? (Input.split() ? `  ${k1.interact} REVIVE` : '') : '  L TAG');
    const b = duo ? 'SKILL = STATUS  PARTNER SKILL = FINISHER   PARRY IN TURNS = RALLY   PARTNER PARRY = COVER'   // ≤ 90 chars: clear of the skill crosses
                  : 'TAG JUST BEFORE A HIT = TAG PARRY   ' + (pad ? 'RT/LT' : 'U/I') + ' IN YOUR STATUS = TAG FINISHER   ' + (pad ? 'START RESTART' : 'HOLD R RESTART');
    if (duo && !Game.botFor(fighters[1])) {          // two people: 1P line, then 2P's own keys (laptop / numpad / pad)
      const k2 = keyNames(fighters[1]);
      const a2 = Input.pads[1].on ? '2P  STICK MOVE  X ATTACK  B PARRY  A DASH  RT/LT SKILLS'
                                  : `2P  ARROWS MOVE  ${k2.attack} ATTACK  ${k2.parry} PARRY  ${k2.dodge} DASH  ${k2.s1}/${k2.s2} SKILLS  ${k2.interact} REVIVE`;
      txtC('1P  ' + a, W / 2, CFG.BASE_H - 74, PAL_HEX[C.BONE0]);
      txtC(a2, W / 2, CFG.BASE_H - 66, PAL_HEX[C.BONE0]);
    } else txtC(a, W / 2, CFG.BASE_H - 66, PAL_HEX[C.BONE0]);
    txtC(b, W / 2, CFG.BASE_H - 58, PAL_HEX[C.STONE3]);
  }
  Stage.drawCut();                                 // 1.6: the cut-in band (over the fight HUD)
  if (Game.rHold > 0.12 && Game.state === 'play') {   // 1.6: R held mid-fight → restart gauge
    const k = Math.min(1, Game.rHold / FEEL.RESTART_HOLD);
    txtC('HOLD R  RESTART', W / 2, 62, PAL_HEX[C.BONE1]);
    hctx.fillStyle = PAL_HEX[C.VOID]; hctx.fillRect(W / 2 - 25, 69, 50, 4);
    hctx.fillStyle = PAL_HEX[C.HOT]; hctx.fillRect(W / 2 - 24, 70, Math.round(48 * k), 2);
  }
  // end screens
  const end = Game.state === 'won' ? 2.2 : Game.state === 'lost' ? 1.6 : -1;
  if (end > 0 && Game.endT > end) {
    const y0 = 104, y1 = 166;
    hctx.fillStyle = PAL_HEX[C.VOID];
    hctx.fillRect(0, y0 + 2, W, y1 - y0 - 4);
    for (let x = 0; x < W; x++) {                                            // dithered band edges
      if ((x & 1) === 0) { hctx.fillRect(x, y0, 1, 1); hctx.fillRect(x, y1 - 1, 1, 1); }
      hctx.fillRect(x, y0 + 1, 1, 1); hctx.fillRect(x, y1 - 2, 1, 1);
    }
    const won = Game.state === 'won';
    txtC(won ? 'VICTORY' : 'DEFEAT', W / 2, 114, PAL_HEX[won ? C.HOT : C.CRIM2], 4, PAL_HEX[won ? C.CRIM0 : C.BLOOD1]);
    const S = Duo.stats;
    const mmss = v => { const s = Math.floor(v); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    if (won) txtC(`TIME ${mmss(Game.winTime)}   ` + S.bossT.map((v, i) => `BOSS ${i + 1} ${mmss(v)}`).join('   '), W / 2, 138, PAL_HEX[C.BONE0]);
    else txtC(`REACHED BOSS ${Rush.idx + 1}/${Rush.count}`, W / 2, 132, PAL_HEX[C.STONE3]);
    txtC(`FINISHERS ${S.finN}   COVERS ${S.covers}   PERFECT RALLIES ${S.fullRally}   SMASHES ${S.shuttle.smash}` + (Game.tagMode ? `   TAG PARRIES ${S.tagParry}` : ''), W / 2, won ? 146 : 140, PAL_HEX[C.STONE3]);
    txtC(Input.padOn ? 'START RETRY     Y CHARACTERS' : 'R RETRY     C CHARACTERS', W / 2, 155, PAL_HEX[C.STONE3]);   // 2단계: C → character select
  }
}
