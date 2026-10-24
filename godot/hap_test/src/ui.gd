## 화면 (모든 글자는 한글). 글꼴은 묶은 IBM Plex Sans KR(본문) · Black Han Sans(제목).
## 단추는 마우스로 누르고, 키보드·패드 선택은 main이 menu_move/menu_activate로 옮긴다 (Godot 포커스는 쓰지 않는다).
extends Control

signal pressed(id: String)

const StickView = preload("res://src/stick_view.gd")
const C_P1 := Color(1.0, 0.478, 0.349)
const C_P2 := Color(0.271, 0.769, 1.0)
const C_TEXT := Color(0.95, 0.93, 0.9)
const C_DIM := Color(0.72, 0.69, 0.67)
const C_WARN := Color(1.0, 0.56, 0.47)
const C_OK := Color(0.62, 0.94, 0.78)
const SEAT_COL := [C_P1, C_P2]
const SEAT_NAME := ["1P · 모루", "2P · 제비"]
const ACT_LABEL := {"atk": "공격", "rcv": "받기", "dodge": "회피", "tag": "태그"}

var f_body: Font
var f_bold: Font
var f_title: Font
var f_title_dot: Font
var st_panel: StyleBoxFlat
var st_btn: StyleBoxFlat
var st_btn_sel: StyleBoxFlat
var st_dark: StyleBoxFlat

var screens := {}
var menus := {}
var info_panel: PanelContainer
var info_label: Label
var info_detail: Label
var toast_panel: PanelContainer
var toast_label: Label
var toast_t := 0.0

var title_quality: Label
var title_help: Label
var title_pads: Label
var quit_dlg: Control
var bench_label: Label
var bench_sub: Label
var bench_bar: ProgressBar
var res_grid: GridContainer
var res_rec: Label
var res_warn: Label
var res_sys: Label
var res_settings: Label
var res_path: Label
var res_status: Label
var slot_ui: Array = []
var input_hint: Label
var free_chips: Array = []
var free_hint: Label
var free_quality: Label

const TITLE_HELP := {
	"bench": "약 1분 동안 품질 4단계를 자동으로 잽니다. 끝나면 결과를 복사해서 대화에 붙여 넣어 주세요.",
	"input": "패드+키보드, 패드+패드, 키보드 두 구역이 되는지 봅니다. 쓸 장치에서 아무 버튼이나 누르면 참가합니다.",
	"free": "대역을 움직이고 공격 버튼으로 이펙트를 터뜨립니다. 1~4 키나 십자키 ←→로 품질을 바꿔 가며 FPS를 봅니다.",
	"quit": "시험판을 끕니다.",
}


func build() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	f_body = load("res://assets/fonts/IBMPlexSansKR-Regular.ttf")
	f_bold = load("res://assets/fonts/IBMPlexSansKR-Bold.ttf")
	f_title = load("res://assets/fonts/BlackHanSans-Regular.ttf")
	# Black Han Sans 에는 가운뎃점(·)이 없다 → 그 글자가 든 제목만 굵은 본문 글꼴로 이어 그린다 (시스템 글꼴에 기대지 않는다).
	# 원래 글꼴에 fallback을 달면 모든 제목의 줄 높이가 커지므로 FontVariation을 따로 둔다.
	var fv := FontVariation.new()
	fv.base_font = f_title
	fv.fallbacks = [f_bold]
	f_title_dot = fv
	var th := Theme.new()
	th.default_font = f_body
	th.default_font_size = 18
	theme = th
	st_panel = _sb(Color(0.055, 0.05, 0.065, 0.84), 12, 18)
	st_dark = _sb(Color(0, 0, 0, 0.55), 0, 6)
	st_btn = _sb(Color(0.09, 0.085, 0.1, 0.78), 8, 10)
	st_btn.border_color = Color(1, 1, 1, 0.16)
	st_btn.set_border_width_all(2)
	st_btn.content_margin_left = 20
	st_btn.content_margin_right = 20
	st_btn_sel = _sb(Color(0.95, 0.93, 0.89, 0.97), 8, 10)
	st_btn_sel.border_color = Color(1, 1, 1, 1)
	st_btn_sel.set_border_width_all(2)
	st_btn_sel.content_margin_left = 20
	st_btn_sel.content_margin_right = 20
	_build_title()
	_build_bench()
	_build_results()
	_build_input()
	_build_free()
	_build_quit()
	_build_info()
	_build_toast()


