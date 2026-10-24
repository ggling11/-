## 시험 고리 (실행할 때 `--` 뒤에 준다):
##   --autotest-input        headless 입력 자동 시험 (가짜 InputEvent + 연결 처리기 직접 호출). 모두 통과해야 종료 코드 0
##   --bench-quick           아주 짧은 성능 측정 → 결과 파일을 쓰고 형식을 확인한 뒤 끝낸다 (--result-file=<경로> 가능)
##   --shots=<폴더>          1280×720 창으로 타이틀 · 측정 중(낮음·최고) · 결과 · 두 명 입력 · 자유롭게 보기 PNG를 찍고 끝낸다
##   --flash-test=<폴더>     고정 60fps(--fixed-fps 60과 함께) 연속 프레임으로 이펙트 한 번의 화면 평균 휘도를 잰다
##   --smoke                 모든 화면을 한 번씩 거쳐 보고 끝낸다 (headless 로그 오류 검사용)
##   --snap=<png> [--snap-screen=title|input|free|game]   한 장만 찍고 끝낸다 (화면 다듬기용)
extends Node

const Router = preload("res://src/input_router.gd")
const Quality = preload("res://src/quality.gd")

var main
var fails := 0
var passes := 0


func setup(m) -> void:
	main = m
	var a: Dictionary = main.args
	if a.has("autotest-input"):
		_run_autotest.call_deferred()
	elif a.has("bench-quick"):
		_run_bench_quick.call_deferred()
	elif a.has("shots"):
		_run_shots.call_deferred(str(a["shots"]))
	elif a.has("flash-test"):
		_run_flash.call_deferred(str(a["flash-test"]))
	elif a.has("smoke"):
		_run_smoke.call_deferred()
	elif a.has("snap"):
		_run_snap.call_deferred(str(a["snap"]), str(a.get("snap-screen", "title")))


func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


func _finish(code: int) -> void:
	await _frames(2)
	main.quit_app(code)


# ───────────── 가짜 입력 이벤트 ─────────────

static func key(code: int, pressed: bool = true, echo: bool = false, device: int = 0) -> InputEventKey:
	var e := InputEventKey.new()
	e.physical_keycode = code
	e.keycode = code
	e.pressed = pressed
	e.echo = echo
	e.device = device
	return e


static func jbtn(dev: int, b: int, pressed: bool = true) -> InputEventJoypadButton:
	var e := InputEventJoypadButton.new()
	e.device = dev
	e.button_index = b
	e.pressed = pressed
	e.pressure = 1.0 if pressed else 0.0
	return e


static func jaxis(dev: int, axis: int, v: float) -> InputEventJoypadMotion:
	var e := InputEventJoypadMotion.new()
	e.device = dev
	e.axis = axis
	e.axis_value = v
	return e


func _router(same_model: bool = false):
	var r = Router.new()
	r.accept_join = true
	if same_model:
		r.fake_joy = {
			0: {"name": "같은 모델 패드", "guid": "03000000aaaa0000bbbb000000000000"},
			1: {"name": "같은 모델 패드", "guid": "03000000aaaa0000bbbb000000000000"},
			2: {"name": "세 번째 패드", "guid": "03000000cccc0000dddd000000000000"},
		}
	else:
		r.fake_joy = {
			0: {"name": "가짜 패드 A", "guid": "0300000011110000aaaa000000000000"},
			1: {"name": "가짜 패드 B", "guid": "0300000022220000bbbb000000000000"},
			2: {"name": "가짜 패드 C", "guid": "0300000033330000cccc000000000000"},
		}
	return r


func _check(case_name: String, ok: bool, detail: String) -> void:
	if ok:
		passes += 1
		print("PASS  %s — %s" % [case_name, detail])
	else:
		fails += 1
		print("FAIL  %s — %s" % [case_name, detail])


static func _near(a: float, b: float, eps: float = 1e-4) -> bool:
	return absf(a - b) <= eps


# ───────────── 입력 자동 시험 ─────────────

func _run_autotest() -> void:
	print("== 입력 자동 시험 (Godot %s) ==" % Engine.get_version_info().get("string", "?"))
	_case1()
	_case2()
	_case3()
	_case4()
	_case5()
	_case6()
	_case7()
	_case_extra()
	_case_holds()
	await _case_integration()
	await _case_resync()
	print("== 결과: 통과 %d · 실패 %d ==" % [passes, fails])
	print("AUTOTEST %s" % ("PASS" if fails == 0 else "FAIL"))
	_finish(0 if fails == 0 else 1)


func _case1() -> void:
	var r = _router()
	r.handle_event(jbtn(0, JOY_BUTTON_A))
	r.handle_event(jbtn(0, JOY_BUTTON_A, false))
	r.handle_event(key(KEY_F))
	var ok_slots: bool = r.slots[0] != null and r.slots[0]["dev"] == "pad:0" and r.slots[1] != null and r.slots[1]["dev"] == "kb_left"
	var atk1: bool = r.get_state(1)["pressed"]["atk"]
	r.consume_edges()
	r.handle_event(key(KEY_F, false))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_X, 1.0))
	var m0: Vector2 = r.get_state(0)["move"]
	var m1: Vector2 = r.get_state(1)["move"]
	r.handle_event(key(KEY_W))
	var m0b: Vector2 = r.get_state(0)["move"]
	var m1b: Vector2 = r.get_state(1)["move"]
	r.handle_event(jbtn(0, JOY_BUTTON_X))
	var p0: bool = r.get_state(0)["pressed"]["atk"]
	var p1: bool = r.get_state(1)["pressed"]["atk"]
	var ok: bool = ok_slots and atk1 and _near(m0.x, 1.0) and m1 == Vector2.ZERO and _near(m1b.y, 1.0) and _near(m0b.y, 0.0) and p0 and not p1
	_check("1 패드0 + 키보드 왼쪽", ok, "칸=[%s, %s] 패드 스틱→1P %s / 2P %s · W→2P %s / 1P %s · X→1P 공격 %s, 2P %s" % [
		r.slots[0]["dev"] if r.slots[0] else "-", r.slots[1]["dev"] if r.slots[1] else "-", m0, m1, m1b, m0b, p0, p1])


