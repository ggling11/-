// ---- 3단계 QTE — 적 · 청 플레이어가 번갈아 누르는 합동 입력 (QTE 표, 7절) · 보스 2 · 3 · 4
//      칸 순서 · 칸 키 = 시드 난수(SR) · 판정 = 기록된 입력(Rec.frameInput 뒤) → 재생 일치
//      판정: 칸 주인이 판정 창(±QTE.win) 안에 그 키 = 깨짐 · 틀린 키 = 실패 · 창 앞 한 박자 안의 입력 = 너무 이름(실패) · 창이 지나도록 안 누름 = 실패
//      ★ 칸 주인이 아닌 사람의 입력은 판정에 안 들어감 (자기 칸만)
//      ★ 무시 봇도 자기 칸은 합 봇처럼 누름 (칸은 각자 화면에 뜬 자기 키 — 파트너를 챙기는 동작이 아님) · 연타 봇 = 아무 키나 연타
//      ★ 칸 주인 = 그 색 캐릭터 (쌍검 = 파트너와 반대 색) · 태그 솔로 = 지금 나와 있는 캐릭터와 칸 색이 다르면 교대 키(성공하면 실제로 교대)
//      전부 성공 = 보스 그로기(QTE.reward.groggy) + 랠리 + 'PERFECT CHAIN' · 실패 칸마다 그 사람 피해(QTE.failDmg) · QTE.punishAt칸 이상 실패 = 보스 강공격 하나
const QTE_ACTS = ['attack', 'parry', 'skill1', 'skill2', 'dodge', 'tag'];   // 판정에 들어가는 입력 (이동은 X)
const Qte3 = {
  on: false, D: null, cells: [], t: 0, fails: 0, lastEnd: -99, want: false, endT: 0, done: false, F: [],
  reset() { this.on = false; this.cells = []; this.want = false; this.lastEnd = -99; this.done = false; this.F = []; },
  bossDef() { return STYLE.on ? QTE.bosses[Rush.idx] || null : null; },
  weight(ph) { const D = this.bossDef(); return D && ph + 1 >= (D.from || 2) ? D.w : 0; },   // ph = 페이즈 - 1 · D.from 페이즈부터
  stats() { const S = Duo.stats; return S.qte || (S.qte = { n: 0, perfect: 0, cells: 0, ok: 0, miss: 0, wrong: 0, early: 0, punish: 0, abort: 0, tagSwap: 0, byBoss: {} }); },
  // QTE 색: 적 · 청 그대로 · 쌍검('both') = 파트너와 반대 색
  col(f) {
    const c = CHARS[f.char].color; if (c !== 'both') return c;
    const o = fighters.find(q => q !== f && q.active); const oc = o && CHARS[o.char].color;
    return oc === 'red' ? 'blue' : oc === 'blue' ? 'red' : (f.idx ? 'blue' : 'red');
  },
  // 참가자 둘 (2인: 둘 다 나와 있고 살아 있음 · 태그: 나와 있는 사람 + 벤치의 살아 있는 사람)
  pair() {
    if (Game.tagMode) { const a = fighters.find(f => f.onField && f.alive), b = fighters.find(f => f.active && f.bench && f.state !== 'down'); return a && b ? [a, b] : null; }
    const l = fighters.filter(f => f.alive); return l.length >= 2 ? l : null;
  },
  can(ph, phaseEntry = false) {
    const D = this.bossDef();
    if (!D || this.on || Game.mode !== 'fight' || Game.state !== 'play' || Relics.open || Rush.state === 'rest') return false;
    if (Game.t - this.lastEnd < (phaseEntry ? QTE.gapPhase : QTE.gap)) return false;
    if (!this.pair() || Duo.fins.length || fighters.some(f => f.onField && (f.state === 'grabbed' || f.state === 'finish' || f.state === 'juggled'))) return false;
    if (Dk.on) {                                   // 도깨비: 합동기 쿨타임을 같이 씀 · 둘 다 서 있을 때만
      if (Dk.J || Dk.rv || Dk.down || Dk.jointCd > 0 || !Dk.alive(0) || !Dk.alive(1)) return false;
      const o = Dk.get(1 - Dk.ci, 'state'); if (o !== 'idle' && o !== 'walk') return false;
    }
    return true;
  },
  onPhase(ph) { const D = this.bossDef(); if (D && D.at.includes(ph)) this.want = true; },
  T(k) { return QTE.lead + k * QTE.beat; },
  start() {
    const D = this.bossDef(), ph = Math.max(1, Math.min(3, AI.phase)), n = D.cells[ph - 1], P = this.pair();
    const cells = [];
    for (let k = 0; k < n; k++) {                  // 시드: 색(같은 색 최대 QTE.maxRun 연속) · 키
      let c = SR() < 0.5 ? 'red' : 'blue';
      if (k >= QTE.maxRun && cells.slice(-QTE.maxRun).every(x => x.col === c)) c = c === 'red' ? 'blue' : 'red';
      cells.push({ col: c, key: QTE.keys[Math.floor(SR() * QTE.keys.length)], res: null, why: '', at: -1, fx: 0 });
    }
    this.on = true; this.D = D; this.cells = cells; this.t = 0; this.fails = 0; this.want = false; this.done = false; this.endT = 0; this.F = P;
    const S = this.stats(); S.n++; const B = S.byBoss[Rush.idx] || (S.byBoss[Rush.idx] = { n: 0, perfect: 0, cells: 0, ok: 0 }); B.n++;
    // 보스: 그 자리에서 맞섬 (진행 중인 공격 · 바닥 · 탄 정리)
    Hazards.clear(); Shots.clear(); Shuttle.clear(); Mark.clear(); Rush.tint(null);
    Dk.each(() => { AI.clearTele(); AI.cmb = null; AI.state = 'qte'; AI.cur = 'qte'; AI.t = 0; boss.rootOn = true; boss.pos.y = 0; boss.play('idle'); boss.turnRate = 6; });
    // 사람: 보스 앞에 나란히 (적 왼쪽 · 청 오른쪽, 도깨비는 자기 색 도깨비 앞)
    for (const f of fighters) if (f.onField) {
      f.state = 'move'; f.clearBufs(); f.vel.set(0, 0, 0); f.pending = null; f.fin = null; f.invuln = Math.max(f.invuln, 0.5);
      const c = this.col(f), side = c === 'red' ? -1 : 1;
      const rig = Dk.on ? Dk.rigs[DK_COL.indexOf(c)] || boss : boss;
      const fa = Math.atan2(f.ch.pos.x - rig.pos.x, f.ch.pos.z - rig.pos.z), a = Dk.on || Game.tagMode ? fa : rig.facing + side * QTE.spread;
      const r = rig.radius + QTE.stand, x = rig.pos.x + Math.sin(a) * r, z = rig.pos.z + Math.cos(a) * r;
      f.ch.place(x, z, Math.atan2(rig.pos.x - x, rig.pos.z - z)); f.ch.rootOn = true; f.ch.play('idle');
    }
    Sfx.play('warn'); Sfx.play('lock'); CamRig.shake(2, 0.2);
  },
  // 이 사람이 지금 노리는 칸 (2인: 자기 색의 첫 미결 칸 · 태그: 첫 미결 칸)
  target(f) {
    for (let k = 0; k < this.cells.length; k++) { const c = this.cells[k]; if (c.res) continue; if (Game.tagMode || c.col === this.col(f)) return k; }
    return -1;
  },
  // 이 칸에서 이 사람이 눌러야 하는 행동 (태그: 나와 있는 캐릭터와 색이 다르면 교대)
  expect(f, c) { return Game.tagMode && c.col !== this.col(f) ? 'tag' : c.key; },
  owner(c) {                                       // 칸 주인 (피해 · 동작) — 태그: 나와 있는 사람
    if (Game.tagMode) return fighters.find(f => f.onField) || null;
    return this.F.find(f => this.col(f) === c.col) || null;
  },
  // Fighter.update에서: 기록된 입력 한 프레임
  input(f, inp) {
    if (this.done) return;
    for (const a of QTE_ACTS) {
      if (!inp.hit(a)) continue;
      const k = this.target(f); if (k < 0) return;
      const c = this.cells[k], T = this.T(k), t = this.t;
      if (t < T - QTE.win - QTE.beat) return;     // 한참 전: 무시
      if (t < T - QTE.win) { this.resolve(k, false, 'early', f); return; }
      this.resolve(k, a === this.expect(f, c), a === this.expect(f, c) ? '' : 'wrong', f);
      return;                                      // 한 프레임에 한 번만 판정
    }
  },
  resolve(k, ok, why, f) {
    const c = this.cells[k], S = this.stats(), B = S.byBoss[Rush.idx];
    c.res = ok ? 'ok' : 'fail'; c.why = why; c.at = this.t; S.cells++; B.cells++;
    const own = Game.tagMode ? f : this.owner(c) || f;
    if (ok) {
      S.ok++; B.ok++;
      if (Game.tagMode && this.expect(f, c) === 'tag') {   // 교대 칸: 실제로 교대 (들어온 사람이 친다)
        Game.tagCd = 0; if (Game.tagSwap(f)) S.tagSwap++;
      }
      const g = Game.tagMode ? fighters.find(q => q.onField) || own : own;
      this.strikeFx(g, c);
    } else {
      S[why || 'miss']++; this.fails++;
      if (own && own.alive) { Game.hurtPlayer(own, QTE.failDmg, boss.pos.clone(), false, null, true, 'qte'); if (own.state === 'hit') own.state = 'move'; }
      Sfx.play('fizzle');
    }
  },
  strikeFx(f, c) {                                 // 칸 깨짐: 그 사람이 한 번 치고 · 그 색 불꽃 · 보스(그 색 도깨비)가 움찔
    const rig = Dk.on ? Dk.rigs[DK_COL.indexOf(c.col)] || boss : boss;
    if (f && f.ch) {
      f.ch.face(Math.atan2(rig.pos.x - f.ch.pos.x, rig.pos.z - f.ch.pos.z));
      const A = f.atk(1); f.ch.play(A && A.clip && f.ch.clips[A.clip] ? A.clip : 'idle', 1.3, 0); f.ch.rootOn = false;
      const m = V3((f.ch.pos.x + rig.pos.x) / 2, 1.3, (f.ch.pos.z + rig.pos.z) / 2);
      Particles.burst(Slots.pk(c.col), m, null, 18, 1.8); Particles.burst('spark', m, null, 10, 1.4);
    }
    rig.shudder && rig.shudder(2, 0.12, 1); rig.flash && rig.flash();
    CamRig.shake(2, 0.12); Sfx.play(this.D.sfx || 'parry');
  },
  update(dt) {
    if (!this.on) return;
    const P = this.F;
    if (Game.state !== 'play' || Game.mode !== 'fight' || !Dk.anyAlive()) { this.finish(true); return; }
    if (!this.done && P.some(f => f.state === 'down' || !f.active)) {   // 한 사람이 쓰러짐: 남은 칸 = 실패로 끝
      const S = this.stats(); S.abort++;
      for (const c of this.cells) if (!c.res) { c.res = 'fail'; c.why = 'miss'; this.fails++; }
      this.done = true; this.endT = 0;
    }
    this.t += dt;
    for (const f of fighters) if (f.onField && f.alive) {
      f.invuln = Math.max(f.invuln, 0.25);           // QTE 중엔 QTE 피해만
      if (f.ch.done) { f.ch.play('idle'); f.ch.rootOn = true; }
    }
    Dk.each(() => { if (AI.state === 'qte') { const o = fighters.find(f => f.onField) || fighters[0]; boss.facingTo = Math.atan2(o.ch.pos.x - boss.pos.x, o.ch.pos.z - boss.pos.z); } });
    if (!this.done) {
      for (let k = 0; k < this.cells.length; k++) {  // 창이 지나도록 안 누른 칸
        const c = this.cells[k]; if (c.res) continue;
        if (this.t > this.T(k) + QTE.win) { const o = this.owner(c); this.resolve(k, false, 'miss', o); } else break;
      }
      if (this.cells.every(c => c.res)) { this.done = true; this.endT = 0; }
    } else if ((this.endT += dt) >= QTE.tail) this.finish(false);
  },
  finish(abort) {
    const S = this.stats(), D = this.D || {}, all = !abort && this.cells.length && this.cells.every(c => c.res === 'ok');
    this.on = false; this.done = false; this.lastEnd = Game.t;
    if (Dk.on) Dk.jointCd = Math.max(Dk.jointCd, FEEL.DK.jointCd);
    for (const f of fighters) if (f.onField && f.alive) { f.invuln = Math.max(f.invuln, QTE.after); f.state = 'move'; f.ch.rootOn = true; if (!f.ch.is || !f.ch.is('idle')) f.ch.play('idle'); }
    if (abort) { Dk.each(() => { if (AI.state === 'qte') AI.toIdle(0.5); }); return; }
    if (all) {                                     // PERFECT CHAIN
      S.perfect++; S.byBoss[Rush.idx].perfect++;
      Dk.each(i => { if (Dk.alive(i) && AI.state !== 'dead') { AI.state = 'idle'; AI.toGroggy('BREAK!'); AI.t = Math.max(AI.t, QTE.reward.groggy); } });
      const last = this.owner(this.cells[this.cells.length - 1]) || fighters[0];
      Duo.rallyUp(QTE.reward.rally, last);
      techNameSet('PERFECT CHAIN', last, true); Sfx.play('fullRally'); CamRig.shake(5, 0.4);
      return;
    }
    if (this.fails >= QTE.punishAt && D.punish) {  // 많이 틀림: 보스 강공격 하나
      S.punish++;
      Dk.each(() => { if (AI.state === 'qte') AI.toIdle(0.2); });
      if (AI.state === 'idle' || AI.state === 'qte') { AI.hist.push(D.punish); AI.start(D.punish); }
      return;
    }
    Dk.each(() => { if (AI.state === 'qte') AI.toIdle(QTE.rest); });
  },
  // 봇: 자기 칸을 판정 창 안에 (칸마다 한 번 정함 — Math.random = 입력 쪽, 기록됨) · 연타 봇 = 아무 키나 연타 · 무시 봇 = 합 봇과 같음
  botStep(f, bot, inp, mode) {
    if (!this.on || this.done) return;
    if (mode === 'spam') { if (Math.random() < QTE.bot.spam) inp.pressed.add(QTE.keys[Math.floor(Math.random() * QTE.keys.length)]); return; }
    const k = this.target(f); if (k < 0) return;
    const c = this.cells[k], T = this.T(k), key = this.expect(f, c), W = QTE.win;
    if (!c.plan || c.planBy !== f) {
      c.planBy = f; const r = Math.random(), B = QTE.bot;
      if (r < B.hit) c.plan = { at: T + (Math.random() * 2 - 1) * W * 0.6, key };
      else if (r < B.hit + B.early) c.plan = { at: T - W - QTE.beat * 0.4, key };
      else { const wrong = QTE.keys.filter(x => x !== key); c.plan = { at: T + (Math.random() * 2 - 1) * W * 0.5, key: wrong[Math.floor(Math.random() * wrong.length)] }; }
      c.planned = false;
    }
    if (!c.planned && this.t + 1e-6 >= c.plan.at) { inp.pressed.add(c.plan.key); c.planned = true; }
  },
};
