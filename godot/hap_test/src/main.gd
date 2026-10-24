## 합 시험판 — 뿌리 노드. 무대·대역·이펙트·화면을 코드로 만들고, 화면 흐름과 입력을 맡는다.
## 시험용 플래그는 `--` 뒤에 준다 (OS.get_cmdline_user_args). testhooks.gd 참고.
extends Node

const Router = preload("res://src/input_router.gd")
const Stage = preload("res://src/stage.gd")
const Actor = preload("res://src/actor.gd")
const Fx = preload("res://src/fx.gd")
const Quality = preload("res://src/quality.gd")
const Bench = preload("res://src/bench.gd")
const SysInfo = preload("res://src/sysinfo.gd")
const Report = preload("res://src/report.gd")
const UI = preload("res://src/ui.gd")
const Sfx = preload("res://src/sfx.gd")
const Hooks = preload("res://src/testhooks.gd")

enum Scr { TITLE, BENCH, RESULTS, INPUT, FREE }

const FWD := Vector3(-0.70710678, 0, -0.70710678)
const RIGHT := Vector3(0.70710678, 0, -0.70710678)
const CAM_OFFSET := Vector3(13, 16, 13)
const BOSS_POS_AL := 5.5
const HAP_WINDOW := 0.3
const C_BOSS := Color(1.0, 0.22, 0.16)

var args := {}
var router
var stage
var boss
var actors: Array = []
var fx
var sfx
var ui
var cam: Camera3D
var env: Environment
var sun: DirectionalLight3D
var world_env: WorldEnvironment
var screen_fx: ColorRect
var quality_idx := 2
var applied := {}
var screen := Scr.TITLE
var quitting_dialog := false
var bench
var bench_quick := false
var bench_restore_quality := 2
var bench_vsync_prev := DisplayServer.VSYNC_ENABLED
var bench_vsync_seen := DisplayServer.VSYNC_DISABLED   # 측정 중 실제로 읽은 수직 동기화 상태
var bench_scene_prev := 0.0
var bench_last_beat := -1
var result_text := ""
var result_path := ""
var clock := 0.0
var boss_prev_phase := 0.0
var last_atk := [-10.0, -10.0]
var info_on := true
var info_accum := 1.0
var frame_ms := 16.7
var headless := false
var hooks
var _stick_nav := {}
var scripted := false   # 시험 고리가 장면을 직접 움직이는 중


func _ready() -> void:
	headless = DisplayServer.get_name() == "headless"
	_parse_args()
	if args.has("windowed") or args.has("shots") or args.has("flash-test"):
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		DisplayServer.window_set_size(Vector2i(1280, 720))
	_build_world()
	_build_ui()
	router = Router.new()
	router.notice.connect(_on_router_notice)
	router.slots_changed.connect(_on_slots_changed)
	Input.joy_connection_changed.connect(_on_joy_connection_changed)
	if args.has("preset"):
		quality_idx = clampi(_preset_arg(args["preset"]), 0, 3)
	set_quality(quality_idx, false)
	show_title()
	print("[hap] 합 시험판 %s · Godot %s · %s · %s" % [SysInfo.VERSION, SysInfo.godot_text(), SysInfo.driver_line(), SysInfo.gpu_line()])
	print("[hap] 무대: 따로 둔 조각 %d개 · 풀 %d · 낙엽 %d · 떨어지는 잎 %d · 석등 %d" % [stage.piece_count, stage.GRASS_N, stage.LEAVES_N, stage.FALLING_N, stage.lanterns.size()])
	hooks = Hooks.new()
	hooks.name = "TestHooks"
	add_child(hooks)
	hooks.setup(self)
	if args.has("bench"):
		start_bench(false)


func _parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		var s: String = a
		if s.begins_with("--"):
			s = s.substr(2)
		var eq := s.find("=")
		if eq >= 0:
			args[s.substr(0, eq)] = s.substr(eq + 1)
		else:
			args[s] = ""