func _case2() -> void:
	var r = _router(true)
	r.handle_event(jbtn(0, JOY_BUTTON_X))
	r.handle_event(jbtn(1, JOY_BUTTON_A))
	var ok_slots: bool = r.slots[0] != null and r.slots[0]["dev"] == "pad:0" and r.slots[1] != null and r.slots[1]["dev"] == "pad:1"
	var same_guid: bool = r.slots[0]["guid"] == r.slots[1]["guid"]
	r.consume_edges()
	r.handle_event(jaxis(1, JOY_AXIS_LEFT_Y, -1.0))
	var m0: Vector2 = r.get_state(0)["move"]
	var m1: Vector2 = r.get_state(1)["move"]
	r.handle_event(jbtn(0, JOY_BUTTON_Y))
	var t0: bool = r.get_state(0)["pressed"]["tag"]
	var t1: bool = r.get_state(1)["pressed"]["tag"]
	var ok: bool = ok_slots and same_guid and m0 == Vector2.ZERO and _near(m1.y, 1.0) and t0 and not t1
	_check("2 패드0 + 패드1 (같은 모델·같은 GUID)", ok, "칸=[%s, %s] 같은GUID=%s · 패드1 스틱 위→2P %s / 1P %s · 패드0 Y→1P 태그 %s, 2P %s" % [
		r.slots[0]["dev"], r.slots[1]["dev"], same_guid, m1, m0, t0, t1])


func _case3() -> void:
	var r = _router()
	r.handle_event(key(KEY_W))
	r.handle_event(key(KEY_W, false))
	r.handle_event(key(KEY_UP))
	r.handle_event(key(KEY_UP, false))
	var ok_slots: bool = r.slots[0] != null and r.slots[0]["dev"] == "kb_left" and r.slots[1] != null and r.slots[1]["dev"] == "kb_right"
	r.consume_edges()
	r.handle_event(key(KEY_D))
	var m0: Vector2 = r.get_state(0)["move"]
	var m1: Vector2 = r.get_state(1)["move"]
	r.handle_event(key(KEY_D, false))
	r.handle_event(key(KEY_LEFT))
	var m0b: Vector2 = r.get_state(0)["move"]
	var m1b: Vector2 = r.get_state(1)["move"]
	r.handle_event(key(KEY_KP_1))
	r.handle_event(key(KEY_G))
	var st0: Dictionary = r.get_state(0)
	var st1: Dictionary = r.get_state(1)
	var ok: bool = ok_slots and _near(m0.x, 1.0) and m1 == Vector2.ZERO and _near(m1b.x, -1.0) and m0b == Vector2.ZERO \
		and st1["pressed"]["atk"] and not st0["pressed"]["atk"] and st0["pressed"]["rcv"] and not st1["pressed"]["rcv"]
	_check("3 키보드 왼쪽 + 키보드 오른쪽", ok, "칸=[%s, %s] D→1P %s/2P %s · ←→2P %s/1P %s · 숫자1→2P 공격 %s · G→1P 받기 %s" % [
		r.slots[0]["dev"], r.slots[1]["dev"], m0, m1, m1b, m0b, st1["pressed"]["atk"], st0["pressed"]["rcv"]])


func _case4() -> void:
	var r = _router()
	r.handle_event(jbtn(0, JOY_BUTTON_A))
	r.handle_event(jbtn(0, JOY_BUTTON_A, false))
	r.consume_edges()
	r.accept_join = false
	r.handle_event(key(KEY_D, true, false, 0))
	r.handle_event(key(KEY_F, true, false, 0))
	r.handle_event(key(KEY_RIGHT, true, false, 0))
	var st0: Dictionary = r.get_state(0)
	var untouched: bool = st0["move"] == Vector2.ZERO and not st0["pressed"]["atk"] and not st0["held"]["atk"] and r.slots[0]["dev"] == "pad:0" and r.slots[1] == null
	for k in [KEY_D, KEY_F, KEY_RIGHT]:
		r.handle_event(key(k, false, false, 0))
	# 참가를 받는 중이면 키보드는 다른 칸(2P)으로 들어가고, 패드 0 칸은 그대로다
	r.accept_join = true
	r.handle_event(key(KEY_W, true, false, 0))
	var st0b: Dictionary = r.get_state(0)
	var st1b: Dictionary = r.get_state(1)
	var joined_other: bool = r.slots[1] != null and r.slots[1]["dev"] == "kb_left" and r.slots[0]["dev"] == "pad:0" and st0b["move"] == Vector2.ZERO and _near(st1b["move"].y, 1.0)
	# 반대로 패드 0 이벤트도 키보드 칸을 건드리지 않는다
	r.handle_event(key(KEY_W, false, false, 0))
	r.handle_event(key(KEY_D, false, false, 0))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_X, -1.0))
	var st1c: Dictionary = r.get_state(1)
	var reverse_ok: bool = st1c["move"] == Vector2.ZERO and _near(r.get_state(0)["move"].x, -1.0)
	_check("4 키보드 이벤트(번호 0)가 패드 0 칸을 건드리지 않음", untouched and joined_other and reverse_ok,
		"키 D·F·→ (device 0) 뒤 1P(패드0) 이동 %s 공격 %s · 참가 중 W→2P=%s · 패드0 스틱→키보드 칸 %s" % [
		st0["move"], st0["held"]["atk"], r.slots[1]["dev"] if r.slots[1] else "-", st1c["move"]])