# ───────────── 도우미 ─────────────

func _sb(bg: Color, radius: int, margin: float) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	s.content_margin_left = margin
	s.content_margin_right = margin
	s.content_margin_top = margin * 0.6
	s.content_margin_bottom = margin * 0.6
	s.anti_aliasing = true
	return s


func _label(text: String, size: int, font: Font = null, color: Color = C_TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font if font != null else f_body)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _shadowed(l: Label) -> Label:
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	l.add_theme_constant_override("shadow_offset_x", 2)
	l.add_theme_constant_override("shadow_offset_y", 2)
	return l


func _panel() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", st_panel)
	return p


func _vbox(sep: int = 8) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return v


func _hbox(sep: int = 8) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return h


func _screen(name: String) -> Control:
	var c := Control.new()
	c.name = name
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.visible = false
	add_child(c)
	screens[name] = c
	return c


func _button(text: String, id: String, menu: String = "", size: int = 22, font: Font = null) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_override("font", font if font != null else f_bold)
	b.add_theme_font_size_override("font_size", size)
	b.add_theme_stylebox_override("normal", st_btn)
	b.add_theme_stylebox_override("hover", st_btn_sel)
	b.add_theme_stylebox_override("pressed", st_btn_sel)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.add_theme_color_override("font_color", C_TEXT)
	b.add_theme_color_override("font_hover_color", Color(0.08, 0.07, 0.08))
	b.add_theme_color_override("font_pressed_color", Color(0.08, 0.07, 0.08))
	b.pressed.connect(func(): pressed.emit(id))
	if menu != "":
		if not menus.has(menu):
			menus[menu] = {"buttons": [], "ids": [], "sel": 0}
		var m: Dictionary = menus[menu]
		var idx: int = m["buttons"].size()
		m["buttons"].append(b)
		m["ids"].append(id)
		b.mouse_entered.connect(func(): menu_select(menu, idx))
	return b


# ───────────── 메뉴 (키보드·패드 선택) ─────────────

func menu_select(menu: String, i: int) -> void:
	var m: Dictionary = menus[menu]
	m["sel"] = clampi(i, 0, m["buttons"].size() - 1)
	for k in m["buttons"].size():
		var b: Button = m["buttons"][k]
		var on: bool = k == m["sel"]
		b.add_theme_stylebox_override("normal", st_btn_sel if on else st_btn)
		b.add_theme_color_override("font_color", Color(0.08, 0.07, 0.08) if on else C_TEXT)
	if menu == "title" and title_help != null:
		title_help.text = TITLE_HELP.get(m["ids"][m["sel"]], "")


func menu_move(menu: String, d: int) -> void:
	var m: Dictionary = menus[menu]
	var n: int = m["buttons"].size()
	menu_select(menu, (m["sel"] + d + n) % n)


func menu_activate(menu: String) -> void:
	var m: Dictionary = menus[menu]
	pressed.emit(m["ids"][m["sel"]])


func show_screen(name: String) -> void:
	for k in screens:
		screens[k].visible = (k == name)
	quit_dlg.visible = false


# ───────────── 정보 막대 · 알림 ─────────────

func _build_info() -> void:
	info_panel = PanelContainer.new()
	info_panel.add_theme_stylebox_override("panel", st_dark)
	info_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	info_panel.offset_bottom = 48
	info_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var v := _vbox(0)
	info_panel.add_child(v)
	info_label = _label("", 15)
	info_label.clip_text = true
	v.add_child(info_label)
	info_detail = _label("", 12, f_body, C_DIM)
	info_detail.clip_text = true
	v.add_child(info_detail)
	add_child(info_panel)