func _preset_arg(v: String) -> int:
	var i := Quality.KEYS.find(v)
	if i >= 0:
		return i
	return int(v) - 1


# ───────────── 세계 ─────────────

func _build_world() -> void:
	var world := Node3D.new()
	world.name = "World"
	add_child(world)
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	sky.sky_material = load("res://materials/sky.tres")
	sky.radiance_size = Sky.RADIANCE_SIZE_128
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.95
	env.tonemap_white = 6.0
	env.glow_enabled = true
	env.glow_intensity = 0.45
	env.glow_strength = 1.0
	env.glow_bloom = 0.02
	env.glow_hdr_threshold = 1.5
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = Color(0.77, 0.56, 0.49)
	env.fog_light_energy = 1.0
	env.fog_density = 0.75
	env.fog_depth_begin = 30.0
	env.fog_depth_end = 105.0
	env.fog_depth_curve = 1.5
	env.fog_sun_scatter = 0.18
	env.fog_aerial_perspective = 0.25
	env.fog_sky_affect = 0.5
	env.ssao_radius = 1.2
	env.ssao_intensity = 1.8
	env.ssao_power = 1.4
	env.volumetric_fog_density = 0.012
	env.volumetric_fog_albedo = Color(1.0, 0.86, 0.76)
	env.volumetric_fog_anisotropy = 0.6
	env.volumetric_fog_length = 80.0
	env.volumetric_fog_ambient_inject = 0.2
	env.volumetric_fog_sky_affect = 0.3
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.06
	env.adjustment_contrast = 1.04
	world_env = WorldEnvironment.new()
	world_env.environment = env
	world.add_child(world_env)

	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	world.add_child(sun)
	var sdir := Vector3(-0.55, 0.6, -0.75).normalized()
	sun.look_at_from_position(sdir * 60.0, Vector3.ZERO, Vector3.UP)
	sun.light_color = Color(1.0, 0.81, 0.61)
	sun.light_energy = 2.4
	sun.shadow_enabled = true
	# 볼류메트릭 안개 속 해의 역광 산란을 줄인다: 보스 너머에서 비추는 주황 산란이 보스의 붉은 네온을 주황으로 덮지 않게
	sun.light_volumetric_fog_energy = 0.5
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_blend_splits = true

	cam = Camera3D.new()
	cam.name = "Camera"
	cam.near = 0.1
	cam.far = 220.0
	world.add_child(cam)
	cam.current = true

	stage = Stage.new()
	stage.name = "Stage"
	world.add_child(stage)
	stage.build()

	boss = Actor.new()
	boss.name = "Boss"
	world.add_child(boss)
	boss.build("boss")
	for k in ["p1", "p2"]:
		var a = Actor.new()
		a.name = k.to_upper()
		world.add_child(a)
		a.build(k)
		a.add_seat_ring()
		actors.append(a)

	fx = Fx.new()
	fx.name = "Fx"
	world.add_child(fx)
	fx.build()

	sfx = Sfx.new()
	sfx.name = "Sfx"
	add_child(sfx)
	sfx.build()
	reset_positions()


func _build_ui() -> void:
	var fx_layer := CanvasLayer.new()
	fx_layer.layer = 0
	add_child(fx_layer)
	screen_fx = ColorRect.new()
	screen_fx.material = load("res://materials/screen_fx.tres")
	screen_fx.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen_fx.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fx_layer.add_child(screen_fx)
	var ui_layer := CanvasLayer.new()
	ui_layer.layer = 2
	add_child(ui_layer)
	ui = UI.new()
	ui.name = "UI"
	ui_layer.add_child(ui)
	ui.build()
	ui.pressed.connect(_on_ui_pressed)


static func to_w(along: float, side: float) -> Vector3:
	return FWD * along + RIGHT * side


