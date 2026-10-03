import os
# Buttons: real key events in headless Chromium + a fake Gamepad API object for the pad mapping.
# Each check: press a key/button, step the game, see which action the right character started.
# 1.6 one keyboard, two people (2P is a person, no 2P pad): 1P WASD + G attack · H parry · Space dodge · T skill 1 · Y skill 2 · B revive
#                                                          2P arrows + L attack · K parry · / dodge · O skill 1 · I skill 2 · . revive (numpad too)
# Alone / 2P AI: 1P WASD + J K U I (unchanged) · 2P join with O / '/' / '.' / numpad · R restarts only when held mid-fight
import json
from playwright.sync_api import sync_playwright
out = []
FAKEPAD = """() => {
  window.__pads = [null, null];
  const mk = () => ({ connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
  window.__mkpad = (i) => { window.__pads[i] = mk(); };
  navigator.getGamepads = () => window.__pads;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 540}); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.add_init_script("(" + FAKEPAD + ")()")
    pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_function('window.PIPE !== undefined', timeout=90000)
    SET = """(o) => { const P = window.PIPE; P.paused = true; P.setup(o); P.AI.state = 'idle'; P.AI.t = 999;
       P.boss.place(0, -0.5, 0); P.fighters[0].ch.place(-0.3, 1.8, Math.PI); P.fighters[1].ch.place(1.2, 1.8, Math.PI);
       for (const f of P.fighters) { f.state = 'move'; f.cd = [0, 0]; } for (let i = 0; i < 3; i++) P.step(1/60, false); return true; }"""
    STEP = "() => { const P = window.PIPE; for (let i = 0; i < 4; i++) P.step(1/60, false); return P.fighters.map(f => ({ st: f.state, k: f.castKind })); }"
    def got_of(r, who):
        return r[who]['k'] if r[who]['st'] == 'cast' else r[who]['st']
    def opts(mode):
        return {'mode': 'duo', 'bots': [None, None], 'seed': 1} if mode == 'duo' else {'mode': 'duo', 'bots': [None, 'coop'], 'seed': 1} if mode == 'ai2' else {'mode': 'tag', 'bots': [None], 'seed': 1}
    def key(code, who, want, mode='duo', cid='KEY'):
        pg.evaluate(SET, opts(mode))
        pg.keyboard.down(code); r = pg.evaluate(STEP); pg.keyboard.up(code)
        got = got_of(r, who)
        out.append({'id': cid, 'mode': mode, 'input': code, 'who': 'AB'[who], 'want': want, 'got': got, 'ok': got == want})
    # one keyboard, two people
    for code, want in [('KeyG', 'attack'), ('KeyH', 'parry'), ('Space', 'dodge'), ('KeyT', 'thrust'), ('KeyY', 'spin')]:
        key(code, 0, want, 'duo', 'SPLIT-1P')
    for code, want in [('KeyL', 'attack'), ('KeyK', 'parry'), ('Slash', 'dodge'), ('KeyO', 'launch'), ('KeyI', 'smash'), ('Numpad7', 'launch'), ('Numpad8', 'smash')]:
        key(code, 1, want, 'duo', 'SPLIT-2P')
    key('KeyJ', 0, 'move', 'duo', 'SPLIT-1P')      # the solo keys do nothing for 1P now
    key('KeyU', 0, 'move', 'duo', 'SPLIT-1P')
    for code, who in [('KeyB', 0), ('Period', 1)]:   # revive = hold
        pg.evaluate(SET, opts('duo')); pg.keyboard.down(code); pg.evaluate("() => window.PIPE.step(1/60, false)")
        h = pg.evaluate(f"() => window.PIPE.Input.heldOf({who}, 'interact')"); pg.keyboard.up(code)
        out.append({'id': 'SPLIT-' + ('1P' if who == 0 else '2P'), 'mode': 'duo', 'input': code + ' (hold)', 'who': 'AB'[who], 'want': 'revive held', 'got': 'revive held' if h else str(h), 'ok': h is True})
    for code, ax in [('ArrowUp', (0, 1)), ('ArrowLeft', (-1, 0))]:
        pg.evaluate(SET, opts('duo')); pg.keyboard.down(code)
        a = pg.evaluate("() => window.PIPE.Input.axisOf(1)"); pg.keyboard.up(code)
        out.append({'id': 'SPLIT-2P', 'mode': 'duo', 'input': code, 'who': 'B', 'want': f'axis {ax}', 'got': f"axis {(a['x'], a['y'])}", 'ok': (a['x'], a['y']) == ax})
    pg.evaluate(SET, opts('duo'))
    for c in ['KeyW', 'ArrowUp']: pg.keyboard.down(c)
    pg.keyboard.down('KeyT'); pg.keyboard.down('KeyO'); r = pg.evaluate(STEP)
    for c in ['KeyT', 'KeyO', 'KeyW', 'ArrowUp']: pg.keyboard.up(c)
    g = (got_of(r, 0), got_of(r, 1))
    out.append({'id': 'SPLIT', 'mode': 'duo', 'input': 'W+T (1P) and Up+O (2P) same frame', 'who': 'AB', 'want': "('thrust', 'launch')", 'got': str(g), 'ok': g == ('thrust', 'launch')})
    # alone / 2P AI: 1P keeps J K U I
    key('KeyU', 0, 'thrust', 'ai2', 'SOLO-1P'); key('KeyI', 0, 'spin', 'ai2', 'SOLO-1P'); key('KeyK', 0, 'parry', 'ai2', 'SOLO-1P'); key('KeyJ', 0, 'attack', 'ai2', 'SOLO-1P')
    key('KeyU', 0, 'thrust', 'tag', 'SOLO-1P'); key('KeyI', 0, 'spin', 'tag', 'SOLO-1P')
    # no shared keys (one keyboard 1P / 2P / global · alone 1P / 2P join keys)
    ov = pg.evaluate("""() => { const P = window.PIPE, c = m => new Set(Object.values(m).flat()), x = (A, B) => [...A].filter(k => B.has(k));
      const g = new Set([...Object.keys(P.GKEYS), 'Digit1','Digit2','Digit3','Digit4','Digit5','KeyQ','KeyE','KeyM','F2','F8']);
      const S1 = c(P.PKEYS_SPLIT[0]), S2 = c(P.PKEYS_SPLIT[1]), O1 = c(P.PKEYS[0]), O2 = c(P.PKEYS[1]);
      return [...x(S1, S2), ...x(S1, g), ...x(S2, g), ...x(O1, O2), ...x(O1, g), ...x(O2, g)]; }""")
    out.append({'id': 'KEYS', 'mode': '-', 'input': 'overlap', 'who': '-', 'want': '[]', 'got': str(ov), 'ok': ov == []})
    # join: alone (tag) → O brings 2P in as a person → the one-keyboard layout switches on
    pg.evaluate(SET, opts('tag'))
    pg.keyboard.press('KeyO'); pg.evaluate("() => { for (let i = 0; i < 3; i++) window.PIPE.step(1/60, false); }")
    j = pg.evaluate("() => { const P = window.PIPE; return { tag: P.Game.tagMode, bot: !!P.fighters[1].bot, split: P.Input.split(), banner: P.Game.bannerText }; }")
    out.append({'id': 'JOIN', 'mode': 'tag', 'input': 'O alone', 'who': 'B', 'want': 'duo, 2P person, split on', 'got': str(j), 'ok': j['tag'] is False and j['bot'] is False and j['split'] is True})
    # HUD labels: one keyboard → 1P G H T Y · 2P L K O I · 2P numpad → 2 7
    pg.evaluate(SET, opts('duo'))
    L1 = pg.evaluate("() => { const P = window.PIPE; return [P.keyNames(P.fighters[0]), P.keyNames(P.fighters[1])]; }")
    pg.keyboard.press('Numpad2'); pg.evaluate("() => window.PIPE.step(1/60, false)")
    L2 = pg.evaluate("() => { const P = window.PIPE; return P.keyNames(P.fighters[1]); }")
    ok = [L1[0]['attack'], L1[0]['parry'], L1[0]['s1'], L1[0]['s2']] == ['G', 'H', 'T', 'Y'] and [L1[1]['attack'], L1[1]['parry'], L1[1]['s1'], L1[1]['s2']] == ['L', 'K', 'O', 'I'] and L2['parry'] == '2'
    out.append({'id': 'LABELS', 'mode': 'duo', 'input': 'keyNames', 'who': 'AB', 'want': 'G H T Y / L K O I / numpad 2', 'got': f"{[L1[0][k] for k in ['attack','parry','s1','s2']]} {[L1[1][k] for k in ['attack','parry','s1','s2']]} {L2['parry']}", 'ok': ok})
    # R: a tap mid-fight does nothing · held 0.6 s restarts
    pg.evaluate(SET, opts('duo')); pg.evaluate("() => { for (let i = 0; i < 120; i++) window.PIPE.step(1/60, false); }")
    t0 = pg.evaluate("() => window.PIPE.Game.t")
    pg.keyboard.down('KeyR'); pg.evaluate("() => { for (let i = 0; i < 18; i++) window.PIPE.step(1/60, false); }"); t1 = pg.evaluate("() => window.PIPE.Game.t")
    pg.evaluate("() => { for (let i = 0; i < 30; i++) window.PIPE.step(1/60, false); }"); t2 = pg.evaluate("() => window.PIPE.Game.t"); pg.keyboard.up('KeyR')
    out.append({'id': 'RESTART', 'mode': 'duo', 'input': 'R held 0.3 s / 0.8 s', 'who': '-', 'want': 'no restart / restart', 'got': f't {t0:.2f} → {t1:.2f} → {t2:.2f}', 'ok': t1 > t0 and t2 < t1})
    # pad: 1st pad = 1P · RT(7) skill 1 · LT(6) skill 2 · (LB 4 = skill 1 too) · 2nd pad = 2P (one-keyboard layout off: 2P has a pad) · RB(5) = tag in tag solo
    def pad(i, btn, who, want, mode='duo'):
        pg.evaluate(SET, opts(mode))
        pg.evaluate(f"() => {{ window.__mkpad(0); window.__mkpad(1); window.PIPE.step(1/60, false); window.__pads[{i}].buttons[{btn}].pressed = true; }}")
        r = pg.evaluate(STEP)
        pg.evaluate(f"() => {{ window.__pads[{i}].buttons[{btn}].pressed = false; window.PIPE.step(1/60, false); window.__pads = [null, null]; window.PIPE.step(1/60, false); }}")
        got = got_of(r, who)
        out.append({'id': 'PAD', 'mode': mode, 'input': f'pad{i + 1} button {btn}', 'who': 'AB'[who], 'want': want, 'got': got, 'ok': got == want})
    pad(0, 7, 0, 'thrust'); pad(0, 6, 0, 'spin'); pad(0, 4, 0, 'thrust')
    pad(1, 7, 1, 'launch'); pad(1, 6, 1, 'smash')
    pg.evaluate(SET, opts('tag'))
    pg.evaluate("() => { window.__mkpad(0); window.PIPE.step(1/60, false); window.__pads[0].buttons[5].pressed = true; }")
    r = pg.evaluate("() => { const P = window.PIPE; for (let i = 0; i < 3; i++) P.step(1/60, false); return P.fighters.map(f => f.onField); }")
    out.append({'id': 'PAD', 'mode': 'tag', 'input': 'pad1 RB (tag solo)', 'who': 'B', 'want': 'B on field', 'got': 'B on field' if r[1] else 'A stays', 'ok': r[1] is True})
    b.close()
for o in out: print(('PASS' if o['ok'] else 'FAIL'), o)
print(sum(o['ok'] for o in out), '/', len(out), 'errors', logs[:3])
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results'), exist_ok=True)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'input15.json'), 'w'), indent=1)
