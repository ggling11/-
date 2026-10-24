## 입력 라우터: 장치 -> 칸(1P/2P) 배정을 혼자 맡는다.
##
## 장치 = (종류, 번호). 키보드 이벤트와 0번 패드 이벤트는 번호(device)가 둘 다 0일 수 있으므로
## 반드시 이벤트 종류(InputEventKey / InputEventJoypad*)로 먼저 가른다.
## 키보드는 두 장치("kb_left", "kb_right")로 나눈다 (프로토타입 키 배치 그대로).
## 패드는 "pad:<번호>". 연결이 끊긴 칸은 비우지 않고 기다리며, 같은 패드(GUID)가 다시 연결되면 같은 칸으로 돌아온다.
extends RefCounted

signal slots_changed
signal notice(text: String, kind: String)   # kind: join / leave / reject / disconnect / reconnect / swap
signal action(slot: int, act: String)        # 공격·받기·회피·태그를 막 눌렀을 때 (메아리 제외)

const SLOT_COUNT := 2
const DEADZONE := 0.2            # 원형 데드존
const JOIN_AXIS := 0.6           # 축으로 참가할 때 넘어야 하는 값 (흔들림으로 참가하지 않게)
const TRIGGER_PRESS := 0.5       # 트리거(축)를 버튼처럼 볼 때의 문턱
const TRIGGER_RELEASE := 0.35    # 트리거를 '놓았다'고 볼 문턱 (0.5 근처 흔들림으로 받기가 여러 번 나가지 않게)
const LEAVE_HOLD := 1.0          # Back/Select 길게 = 나가기 (초)
const SWAP_HOLD := 0.6           # Tab · 패드 L3 길게 = 1P·2P 자리 바꾸기 (초). 스틱을 세게 밀다 L3가 눌려도 바뀌지 않게
const REJECT_COOLDOWN := 1.5     # 같은 장치의 '자리가 다 찼습니다' 알림 간격 (초)
const DOUBLE_PAD_MS := 50        # 서로 다른 두 패드가 같은 버튼으로 이만큼 안에 들어오면 '한 패드가 두 번 잡혔나?' 안내
const ACTIONS := ["atk", "rcv", "dodge", "tag"]
const ACTION_NAMES := {"atk": "공격", "rcv": "받기", "dodge": "회피", "tag": "태그"}

## 키보드 두 구역. 물리 키 코드 기준 (자판 배열·한/영 상태와 무관).
const KB_ZONES := {
	"kb_left": {
		"label": "키보드 왼쪽",
		"hint": "WASD 이동 · F 공격 · G 받기 · Space 회피 · Q 태그",
		"up": [KEY_W], "down": [KEY_S], "left": [KEY_A], "right": [KEY_D],
		"atk": [KEY_F], "rcv": [KEY_G], "dodge": [KEY_SPACE], "tag": [KEY_Q],
	},
	"kb_right": {
		"label": "키보드 오른쪽",
		"hint": "방향키 이동 · K/숫자패드1 공격 · L/숫자패드2 받기 · J/숫자패드0 회피 · I/숫자패드3 태그",
		"up": [KEY_UP], "down": [KEY_DOWN], "left": [KEY_LEFT], "right": [KEY_RIGHT],
		"atk": [KEY_K, KEY_KP_1], "rcv": [KEY_L, KEY_KP_2], "dodge": [KEY_J, KEY_KP_0], "tag": [KEY_I, KEY_KP_3],
	},
}

## 패드 버튼 (Godot/SDL 배치: A=0 아래, B=1 오른쪽, X=2 왼쪽, Y=3 위). 트리거는 축이라 따로 본다.
const PAD_BUTTONS := {
	"atk": [JOY_BUTTON_X],
	"rcv": [JOY_BUTTON_B, JOY_BUTTON_RIGHT_SHOULDER],
	"dodge": [JOY_BUTTON_A],
	"tag": [JOY_BUTTON_Y, JOY_BUTTON_LEFT_SHOULDER],
}
## 참가 버튼으로 치지 않는 패드 버튼 (Start = 타이틀로, Back = 나가기, Guide = 시스템)
const PAD_NO_JOIN := [JOY_BUTTON_START, JOY_BUTTON_BACK, JOY_BUTTON_GUIDE]