func reset_positions() -> void:
	boss.position = to_w(BOSS_POS_AL, 0.6)
	boss.face_towards(boss.position - FWD)
	boss.rotation.y = boss.facing
	actors[0].position = to_w(-3.0, -2.6)
	actors[1].position = to_w(-3.0, 2.6)
	for a in actors:
		a.face_towards(boss.position)
		a.tick(0.0)


func game_camera() -> void:
	cam.fov = 38.0
	cam.position = CAM_OFFSET
	cam.look_at(Vector3.ZERO, Vector3.UP)


func title_camera() -> void:
	cam.fov = 40.0
	cam.position = to_w(-15.5, 5.5) + Vector3(0, 3.1, 0)
	cam.look_at(to_w(3.0, -6.2) + Vector3(0, 3.0, 0), Vector3.UP)


# ───────────── 품질 ─────────────

func foliage_list() -> Array:
	return [[stage.grass_mmi, stage.GRASS_N, "풀"], [stage.leaves_mmi, stage.LEAVES_N, "낙엽"]]


func set_quality(i: int, announce: bool = true) -> Dictionary:
	quality_idx = clampi(i, 0, 3)
	applied = Quality.apply(quality_idx, get_viewport(), env, sun, stage.lanterns, foliage_list(), screen_fx)
	ui.set_title_quality(Quality.NAMES[quality_idx])
	ui.set_free_quality(Quality.NAMES[quality_idx])
	if announce:
		ui.toast("품질: %s" % Quality.NAMES[quality_idx])
		sfx.play("tick")
	_update_info()
	print("[hap] 품질 %s: %s" % [Quality.NAMES[quality_idx], Quality.describe(applied)])
	return applied


# ───────────── 화면 흐름 ─────────────

func show_title() -> void:
	screen = Scr.TITLE
	quitting_dialog = false
	router.accept_join = false
	ui.show_screen("title")
	title_camera()
	reset_positions()
	# 타이틀 구도: 두 대역을 메뉴(왼쪽) 밖, 보스 앞쪽에 세운다
	actors[0].position = to_w(-2.6, 0.9)
	actors[1].position = to_w(-4.2, 3.6)
	for a in actors:
		a.face_towards(boss.position)
		a.facing += 0.5
		a.tick(0.0)
	_refresh_title_pads()


func show_input() -> void:
	screen = Scr.INPUT
	router.accept_join = true
	router.dpad_moves = true
	router.resync()   # 다른 화면에 있는 동안 놓은 키·버튼이 눌린 채 남지 않게
	ui.show_screen("input")
	game_camera()
	reset_positions()


func show_free() -> void:
	screen = Scr.FREE
	router.accept_join = true
	router.dpad_moves = false
	router.resync()
	ui.show_screen("free")
	ui.set_free_quality(Quality.NAMES[quality_idx])
	game_camera()
	reset_positions()


func show_results() -> void:
	screen = Scr.RESULTS
	router.accept_join = false
	ui.show_screen("results")
	game_camera()


func go_back() -> void:
	match screen:
		Scr.TITLE:
			quitting_dialog = not quitting_dialog
			ui.show_quit(quitting_dialog)
			sfx.play("tick")
		Scr.BENCH:
			cancel_bench()
			show_title()
		_:
			show_title()


func quit_app(code: int = 0) -> void:
	sfx.stop_all()
	set_process(false)
	await get_tree().create_timer(0.25).timeout   # 오디오 스레드가 멈춘 재생을 치울 시간
	get_tree().quit(code)


func toggle_fullscreen() -> void:
	var m := DisplayServer.window_get_mode()
	if m == DisplayServer.WINDOW_MODE_FULLSCREEN or m == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		var ss := DisplayServer.screen_get_size()
		var w := clampi(int(ss.x * 0.7), 960, 1920)
		var sz := Vector2i(w, int(w * 9.0 / 16.0))
		DisplayServer.window_set_size(sz)
		DisplayServer.window_set_position(DisplayServer.screen_get_position() + (ss - sz) / 2)
		ui.toast("창 모드 (F11 / Alt+Enter: 전체 화면)")
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		ui.toast("전체 화면")