func _case5() -> void:
	var r = _router()
	var notes: Array = []
	r.notice.connect(func(t, k): notes.append([t, k]))
	r.handle_event(jbtn(0, JOY_BUTTON_A))
	r.handle_event(jbtn(1, JOY_BUTTON_A))
	r.on_joy_connection_changed(0, false)
	var waiting: bool = r.slots[0] != null and not r.slots[0]["connected"]
	var msg_ok := false
	for n in notes:
		if n[1] == "disconnect" and String(n[0]).contains("연결 끊김 — 다시 연결하면 이어서"):
			msg_ok = true
	# 기다리는 동안 다른 패드는 그 칸을 빼앗지 못한다
	r.on_joy_connection_changed(2, true)
	r.handle_event(jbtn(2, JOY_BUTTON_A))
	var not_stolen: bool = r.slots[0]["guid"] == r.fake_joy[0]["guid"] and not r.slots[0]["connected"]
	# 같은 패드가 다른 번호(3)로 다시 연결된다
	r.fake_joy[3] = r.fake_joy[0].duplicate()
	r.on_joy_connection_changed(3, true)
	var back: bool = r.slots[0]["connected"] and r.slots[0]["pad"] == 3 and r.slots[0]["dev"] == "pad:3"
	r.handle_event(jaxis(3, JOY_AXIS_LEFT_X, 1.0))
	var moves: bool = _near(r.get_state(0)["move"].x, 1.0) and r.get_state(1)["move"] == Vector2.ZERO
	# 둘 다 끊긴 뒤 B가 먼저 0번으로 돌아와도 2P 칸으로 간다
	r.on_joy_connection_changed(3, false)
	r.on_joy_connection_changed(1, false)
	var b_guid: String = r.fake_joy[1]["guid"]
	var a_guid: String = r.fake_joy[0]["guid"]
	r.fake_joy[0] = {"name": "가짜 패드 B", "guid": b_guid}
	r.fake_joy[1] = {"name": "가짜 패드 A", "guid": a_guid}
	r.on_joy_connection_changed(0, true)
	r.on_joy_connection_changed(1, true)
	var swapped_ids_ok: bool = r.slots[1]["connected"] and r.slots[1]["pad"] == 0 and r.slots[0]["connected"] and r.slots[0]["pad"] == 1
	# 같은 모델 둘: 번호가 같으면 그 칸으로
	var r2 = _router(true)
	r2.handle_event(jbtn(0, JOY_BUTTON_A))
	r2.handle_event(jbtn(1, JOY_BUTTON_A))
	r2.on_joy_connection_changed(1, false)
	r2.on_joy_connection_changed(1, true)
	var same_model_ok: bool = r2.slots[1]["connected"] and r2.slots[1]["pad"] == 1 and r2.slots[0]["pad"] == 0 and r2.slots[0]["connected"]
	_check("5 패드가 끊겼다 다시 연결되면 같은 칸", waiting and msg_ok and not_stolen and back and moves and swapped_ids_ok and same_model_ok,
		"끊김 표시=%s 문구=%s · 다른 패드가 못 뺏음=%s · 같은 GUID가 3번으로 돌아옴=%s(이동 %s) · B가 먼저 0번으로 와도 2P=%s · 같은 모델 1번 복귀=%s" % [
		waiting, msg_ok, not_stolen, back, moves, swapped_ids_ok, same_model_ok])


func _case6() -> void:
	var r = _router()
	var rejects := []
	r.notice.connect(func(t, k):
		if k == "reject":
			rejects.append(t)
	)
	r.handle_event(jbtn(0, JOY_BUTTON_A))
	r.handle_event(key(KEY_F))
	var before: Array = [r.slots[0]["dev"], r.slots[1]["dev"]]
	var j1: int = r.try_join("pad:1")
	r.handle_event(jbtn(1, JOY_BUTTON_A))
	r.handle_event(key(KEY_UP))
	r.handle_event(jbtn(2, JOY_BUTTON_X))
	var after: Array = [r.slots[0]["dev"], r.slots[1]["dev"]]
	var ok: bool = j1 == -1 and before == after and rejects.size() >= 3 and r.slot_of("pad:1") == -1 and r.slot_of("kb_right") == -1
	_check("6 세 번째 장치는 참가하지 못함", ok, "칸 %s → %s · 거절 알림 %d번 (예: %s)" % [before, after, rejects.size(), rejects[0] if rejects.size() > 0 else "-"])


func _case7() -> void:
	var r = _router()
	r.handle_event(key(KEY_W))
	r.handle_event(key(KEY_D))
	var kb: float = r.get_state(0)["move"].length()
	r.handle_event(jbtn(0, JOY_BUTTON_A))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_X, 1.0))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_Y, -1.0))
	var stick: float = r.get_state(1)["move"].length()
	r.handle_event(jbtn(0, JOY_BUTTON_DPAD_UP))
	r.handle_event(jbtn(0, JOY_BUTTON_DPAD_RIGHT))
	var both: float = r.get_state(1)["move"].length()
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_X, 0.0))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_Y, 0.0))
	var dpad: float = r.get_state(1)["move"].length()
	r.handle_event(jbtn(0, JOY_BUTTON_DPAD_UP, false))
	r.handle_event(jbtn(0, JOY_BUTTON_DPAD_RIGHT, false))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_X, 0.15))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_Y, 0.1))
	var dz: float = r.get_state(1)["move"].length()
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_X, 0.6 * 0.70710678))
	r.handle_event(jaxis(0, JOY_AXIS_LEFT_Y, -0.6 * 0.70710678))
	var mid: float = r.get_state(1)["move"].length()
	var ok: bool = kb <= 1.0 + 1e-6 and stick <= 1.0 + 1e-6 and both <= 1.0 + 1e-6 and dpad <= 1.0 + 1e-6 and _near(kb, 1.0) and dz == 0.0 and _near(mid, 0.5, 1e-3)
	_check("7 대각선 이동 크기가 1을 넘지 않음", ok, "키보드 W+D %.4f · 스틱(1,1) %.4f · 스틱+십자키 %.4f · 십자키 대각 %.4f · 데드존 안(0.18) %.4f · 스틱 0.6 → %.4f" % [kb, stick, both, dpad, dz, mid])