var slots: Array = []               # 칸마다 Dictionary 또는 null
var accept_join := false            # 참가를 받는 화면에서만 true
var dpad_moves := true              # 자유롭게 보기에서는 십자키 좌우가 품질 전환이라 false
var kb_held := {"kb_left": {}, "kb_right": {}}   # 구역 -> {물리키: true}
var pads := {}                      # 패드 번호 -> {buttons:{}, axes:[], connected:bool}
var fake_joy := {}                  # 시험용: 패드 번호 -> {name, guid} (진짜 Input 대신)
var _key_zone := {}                 # 물리키 -> [구역, 역할]
var _edges := {}                    # 장치 키 -> {act: true} (이번 프레임에 막 누름)
var _join_seq := 0
var last_reject := ""
var _reject_t := {}                 # 장치 키 -> 마지막 거절 알림 시각 (ms)
var _tab_held := false              # Tab (자리 바꾸기, 길게)
var _tab_t := 0.0
var _last_pad_join_ms := -100000
var _last_pad_join_dev := ""
var _last_pad_join_cause := ""
var _cause := ""                    # 지금 처리 중인 참가 원인 ("b0" 버튼 0, "a1" 축 1 ...)


func _init() -> void:
	slots.resize(SLOT_COUNT)
	for zone in KB_ZONES:
		var z: Dictionary = KB_ZONES[zone]
		for role in ["up", "down", "left", "right"] + ACTIONS:
			for k in z[role]:
				_key_zone[k] = [zone, role]


# ───────────── 장치 정보 ─────────────

func joy_name(id: int) -> String:
	if fake_joy.has(id):
		return fake_joy[id].get("name", "")
	return Input.get_joy_name(id)


func joy_guid(id: int) -> String:
	if fake_joy.has(id):
		return fake_joy[id].get("guid", "")
	return Input.get_joy_guid(id)


func joy_info(id: int) -> Dictionary:
	if fake_joy.has(id):
		return fake_joy[id].get("info", {})
	return Input.get_joy_info(id)


## 같은 모델 패드는 GUID가 같다. joy_info에 일련번호가 있으면 그것까지 묶어 고유값으로 쓴다.
func joy_unit_key(id: int) -> String:
	var info := joy_info(id)
	var serial := ""
	for k in ["serial_number", "serial"]:
		if info.has(k) and str(info[k]) != "":
			serial = str(info[k])
	return joy_guid(id) + ("#" + serial if serial != "" else "")


static func pad_key(id: int) -> String:
	return "pad:%d" % id


func _pad(id: int) -> Dictionary:
	if not pads.has(id):
		var axes: Array = []
		axes.resize(10)
		axes.fill(0.0)
		pads[id] = {"buttons": {}, "axes": axes, "connected": true, "rt_down": false}
	return pads[id]


# ───────────── 이벤트 ─────────────

## 게임 입력이면 true. Esc/F1 같은 앱 키는 여기 오기 전에 main이 처리한다.
func handle_event(ev: InputEvent) -> bool:
	if ev is InputEventKey:
		return _on_key(ev)
	if ev is InputEventJoypadButton:
		return _on_pad_button(ev)
	if ev is InputEventJoypadMotion:
		return _on_pad_motion(ev)
	return false


func _on_key(ev: InputEventKey) -> bool:
	if ev.echo:
		return false   # 키 메아리(꾹 누름 반복)는 무시
	var code: int = ev.physical_keycode if ev.physical_keycode != KEY_NONE else ev.keycode
	if code == KEY_TAB:
		_tab_held = ev.pressed   # 길게 누르면 update()에서 자리를 바꾼다
		if not ev.pressed:
			_tab_t = 0.0
		return true
	if not _key_zone.has(code):
		if ev.pressed and code == KEY_BACKSPACE:
			leave_keyboard()
			return true
		return false
	var zone: String = _key_zone[code][0]
	var role: String = _key_zone[code][1]
	if ev.pressed:
		kb_held[zone][code] = true
		if role in ACTIONS:
			_mark_edge(zone, role)
		_maybe_join(zone)
	else:
		kb_held[zone].erase(code)
	return true


