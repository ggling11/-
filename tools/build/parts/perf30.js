// ---- 3단계 성능: 자동 화질 (STYLE.quality) — 실제 프레임 시간(requestAnimationFrame 간격)을 보고 3D 해상도 · 그림자 · 빛 번짐을 한 단계씩 내리고 올림
//      글자 · HUD는 늘 화면 해상도 그대로 (3D만 낮춰서 부드럽게 키움) · 헤드리스 점검(PIPE.step)은 이 루프를 안 거쳐서 영향 없음
const Perf3 = {
  level: 0, ema: 16.7, t: 0, good: 0, auto: STYLE.quality.auto, block: {}, clock: 0, changes: 0,
  apply(lv, why = '') {
    const Q = STYLE.quality, L = Q.levels[Math.max(0, Math.min(Q.levels.length - 1, lv))];
    this.level = Q.levels.indexOf(L); STYLE.scale = L.scale; Pipe.toggles.bloom = L.bloom; styleCompMat.uniforms.uRings.value = L.rings ?? 2;
    if (shadowRT.width !== L.shadow) shadowRT.setSize(L.shadow, L.shadow);
    resize(); this.t = 0; this.good = 0; this.changes++;
    if (why) Game.note && Game.note(`QUALITY ${Math.round(L.scale * 100)}%`);
  },
  setManual(scale) { this.auto = scale === null; if (scale !== null) { STYLE.scale = scale; resize(); } else this.apply(this.level); },
  tick(rawMs) {
    if (!STYLE.on || !this.auto || document.hidden) return;
    if (rawMs > 1500) return;                        // 탭 전환 · 멈춤 뒤 첫 프레임
    rawMs = Math.min(rawMs, 100);                    // 아주 느린 프레임도 '느림'으로만 셈
    this.clock += rawMs / 1000; this.t += rawMs / 1000;
    this.ema += (rawMs - this.ema) * 0.06;
    const Q = STYLE.quality;
    if (this.t < Q.settle) return;
    if (this.ema > Q.downMs && this.level < Q.levels.length - 1) { this.block[this.level] = this.clock + Q.block; this.apply(this.level + 1, 'down'); return; }
    if (this.ema < Q.upMs && this.level > 0 && !(this.block[this.level - 1] > this.clock)) {
      this.good += rawMs / 1000; if (this.good >= Q.upHold) this.apply(this.level - 1, 'up');
    } else this.good = 0;
  },
};