func _on_ui_pressed(id: String) -> void:
	sfx.play("tick")
	match id:
		"bench":
			start_bench(false)
		"input":
			show_input()
		"free":
			show_free()
		"quit":
			quitting_dialog = true
			ui.show_quit(true)
		"quit_yes":
			quit_app()
		"quit_no":
			quitting_dialog = false
			ui.show_quit(false)
		"copy":
			copy_results()
		"rerun":
			start_bench(bench_quick)
		"to_title":
			show_title()
		"swap":
			router.swap()
		"vib0", "vib1":
			_vibrate(int(id.substr(3)))
		"clear0", "clear1":
			router.leave(int(id.substr(5)))


func _vibrate(slot: int) -> void:
	match router.vibrate(slot):
		1:
			ui.toast("%dP 진동 시험 (0.45초)" % (slot + 1))
		2:
			ui.toast("%dP 진동 신호를 보냈습니다 — 이 패드는 진동이 없다고 알려 왔습니다" % (slot + 1), Color(1, 0.56, 0.47))
		_:
			ui.toast("%dP는 게임패드가 아니라 진동이 없습니다" % (slot + 1), Color(1, 0.56, 0.47))


func _on_router_notice(text: String, kind: String) -> void:
	var col := Color(0.95, 0.93, 0.9)
	match kind:
		"join":
			sfx.play("join")
		"leave":
			sfx.play("leave")
		"reject":
			sfx.play("reject")
			col = Color(1, 0.56, 0.47)
		"warn":
			col = Color(1, 0.56, 0.47)
		"disconnect":
			sfx.play("reject")
			col = Color(1, 0.56, 0.47)
		"reconnect":
			sfx.play("join")
			col = Color(0.62, 0.94, 0.78)
		"swap":
			sfx.play("tick")
	print("[hap] 입력: %s" % text)
	ui.toast(text, col)


func _on_slots_changed() -> void:
	pass


func _on_joy_connection_changed(device: int, connected: bool) -> void:
	print("[hap] 패드 %d %s: %s [%s]" % [device, "연결" if connected else "끊김", Input.get_joy_name(device), Input.get_joy_guid(device)])
	router.on_joy_connection_changed(device, connected)
	_refresh_title_pads()


func _refresh_title_pads() -> void:
	var ids := Input.get_connected_joypads()
	if ids.is_empty():
		ui.set_title_pads("연결된 게임패드 없음 (연결하면 바로 잡힙니다)")
		return
	var names := []
	for id in ids:
		names.append("#%d %s" % [id, Input.get_joy_name(id)])
	ui.set_title_pads("연결된 게임패드 %d개: %s" % [ids.size(), " · ".join(PackedStringArray(names))])


# ───────────── 입력 ─────────────

func _input(ev: InputEvent) -> void:
	if scripted and not (ev is InputEventKey or ev is InputEventJoypadButton or ev is InputEventJoypadMotion):
		return
	if ev is InputEventKey and ev.pressed and not ev.echo:
		var code: int = ev.keycode
		var pcode: int = ev.physical_keycode if ev.physical_keycode != KEY_NONE else ev.keycode
		if code == KEY_F11 or ((code == KEY_ENTER or code == KEY_KP_ENTER) and ev.alt_pressed):
			toggle_fullscreen()
			get_viewport().set_input_as_handled()
			return
		if code == KEY_F1:
			info_on = not info_on
			ui.info_panel.visible = info_on
			get_viewport().set_input_as_handled()
			return
		if code == KEY_ESCAPE:
			go_back()
			get_viewport().set_input_as_handled()
			return
		if pcode >= KEY_1 and pcode <= KEY_4 and screen != Scr.BENCH:
			set_quality(pcode - KEY_1)
			get_viewport().set_input_as_handled()
			return
	if ev is InputEventJoypadButton and ev.pressed and ev.button_index == JOY_BUTTON_START:
		go_back()
		get_viewport().set_input_as_handled()
		return
	match screen:
		Scr.TITLE:
			_menu_input(ev, "quit" if quitting_dialog else "title", quitting_dialog)
		Scr.RESULTS:
			_menu_input(ev, "results", true)
		Scr.INPUT, Scr.FREE:
			_play_input(ev)