func set_info(text: String, detail: String = "") -> void:
	info_label.text = text
	info_detail.text = detail


func _build_toast() -> void:
	toast_panel = PanelContainer.new()
	var sb := _sb(Color(0.05, 0.045, 0.06, 0.9), 10, 16)
	sb.border_color = Color(1, 1, 1, 0.25)
	sb.set_border_width_all(1)
	toast_panel.add_theme_stylebox_override("panel", sb)
	toast_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	toast_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	toast_panel.offset_top = 118
	toast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	toast_label = _label("", 20, f_bold)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_panel.add_child(toast_label)
	toast_panel.visible = false
	add_child(toast_panel)


func toast(text: String, color: Color = C_TEXT, seconds: float = 2.6) -> void:
	toast_label.text = text
	toast_label.add_theme_color_override("font_color", color)
	toast_panel.visible = true
	toast_panel.modulate.a = 1.0
	toast_t = seconds
	# 가운데 정렬을 다시 맞춘다
	toast_panel.reset_size()
	toast_panel.offset_left = -toast_panel.get_combined_minimum_size().x * 0.5
	toast_panel.offset_right = toast_panel.get_combined_minimum_size().x * 0.5


func tick(delta: float) -> void:
	if toast_t > 0.0:
		toast_t -= delta
		toast_panel.modulate.a = clampf(toast_t / 0.4, 0.0, 1.0)
		if toast_t <= 0.0:
			toast_panel.visible = false


# ───────────── 타이틀 ─────────────

func _build_title() -> void:
	var s := _screen("title")
	var shade := TextureRect.new()
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.45, 1.0])
	g.colors = PackedColorArray([Color(0.03, 0.02, 0.03, 0.86), Color(0.03, 0.02, 0.03, 0.55), Color(0.03, 0.02, 0.03, 0.0)])
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(1, 0)
	gt.width = 256
	gt.height = 4
	shade.texture = gt
	shade.stretch_mode = TextureRect.STRETCH_SCALE
	shade.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	shade.set_anchors_and_offsets_preset(Control.PRESET_LEFT_WIDE)
	shade.offset_right = 900
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	s.add_child(shade)
	var v := _vbox(6)
	v.position = Vector2(84, 70)
	s.add_child(v)
	var h := _hbox(18)
	h.alignment = BoxContainer.ALIGNMENT_BEGIN
	var big := _shadowed(_label("합", 150, f_title))
	h.add_child(big)
	var sub := _shadowed(_label("· 시험판", 56, f_title_dot, Color(0.92, 0.88, 0.84)))
	sub.size_flags_vertical = Control.SIZE_SHRINK_END
	sub.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	h.add_child(sub)
	v.add_child(h)
	v.add_child(_shadowed(_label("엔진 시험판 %s — 켜지는지 · 얼마나 빠른지 · 두 명 입력이 되는지" % "0.1.0", 19, f_body, C_DIM)))
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 22)
	v.add_child(gap)
	var mv := _vbox(10)
	for item in [["성능 측정", "bench"], ["두 명 입력 시험", "input"], ["자유롭게 보기", "free"], ["끝내기", "quit"]]:
		var b := _button(item[0], item[1], "title", 26)
		b.custom_minimum_size = Vector2(430, 58)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		mv.add_child(b)
	v.add_child(mv)
	var gap2 := Control.new()
	gap2.custom_minimum_size = Vector2(0, 10)
	v.add_child(gap2)
	title_help = _shadowed(_label("", 17, f_body, C_TEXT))
	title_help.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_help.custom_minimum_size = Vector2(520, 52)
	v.add_child(title_help)
	title_quality = _shadowed(_label("", 19, f_bold))
	v.add_child(title_quality)
	var foot := _shadowed(_label("↑↓ 고르기 · Enter / 패드 A 확인 · Esc 끝내기 · F1 정보 막대 · F11 / Alt+Enter 창 모드", 15, f_body, C_DIM))
	foot.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	foot.offset_left = 84
	foot.offset_top = -40
	foot.offset_bottom = -16
	s.add_child(foot)
	title_pads = _shadowed(_label("", 15, f_body, C_DIM))
	title_pads.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	title_pads.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	title_pads.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	title_pads.offset_left = -700
	title_pads.offset_right = -24
	title_pads.offset_top = -40
	title_pads.offset_bottom = -16
	s.add_child(title_pads)
	menu_select("title", 0)