func _on_pad_button(ev: InputEventJoypadButton) -> bool:
	var p := _pad(ev.device)
	p["connected"] = true
	p["buttons"][ev.button_index] = ev.pressed
	if not ev.pressed:
		return true
	var dev := pad_key(ev.device)
	for act in ACTIONS:
		if ev.button_index in PAD_BUTTONS[act]:
			_mark_edge(dev, act)
	if not (ev.button_index in PAD_NO_JOIN):
		_cause = "b%d" % ev.button_index
		_maybe_join(dev)
		_cause = ""
	return true


func _on_pad_motion(ev: InputEventJoypadMotion) -> bool:
	var p := _pad(ev.device)
	p["connected"] = true
	var axes: Array = p["axes"]
	if ev.axis < 0 or ev.axis >= axes.size():
		return true
	var before: float = axes[ev.axis]
	axes[ev.axis] = ev.axis_value
	var dev := pad_key(ev.device)
	if ev.axis == JOY_AXIS_TRIGGER_RIGHT:
		# RT = 받기. 0.5를 넘는 순간 한 번, 0.35 아래로 내려가야 다시 걸린다 (문턱 근처 흔들림 무시)
		if not p["rt_down"] and ev.axis_value >= TRIGGER_PRESS:
			p["rt_down"] = true
			_mark_edge(dev, "rcv")
		elif p["rt_down"] and ev.axis_value < TRIGGER_RELEASE:
			p["rt_down"] = false
	if ev.axis <= JOY_AXIS_TRIGGER_RIGHT:
		# 축으로 참가: 문턱을 '넘는 순간'만 본다 (계속 밀고 있는 동안 매 이벤트마다 시도하지 않게).
		# 트리거는 양(+)으로 당길 때만 친다 — 쉬는 값이 -1인 이상한 장치가 저절로 참가하지 않게.
		var is_trig: bool = ev.axis == JOY_AXIS_TRIGGER_LEFT or ev.axis == JOY_AXIS_TRIGGER_RIGHT
		var was: float = before if is_trig else absf(before)
		var now: float = ev.axis_value if is_trig else absf(ev.axis_value)
		if was < JOIN_AXIS and now >= JOIN_AXIS:
			_cause = "a%d" % ev.axis
			_maybe_join(dev)
			_cause = ""
	return true


func _mark_edge(dev: String, act: String) -> void:
	if not _edges.has(dev):
		_edges[dev] = {}
	_edges[dev][act] = true
	var s := slot_of(dev)
	if s >= 0 and slots[s]["connected"]:
		action.emit(s, act)


# ───────────── 참가 · 나가기 · 자리 바꾸기 ─────────────

func slot_of(dev: String) -> int:
	for i in SLOT_COUNT:
		if slots[i] != null and slots[i]["dev"] == dev:
			return i
	return -1


func device_label(dev: String) -> String:
	if KB_ZONES.has(dev):
		return KB_ZONES[dev]["label"]
	if dev.begins_with("wait:"):
		return "연결을 기다리는 패드"
	var id := int(dev.get_slice(":", 1))
	var n := joy_name(id)
	return "게임패드 #%d%s" % [id, (" · " + n) if n != "" else ""]


func _maybe_join(dev: String) -> int:
	if not accept_join:
		return -1
	return try_join(dev)


## 참가. 이미 있는 장치면 그 칸, 빈 칸이 없으면 -1 (세 번째 장치는 참가하지 못한다).
func try_join(dev: String) -> int:
	var cur := slot_of(dev)
	if cur >= 0:
		return cur
	var free := -1
	for i in SLOT_COUNT:
		if slots[i] == null:
			free = i
			break
	if free < 0:
		last_reject = dev
		var now_ms := Time.get_ticks_msec()
		if now_ms - int(_reject_t.get(dev, -100000)) >= int(REJECT_COOLDOWN * 1000.0):
			_reject_t[dev] = now_ms
			notice.emit("자리가 다 찼습니다 — 세 번째 장치는 참가할 수 없습니다 (%s)" % device_label(dev), "reject")
		return -1
	var kind := "keyboard" if KB_ZONES.has(dev) else "pad"
	var info := {
		"dev": dev, "kind": kind, "pad": -1, "guid": "", "unit": "", "name": "",
		"connected": true, "seq": _join_seq, "leave_t": 0.0,
	}
	_join_seq += 1
	if kind == "pad":
		var id := int(dev.get_slice(":", 1))
		info["pad"] = id
		info["guid"] = joy_guid(id)
		info["unit"] = joy_unit_key(id)
		info["name"] = joy_name(id)
	else:
		info["name"] = KB_ZONES[dev]["label"]
	slots[free] = info
	notice.emit("%dP 참가: %s" % [free + 1, device_label(dev)], "join")
	if kind == "pad":
		# DS4Windows · Steam 처럼 패드 하나가 장치 두 개로 잡히면, 한 번 누름으로 두 칸이 찬다 → 안내만 한다 (막지는 않는다)
		var now_ms := Time.get_ticks_msec()
		if _cause != "" and _cause == _last_pad_join_cause and _last_pad_join_dev != dev \
				and now_ms - _last_pad_join_ms <= DOUBLE_PAD_MS and slot_of(_last_pad_join_dev) >= 0:
			notice.emit("두 패드가 같은 버튼으로 동시에 들어왔습니다\n한 번만 눌렀다면 한 패드가 두 번 잡힌 것입니다 (DS4Windows·Steam) — [칸 비우기]로 하나를 비우세요", "warn")
		_last_pad_join_ms = now_ms
		_last_pad_join_dev = dev
		_last_pad_join_cause = _cause
	slots_changed.emit()
	return free


