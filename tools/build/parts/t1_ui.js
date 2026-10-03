/* =============================================================================
 * 4단계 테마 1 — 게임 HUD · 화면 5개 (t1_ui.js): 타이틀 · 전투 HUD · QTE · Esc 메뉴 · 결과 + 화면 전환
 *   배치(3단계와 다름): 보스 = 왼쪽 위 큰 한글 이름 + 막대 · 기술명 = 위 가운데 고정 · 랠리 = 오른쪽 위 빨간 도장
 *   · 두 사람 패널 = 아래 가운데 나란히 (초상은 바깥쪽) · QTE = 패널 위 띠
 *   규칙(3단계 그대로): 화면 글자 동시 3개 이하(기술명 · 배너 · 알림 + 팝업, uiTexts3) · 싸우는 화면엔 1P 키만(UI.keys2P) · 기술명 0.8초
 *   UI 움직임은 게임을 멈추거나 입력을 막지 않는다 (그리기만)
 * ========================================================================== */
T1H.game = (ctx, S) => {
  const H = T1H, D = T1, P = D.pal, U = D.ui;
  const W = hudCanvas.width, Hh = hudCanvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  H.frame(ctx, W, Hh);
  const L = H.left(), Rr = H.right(), t = S.t;
  const ui = H.ui || (H.ui = { state: null, wipe: 0, panelT: 0, lastHp: [null, null], hpFlash: [0, 0], rally: null, rallyT: 9, bossHp: null, bossFlash: 0, techS: '', techT: 0 });
  /* 화면 전환 와이프: 상태가 바뀌면 사선 빗금 띠가 쓸고 지나감 */
  const st = Game.state;
  /* UI 시간 = 게임 시계(clock.t · 업데이트가 진행) → 같은 게임 상태면 같은 그림 (캡처 · 재현) */
  if (st !== ui.state) { if (ui.state !== null) ui.wipeAt = clock.t; ui.state = st; }
  ui.wipe = ui.wipeAt === undefined ? 0 : Math.max(0, U.wipeT - (clock.t - ui.wipeAt)); ui.panelT = st === 'play' ? Game.t : 99;
  const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(S.R.camera); return [((v.x + 1) / 2) * W / H.u - H.ox / H.u, ((1 - v.y) / 2) * 1080, v.z]; };
  const charCol = f => (f.char === 'great' ? P.red : P.blue);
  const KO = { 'THE AZURE WARDEN': '애저 워든', 'THE SCARLET COLOSSUS': '스칼렛 콜로서스', 'THE WEEPING BELL': '위핑 벨', 'THE TWIN DOKKAEBI': '쌍둥이 도깨비' };
  if (st === 'title') { title(ctx); wipeDraw(ctx); if (Menu3.on) menu(ctx); return; }
  if (st === 'select') { if (Menu3.on) menu(ctx); return; }

  /* ---------------- 전투 HUD */
  const slide = k => Math.min(1, ui.panelT / U.slideT) < 1 ? (1 - Math.min(1, ui.panelT / U.slideT)) * k : 0;
  const endAt = Game.state === 'won' ? 2.2 : Game.state === 'lost' ? 1.6 : -1, resShow = endAt >= 0 && Game.endT > endAt;
  if (!resShow) {   /* 라운드 9: 결과 화면 뒤로 전투 HUD가 비치지 않게 */
    bossBlock(ctx);
    topRight(ctx);
    rally(ctx);
    playersPanel(ctx);
    qte(ctx);
    worldMarks(ctx);
    techName(ctx);
    banners(ctx);
  }
  results(ctx);
  wipeDraw(ctx);
  if (Menu3.on) menu(ctx);

  function bossBlock(ctx) {
    if (!boss.root.visible || Dk.on) return;
    const x0 = Math.max(L + 40, 40) - slide(500), y0 = 30, nm = Rush.boss.name, ko = KO[nm] || nm.replace('THE ', '');
    H.text(ctx, ko, x0, y0 + 56, 58, P.ink, { ko: true, big: true, stroke: 10, sc: '#fefefe' });
    H.text(ctx, nm.replace('THE ', ''), x0 + 4, y0 + 88, 24, P.ink, { stroke: 6, sc: '#fefefe' });
    const bx = x0, by = y0 + 104, bw = 620, bh = 20, f = Math.max(0, AI.hp / AI.maxHp), c = Math.max(f, AI.chip / AI.maxHp);
    if (ui.bossHp !== null && f < ui.bossHp - 0.002) ui.bossFlash = 0.08; ui.bossHp = f; ui.bossFlash = Math.max(0, ui.bossFlash - S.realDt);
    const inv = ui.bossFlash > 0;
    H.poly(ctx, [[bx + 8, by], [bx + bw + 8, by], [bx + bw, by + bh], [bx, by + bh]], inv ? P.ink : '#fefefe', P.ink, 4);
    ctx.save(); ctx.beginPath(); ctx.moveTo(bx + 8, by); ctx.lineTo(bx + bw + 8, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath(); ctx.clip();
    ctx.fillStyle = P.red; ctx.fillRect(bx + bw * f, by, bw * (c - f), bh);
    ctx.fillStyle = inv ? '#fefefe' : P.ink; ctx.fillRect(bx, by, bw * f + 6, bh);
    ctx.restore();
    for (const k of FIGHT.PHASE_AT) { ctx.fillStyle = '#fefefe'; ctx.fillRect(bx + bw * k, by - 4, 3, bh + 8); ctx.fillStyle = P.ink; ctx.fillRect(bx + bw * k + 3, by - 4, 2, bh + 8); }
    for (let i = 0; i < 3; i++) { const x = bx + bw + 24 + i * 26; H.poly(ctx, [[x + 5, by], [x + 19, by], [x + 14, by + bh], [x, by + bh]], i < AI.phase ? P.ink : '#fefefe', P.ink, 3); }
    if (AI.brk > 0 || AI.state === 'groggy') { const g = AI.state === 'groggy' ? 1 : AI.brk / FIGHT.BREAK_MAX; ctx.fillStyle = P.ink; ctx.fillRect(bx, by + bh + 7, bw * g, 9); H.hatch(ctx, bx, by + bh + 7, bw * g, 9, '#fefefe', 12, 4);
      if (AI.state === 'groggy') H.text(ctx, 'BREAK', bx + bw * g + 12, by + bh + 18, 20, P.red); }
    if (AI.phaseNoteT > 0) H.stamp(ctx, bx + bw + 150, by + 10, 46, AI.phase >= 3 ? 'III' : 'II', 44, Math.max(0, Math.min(1, (2.5 - AI.phaseNoteT) / 0.12))   /* phaseNoteT는 2.5에서 줄어듦 */);
  }
  function topRight(ctx) {
    const s = Math.floor(Game.t), tm = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, x = Rr - 40;
    H.text(ctx, tm, x, 60, 34, P.ink, { al: 'right', stroke: 6, sc: '#fefefe' });
    ctx.fillStyle = P.ink; ctx.fillRect(x - 150, 74, 150, 4);
    H.text(ctx, 'ESC  MENU', x, 102, 18, '#6a494e', { al: 'right' });
  }
  function rally(ctx) {
    const r = Duo.rally || 0; if (r !== ui.rally) { if (ui.rally !== null && r > ui.rally) ui.rallyT = 0; ui.rally = r; } ui.rallyT += S.realDt;
    if (r <= 0) return;
    const x = Rr - 120, y = 190, full = r >= FEEL.RALLY_MAX, k = Math.min(1, ui.rallyT / U.stampT);
    H.stamp(ctx, x, y, 56, String(r), 64, k);
    H.text(ctx, full ? 'MAX' : 'RALLY', x, y + 90, 26, P.ink, { al: 'center', stroke: 6, sc: '#fefefe' });
    if (Duo.buffT > 0) { ctx.fillStyle = P.ink; ctx.fillRect(x - 60, y + 104, 120 * Duo.buffT / FEEL.RALLY_BUFF_T, 6); }
  }
  function playersPanel(ctx) {
    const duo = !Game.tagMode, cx = 960, y = 924 + slide(220);
    if (!duo) { const on = fighters.find(o => o.onField) || fighters[0]; panel(ctx, on, cx - 235, y, false, true); const b = fighters.find(o => o !== on); if (b) bench(ctx, b, cx + 262, y + 12); return; }
    panel(ctx, fighters[0], cx - 490, y, false, false); panel(ctx, fighters[1], cx + 20, y, true, false);
  }
  function bench(ctx, f, x, y) {
    H.portrait(ctx, f.char === 'great' ? 'great' : 'rapier', x, y, 0.42, true);
    ctx.fillStyle = P.ink; ctx.fillRect(x + 2, y + 104, 84, 10); ctx.fillStyle = charCol(f); ctx.fillRect(x + 4, y + 106, 80 * f.hp / FIGHT.PLAYER_HP, 6);
    if (Game.tagMode) { const K = keyNames(fighters[0]); H.text(ctx, `${K.tag} TAG`, x + 100, y + 60, 20, P.ink); }
  }
  /* 패널 (라운드 8): [초상 | 이름 · 체력 · 파형 | 스킬 2칸 + 패리/대시] — 오른쪽 패널은 좌우 뒤집음 (초상이 바깥) */
  function panel(ctx, f, x, y, right, solo) {
    const i = f.idx, col = charCol(f), w = 470, h = 124;
    if (ui.lastHp[i] !== null && f.hp < ui.lastHp[i] - 0.5) ui.hpFlash[i] = 0.12; ui.lastHp[i] = f.hp; ui.hpFlash[i] = Math.max(0, ui.hpFlash[i] - S.realDt);
    const inv = ui.hpFlash[i] > 0, down = f.state === 'down';
    H.poly(ctx, [[x + 16, y], [x + w + 16, y], [x + w, y + h], [x, y + h]], '#fefefe', P.ink, 4);
    H.hatch(ctx, x + 8, y + 5, w, 13, '#d6cfcf', 12, 5);
    const px = right ? x + w - 130 : x + 14, ix = x + 150, iw = 182, sx0 = right ? x + 18 : x + 340;
    H.portrait(ctx, f.char === 'great' ? 'great' : 'rapier', px, y - 30, 0.6, right);
    if (down) { ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#fefefe'; ctx.fillRect(px - 4, y - 30, 128, 148); ctx.restore(); H.stamp(ctx, px + 62, y + 40, 40, 'DOWN', 22, 1); }
    /* 이름 탭: 검정 사선 판 · 칸에 맞춰 글자 크기 줄임 */
    const nm = CHARS[f.char].label + (Game.botFor(f) ? ' AI' : '');
    let fs = 22; ctx.font = `400 ${fs}px 'T1 Archivo'`; while (ctx.measureText(nm).width > iw - 26 && fs > 13) { fs--; ctx.font = `400 ${fs}px 'T1 Archivo'`; }
    H.poly(ctx, [[ix + 8, y + 24], [ix + iw + 8, y + 24], [ix + iw, y + 54], [ix, y + 54]], P.ink);
    H.text(ctx, nm, ix + 14, y + 46, fs, '#fefefe'); ctx.fillStyle = col; ctx.fillRect(ix + iw - 34, y + 24, 26, 6);
    /* 체력 (피격 때 짧게 흑백 반전) */
    const by = y + 64, bw = iw;
    ctx.fillStyle = inv ? P.ink : '#fefefe'; ctx.fillRect(ix, by, bw, 16); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.strokeRect(ix, by, bw, 16);
    ctx.fillStyle = P.red; ctx.fillRect(ix + 3, by + 3, (bw - 6) * Math.max(0, f.chip) / FIGHT.PLAYER_HP, 10);
    ctx.fillStyle = inv ? '#fefefe' : P.ink; ctx.fillRect(ix + 3, by + 3, (bw - 6) * Math.max(0, f.hp) / FIGHT.PLAYER_HP, 10);
    /* 파형 동그라미 (저장된 색 · 들어올 때 커짐) */
    const max = Slots.max(f);
    for (let k = 0; k < max; k++) {
      const on = k < f.slots.length, wv = on ? f.slots[k] : null, cx = ix + 14 + k * 34, cy = y + 104, pop = f.slotFx && f.slotFx.some(e => e.k === 'in' && e.i === k && e.t < 0.2);
      ctx.beginPath(); ctx.arc(cx, cy, pop ? 15 : 12, 0, Math.PI * 2); ctx.fillStyle = on ? (wv === 'red' ? P.red : wv === 'blue' ? P.blue : P.purple) : '#fefefe'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
      if (on) { ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.quadraticCurveTo(cx - 3.5, cy - 6, cx, cy); ctx.quadraticCurveTo(cx + 3.5, cy + 6, cx + 7, cy); ctx.strokeStyle = '#fefefe'; ctx.lineWidth = 2.5; ctx.stroke(); }
    }
    /* 스킬 2칸 (기호 · 쿨타임 · 1P 키만) + 아래 패리 · 대시 작은 칸 */
    const showKey = (!right || UI.keys2P || solo) && !Game.botFor(f), K = keyNames(f), offer = finOffer(f);
    for (const sl of [1, 2]) {
      const kind = f.skillKind(sl), cd = f.cd[sl - 1], sx = sx0 + (sl - 1) * 64, sy = y + 20, sz = 56;
      ctx.save(); ctx.translate(sx + 10, sy); ctx.transform(1, 0, -0.17, 1, 0, 0);
      ctx.fillStyle = offer ? P.red : '#fefefe'; ctx.fillRect(0, 0, sz, sz); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.strokeRect(0, 0, sz, sz);
      glyph(ctx, kind, sz / 2, sz / 2, offer ? '#fefefe' : P.ink);
      if (cd > 0 && !offer) { const hh = sz * Math.min(1, cd / FEEL.SKILLS[kind].cd); ctx.fillStyle = 'rgba(20,17,18,0.55)'; ctx.fillRect(0, sz - hh, sz, hh); H.text(ctx, String(Math.ceil(cd)), sz / 2, sz / 2 + 10, 26, '#fefefe', { al: 'center' }); }
      if (showKey && !(cd > 0)) { ctx.fillStyle = P.ink; ctx.fillRect(sz - 18, -10, 28, 24); H.text(ctx, String(K[`s${sl}`]).slice(0, 2), sz - 4, 8, 15, '#fefefe', { al: 'center' }); }
      ctx.restore();
    }
    if (offer) offer.names.forEach((n, k) => H.text(ctx, `${showKey ? K[`s${k + 1}`] + '  ' : ''}${finLabel(n)}`, right ? x + w : x + 20, y - 48 - k * 30, 24, Math.floor(clock.t * 8) % 2 ? P.red : P.ink, { al: right ? 'right' : 'left', stroke: 6, sc: '#fefefe' }));
    const pOpen = f.state === 'parry' && f.t <= Waves.parryWindow(f), rdy = f.sinceRoll >= FEEL.DODGE_MIN_GAP;
    for (const [j, lab, on, key] of [[0, 'P', pOpen, K.parry], [1, 'D', rdy, K.dodge]]) {
      const qx = sx0 + j * 64 + 2, qy = y + 88; ctx.fillStyle = on ? P.ink : '#fefefe'; ctx.fillRect(qx, qy, 54, 22); ctx.lineWidth = 2.5; ctx.strokeStyle = P.ink; ctx.strokeRect(qx, qy, 54, 22);
      H.text(ctx, showKey ? `${lab} ${String(key).slice(0, 3)}` : lab, qx + 27, qy + 17, 14, on ? '#fefefe' : P.ink, { al: 'center' });
    }
  }
  function glyph(ctx, kind, cx, cy, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'square'; ctx.beginPath();
    if (kind === 'thrust' || kind === 'windThrust') { ctx.moveTo(-16, 16); ctx.lineTo(14, -14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(16, -16); ctx.lineTo(4, -14); ctx.lineTo(14, -4); ctx.fill(); }
    else if (kind === 'spin') { ctx.arc(0, 2, 14, -0.3, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(8, -12); ctx.lineTo(-4, -6); ctx.fill(); }
    else if (kind === 'launch') { ctx.moveTo(-14, 16); ctx.lineTo(0, -6); ctx.lineTo(14, 16); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(10, -6); ctx.lineTo(-10, -6); ctx.fill(); }
    else { ctx.moveTo(0, -18); ctx.lineTo(0, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-16, 16); ctx.lineTo(16, 16); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(9, 6); ctx.lineTo(0, 14); ctx.fill(); }
    ctx.restore();
  }
  function qte(ctx) {
    const Q = Qte3; if (!Q.on || !Q.cells.length) return;
    const n = Q.cells.length, cur = Q.cells.findIndex(c => !c.res), y = 800, gap = 120, x0 = 960 - (n - 1) * gap / 2;
    H.poly(ctx, [[L, y - 92], [Rr, y - 104], [Rr, y + 74], [L, y + 86]], '#fefefe');
    H.hatch(ctx, L, y - 100, Rr - L, 184, '#ddd5d6', 16, 6);
    ctx.fillStyle = P.ink; ctx.fillRect(L, y - 104, Rr - L, 8);
    H.text(ctx, Q.D.name, 960, y - 52, 44, P.ink, { al: 'center', stroke: 8, sc: '#fefefe' });
    let onCol = Game.tagMode ? Q.col(fighters.find(f => f.onField) || fighters[0]) : null;
    Q.cells.forEach((c, k) => {
      const x = x0 + k * gap, now = k === cur, s = now ? 96 : 76;
      let key = c.key; if (Game.tagMode) { if (!c.res && c.col !== onCol) key = 'tag'; if (!c.res) onCol = c.col; }
      const own = Game.tagMode ? fighters.find(f => f.onField) || fighters[0] : Q.owner(c) || fighters[0], K = keyNames(own), lab = String(K[QKEY[key]] || key).slice(0, 3);
      const cc = c.col === 'red' ? P.red : P.blue;
      ctx.save(); ctx.translate(x, y + 10); ctx.transform(1, 0, -0.14, 1, 0, 0);
      if (c.res === 'ok') { ctx.fillStyle = P.red; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.strokeRect(-s / 2, -s / 2, s, s); H.text(ctx, lab, 0, 16, 40, '#fefefe', { al: 'center' }); }
      else if (c.res) { ctx.fillStyle = '#fefefe'; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.strokeRect(-s / 2, -s / 2, s, s); H.text(ctx, lab, 0, 16, 40, '#b0a3a5', { al: 'center' });
        ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.moveTo(s / 2, -s / 2); ctx.lineTo(-s / 2, s / 2); ctx.stroke(); }
      else if (now) { ctx.fillStyle = P.ink; ctx.fillRect(-s / 2, -s / 2, s, s); H.text(ctx, lab, 0, 20, 54, '#fefefe', { al: 'center' }); ctx.fillStyle = cc; ctx.fillRect(-s / 2, s / 2 - 14, s, 14);
        const due = Q.T(k) - Q.t, kk = Math.max(0, Math.min(1, due / QTE.beat)); ctx.lineWidth = 5; ctx.strokeStyle = cc; ctx.strokeRect(-s / 2 - 10 - 30 * kk, -s / 2 - 10 - 30 * kk, s + 20 + 60 * kk, s + 20 + 60 * kk); }
      else { ctx.fillStyle = '#fefefe'; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.strokeRect(-s / 2, -s / 2, s, s); H.text(ctx, lab, 0, 16, 40, P.ink, { al: 'center' }); ctx.fillStyle = cc; ctx.fillRect(-s / 2 + 8, s / 2 - 16, s - 16, 8); }
      ctx.restore();
    });
  }
  function worldMarks(ctx) {
    const duo = !Game.tagMode, room = uiTexts3().room; let shown = 0;
    for (const f of fighters) {
      if (!f.onField) continue; const p = f.ch.pos;
      if (f.state === 'down' && duo) {
        const [x, y] = proj(p.x, 1.2, p.z), k = f.reviveT / FEEL.REVIVE_T;
        ctx.fillStyle = P.ink; ctx.fillRect(x - 60, y - 40, 120, 14); ctx.fillStyle = '#fefefe'; ctx.fillRect(x - 57, y - 37, 114 * k, 8);
        const near = fighters.find(o => o !== f && o.alive && o.ch.pos.distanceTo(p) < FEEL.REVIVE_R + 0.6), rev = fighters.some(o => o.state === 'revive' && o.reviveOf === f);
        H.text(ctx, rev ? 'REVIVING' : near && !near.bot && (near.idx === 0 || UI.keys2P) ? `HOLD ${keyNames(near).interact}` : 'HELP!', x, y - 54, 24, rev ? P.ink : P.red, { al: 'center', stroke: 6, sc: '#fefefe' });
      }
      edge(ctx, ...proj(p.x, 1.0, p.z), charCol(f));
    }
    if (boss.root.visible && AI.state !== 'dead') edge(ctx, ...proj(boss.pos.x, 1.6, boss.pos.z), P.ink);
    /* 어그로 눈 표시: 보스가 노리는 사람 (둘 다 필드에 있을 때) */
    const onF = fighters.filter(f => f.onField && f.state !== 'down'), tg = AI.aggro;
    if (AI.targetable && AI.targetable() && tg && onF.length > 1 && boss.root.visible) {
      const [x, y] = proj(tg.ch.pos.x, tg.ch.pos.y + 2.75, tg.ch.pos.z);
      ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(0, -16, 22, 0); ctx.quadraticCurveTo(0, 16, -22, 0); ctx.fillStyle = P.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fillStyle = P.red; ctx.fill(); ctx.restore();
    }
    /* 표식 (워든): 표식 받은 사람 위 마름모 + 커버 안내 */
    if (Mark.st) { const w = Mark.marked(), e = Mark.eta(); if (w) { const [x, y] = proj(w.ch.pos.x, w.ch.pos.y + 3.1, w.ch.pos.z), bl = Math.floor(clock.t * 8) % 2;
      H.poly(ctx, [[x, y - 22], [x + 18, y], [x, y + 22], [x - 18, y]], bl ? P.red : P.ink, P.ink, 3); ctx.fillStyle = '#fefefe'; ctx.fillRect(x - 3, y - 3, 6, 6);
      if (e !== null && e <= 1.2) { if (Game.tagMode) H.text(ctx, `${keyNames(w).tag} COVER`, x, y - 32, 22, P.ink, { al: 'center', stroke: 6, sc: '#fefefe' });
        else for (const o of fighters) if (o !== w && o.alive) { const [qx, qy] = proj(o.ch.pos.x, o.ch.pos.y + 2.9, o.ch.pos.z);
          H.text(ctx, 'COVER!', qx, qy - 20, 26, bl ? P.red : P.ink, { al: 'center', stroke: 6, sc: '#fefefe' }); if (!Game.botFor(o) && (o.idx === 0 || UI.keys2P)) H.text(ctx, keyNames(o).parry, qx, qy + 6, 20, P.ink, { al: 'center', stroke: 5, sc: '#fefefe' });   /* U2: 싸우는 화면엔 1P 키만 */ } } } }
    /* 팝업: 글자 수 예산(uiTexts3) 안에서 새 것부터 · 작은 검정 상자 */
    for (let i = Game.popups.length - 1; i >= 0 && shown < room; i--) {
      const pp = Game.popups[i], [x, y0] = proj(pp.p.x, pp.p.y, pp.p.z), y = y0 - Math.min(30, pp.t * 70);
      ctx.font = `400 22px 'T1 Archivo'`; const w = ctx.measureText(pp.text).width + 20;
      ctx.fillStyle = P.ink; ctx.fillRect(x - w / 2, y - 24, w, 32); H.text(ctx, pp.text, x, y, 22, '#fefefe', { al: 'center' }); shown++;
    }
  }
  function edge(ctx, x, y, z, col) {
    const m = 40; if (x >= L + m && x <= Rr - m && y >= m && y <= 1080 - m && z < 1) return;
    const cx = Math.max(L + m, Math.min(Rr - m, x)), cy = Math.max(m, Math.min(1080 - m, y)), a = Math.atan2(y - cy, x - cx);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-10, -14); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke(); ctx.restore();
  }
  function koName(s) {   /* 영문 기술명 → 한글 부제 (앞말 + 이름) */
    const K = D.ui.ko || {}, KP = D.ui.koPre || {}; s = String(s).trim(); if (K[s]) return K[s];
    const i = s.indexOf(' '), pre = i > 0 ? s.slice(0, i) : '', rest = i > 0 ? s.slice(i + 1).trim() : '';
    if (KP[pre] && K[rest]) return KP[pre] + ' ' + K[rest];
    return null;
  }
  function techName(ctx) {
    const T = Game.techName; if (!T || T.t <= 0) return;
    if (T.s !== ui.techS || T.t > ui.techT + 0.01) { ui.techS = T.s; } ui.techT = T.t;
    const f = fighters.find(o => T.col && (charHex(o) === T.col)), col = T.col && T.col.toLowerCase() === '#c78dff' ? P.purple : f ? charCol(f) : P.ink;
    H.techName(ctx, { s: T.s, ko: koName(T.s), col, t: T.t });
  }
  function banners(ctx) {
    if (Game.bannerT > 0) H.text(ctx, Game.bannerText, 960, 420, 46, P.ink, { al: 'center', stroke: 10, sc: '#fefefe' });
    if (Game.noteT > 0 && !Menu3.on) H.text(ctx, Game.noteText, Rr - 40, 140, 22, P.ink, { al: 'right', stroke: 6, sc: '#fefefe' });
    if (Style.monoT > 0 && Style.card) {   /* 보스 등장 카드: 사선 빗금 띠가 밀려 들어오며 큰 한글 이름 */
      const k = Math.min(1, (Style.monoDur - Style.monoT) / 0.15), off = (1 - k) * 900;
      H.poly(ctx, [[L - off, 420], [Rr - 300 - off, 420], [Rr - 360 - off, 640], [L - off, 640]], P.ink);
      H.hatch(ctx, L - off, 420, 900, 18, '#3a3234', 14, 6);
      H.text(ctx, Style.card.a, L + 80 - off, 500, 34, '#fefefe');
      H.text(ctx, KO['THE ' + Style.card.b] || Style.card.b, L + 80 - off, 600, 92, '#fefefe', { ko: true, big: true });
      H.text(ctx, Style.card.b, L + 520 - off, 600, 30, '#fefefe');
    }
    if (Game.rHold > 0.12 && Game.state === 'play') { const k = Math.min(1, Game.rHold / FEEL.RESTART_HOLD); H.text(ctx, 'HOLD R  RESTART', 960, 330, 30, P.ink, { al: 'center', stroke: 6, sc: '#fefefe' }); ctx.fillStyle = P.ink; ctx.fillRect(860, 344, 200, 12); ctx.fillStyle = P.red; ctx.fillRect(863, 347, 194 * k, 6); }
    if (Join3.held && Join3.t > 0) { const k = Math.min(1, Join3.t / UI.joinHold); H.text(ctx, 'HOLD: 2P JOINS', 960, 760, 28, P.ink, { al: 'center', stroke: 6, sc: '#fefefe' }); ctx.fillStyle = P.ink; ctx.fillRect(860, 772, 200, 12); ctx.fillStyle = P.blue; ctx.fillRect(863, 775, 194 * k, 6); }
  }
  function results(ctx) {
    const end = Game.state === 'won' ? 2.2 : Game.state === 'lost' ? 1.6 : -1;
    if (end < 0 || Game.endT <= end) return;
    const won = Game.state === 'won', k = Math.min(1, (Game.endT - end) / 0.25), S2 = Duo.stats;
    ctx.fillStyle = 'rgba(254,254,254,0.82)'; ctx.fillRect(L, 0, Rr - L, 1080);
    H.poly(ctx, [[L, 170], [Rr, 150], [Rr, 470], [L, 490]], '#ebe5e4'); H.hatch(ctx, L, 150, Rr - L, 340, '#d6cfcf', 16, 6);
    H.text(ctx, won ? 'VICTORY' : 'DEFEAT', 80 - (1 - k) * 600, 420, 230, P.ink);
    H.stamp(ctx, 1660, 300, 116, won ? 'WIN' : 'LOSE', won ? 74 : 56, Math.min(1, (Game.endT - end - 0.2) / U.stampT));
    H.text(ctx, won ? '애저 워든 격파' : '쓰러졌다', 86, 540, 40, P.ink, { ko: true, big: true });
    H.portrait(ctx, 'rapier', 90, 610, 1.3); H.portrait(ctx, 'great', 390, 610, 1.3, true);
    const mmss = v => { const s = Math.floor(v); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    const q = S2.qte || { n: 0, perfect: 0 };
    const rows = [['TIME', mmss(won ? Game.winTime : Game.t)], ['FINISHERS', String(S2.finN)], ['COVERS', String(S2.covers)], ['PERFECT RALLY', String(S2.fullRally)], ['QTE PERFECT', `${q.perfect} / ${q.n}`]];
    rows.forEach(([a, b], i) => { const y = 650 + i * 62; ctx.fillStyle = P.ink; ctx.fillRect(760, y - 32, 12, 40); H.text(ctx, a, 790, y, 30, P.ink); H.text(ctx, b, 1420, y, 40, P.ink, { al: 'right' }); ctx.fillStyle = '#d3cccc'; ctx.fillRect(790, y + 14, 630, 2); });
    if (Game.endT > end + 0.4 && Math.floor(clock.t / 0.55) % 2 === 0) { H.poly(ctx, [[760, 980], [1480, 980], [1468, 1040], [748, 1040]], P.ink); H.text(ctx, 'PRESS ANY KEY — RESTART', 784, 1024, 34, '#fefefe'); }
    H.text(ctx, '아무 키 = 다시', 1500, 1024, 24, P.ink, { ko: true });
  }
  function wipeDraw(ctx) {
    if (ui.wipe <= 0) return;
    const k = 1 - ui.wipe / U.wipeT, x = L - 400 + k * (Rr - L + 1200);
    H.poly(ctx, [[x - 900, 0], [x, 0], [x - 300, 1080], [x - 1200, 1080]], P.ink);
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 260, 0); ctx.lineTo(x - 40, 1080); ctx.lineTo(x - 300, 1080); ctx.closePath(); ctx.clip(); H.hatch(ctx, x - 300, 0, 600, 1080, P.ink, 22, 9); ctx.restore();
  }
  /* 타이틀 (라운드 8): 왼쪽 = 큰 제목 + 빗금 띠(제목 폭만) · 오른쪽 = 워든 히어로 (3D) · 아래 = 아무 키 */
  function title(ctx) {
    const blink = Math.floor(clock.t / UI.title.blink) % 2 === 0;
    H.poly(ctx, [[L, 372], [1160, 372], [1110, 640], [L, 640]], '#ebe5e4'); H.hatch(ctx, L, 372, 1160 - L, 268, '#d6cfcf', 16, 6);
    const nm = UI.title.name.split(' ');
    H.text(ctx, nm[0] || '', 70, 320, 196, P.ink); H.text(ctx, nm.slice(1).join(' '), 70, 560, 196, P.ink);
    H.stamp(ctx, 1010, 500, 78, UI.title.sub, 60, 1);
    H.text(ctx, '크림슨 아레나 · 듀오 보스러시', 78, 622, 34, P.ink, { ko: true, big: true });
    H.dots(ctx, L + 44, 120, 4, 22, 4, P.ink); ctx.beginPath(); ctx.arc(L + 44, 230, 13, 0, Math.PI * 2); ctx.fill(); H.dots(ctx, L + 44, 266, 5, 20, 3.5, P.ink);
    H.text(ctx, 'THE AZURE WARDEN', Rr - 60, 1000, 22, P.ink, { al: 'right' }); H.text(ctx, '애저 워든', Rr - 60, 960, 40, P.ink, { al: 'right', ko: true, big: true });
    if (blink) { H.poly(ctx, [[60, 838], [640, 838], [620, 918], [40, 918]], '#fefefe', P.ink, 5); H.text(ctx, 'PRESS ANY KEY', 84, 896, 54, P.ink); }
    H.text(ctx, '아무 키나 누르세요', 80, 966, 26, P.ink, { ko: true });
    const pads = padStatusLines(); H.text(ctx, pads[0], 80, 1046, 20, '#6a494e');
    ctx.fillStyle = P.ink; ctx.fillRect(Rr - 290, 1018, 70, 36); H.text(ctx, 'ESC', Rr - 255, 1044, 22, '#fefefe', { al: 'center' }); H.text(ctx, 'SETTINGS', Rr - 206, 1045, 24, P.ink);
  }
  /* Esc 메뉴 (라운드 8): 왼쪽 검정 판 · 큰 글씨 위계(RESUME · PLAYERS · RESTART) · 설정 묶음은 커서가 들어갈 때만 펼침
   *   줄 목록 · 커서 이동 · 값 바꾸기는 3단계 Menu3 그대로 (그리기만 다름) */
  function menu(ctx) {
    ctx.fillStyle = 'rgba(254,254,254,0.55)'; ctx.fillRect(L, 0, Rr - L, 1080);
    const x0 = L, pw = 820;
    H.poly(ctx, [[x0, 0], [x0 + pw, 0], [x0 + pw - 150, 1080], [x0, 1080]], P.ink);
    H.dots(ctx, x0 + pw - 120, 120, 6, 22, 4, '#fefefe');
    H.text(ctx, Game.state === 'title' ? 'SETTINGS' : 'PAUSED', x0 + 70, 176, 118, '#fefefe');
    H.text(ctx, Game.state === 'title' ? '설정' : '일시 정지', x0 + 76, 234, 40, P.red, { ko: true, big: true });
    if (Game.state !== 'title') H.text(ctx, '게임이 멈춰 있어요', x0 + 76 + 190, 230, 22, '#cfc6c8', { ko: true });
    if (Menu3.page === 'keys' || Menu3.page === 'pad') { pageKeys(ctx, x0); return; }
    const rows = Menu3.items(), big = new Set(['RESUME', 'PLAYERS', 'RESTART', 'CHARACTER SELECT']), cur = Menu3.cur;
    const isSet = it => !big.has(it.k) && it.k !== 'CONTROLS';
    const setIdx = rows.map((it, i) => (isSet(it) ? i : -1)).filter(i => i >= 0), inSet = setIdx.includes(cur);
    let y = 320, setDrawn = false;
    rows.forEach((it, i) => {
      const sel = i === cur;
      if (isSet(it)) {
        if (!inSet) {   /* 접힌 설정 묶음: 한 줄 + 요약 */
          if (setDrawn) return; setDrawn = true;
          H.text(ctx, 'SETTINGS', x0 + 80, y, 28, '#cfc6c8'); H.text(ctx, `${setIdx.length}`, x0 + 260, y, 20, '#8f8487');
          H.text(ctx, `ART ${ART.cur} · ${UI.shake === 0 ? 'NO SHAKE' : 'SHAKE'} · ${Sfx.muted ? 'MUTE' : 'SOUND'}`, x0 + pw - 210, y, 18, '#8f8487', { al: 'right' });
          y += 50; return;
        }
        if (!setDrawn) { setDrawn = true; H.text(ctx, 'SETTINGS', x0 + 80, y - 6, 18, '#8f8487'); ctx.fillStyle = '#5a5254'; ctx.fillRect(x0 + 200, y - 13, pw - 380, 3); y += 26; }
        if (sel) H.poly(ctx, [[x0 + 60, y - 28], [x0 + pw - 190, y - 28], [x0 + pw - 196, y + 10], [x0 + 54, y + 10]], P.red);
        H.text(ctx, it.k, x0 + 96, y, 24, '#fefefe');
        const v = it.v ? it.v() : ''; if (v) H.text(ctx, String(v), x0 + pw - 210, y, 18, '#fefefe', { al: 'right' });
        y += 40; return;
      }
      const isBig = big.has(it.k), size = isBig ? 54 : 28, hgt = isBig ? 76 : 48;
      if (isBig && i > 0) y += 8;
      if (sel) H.poly(ctx, [[x0 + 40, y - size * 0.82], [x0 + pw - 170, y - size * 0.82], [x0 + pw - 178, y + size * 0.26], [x0 + 32, y + size * 0.26]], P.red);
      H.text(ctx, it.k, x0 + 80, y, size, '#fefefe');
      const v = it.v ? it.v() : ''; if (v) H.text(ctx, String(v), x0 + pw - 210, y, isBig ? 22 : 18, '#fefefe', { al: 'right' });
      y += hgt;
    });
    H.text(ctx, 'UP · DOWN  SELECT     LEFT · RIGHT  CHANGE     ESC  BACK', x0 + 70, 1046, 18, '#8f8487');
  }
  function pageKeys(ctx, x0) {
    const K = keyNames(fighters[0]), rows = Menu3.page === 'pad' ? padStatusLines().concat(['A DASH · B PARRY · X ATTACK', 'RT/LB SKILL U · LT SKILL I · RB TAG', 'START MENU · BACK END SCREEN']) :
      [`MOVE  WASD`, `ATTACK  ${K.attack || 'J'}`, `PARRY  ${K.parry}`, `DASH  ${K.dodge}`, `SKILL  ${K.s1} / ${K.s2}`, `TAG  ${K.tag}`, `REVIVE  ${K.interact} (HOLD)`, 'MENU  ESC'];
    rows.forEach((r, i) => H.text(ctx, String(r), x0 + 80, 340 + i * 56, 32, '#fefefe'));
    H.text(ctx, 'ESC / ENTER  BACK', x0 + 70, 1046, 20, '#b0a3a5');
  }
};