func set_title_quality(name: String) -> void:
	title_quality.text = "품질 단계:  ◀ %s ▶     (1~4 키 · 십자키 ←→)" % name


func set_title_pads(text: String) -> void:
	title_pads.text = text


func _build_quit() -> void:
	quit_dlg = Control.new()
	quit_dlg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	quit_dlg.visible = false
	add_child(quit_dlg)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	quit_dlg.add_child(dim)
	var p := _panel()
	p.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(460, 0)
	p.offset_left = -230
	p.offset_right = 230
	p.offset_top = -95
	p.offset_bottom = 95
	quit_dlg.add_child(p)
	var v := _vbox(18)
	p.add_child(v)
	var t := _label("끝낼까요?", 34, f_title)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var h := _hbox(16)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	for item in [["끝내기", "quit_yes"], ["취소", "quit_no"]]:
		var b := _button(item[0], item[1], "quit", 22)
		b.custom_minimum_size = Vector2(170, 52)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		h.add_child(b)
	v.add_child(h)
	var hint := _label("←→ 고르기 · Enter / A 확인 · Esc / B 취소", 14, f_body, C_DIM)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(hint)


func show_quit(on: bool) -> void:
	quit_dlg.visible = on
	if on:
		menu_select("quit", 1)


# ───────────── 성능 측정 중 ─────────────

func _build_bench() -> void:
	var s := _screen("bench")
	var p := _panel()
	p.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	p.grow_vertical = Control.GROW_DIRECTION_BEGIN
	p.offset_left = -330
	p.offset_right = 330
	p.offset_bottom = -18
	s.add_child(p)
	var v := _vbox(6)
	p.add_child(v)
	bench_label = _label("성능 측정", 24, f_bold)
	bench_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(bench_label)
	bench_sub = _label("", 16, f_body, C_DIM)
	bench_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(bench_sub)
	bench_bar = ProgressBar.new()
	bench_bar.show_percentage = false
	bench_bar.custom_minimum_size = Vector2(600, 10)
	var bg := _sb(Color(1, 1, 1, 0.12), 4, 0)
	var fill := _sb(Color(0.95, 0.93, 0.89, 0.95), 4, 0)
	bench_bar.add_theme_stylebox_override("background", bg)
	bench_bar.add_theme_stylebox_override("fill", fill)
	bench_bar.max_value = 1.0
	v.add_child(bench_bar)
	var esc := _label("Esc / Start: 그만두고 타이틀로 · 측정 중에는 마우스와 키를 건드리지 마세요", 14, f_body, C_DIM)
	esc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(esc)


func set_bench(step: int, total: int, name: String, t: float, seg: float, warm: float, overall: float) -> void:
	bench_label.text = "성능 측정 중 · %d/%d 단계 「%s」" % [step, total, name]
	var phase := "데우는 중 (앞 %.0f초는 빼고 잽니다)" % warm if t < warm else "재는 중"
	bench_sub.text = "%s · %.1f / %s초" % [phase, minf(t, seg), ("%d" % int(seg)) if is_equal_approx(seg, roundf(seg)) else ("%.1f" % seg)]
	bench_bar.value = overall


# ───────────── 결과 ─────────────