func leave(slot: int) -> void:
	if slot < 0 or slot >= SLOT_COUNT or slots[slot] == null:
		return
	var dev: String = slots[slot]["dev"]
	slots[slot] = null
	_edges.erase(dev)
	notice.emit("%dP 나감" % (slot + 1), "leave")
	slots_changed.emit()


## Backspace: 키보드 칸이 하나면 그 칸, 둘이면 나중에 들어온 칸이 나간다.
## 키보드 칸이 없으면, 연결이 끊긴 채 기다리는 패드 칸을 비운다 (배터리가 나가 돌아오지 않는 패드 대신 새 패드를 받게).
func leave_keyboard() -> void:
	var best := -1
	for i in SLOT_COUNT:
		if slots[i] != null and slots[i]["kind"] == "keyboard":
			if best < 0 or slots[i]["seq"] > slots[best]["seq"]:
				best = i
	if best < 0:
		for i in SLOT_COUNT:
			if slots[i] != null and not slots[i]["connected"]:
				best = i
				break
	if best >= 0:
		leave(best)


func swap() -> void:
	var a = slots[0]
	slots[0] = slots[1]
	slots[1] = a
	notice.emit("1P와 2P 자리를 바꿨습니다", "swap")
	slots_changed.emit()


func clear_all() -> void:
	for i in SLOT_COUNT:
		slots[i] = null
	_edges.clear()
	slots_changed.emit()


# ───────────── 연결 · 끊김 (Input.joy_connection_changed) ─────────────

func on_joy_connection_changed(device: int, connected: bool) -> void:
	if not connected:
		if pads.has(device):
			pads[device]["connected"] = false
			pads[device]["buttons"] = {}
			pads[device]["rt_down"] = false
			(pads[device]["axes"] as Array).fill(0.0)
		for i in SLOT_COUNT:
			var s = slots[i]
			if s != null and s["kind"] == "pad" and s["pad"] == device and s["connected"]:
				s["connected"] = false
				s["dev"] = "wait:%d" % s["seq"]   # 기다리는 칸: 같은 번호를 받은 다른 패드와 섞이지 않게
				s["leave_t"] = 0.0
				notice.emit("%dP 연결 끊김 — 다시 연결하면 이어서" % (i + 1), "disconnect")
				slots_changed.emit()
		return
	# 새로 연결됨: 상태를 새로 만들고, 기다리는 칸 중 같은 패드를 찾는다.
	pads.erase(device)
	_pad(device)
	var guid := joy_guid(device)
	var unit := joy_unit_key(device)
	var pick := -1
	var best_score := 0
	for i in SLOT_COUNT:
		var s = slots[i]
		if s == null or s["kind"] != "pad" or s["connected"]:
			continue
		var score := 0
		if unit != "" and s["unit"] == unit:
			score += 4
		elif guid != "" and s["guid"] == guid:
			score += 2
		if s["pad"] == device:
			score += 1
		if guid == "" and s["guid"] == "" and s["pad"] == device:
			score += 2
		if score >= 2 and score > best_score:
			best_score = score
			pick = i
	if pick >= 0:
		var s: Dictionary = slots[pick]
		s["pad"] = device
		s["dev"] = pad_key(device)
		s["connected"] = true
		s["name"] = joy_name(device)
		s["leave_t"] = 0.0
		notice.emit("%dP 다시 연결 — 같은 칸으로 돌아왔습니다" % (pick + 1), "reconnect")
		slots_changed.emit()