func _case_extra() -> void:
	# 8 키 메아리 무시
	var r = _router()
	r.handle_event(key(KEY_F))
	r.consume_edges()
	r.handle_event(key(KEY_F, true, true))
	var echo_ignored: bool = not r.get_state(0)["pressed"]["atk"]
	_check("8 키 메아리(꾹 누름 반복)는 새 입력이 아님", echo_ignored, "메아리 뒤 공격 막 누름=%s" % (not echo_ignored))
	# 9 초점을 잃으면 눌린 키를 놓는다
	r.handle_event(key(KEY_D))
	var before: Vector2 = r.get_state(0)["move"]
	r.clear_held()
	var after: Vector2 = r.get_state(0)["move"]
	_check("9 창 초점을 잃으면 눌린 키를 모두 놓음", _near(before.x, 1.0) and after == Vector2.ZERO, "전 %s → 후 %s" % [before, after])
	# 10 나가기: Back 길게, Backspace
	var r2 = _router()
	r2.handle_event(jbtn(0, JOY_BUTTON_A))
	r2.handle_event(key(KEY_UP))
	r2.handle_event(jbtn(0, JOY_BUTTON_BACK))
	r2.update(0.5)
	var still: bool = r2.slots[0] != null
	r2.update(0.6)
	var left_pad: bool = r2.slots[0] == null
	r2.handle_event(key(KEY_BACKSPACE))
	var left_kb: bool = r2.slots[1] == null
	_check("10 나가기 (Back 1초 · Backspace)", still and left_pad and left_kb, "0.5초엔 남음=%s · 1.1초에 패드 나감=%s · Backspace로 키보드 나감=%s" % [still, left_pad, left_kb])
	# 11 자리 바꾸기
	var r3 = _router()
	r3.handle_event(jbtn(0, JOY_BUTTON_A))
	r3.handle_event(key(KEY_F))
	r3.swap()
	r3.handle_event(jaxis(0, JOY_AXIS_LEFT_X, 1.0))
	var sw_ok: bool = r3.slots[0]["dev"] == "kb_left" and r3.slots[1]["dev"] == "pad:0" and _near(r3.get_state(1)["move"].x, 1.0)
	_check("11 1P·2P 자리 바꾸기", sw_ok, "바꾼 뒤 칸=[%s, %s]" % [r3.slots[0]["dev"], r3.slots[1]["dev"]])
	# 12 트리거는 축 (RT = 받기)
	var r4 = _router()
	r4.handle_event(jbtn(0, JOY_BUTTON_A))
	r4.consume_edges()
	r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.8))
	var st: Dictionary = r4.get_state(0)
	var rt_ok: bool = st["held"]["rcv"] and st["pressed"]["rcv"] and _near(st["rt"], 0.8)
	r4.consume_edges()
	r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.2))
	r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_LEFT, 0.9))
	var st2: Dictionary = r4.get_state(0)
	var rel_ok: bool = not st2["held"]["rcv"] and _near(st2["lt"], 0.9) and not st2["held"]["tag"]
	_check("12 트리거는 축 (RT 0.8 = 받기, LT는 행동 없음)", rt_ok and rel_ok, "RT 0.8 → 받기 %s · RT 0.2 → %s · LT %.2f" % [st["held"]["rcv"], st2["held"]["rcv"], st2["lt"]])
	# 13 날 버튼 번호 표시
	r4.handle_event(jbtn(0, JOY_BUTTON_A, false))
	r4.handle_event(jbtn(0, JOY_BUTTON_RIGHT_SHOULDER))
	r4.handle_event(jbtn(0, JOY_BUTTON_X))
	var raw: Array = r4.get_state(0)["raw_buttons"]
	_check("13 누른 버튼 번호를 그대로 보여 줌", raw == [JOY_BUTTON_X, JOY_BUTTON_RIGHT_SHOULDER], "번호 %s (X=%d, RB=%d)" % [raw, JOY_BUTTON_X, JOY_BUTTON_RIGHT_SHOULDER])
	# 14 참가를 받지 않는 화면에서는 아무도 참가하지 않는다
	var r5 = _router()
	r5.accept_join = false
	r5.handle_event(jbtn(0, JOY_BUTTON_A))
	r5.handle_event(key(KEY_F))
	_check("14 타이틀 등에서는 참가하지 않음", r5.slots[0] == null and r5.slots[1] == null, "칸=%s" % [r5.slots])