func _build_results() -> void:
	var s := _screen("results")
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.35)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	s.add_child(dim)
	var p := _panel()
	p.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	p.offset_left = -580
	p.offset_right = 580
	p.offset_top = -300
	p.offset_bottom = 290
	s.add_child(p)
	var v := _vbox(8)
	p.add_child(v)
	v.add_child(_label("측정 결과", 36, f_title))
	res_grid = GridContainer.new()
	res_grid.columns = 8
	res_grid.add_theme_constant_override("h_separation", 26)
	res_grid.add_theme_constant_override("v_separation", 4)
	v.add_child(res_grid)
	res_rec = _label("", 22, f_bold, C_OK)
	v.add_child(res_rec)
	res_warn = _label("", 15, f_bold, C_WARN)
	res_warn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	res_warn.custom_minimum_size = Vector2(1100, 0)
	res_warn.visible = false
	v.add_child(res_warn)
	res_sys = _label("", 15, f_body, C_DIM)
	res_sys.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(res_sys)
	res_settings = _label("", 13, f_body, C_DIM)
	res_settings.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	res_settings.custom_minimum_size = Vector2(1100, 0)
	v.add_child(res_settings)
	res_path = _label("", 15, f_body, C_TEXT)
	res_path.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	res_path.custom_minimum_size = Vector2(1100, 0)
	v.add_child(res_path)
	var h := _hbox(14)
	for item in [["결과 복사", "copy"], ["다시 측정", "rerun"], ["타이틀로", "to_title"]]:
		var b := _button(item[0], item[1], "results", 21)
		b.custom_minimum_size = Vector2(190, 50)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		h.add_child(b)
	res_status = _label("", 17, f_bold, C_OK)
	res_status.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(res_status)
	v.add_child(h)
	v.add_child(_label("←→ 고르기 · Enter / A 확인 · Esc / B 타이틀 · [결과 복사] 뒤 대화창에 Ctrl+V", 14, f_body, C_DIM))
	menu_select("results", 0)


func show_results(results: Array, names: Array, rec: int, target: int, sys_text: String, settings_text: String, path_text: String, warn_text: String = "") -> void:
	for c in res_grid.get_children():
		c.queue_free()
	for head in ["단계", "평균 FPS", "1% 하위 FPS", "최장 프레임", "끊김(>50ms)", "처음 5초 끊김", "프레임 수", ""]:
		var l := _label(head, 15, f_bold, C_DIM)
		res_grid.add_child(l)
	for r in results:
		var is_rec: bool = r["preset"] == rec
		var col := C_OK if is_rec else C_TEXT
		var cells := [names[r["preset"]], "%.1f" % r["avg_fps"], "%.1f" % r["p1_low_fps"], "%.1f ms" % r["max_ms"],
			str(r["hitches"]), str(r["hitches_first5s"]), str(r["frames"]), "◀ 추천" if is_rec else ""]
		for i in cells.size():
			var l := _label(cells[i], 21 if i > 0 else 22, f_bold if (i == 0 or i == 1 or is_rec) else f_body, col)
			if i > 0 and i < 7:
				l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			res_grid.add_child(l)
	if rec >= 0:
		res_rec.text = "추천 단계: %s   (평균 FPS ≥ %d 이고 1%% 하위 FPS ≥ 45 인 가장 높은 단계)" % [names[rec], target]
		res_rec.add_theme_color_override("font_color", C_OK)
	else:
		res_rec.text = "추천 단계: 없음 — '낮음'도 기준(평균 ≥ %d, 1%% 하위 ≥ 45)에 못 미칩니다" % target
		res_rec.add_theme_color_override("font_color", C_WARN)
	res_warn.text = warn_text
	res_warn.visible = warn_text != ""
	res_sys.text = sys_text
	res_settings.text = settings_text
	res_path.text = path_text
	res_status.text = ""
	menu_select("results", 0)


func set_results_status(text: String, ok: bool = true) -> void:
	res_status.text = text
	res_status.add_theme_color_override("font_color", C_OK if ok else C_WARN)


# ───────────── 두 명 입력 시험 ─────────────