## 메뉴 고르기: 키보드 ↑↓(또는 ←→) Enter, 패드 십자키·왼쪽 스틱·A, B = 뒤로.
func _menu_input(ev: InputEvent, menu: String, horizontal: bool) -> void:
	var d := 0
	var ok := false
	var back := false
	var qd := 0
	if ev is InputEventKey and ev.pressed and not ev.echo:
		match ev.keycode:
			KEY_UP, KEY_W:
				d = -1
			KEY_DOWN, KEY_S:
				d = 1
			KEY_LEFT, KEY_A:
				if horizontal: d = -1
				else: qd = -1
			KEY_RIGHT, KEY_D:
				if horizontal: d = 1
				else: qd = 1
			KEY_ENTER, KEY_KP_ENTER, KEY_SPACE:
				ok = true
			KEY_BACKSPACE:
				back = true
	elif ev is InputEventJoypadButton and ev.pressed:
		match ev.button_index:
			JOY_BUTTON_DPAD_UP:
				d = -1
			JOY_BUTTON_DPAD_DOWN:
				d = 1
			JOY_BUTTON_DPAD_LEFT:
				if horizontal: d = -1
				else: qd = -1
			JOY_BUTTON_DPAD_RIGHT:
				if horizontal: d = 1
				else: qd = 1
			JOY_BUTTON_A:
				ok = true
			JOY_BUTTON_B:
				back = true
	elif ev is InputEventJoypadMotion and (ev.axis == JOY_AXIS_LEFT_Y or ev.axis == JOY_AXIS_LEFT_X):
		var key := "%d:%d" % [ev.device, ev.axis]
		var dir := 0
		if ev.axis_value > 0.6:
			dir = 1
		elif ev.axis_value < -0.6:
			dir = -1
		var prev: int = _stick_nav.get(key, 0)
		if dir != 0:
			_stick_nav[key] = dir
		elif absf(ev.axis_value) < 0.3:
			_stick_nav[key] = 0   # 0.3~0.6 사이는 이전 상태 유지 (한 번 기울이면 한 칸만)
		if dir != 0 and prev == 0:
			if ev.axis == JOY_AXIS_LEFT_Y:
				d = dir
			elif horizontal:
				d = dir
			else:
				qd = dir
	if d != 0:
		ui.menu_move(menu, d)
		sfx.play("tick")
	if qd != 0 and screen == Scr.TITLE and not quitting_dialog:
		set_quality(quality_idx + qd)
	if ok:
		ui.menu_activate(menu)
	if back:
		if quitting_dialog:
			quitting_dialog = false
			ui.show_quit(false)
		elif screen == Scr.RESULTS:
			show_title()


## Tab · 패드 L3 길게 = 자리 바꾸기, Back 길게 = 나가기는 라우터가 update()에서 센다.
func _play_input(ev: InputEvent) -> void:
	if ev is InputEventJoypadButton and ev.pressed:
		var s: int = router.slot_of(Router.pad_key(ev.device))
		if ev.button_index == JOY_BUTTON_RIGHT_STICK and s >= 0:
			_vibrate(s)
			return
		if screen == Scr.FREE and (ev.button_index == JOY_BUTTON_DPAD_LEFT or ev.button_index == JOY_BUTTON_DPAD_RIGHT):
			set_quality(quality_idx + (1 if ev.button_index == JOY_BUTTON_DPAD_RIGHT else -1))
			router.handle_event(ev)
			return
	router.handle_event(ev)


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and router != null:
		router.clear_held()