## 16~21: 길게 누르기 · 거절 알림 · 트리거 흔들림 · 끊긴 칸 비우기 · 십자키 위아래 · 한 패드 두 번 잡힘 안내
func _case_holds() -> void:
	# 16 L3 · Tab: 짧게 누르면 안 바뀌고, 길게 누르면 한 번만 바뀐다
	var r = _router()
	var swaps := [0]
	r.notice.connect(func(t, k):
		if k == "swap":
			swaps[0] += 1
	)
	r.handle_event(jbtn(0, JOY_BUTTON_A))
	r.handle_event(jbtn(1, JOY_BUTTON_A))
	r.handle_event(jbtn(0, JOY_BUTTON_LEFT_STICK))
	r.update(0.1)
	r.handle_event(jbtn(0, JOY_BUTTON_LEFT_STICK, false))
	r.update(0.1)
	var tap_none: bool = swaps[0] == 0 and r.slots[0]["dev"] == "pad:0"
	r.handle_event(jbtn(0, JOY_BUTTON_LEFT_STICK))
	for i in 13:
		r.update(0.1)   # 1.3초
	var hold_once: bool = swaps[0] == 1 and r.slots[1]["dev"] == "pad:0"
	r.handle_event(jbtn(0, JOY_BUTTON_LEFT_STICK, false))
	r.update(0.1)
	r.handle_event(key(KEY_TAB))
	r.update(0.2)
	r.handle_event(key(KEY_TAB, false))
	r.update(0.1)
	var tab_tap_none: bool = swaps[0] == 1
	r.handle_event(key(KEY_TAB))
	for i in 10:
		r.update(0.1)
	r.handle_event(key(KEY_TAB, false))
	var tab_hold_once: bool = swaps[0] == 2 and r.slots[0]["dev"] == "pad:0"
	_check("16 자리 바꾸기는 길게 (L3 · Tab 짧게 = 그대로, 길게 = 한 번)", tap_none and hold_once and tab_tap_none and tab_hold_once,
		"L3 0.1초 → 바뀜 %d번 · L3 1.3초 → %s · Tab 0.2초 → 그대로=%s · Tab 1초 → 바뀜 모두 %d번" % [0 if tap_none else swaps[0], hold_once, tab_tap_none, swaps[0]])
	# 17 자리가 다 찼을 때 세 번째 장치의 거절 알림은 몰아서 한 번 + 쉬는 값이 -1인 트리거로 저절로 참가하지 않음
	var r2 = _router()
	var rejects := [0]
	r2.notice.connect(func(t, k):
		if k == "reject":
			rejects[0] += 1
	)
	r2.handle_event(jbtn(0, JOY_BUTTON_A))
	r2.handle_event(key(KEY_F))
	for i in 30:
		r2.handle_event(jaxis(2, JOY_AXIS_LEFT_X, 0.6 + 0.013 * i))
	r2.handle_event(jaxis(2, JOY_AXIS_LEFT_X, 0.0))
	for i in 5:
		r2.handle_event(key(KEY_UP))
		r2.handle_event(key(KEY_UP, false))
	var flood_ok: bool = rejects[0] == 2   # 패드 2 한 번 + 키보드 오른쪽 한 번
	var r3 = _router()
	r3.fake_joy[4] = {"name": "", "guid": ""}
	r3.handle_event(jaxis(4, JOY_AXIS_TRIGGER_LEFT, -1.0))
	r3.handle_event(jaxis(4, JOY_AXIS_TRIGGER_RIGHT, -1.0))
	var rest_ok: bool = r3.slot_of("pad:4") == -1
	r3.handle_event(jaxis(4, JOY_AXIS_TRIGGER_RIGHT, 0.9))
	var pull_ok: bool = r3.slot_of("pad:4") == 0
	_check("17 거절 알림 몰아서 · 트리거 쉬는 값 -1로 참가 안 함", flood_ok and rest_ok and pull_ok,
		"스틱 30번 + 키 5번 → 거절 알림 %d번 · 트리거 -1 → 칸 %d · RT 당김 → 칸 %d" % [rejects[0], -1 if rest_ok else 0, r3.slot_of("pad:4")])
	# 18 RT 문턱 근처 흔들림은 받기 한 번
	var r4 = _router()
	var rcv := [0]
	r4.action.connect(func(slot, act):
		if act == "rcv":
			rcv[0] += 1
	)
	r4.handle_event(jbtn(0, JOY_BUTTON_A))
	for i in 10:
		r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.505))
		r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.495))
	var wobble_ok: bool = rcv[0] == 1 and r4.get_state(0)["held"]["rcv"]
	r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.1))
	r4.handle_event(jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.9))
	var again_ok: bool = rcv[0] == 2
	_check("18 RT 0.5 근처 흔들림 = 받기 한 번", wobble_ok and again_ok, "0.495↔0.505 열 번 → 받기 %d번 · 놓았다 다시 당김 → 모두 %d번" % [1 if wobble_ok else rcv[0], rcv[0]])
	# 19 끊긴 채 기다리는 패드 칸은 Backspace로 비울 수 있다 (키보드 칸이 없을 때)
	var r5 = _router()
	r5.handle_event(jbtn(0, JOY_BUTTON_A))
	r5.handle_event(jbtn(1, JOY_BUTTON_A))
	r5.on_joy_connection_changed(0, false)
	r5.handle_event(key(KEY_BACKSPACE))
	var freed: bool = r5.slots[0] == null and r5.slots[1] != null and r5.slots[1]["dev"] == "pad:1"
	r5.handle_event(jbtn(2, JOY_BUTTON_A))
	var new_in: bool = r5.slot_of("pad:2") == 0
	_check("19 끊긴 패드 칸을 Backspace로 비우고 새 패드를 받음", freed and new_in, "비움=%s · 새 패드 2 → 1P=%s" % [freed, new_in])
	# 20 자유롭게 보기(십자키 좌우 = 품질)에서도 십자키 위아래는 움직인다
	var r6 = _router()
	r6.dpad_moves = false
	r6.handle_event(jbtn(0, JOY_BUTTON_A))
	r6.handle_event(jbtn(0, JOY_BUTTON_DPAD_UP))
	var up: Vector2 = r6.get_state(0)["move"]
	r6.handle_event(jbtn(0, JOY_BUTTON_DPAD_UP, false))
	r6.handle_event(jbtn(0, JOY_BUTTON_DPAD_RIGHT))
	var right: Vector2 = r6.get_state(0)["move"]
	_check("20 자유롭게 보기에서 십자키 위아래 이동", _near(up.y, 1.0) and right == Vector2.ZERO, "위 %s · 오른쪽(품질 키) %s" % [up, right])
	# 21 같은 버튼으로 거의 동시에 두 패드가 들어오면 안내 (DS4Windows · Steam 이중 장치)
	var r7 = _router()
	var warns := [0]
	r7.notice.connect(func(t, k):
		if k == "warn":
			warns[0] += 1
	)
	r7.handle_event(jbtn(0, JOY_BUTTON_A))
	r7.handle_event(jbtn(1, JOY_BUTTON_A))
	var both_in: bool = r7.slots[0] != null and r7.slots[1] != null
	var r8 = _router()
	var warns2 := [0]
	r8.notice.connect(func(t, k):
		if k == "warn":
			warns2[0] += 1
	)
	r8.handle_event(jbtn(0, JOY_BUTTON_A))
	r8.handle_event(jbtn(1, JOY_BUTTON_X))
	_check("21 한 패드가 두 번 잡힌 듯하면 안내만 (막지 않음)", both_in and warns[0] == 1 and warns2[0] == 0,
		"같은 버튼 동시 → 안내 %d번 (두 칸 다 참 %s) · 다른 버튼 → 안내 %d번" % [warns[0], both_in, warns2[0]])