func _build_input() -> void:
	var s := _screen("input")
	var hp := PanelContainer.new()
	hp.add_theme_stylebox_override("panel", _sb(Color(0.04, 0.035, 0.05, 0.62), 10, 12))
	hp.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	hp.offset_left = -385
	hp.offset_right = 385
	hp.offset_top = 56
	hp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	s.add_child(hp)
	var head := _vbox(0)
	hp.add_child(head)
	var t := _shadowed(_label("두 명 입력 시험", 34, f_title))
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.add_child(t)
	input_hint = _label("쓸 장치에서 아무 버튼이나 누르세요 (패드 Start는 타이틀로 나가기) — 키보드는 왼쪽(WASD) · 오른쪽(방향키) 두 구역", 15, f_body, C_TEXT)
	input_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.add_child(input_hint)
	for i in 2:
		slot_ui.append(_build_slot_panel(s, i))
	var foot := _panel()
	foot.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	foot.offset_left = -490
	foot.offset_right = 490
	foot.offset_top = -66
	foot.offset_bottom = -12
	s.add_child(foot)
	var fh := _hbox(14)
	fh.alignment = BoxContainer.ALIGNMENT_CENTER
	foot.add_child(fh)
	var sw := _button("1P ↔ 2P 바꾸기", "swap", "", 17)
	sw.custom_minimum_size = Vector2(170, 38)
	fh.add_child(sw)
	fh.add_child(_label("Tab · 패드 L3 길게  |  나가기: Back 길게 · Backspace  |  진동: R3  |  Esc · Start: 타이틀", 14, f_body, C_DIM))
	var back := _button("타이틀로", "to_title", "", 17)
	back.custom_minimum_size = Vector2(110, 38)
	fh.add_child(back)


func _build_slot_panel(parent: Control, i: int) -> Dictionary:
	var p := _panel()
	var sb: StyleBoxFlat = st_panel.duplicate()
	sb.border_color = SEAT_COL[i]
	sb.border_width_top = 4
	p.add_theme_stylebox_override("panel", sb)
	if i == 0:
		p.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		p.offset_left = 20
		p.offset_right = 440
	else:
		p.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
		p.offset_left = -440
		p.offset_right = -20
	p.offset_top = 126
	p.offset_bottom = 640
	parent.add_child(p)
	var v := _vbox(7)
	p.add_child(v)
	var hh := _hbox(10)
	hh.add_child(_label(SEAT_NAME[i], 30, f_title_dot, SEAT_COL[i]))
	var status := _label("", 15, f_bold, C_DIM)
	status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	status.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hh.add_child(status)
	v.add_child(hh)
	var dev := _label("", 22, f_bold)
	v.add_child(dev)
	var detail := _label("", 14, f_body, C_DIM)
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail.custom_minimum_size = Vector2(380, 0)
	v.add_child(detail)
	var empty := _label("", 21, f_bold, C_TEXT)
	empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	empty.custom_minimum_size = Vector2(380, 120)
	empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	empty.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	v.add_child(empty)
	var body := _vbox(7)
	v.add_child(body)
	var sticks := _hbox(16)
	var lsv := StickView.new()
	lsv.custom_minimum_size = Vector2(96, 96)
	lsv.accent = SEAT_COL[i]
	var rsv := StickView.new()
	rsv.custom_minimum_size = Vector2(96, 96)
	rsv.accent = Color(1, 1, 1, 0.8)
	var stick_txt := _label("", 14, f_body, C_TEXT)
	stick_txt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	sticks.add_child(lsv)
	sticks.add_child(rsv)
	sticks.add_child(stick_txt)
	body.add_child(sticks)
	var trig := _hbox(8)
	var bars := []
	for nm in ["LT", "RT"]:
		trig.add_child(_label(nm, 14, f_bold, C_DIM))
		var b := ProgressBar.new()
		b.show_percentage = false
		b.max_value = 1.0
		b.custom_minimum_size = Vector2(120, 12)
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		b.add_theme_stylebox_override("background", _sb(Color(1, 1, 1, 0.12), 3, 0))
		b.add_theme_stylebox_override("fill", _sb(SEAT_COL[i], 3, 0))
		trig.add_child(b)
		bars.append(b)
	var trig_txt := _label("", 14, f_body, C_TEXT)
	trig.add_child(trig_txt)
	body.add_child(trig)
	var acts := _hbox(8)
	var act_boxes := {}
	for a in ["atk", "rcv", "dodge", "tag"]:
		var ap := PanelContainer.new()
		ap.add_theme_stylebox_override("panel", _sb(Color(1, 1, 1, 0.08), 6, 8))
		var al := _label(ACT_LABEL[a], 17, f_bold, C_DIM)
		al.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		al.custom_minimum_size = Vector2(70, 0)
		ap.add_child(al)
		acts.add_child(ap)
		act_boxes[a] = [ap, al, 0.0]
	body.add_child(acts)
	var raw := _label("", 14, f_body, C_DIM)
	raw.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	raw.custom_minimum_size = Vector2(380, 40)
	body.add_child(raw)
	var leave := ProgressBar.new()
	leave.show_percentage = false
	leave.max_value = 1.0
	leave.custom_minimum_size = Vector2(380, 8)
	leave.add_theme_stylebox_override("background", _sb(Color(1, 1, 1, 0.1), 3, 0))
	leave.add_theme_stylebox_override("fill", _sb(C_WARN, 3, 0))
	body.add_child(leave)
	var bh := _hbox(10)
	var vib := _button("진동 시험", "vib%d" % i, "", 16)
	vib.custom_minimum_size = Vector2(130, 36)
	var clr := _button("칸 비우기", "clear%d" % i, "", 16)
	clr.custom_minimum_size = Vector2(130, 36)
	bh.add_child(vib)
	bh.add_child(clr)
	v.add_child(bh)
	return {"panel": p, "status": status, "dev": dev, "detail": detail, "empty": empty, "body": body, "ls": lsv, "rs": rsv,
		"stick_txt": stick_txt, "bars": bars, "trig_txt": trig_txt, "acts": act_boxes, "raw": raw, "leave": leave,
		"vib": vib, "clear": clr}