# ───────────── 프레임 ─────────────

func _process(delta: float) -> void:
	clock += delta
	frame_ms = lerpf(frame_ms, delta * 1000.0, 0.1)
	if screen == Scr.INPUT or screen == Scr.FREE:
		router.update(delta)   # 다른 화면에서는 라우터가 이벤트를 받지 않으므로 길게 누르기도 세지 않는다
	if not scripted:
		match screen:
			Scr.BENCH:
				_bench_step(delta)
			Scr.INPUT, Scr.FREE:
				_drive_players(delta)
				if screen == Scr.FREE:
					_boss_cycle(fmod(clock, 2.0), 0.9)
				else:
					boss.idle_pose(clock)
			_:
				boss.idle_pose(clock)
				for a in actors:
					a.speed_now = 0.0
					a.tick(delta)
	fx.advance(delta)
	ui.tick(delta)
	info_accum += delta
	if info_accum >= 0.25 or headless:
		info_accum = 0.0
		_update_info()
	router.consume_edges()


func _update_info() -> void:
	var ws := DisplayServer.window_get_size()
	var sc: float = applied.get("scale", 1.0)
	var rs := Vector2i(int(ws.x * sc), int(ws.y * sc))
	var vs := DisplayServer.window_get_vsync_mode()
	ui.set_info("FPS %d · %.1f ms  │  품질 %s  │  %s · %s  │  %s  │  %d×%d · 3D 배율 %.2f (%d×%d)  │  수직 동기화 %s" % [
		Engine.get_frames_per_second(), frame_ms, Quality.NAMES[quality_idx], SysInfo.driver_name(), SysInfo.method_name(),
		SysInfo.gpu_name(), ws.x, ws.y, sc, rs.x, rs.y, SysInfo.vsync_text(vs)],
		(("적용한 값: " + Quality.short(applied)) if not applied.is_empty() else "") + "   ·   F1: 정보 막대 숨기기")


func _drive_players(delta: float) -> void:
	for i in 2:
		var st: Dictionary = router.get_state(i)
		var a = actors[i]
		var mv: Vector2 = st["move"]
		a.step(RIGHT * mv.x + FWD * mv.y, delta)
		if not st["active"]:
			continue
		if st["pressed"]["atk"]:
			a.attack()
			sfx.play("atk", -2.0)
			if clock - last_atk[1 - i] <= HAP_WINDOW and router.get_state(1 - i)["active"]:
				var mid: Vector3 = (actors[0].position + actors[1].position) * 0.5
				fx.burst(mid + Vector3(0, 0.1, 0), Color(1.0, 0.95, 0.9), 1.4)
				sfx.play("hap")
				ui.toast("합!", Color(0.95, 0.93, 0.9), 1.2)
				last_atk[1 - i] = -10.0
			else:
				var front: Vector3 = a.position + Vector3(sin(a.facing), 0, cos(a.facing)) * 1.1
				fx.burst(front + Vector3(0, 0.1, 0), ui.SEAT_COL[i], 0.55)
				last_atk[i] = clock
		if st["pressed"]["rcv"]:
			a.receive()
			sfx.play("rcv", -3.0)
		if st["pressed"]["dodge"]:
			a.dodge()
		if st["pressed"]["tag"]:
			a.tag()
	for i in 2:
		var info = router.slots[i]
		if screen == Scr.INPUT:
			var label := ""
			var detail := ""
			if info != null:
				if info["kind"] == "pad":
					label = "게임패드 #%d" % info["pad"]
					detail = "%s\nGUID %s" % [info["name"] if info["name"] != "" else "(이름 없음)", info["guid"] if info["guid"] != "" else "—"]
					var ji: Dictionary = router.joy_info(info["pad"]) if info["connected"] else {}
					var extra := PackedStringArray()
					for k in ji:
						if str(k) in ["vendor_id", "product_id", "xinput_index", "steam_input_index"]:
							extra.append("%s %s" % [k, ji[k]])
					if extra.size() > 0:
						detail += " · " + " · ".join(extra)
				else:
					label = info["name"]
					detail = Router.KB_ZONES[info["dev"]]["hint"]
			ui.update_slot(i, info, router.get_state(i), label, detail, delta)
		else:
			var txt := "%s — 아무 버튼이나 눌러 참가" % ui.SEAT_NAME[i]
			var on := false
			if info != null:
				on = info["connected"]
				var dl: String = ("게임패드 #%d %s" % [info["pad"], info["name"]]) if info["kind"] == "pad" else info["name"]
				txt = "%s · %s" % [ui.SEAT_NAME[i], dl if on else "연결 끊김 — 다시 연결하면 이어서"]
			ui.update_free(i, txt, on)