## 15 실제 경로: Input.parse_input_event → main._input → 라우터 (두 명 입력 화면)
func _case_integration() -> void:
	main.show_input()
	main.router.clear_all()
	main.router.fake_joy[0] = {"name": "가짜 패드 (실제 경로 시험)", "guid": "03000000feed0000beef000000000000"}
	Input.parse_input_event(jbtn(0, JOY_BUTTON_X))
	Input.parse_input_event(jbtn(0, JOY_BUTTON_X, false))
	Input.parse_input_event(key(KEY_F))
	Input.parse_input_event(key(KEY_F, false))
	Input.flush_buffered_events()
	await _frames(2)
	var s: Array = main.router.slots
	var ok: bool = s[0] != null and s[0]["dev"] == "pad:0" and s[1] != null and s[1]["dev"] == "kb_left"
	Input.parse_input_event(jbtn(5, JOY_BUTTON_A))
	Input.flush_buffered_events()
	await _frames(1)
	var still: bool = main.router.slot_of("pad:5") == -1
	_check("15 실제 이벤트 경로 (Input.parse_input_event → main → 라우터)", ok and still, "칸=[%s, %s] · 세 번째(패드5) 거절=%s" % [
		s[0]["dev"] if s[0] else "-", s[1]["dev"] if s[1] else "-", still])
	main.router.clear_all()
	main.show_title()