# ───────────── 프레임마다 ─────────────

## 길게 누르기 진행 (Back = 나가기, L3 · Tab = 자리 바꾸기). 입력을 받는 화면에서만 부른다.
## 프레임 끝에 consume_edges()를 부른다.
func update(delta: float) -> void:
	for i in SLOT_COUNT:
		var s = slots[i]
		if s == null or s["kind"] != "pad" or not s["connected"]:
			continue
		if _btn(s["pad"], JOY_BUTTON_BACK):
			s["leave_t"] += delta
			if s["leave_t"] >= LEAVE_HOLD:
				leave(i)
				continue
		else:
			s["leave_t"] = 0.0
		if _btn(s["pad"], JOY_BUTTON_LEFT_STICK):
			var before_t: float = s.get("swap_t", 0.0)
			s["swap_t"] = before_t + delta
			if before_t < SWAP_HOLD and s["swap_t"] >= SWAP_HOLD:
				swap()   # 한 번 길게 누르면 한 번만 바뀐다 (계속 누르고 있어도)
				return
		else:
			s["swap_t"] = 0.0
	if _tab_held:
		var tb := _tab_t
		_tab_t += delta
		if tb < SWAP_HOLD and _tab_t >= SWAP_HOLD:
			swap()
	else:
		_tab_t = 0.0


func consume_edges() -> void:
	_edges.clear()


## 창이 초점을 잃으면 눌려 있던 키를 모두 놓는다 (돌아왔을 때 키가 눌린 채 남지 않게).
func clear_held() -> void:
	for zone in kb_held:
		kb_held[zone].clear()
	for id in pads:
		pads[id]["buttons"] = {}
	_tab_held = false
	_tab_t = 0.0
	_edges.clear()


## 라우터가 이벤트를 받지 못한 사이(다른 화면에 있던 동안)에 놓은 키·버튼·스틱이 남지 않게,
## 지금 실제로 눌린 상태를 Input에서 다시 읽는다. 두 명 입력 시험 · 자유롭게 보기에 들어갈 때 부른다.
## 들어오기 전부터 눌려 있던 Tab · L3는 자리 바꾸기로 치지 않는다 (놓았다가 다시 길게 눌러야 한다).
func resync() -> void:
	for zone in kb_held:
		kb_held[zone].clear()
	for code in _key_zone:
		if Input.is_physical_key_pressed(code):
			kb_held[_key_zone[code][0]][code] = true
	_tab_held = Input.is_physical_key_pressed(KEY_TAB)
	_tab_t = SWAP_HOLD if _tab_held else 0.0
	var ids: Array = pads.keys()
	for id in Input.get_connected_joypads():
		if not ids.has(id):
			ids.append(id)
	for id in ids:
		var p := _pad(id)
		var btns := {}
		for b in JOY_BUTTON_SDL_MAX:
			if Input.is_joy_button_pressed(id, b):
				btns[b] = true
		p["buttons"] = btns
		var axes: Array = p["axes"]
		for a in axes.size():
			axes[a] = Input.get_joy_axis(id, a)
		p["rt_down"] = float(axes[JOY_AXIS_TRIGGER_RIGHT]) >= TRIGGER_PRESS
	for s in slots:
		if s == null:
			continue
		s["leave_t"] = 0.0
		s["swap_t"] = SWAP_HOLD if (s["kind"] == "pad" and _btn(s["pad"], JOY_BUTTON_LEFT_STICK)) else 0.0
	_edges.clear()


func _btn(id: int, b: int) -> bool:
	if not pads.has(id):
		return false
	return pads[id]["buttons"].get(b, false)


func _axis(id: int, a: int) -> float:
	if not pads.has(id):
		return 0.0
	return pads[id]["axes"][a]


static func radial_deadzone(v: Vector2, dz: float = DEADZONE) -> Vector2:
	var l := v.length()
	if l < dz:
		return Vector2.ZERO
	return v / l * minf(1.0, (l - dz) / (1.0 - dz))