## 칸 하나 갱신. info = router.slots[i] (또는 null), st = router.get_state(i), label = 장치 이름
func update_slot(i: int, info, st: Dictionary, dev_label: String, detail: String, delta: float) -> void:
	var u: Dictionary = slot_ui[i]
	if info == null:
		u["status"].text = "비어 있음"
		u["status"].add_theme_color_override("font_color", C_DIM)
		u["dev"].text = ""
		u["detail"].text = ""
		u["empty"].text = "쓸 장치에서 아무 버튼이나 누르세요\n(패드 Start 말고 · 키보드는 WASD나 방향키 쪽)"
		u["empty"].add_theme_color_override("font_color", C_TEXT)
		u["empty"].visible = true
		u["body"].visible = false
		u["vib"].visible = false
		u["clear"].visible = false
		return
	var pad: bool = info["kind"] == "pad"
	u["dev"].text = dev_label
	u["detail"].text = detail
	u["clear"].visible = true
	u["vib"].visible = pad
	if not info["connected"]:
		u["vib"].visible = false
		u["status"].text = "연결 끊김"
		u["status"].add_theme_color_override("font_color", C_WARN)
		u["empty"].text = "연결 끊김 — 다시 연결하면 이어서\n(안 돌아오면 Backspace · [칸 비우기])"
		u["empty"].add_theme_color_override("font_color", C_WARN)
		u["empty"].visible = true
		u["body"].visible = false
		return
	u["status"].text = "참가 중 · %s" % ("게임패드" if pad else "키보드")
	u["status"].add_theme_color_override("font_color", SEAT_COL[i])
	u["empty"].visible = false
	u["body"].visible = true
	var mv: Vector2 = st["move"]
	var ls: Vector2 = st["lstick"]
	(u["ls"] as Control).call("set_values", ls if pad else mv, mv)
	(u["rs"] as Control).call("set_values", st["rstick"], Vector2.ZERO)
	(u["rs"] as Control).visible = pad
	if pad:
		u["stick_txt"].text = "왼쪽 스틱 %+.2f, %+.2f\n오른쪽 스틱 %+.2f, %+.2f\n이동 %+.2f, %+.2f  (크기 %.2f)" % [ls.x, ls.y, st["rstick"].x, st["rstick"].y, mv.x, mv.y, mv.length()]
	else:
		u["stick_txt"].text = "이동 %+.2f, %+.2f\n크기 %.2f (대각선도 1 이하)" % [mv.x, mv.y, mv.length()]
	u["bars"][0].value = st["lt"]
	u["bars"][1].value = st["rt"]
	u["bars"][0].get_parent().visible = pad
	u["trig_txt"].text = "%.2f / %.2f" % [st["lt"], st["rt"]]
	for a in u["acts"]:
		var box: Array = u["acts"][a]
		if st["pressed"][a]:
			box[2] = 0.18
		box[2] = maxf(0.0, box[2] - delta)
		var on: bool = st["held"][a] or box[2] > 0.0
		var sb: StyleBoxFlat = (box[0] as PanelContainer).get_theme_stylebox("panel")
		sb.bg_color = SEAT_COL[i] if on else Color(1, 1, 1, 0.08)
		(box[1] as Label).add_theme_color_override("font_color", Color(0.06, 0.05, 0.06) if on else C_DIM)
	var raw_txt := ""
	if pad:
		var bl: Array = st["raw_buttons"]
		raw_txt = "누른 버튼 번호: %s" % (" ".join(bl.map(func(x): return str(x))) if bl.size() > 0 else "—")
		var ax := []
		for pair in st["raw_axes"]:
			ax.append("%d:%+.2f" % [pair[0], pair[1]])
		raw_txt += "\n축: " + "  ".join(ax)
	else:
		var kl: Array = st["raw_buttons"]
		raw_txt = "누른 키: %s" % (" ".join(kl) if kl.size() > 0 else "—")
	u["raw"].text = raw_txt
	u["leave"].value = clampf(st["leave_t"] / 1.0, 0.0, 1.0)
	u["leave"].visible = pad and st["leave_t"] > 0.0