## 22 다른 화면에서 놓은 키·버튼이 눌린 채 남지 않음 (실제 경로, 화면을 오가며)
func _case_resync() -> void:
	var R = main.router
	main.show_input()
	R.clear_all()
	R.fake_joy[0] = {"name": "가짜 패드 (화면 오가기)", "guid": "03000000feed0000beef000000000001"}
	for ev in [jbtn(0, JOY_BUTTON_A), jbtn(0, JOY_BUTTON_A, false), key(KEY_D)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	await _frames(1)
	for ev in [jaxis(0, JOY_AXIS_LEFT_Y, -1.0), jbtn(0, JOY_BUTTON_RIGHT_SHOULDER), jbtn(0, JOY_BUTTON_BACK)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	await _frames(2)
	var joined: bool = R.slots[0] != null and R.slots[1] != null and _near(R.get_state(1)["move"].x, 1.0) and _near(R.get_state(0)["move"].y, 1.0)
	# Start로 타이틀 → 타이틀에서 모두 놓는다. Back을 쥔 채 타이틀에 있어도 칸이 저절로 나가지 않는다
	Input.parse_input_event(jbtn(0, JOY_BUTTON_START))
	Input.parse_input_event(jbtn(0, JOY_BUTTON_START, false))
	Input.flush_buffered_events()
	await _frames(1)
	var on_title: bool = main.screen == main.Scr.TITLE
	await get_tree().create_timer(1.3).timeout
	var kept: bool = R.slots[0] != null
	for ev in [key(KEY_D, false), jaxis(0, JOY_AXIS_LEFT_Y, 0.0), jbtn(0, JOY_BUTTON_RIGHT_SHOULDER, false), jbtn(0, JOY_BUTTON_BACK, false)]:
		Input.parse_input_event(ev)
	# 타이틀에서 스틱을 밀고 그대로 쥔 채 들어간다
	Input.parse_input_event(jaxis(0, JOY_AXIS_LEFT_X, 0.9))
	Input.flush_buffered_events()
	await _frames(1)
	main.show_free()
	await _frames(1)
	var st0: Dictionary = R.get_state(0)
	var st1: Dictionary = R.get_state(1)
	var released: bool = st1["move"] == Vector2.ZERO and not st0["held"]["rcv"] and _near(st0["move"].y, 0.0)
	var picked: bool = _near(st0["move"].x, 0.875, 1e-3)
	Input.parse_input_event(jaxis(0, JOY_AXIS_LEFT_X, 0.0))
	Input.flush_buffered_events()
	await _frames(1)
	_check("22 다른 화면에서 놓은 키·버튼이 남지 않음 (Start→타이틀→다시)", joined and on_title and kept and released and picked,
		"참가·이동=%s · 타이틀=%s · 타이틀에서 Back 1.3초 쥐어도 칸 남음=%s · 돌아와서 D·받기 놓임=%s (2P %s, 1P 받기 %s) · 쥔 스틱 읽음 %s" % [
		joined, on_title, kept, released, st1["move"], st0["held"]["rcv"], st0["move"]])
	R.clear_all()
	main.show_title()


# ───────────── 성능 측정 빠른 실행 ─────────────

func _run_bench_quick() -> void:
	main.sfx.muted = true
	main.start_bench(true)
	var t0 := Time.get_ticks_msec()
	while main.screen != main.Scr.RESULTS:
		await get_tree().process_frame
		if Time.get_ticks_msec() - t0 > 600000:
			print("BENCH-QUICK FAIL timeout")
			_finish(1)
			return
	var path: String = main.result_path
	var ok := path != "" and FileAccess.file_exists(path)
	var text := FileAccess.get_file_as_string(path) if ok else ""
	var missing := []
	for k in ["hap_test_version=", "godot=", "os=", "cpu=", "gpu=", "driver=", "resolution=", "refresh_hz=",
			"low.avg_fps=", "mid.avg_fps=", "high.avg_fps=", "max.avg_fps=", "max.p1_low_fps=", "max.hitches_first_5s=", "recommended="]:
		if not text.contains(k):
			missing.append(k)
	ok = ok and missing.is_empty()
	print("BENCH-QUICK %s path=%s missing=%s" % ["PASS" if ok else "FAIL", path, missing])
	main.copy_results()
	_finish(0 if ok else 1)


# ───────────── 스크린샷 ─────────────

func _capture(dir: String, name: String) -> void:
	await RenderingServer.frame_post_draw
	var img: Image = main.get_viewport().get_texture().get_image()
	var p := dir.path_join(name + ".png")
	img.save_png(p)
	print("SHOT %s %dx%d" % [p, img.get_width(), img.get_height()])


func _run_shots(dir: String) -> void:
	DirAccess.make_dir_recursive_absolute(dir)
	main.sfx.muted = true
	await _frames(4)
	main.show_title()
	await _frames(3)
	await _capture(dir, "01_title")
	# 측정 중 (빠른 측정을 실제로 돌리며 낮음 · 최고에서 찍는다)
	main.start_bench(true)
	await _frames(3)
	await _capture(dir, "02_bench_low")
	while main.screen == main.Scr.BENCH and main.bench.current_preset() != 3:
		await get_tree().process_frame
	if main.screen == main.Scr.BENCH:
		await _capture(dir, "03_bench_max")   # '최고'로 바꾼 바로 그 프레임 (빠른 측정은 몇 프레임이면 끝난다)
	while main.screen == main.Scr.BENCH:
		await get_tree().process_frame
	await _frames(2)
	await _capture(dir, "04_results")
	# 두 명 입력: 가짜 장치 둘 (패드 0 + 키보드 왼쪽)
	main.show_input()
	main.router.fake_joy[0] = {"name": "Xbox Wireless Controller (가짜 입력)", "guid": "030000005e040000e002000000007200"}
	for ev in [jbtn(0, JOY_BUTTON_A), jbtn(0, JOY_BUTTON_A, false), key(KEY_F), key(KEY_F, false)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	await _frames(1)
	for ev in [jaxis(0, JOY_AXIS_LEFT_X, 0.62), jaxis(0, JOY_AXIS_LEFT_Y, -0.55), jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.73),
			jaxis(0, JOY_AXIS_RIGHT_X, -0.3), jbtn(0, JOY_BUTTON_X), jbtn(0, JOY_BUTTON_RIGHT_SHOULDER), key(KEY_D), key(KEY_W), key(KEY_G)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	await _frames(8)
	await _capture(dir, "05_input_two_players")
	for ev in [jbtn(0, JOY_BUTTON_X, false), jbtn(0, JOY_BUTTON_RIGHT_SHOULDER, false), key(KEY_D, false), key(KEY_W, false), key(KEY_G, false),
			jaxis(0, JOY_AXIS_LEFT_X, 0.0), jaxis(0, JOY_AXIS_LEFT_Y, 0.0), jaxis(0, JOY_AXIS_TRIGGER_RIGHT, 0.0), jaxis(0, JOY_AXIS_RIGHT_X, 0.0)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	# 끊김 표시
	main.router.on_joy_connection_changed(0, false)
	await _frames(2)
	await _capture(dir, "06_input_disconnected")
	main.router.on_joy_connection_changed(0, true)
	# 자유롭게 보기 + 터짐
	main.show_free()
	main.set_quality(3, false)
	await _frames(2)
	main.fx.burst(main.boss.impact_point(), main.C_BOSS, 1.2)
	await _frames(4)
	await _capture(dir, "07_free_view")
	print("SHOTS DONE %s" % dir)
	_finish(0)


# ───────────── 섬광 ─────────────

static func mean_luma(img: Image) -> float:
	var small := img.duplicate() as Image
	small.convert(Image.FORMAT_RGB8)
	small.resize(160, 90, Image.INTERPOLATE_BILINEAR)
	var sum := 0.0
	for y in small.get_height():
		for x in small.get_width():
			var c := small.get_pixel(x, y)
			sum += 0.299 * c.r + 0.587 * c.g + 0.114 * c.b
	return sum / (small.get_width() * small.get_height()) * 255.0


## 고정 60fps 연속 프레임의 화면 평균 휘도. 같은 씨앗·같은 프레임 수라 실행마다 화면이 같다.
## --flash-variant=nolight 로 섬광 조명만 끈 장면을 따로 찍으면, 두 결과의 차이가 섬광 성분이다 (qa_check.py flash).
func _run_flash(dir: String) -> void:
	DirAccess.make_dir_recursive_absolute(dir)
	var preset := 2
	if main.args.has("preset"):
		preset = main._preset_arg(main.args["preset"])
	var variant: String = main.args.get("flash-variant", "light")
	main.sfx.muted = true
	main.scripted = true
	main.ui.visible = false
	main.screen = main.Scr.FREE
	main.ui.show_screen("free")
	main.game_camera()
	main.reset_positions()
	main.set_quality(preset, false)
	main.boss.idle_pose(0.0)
	main.fx.flash_enabled = variant != "nolight"
	print("FLASH preset=%s variant=%s (--fixed-fps 60 과 함께)" % [Quality.NAMES[preset], variant])
	await _frames(6)
	var pre := []
	for i in 4:
		await RenderingServer.frame_post_draw
		var img: Image = main.get_viewport().get_texture().get_image()
		pre.append(mean_luma(img))
		img.save_png(dir.path_join("flash_pre%d.png" % i))
	var base := 0.0
	for l in pre:
		base += l
	base /= pre.size()
	await get_tree().process_frame
	main.fx.burst(main.boss.impact_point(), main.C_BOSS, 1.2)
	var after := []
	for k in 16:
		await RenderingServer.frame_post_draw
		var img: Image = main.get_viewport().get_texture().get_image()
		var l := mean_luma(img)
		after.append([k, k / 60.0, l, main.fx.any_flash_lit()])
		img.save_png(dir.path_join("flash_%02d.png" % k))
		await get_tree().process_frame
	var csv := PackedStringArray(["frame,t_seconds,mean_luma,excess,flash_light_on"])
	for i in pre.size():
		csv.append("pre%d,,%.3f,%.3f," % [i, pre[i], pre[i] - base])
	var peak := base
	var off_at := -1.0
	for a in after:
		peak = maxf(peak, a[2])
		csv.append("%d,%.4f,%.3f,%.3f,%s" % [a[0], a[1], a[2], a[2] - base, a[3]])
		print("FLASH frame=%02d t=%.4f luma=%.3f excess=%+.3f light_on=%s" % [a[0], a[1], a[2], a[2] - base, a[3]])
		if off_at < 0.0 and not a[3]:
			off_at = a[1]
	var f := FileAccess.open(dir.path_join("flash_luma.csv"), FileAccess.WRITE)
	if f:
		f.store_string("\n".join(csv) + "\n")
		f.close()
	print("FLASH base=%.3f peak=%.3f peak_excess=%.3f light_off_at=%.4fs (섬광 조명 %.2f초에 0)" % [base, peak, peak - base, off_at, main.fx.FLASH_TIME])
	var ok: bool = after.size() == 16 and (variant == "nolight" or (off_at >= 0.0 and off_at <= 0.1 + 1e-6))
	print("FLASH-RUN %s" % ("OK" if ok else "FAIL"))
	_finish(0 if ok else 1)


# ───────────── 모든 화면 한 번씩 ─────────────

func _run_smoke() -> void:
	main.sfx.muted = false
	await _frames(3)
	print("SMOKE title")
	main._on_ui_pressed("input")
	main.router.fake_joy[0] = {"name": "가짜 패드", "guid": "03000000aaaa"}
	for ev in [jbtn(0, JOY_BUTTON_A), jbtn(0, JOY_BUTTON_A, false), key(KEY_UP), key(KEY_UP, false), jaxis(0, JOY_AXIS_LEFT_X, 0.8),
			jbtn(0, JOY_BUTTON_X), key(KEY_K), key(KEY_LEFT), jbtn(1, JOY_BUTTON_A)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	await _frames(5)
	main._on_ui_pressed("vib0")
	main._on_ui_pressed("vib1")
	main._on_ui_pressed("swap")
	main.router.on_joy_connection_changed(0, false)
	await _frames(2)
	main.router.on_joy_connection_changed(0, true)
	main._on_ui_pressed("clear1")
	await _frames(2)
	print("SMOKE input")
	main._on_ui_pressed("to_title")
	main._on_ui_pressed("free")
	for i in 4:
		main.set_quality(i)
		await _frames(2)
	for ev in [jbtn(0, JOY_BUTTON_X), jbtn(0, JOY_BUTTON_X, false), key(KEY_F), key(KEY_F, false)]:
		Input.parse_input_event(ev)
	Input.flush_buffered_events()
	await _frames(40)
	print("SMOKE free")
	main.bench_quick = true
	main.args["bench-seconds"] = "0.3"
	main.args["bench-warmup"] = "0.1"
	main.args["result-file"] = OS.get_user_data_dir().path_join("smoke_result.txt")
	main.start_bench(true)
	while main.screen == main.Scr.BENCH:
		await get_tree().process_frame
	print("SMOKE bench -> %s" % main.result_path)
	main._on_ui_pressed("copy")
	main.ui.menu_move("results", 1)
	main._on_ui_pressed("to_title")
	main.go_back()
	await _frames(2)
	main._on_ui_pressed("quit_no")
	main.toggle_fullscreen()
	await _frames(2)
	print("SMOKE DONE")
	_finish(0)


# ───────────── 한 장 ─────────────

func _run_snap(path: String, which: String) -> void:
	main.sfx.muted = true
	match which:
		"input":
			main.show_input()
		"free", "game":
			main.show_free()
			if which == "game":
				main.ui.visible = false
		_:
			main.show_title()
	await _frames(int(main.args.get("snap-frames", "4")))
	if which == "free":
		main.fx.burst(main.boss.impact_point(), main.C_BOSS, 1.2)
		await _frames(2)
	await RenderingServer.frame_post_draw
	var img: Image = main.get_viewport().get_texture().get_image()
	img.save_png(path)
	print("SNAP %s %dx%d" % [path, img.get_width(), img.get_height()])
	_finish(0)