func _kb_down(zone: String, role: String) -> bool:
	for k in KB_ZONES[zone][role]:
		if kb_held[zone].has(k):
			return true
	return false


## 칸의 지금 입력. move는 화면 기준 (x 오른쪽, y 위), 길이는 1을 넘지 않는다.
func get_state(slot: int) -> Dictionary:
	var st := {
		"move": Vector2.ZERO, "held": {}, "pressed": {}, "lstick": Vector2.ZERO, "rstick": Vector2.ZERO,
		"lt": 0.0, "rt": 0.0, "raw_buttons": [], "raw_axes": [], "active": false, "leave_t": 0.0,
	}
	for a in ACTIONS:
		st["held"][a] = false
		st["pressed"][a] = false
	if slot < 0 or slot >= SLOT_COUNT or slots[slot] == null:
		return st
	var s: Dictionary = slots[slot]
	if not s["connected"]:
		return st
	st["active"] = true
	var dev: String = s["dev"]
	var ed: Dictionary = _edges.get(dev, {})
	for a in ACTIONS:
		st["pressed"][a] = ed.get(a, false)
	var mv := Vector2.ZERO
	if s["kind"] == "keyboard":
		mv.x = float(_kb_down(dev, "right")) - float(_kb_down(dev, "left"))
		mv.y = float(_kb_down(dev, "up")) - float(_kb_down(dev, "down"))
		for a in ACTIONS:
			st["held"][a] = _kb_down(dev, a)
		var keys: Array = kb_held[dev].keys()
		keys.sort()
		for k in keys:
			st["raw_buttons"].append(OS.get_keycode_string(k))
	else:
		var id: int = s["pad"]
		var ls := Vector2(_axis(id, JOY_AXIS_LEFT_X), -_axis(id, JOY_AXIS_LEFT_Y))
		var rs := Vector2(_axis(id, JOY_AXIS_RIGHT_X), -_axis(id, JOY_AXIS_RIGHT_Y))
		st["lstick"] = ls
		st["rstick"] = rs
		st["lt"] = _axis(id, JOY_AXIS_TRIGGER_LEFT)
		st["rt"] = _axis(id, JOY_AXIS_TRIGGER_RIGHT)
		mv = radial_deadzone(ls)
		if dpad_moves:   # 자유롭게 보기에서는 십자키 좌우가 품질 전환이라 위아래만 움직인다
			mv.x += float(_btn(id, JOY_BUTTON_DPAD_RIGHT)) - float(_btn(id, JOY_BUTTON_DPAD_LEFT))
		mv.y += float(_btn(id, JOY_BUTTON_DPAD_UP)) - float(_btn(id, JOY_BUTTON_DPAD_DOWN))
		for a in ACTIONS:
			var h := false
			for b in PAD_BUTTONS[a]:
				h = h or _btn(id, b)
			st["held"][a] = h
		st["held"]["rcv"] = st["held"]["rcv"] or pads[id].get("rt_down", false)
		var bl: Array = []
		for b in pads[id]["buttons"]:
			if pads[id]["buttons"][b]:
				bl.append(b)
		bl.sort()
		st["raw_buttons"] = bl
		var axes: Array = pads[id]["axes"]
		for ai in axes.size():
			if absf(axes[ai]) > 0.01 or ai < 6:
				st["raw_axes"].append([ai, axes[ai]])
		st["leave_t"] = s["leave_t"]
	if mv.length() > 1.0:
		mv = mv.normalized()
	st["move"] = mv
	return st


## 진동 시험. 0 = 패드가 아님(또는 끊김), 1 = 진동 신호를 보냄, 2 = 보냈지만 패드가 진동이 없다고 알려 옴.
## has_joy_vibration 이 틀릴 수도 있으니 신호는 언제나 보낸다 (알림만 다르게).
func vibrate(slot: int, weak: float = 0.6, strong: float = 0.9, dur: float = 0.45) -> int:
	if slot < 0 or slot >= SLOT_COUNT or slots[slot] == null:
		return 0
	var s: Dictionary = slots[slot]
	if s["kind"] != "pad" or not s["connected"]:
		return 0
	Input.start_joy_vibration(s["pad"], weak, strong, dur)
	return 1 if Input.has_joy_vibration(s["pad"]) else 2