# ───────────── 자유롭게 보기 ─────────────

func _build_free() -> void:
	var s := _screen("free")
	for i in 2:
		var p := PanelContainer.new()
		var sb := _sb(Color(0.05, 0.045, 0.06, 0.78), 8, 12)
		sb.border_color = SEAT_COL[i]
		sb.border_width_left = 4 if i == 0 else 0
		sb.border_width_right = 4 if i == 1 else 0
		p.add_theme_stylebox_override("panel", sb)
		if i == 0:
			p.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
			p.offset_left = 18
			p.offset_top = -64
			p.offset_bottom = -16
		else:
			p.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
			p.grow_horizontal = Control.GROW_DIRECTION_BEGIN
			p.offset_right = -18
			p.offset_top = -64
			p.offset_bottom = -16
		var l := _label("", 17, f_bold)
		p.add_child(l)
		s.add_child(p)
		free_chips.append(l)
	var hp := PanelContainer.new()
	hp.add_theme_stylebox_override("panel", _sb(Color(0.05, 0.045, 0.06, 0.7), 8, 12))
	hp.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	hp.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	hp.offset_right = -18
	hp.offset_top = 58
	s.add_child(hp)
	var hv := _vbox(2)
	hp.add_child(hv)
	free_quality = _label("", 20, f_bold)
	hv.add_child(free_quality)
	free_hint = _label("1~4 · 십자키 ←→: 품질\n공격: 이펙트 · 둘이 함께 공격: 합\n아무 버튼: 참가 · Esc / Start: 타이틀", 15, f_body, C_DIM)
	hv.add_child(free_hint)
	var back := _button("타이틀로 (Esc)", "to_title", "", 16)
	back.custom_minimum_size = Vector2(150, 34)
	hv.add_child(back)


func update_free(i: int, text: String, active: bool) -> void:
	free_chips[i].text = text
	free_chips[i].add_theme_color_override("font_color", C_TEXT if active else C_DIM)


func set_free_quality(name: String) -> void:
	free_quality.text = "자유롭게 보기 · 품질 %s" % name