## 보스 내려찍기 주기 (2초). 1.25초에 주먹이 땅에 닿으면 터진다.
func _boss_cycle(phase: float, power: float) -> void:
	boss.slam_pose(phase)
	if boss_prev_phase < 1.25 and phase >= 1.25:
		fx.burst(boss.impact_point(), C_BOSS, power)
		sfx.play("slam", -10.0 if screen == Scr.BENCH else -6.0)
	boss_prev_phase = phase


# ───────────── 성능 측정 ─────────────

func start_bench(quick: bool) -> void:
	if screen != Scr.BENCH:
		bench_restore_quality = quality_idx
	screen = Scr.BENCH
	bench_quick = quick
	router.accept_join = false
	ui.show_screen("bench")
	game_camera()
	reset_positions()
	bench_vsync_prev = DisplayServer.window_get_vsync_mode()
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	bench_vsync_seen = DisplayServer.window_get_vsync_mode()   # 결과에는 실제로 읽은 값을 적는다
	_update_info()
	bench = Bench.new()
	if quick:
		bench.configure(float(args.get("bench-seconds", "1.2")), float(args.get("bench-warmup", "0.4")), 3)
	else:
		bench.configure(12.0, 2.0, 3)
	bench.start()
	boss_prev_phase = 0.0
	bench_last_beat = -1
	print("[hap] 성능 측정 시작 (%s): 단계마다 %.1f초, 앞 %.1f초 제외, 수직 동기화 끔" % ["빠른" if quick else "보통", bench.seg_time, bench.warmup])
	_bench_next_segment()


func _bench_next_segment() -> void:
	var idx: int = bench.next_preset()
	var a := set_quality(idx, false)
	boss_prev_phase = 0.0
	bench_last_beat = -1
	bench.begin_segment(Time.get_ticks_usec(), a)


func _bench_step(delta: float) -> void:
	var r: String = bench.tick(Time.get_ticks_usec())
	bench_scene(bench.seg_t, delta)
	var total: float = bench.order.size() * bench.seg_time
	var done: float = bench.pos * bench.seg_time + minf(bench.seg_t, bench.seg_time)
	ui.set_bench(bench.pos + 1, bench.order.size(), Quality.NAMES[bench.current_preset()], bench.seg_t, bench.seg_time, bench.warmup, done / total)
	if r == "next":
		var res: Dictionary = bench.results.back()
		res["draw_calls"] = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
		res["primitives"] = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)
		res["objects"] = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_OBJECTS_IN_FRAME)
		res["vram_mb"] = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED) / 1048576.0
		print("[hap] 측정 %s: 평균 %.1f FPS · 1%% 하위 %.1f · 최장 %.1f ms · 끊김 %d · 처음5초 %d · 프레임 %d" % [
			Quality.NAMES[res["preset"]], res["avg_fps"], res["p1_low_fps"], res["max_ms"], res["hitches"], res["hitches_first5s"], res["frames"]])
		if bench.has_next():
			_bench_next_segment()
		else:
			_bench_done()


## 측정 장면 (매번 같다): 쿼터뷰 고정 카메라, 보스가 2초마다 내려찍고 이펙트가 터지며, 두 대역이 원을 그리며 돈다.
func bench_scene(t: float, delta: float) -> void:
	_boss_cycle(fmod(t, 2.0), 1.2)
	for i in 2:
		var a = actors[i]
		var ang := t * 0.7 + PI * i
		var r := 6.0
		a.position = Vector3(cos(ang) * r, 0, sin(ang) * r)
		var tangent := Vector3(-sin(ang), 0, cos(ang))
		a.facing = atan2(tangent.x, tangent.z)
		a.speed_now = 1.0
	var beat := int(floor(t))
	if beat != bench_last_beat:
		bench_last_beat = beat
		actors[beat % 2].attack()
	for a in actors:
		a.tick(delta)


func _bench_done() -> void:
	bench.finish()
	DisplayServer.window_set_vsync_mode(bench_vsync_prev)
	set_quality(bench_restore_quality, false)
	result_text = Report.build(bench, bench_quick, bench_vsync_seen)
	result_path = save_result(result_text)
	print(result_text)
	print("[hap] 결과 파일: %s" % (result_path if result_path != "" else "(저장 못 함)"))
	var refresh := SysInfo.refresh_rate()
	var rec := Bench.recommend(bench.results, refresh)
	var ws := SysInfo.window_size()
	var sys_text := "GPU %s · %s\n%d×%d · 주사율 %s · %s" % [SysInfo.gpu_line(), SysInfo.driver_line(), ws.x, ws.y,
		("%d Hz" % roundi(refresh)) if refresh > 0 else "알 수 없음", SysInfo.os_text()]
	var lines := PackedStringArray()
	for a in bench.applied:
		lines.append("%s: %s" % [a["name"], Quality.describe(a)])
	var path_text := ("결과 파일: %s" % result_path) if result_path != "" else "결과 파일을 저장하지 못했습니다 — [결과 복사]를 써 주세요"
	var warn := Report.cap_warning(bench.results, refresh)
	ui.show_results(bench.results, Quality.NAMES, rec, int(maxf(60.0, roundf(refresh))), sys_text, "\n".join(lines), path_text, warn)
	show_results()


func cancel_bench() -> void:
	if bench != null and bench.running:
		bench.cancel()
		DisplayServer.window_set_vsync_mode(bench_vsync_prev)
		set_quality(bench_restore_quality, false)
		print("[hap] 성능 측정 취소")


## 결과 파일: exe 옆 hap_test_result.txt, 안 되면 사용자 폴더 (user://).
func save_result(text: String) -> String:
	var candidates := []
	if args.has("result-file"):
		candidates.append(args["result-file"])
	elif OS.has_feature("template"):
		candidates.append(OS.get_executable_path().get_base_dir().path_join("hap_test_result.txt"))
	candidates.append("user://hap_test_result.txt")
	for p in candidates:
		var f := FileAccess.open(p, FileAccess.WRITE)
		if f == null:
			print("[hap] 결과 파일 쓰기 실패: %s (%s)" % [p, error_string(FileAccess.get_open_error())])
			continue
		f.store_string(String.chr(0xFEFF) + text.replace("\n", "\r\n"))
		f.close()
		# 보여 주기용 경로: Windows에서는 탐색기에 붙여 넣을 수 있게 역슬래시로 (파일 쓰기는 원래 경로로 했다)
		var shown: String = ProjectSettings.globalize_path(p) if p.begins_with("user://") else p
		if OS.get_name() == "Windows":
			shown = shown.replace("/", "\\")
		return shown
	return ""


func copy_results() -> void:
	if result_text == "":
		return
	DisplayServer.clipboard_set(result_text)
	ui.set_results_status("복사했습니다 — 대화창에 Ctrl+V로 붙여 넣어 주세요")
