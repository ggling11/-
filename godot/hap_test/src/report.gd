## 결과 텍스트 (사람이 읽는 표 + 기계가 읽는 key=value 묶음).
extends RefCounted

const Quality = preload("res://src/quality.gd")
const SysInfo = preload("res://src/sysinfo.gd")
const Bench = preload("res://src/bench.gd")


static func _pad(s: String, w: int, right: bool = false) -> String:
	var n := s.length()
	# 한글은 고정폭 글꼴에서 두 칸을 차지하므로 너비를 두 배로 센다
	for ch in s:
		if ch.unicode_at(0) >= 0x1100:
			n += 1
	if n >= w:
		return s
	return (" ".repeat(w - n) + s) if right else (s + " ".repeat(w - n))


## 모든 단계의 평균 FPS가 주사율 근처에 붙어 있으면 (그래픽 드라이버의 수직 동기화 · 프레임 제한 의심) true.
## Godot는 드라이버 설정에서 강제로 켠 수직 동기화나 프레임 제한을 알 수 없다.
static func cap_suspected(res: Array, refresh: float) -> bool:
	if refresh <= 0.0 or res.size() < 2:
		return false
	var lo := INF
	var hi := 0.0
	for r in res:
		lo = minf(lo, r["avg_fps"])
		hi = maxf(hi, r["avg_fps"])
	return hi <= refresh * 1.02 and lo >= refresh * 0.85 and (hi - lo) <= hi * 0.04


static func cap_warning(res: Array, refresh: float) -> String:
	if not cap_suspected(res, refresh):
		return ""
	return "주의: 모든 단계의 평균 FPS가 주사율(%d Hz) 근처에 묶여 있습니다 — 그래픽 드라이버 설정에서 수직 동기화나 프레임 제한이 켜져 있을 수 있습니다. 이 경우 추천 단계는 실제보다 낮게 나옵니다." % roundi(refresh)


static func build(b: Bench, quick: bool, vsync_mode: int) -> String:
	var vsync_during := SysInfo.vsync_text(vsync_mode)
	var refresh := SysInfo.refresh_rate()
	var rec := Bench.recommend(b.results, refresh)
	var target := maxf(60.0, roundf(refresh))
	var ws := SysInfo.window_size()
	var ss := SysInfo.screen_size()
	var L := PackedStringArray()
	L.append("합 시험판 결과 (이 글 전체를 복사해서 대화에 붙여 넣어 주세요)")
	L.append("==========================================================")
	L.append("시험판: %s%s · Godot %s" % [SysInfo.VERSION, " (빠른 측정)" if quick else "", SysInfo.godot_text()])
	L.append("측정 시각: %s ~ %s" % [b.started_at, b.finished_at])
	L.append("OS: %s" % SysInfo.os_text())
	L.append("CPU: %s" % SysInfo.cpu_text())
	L.append("GPU: %s" % SysInfo.gpu_line())
	L.append("그래픽 드라이버: %s" % SysInfo.driver_line())
	L.append("해상도: %d×%d (%s) · 모니터 %d×%d · 주사율 %s" % [ws.x, ws.y, SysInfo.window_mode_text(), ss.x, ss.y,
		("%d Hz" % roundi(refresh)) if refresh > 0.0 else "알 수 없음"])
	L.append("측정 방식: 단계마다 %s초 (앞 %s초는 데우기라 뺌) · 측정 중 수직 동기화 %s" % [_num(b.seg_time), _num(b.warmup), vsync_during])
	L.append("  1% 하위 FPS = 측정 구간 프레임 중 가장 긴 1%(최소 1프레임)의 평균 시간을 FPS로 바꾼 값")
	L.append("  끊김 = 50ms를 넘은 프레임 · 처음 5초 끊김 = 단계를 바꾼 순간(데우기 포함)부터 5초 안")
	L.append("")
	L.append("%s%s%s%s%s%s%s" % [_pad("단계", 6), _pad("평균FPS", 10, true), _pad("1%하위", 10, true), _pad("최장ms", 9, true),
		_pad("끊김", 7, true), _pad("처음5초", 9, true), _pad("프레임", 9, true)])
	for r in b.results:
		L.append("%s%s%s%s%s%s%s" % [_pad(Quality.NAMES[r["preset"]], 6), _pad("%.1f" % r["avg_fps"], 10, true),
			_pad("%.1f" % r["p1_low_fps"], 10, true), _pad("%.1f" % r["max_ms"], 9, true), _pad(str(r["hitches"]), 7, true),
			_pad(str(r["hitches_first5s"]), 9, true), _pad(str(r["frames"]), 9, true)])
	L.append("")
	if rec >= 0:
		L.append("추천 단계: %s  (기준: 평균 FPS ≥ %d, 1%% 하위 FPS ≥ 45 인 가장 높은 단계)" % [Quality.NAMES[rec], int(target)])
	else:
		L.append("추천 단계: 없음 — '낮음'도 기준(평균 FPS ≥ %d, 1%% 하위 ≥ 45)에 못 미칩니다" % int(target))
	var warn := cap_warning(b.results, refresh)
	if warn != "":
		L.append(warn)
	L.append("")
	L.append("그리기 부하 (각 단계 마지막 프레임): " + " · ".join(PackedStringArray(b.results.map(func(r): return "%s 그리기 %d회 / 삼각형 %d / 물체 %d / VRAM %.0fMB" % [
		Quality.NAMES[r["preset"]], r.get("draw_calls", 0), r.get("primitives", 0), r.get("objects", 0), r.get("vram_mb", 0.0)]))))
	L.append("  ※ 삼각형 수는 프로토타입(약 13만 2천 개)보다 적습니다 — 대역과 소품이 기본 도형이라 정점·그림자 쪽 부하는 실제 게임보다 가볍습니다.")
	L.append("    픽셀 쪽 부하(해상도 · MSAA · SSAO · 볼류메트릭 안개 · 블룸 · 화면 셰이더 · 그림자 크기)는 실제 게임 기준으로 넣었습니다.")
	L.append("")
	L.append("단계별 실제 설정:")
	for a in b.applied:
		L.append("- %s: %s" % [a["name"], Quality.describe(a)])
	L.append("")
	L.append("--- 기계용 (key=value) ---")
	for line in machine_block(b, rec, refresh, quick, vsync_mode):
		L.append(line)
	L.append("--- 끝 ---")
	return "\n".join(L) + "\n"


static func _num(v: float) -> String:
	return ("%d" % int(v)) if is_equal_approx(v, roundf(v)) else ("%.1f" % v)


static func _window_mode_key() -> String:
	match DisplayServer.window_get_mode():
		DisplayServer.WINDOW_MODE_FULLSCREEN:
			return "fullscreen"
		DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN:
			return "exclusive_fullscreen"
		DisplayServer.WINDOW_MODE_MAXIMIZED:
			return "maximized"
		_:
			return "windowed"


static func _gpu_type_key() -> String:
	match RenderingServer.get_video_adapter_type():
		RenderingDevice.DEVICE_TYPE_DISCRETE_GPU:
			return "discrete"
		RenderingDevice.DEVICE_TYPE_INTEGRATED_GPU:
			return "integrated"
		RenderingDevice.DEVICE_TYPE_VIRTUAL_GPU:
			return "virtual"
		RenderingDevice.DEVICE_TYPE_CPU:
			return "cpu"
		_:
			return "other"


static func _clean(s: String) -> String:
	return s.replace("\n", " ").replace("=", "-").strip_edges()


static func machine_block(b: Bench, rec: int, refresh: float, quick: bool, vsync_mode: int) -> PackedStringArray:
	var ws := SysInfo.window_size()
	var ss := SysInfo.screen_size()
	var out := PackedStringArray()
	out.append("hap_test_version=%s" % SysInfo.VERSION)
	out.append("quick=%s" % ("1" if quick else "0"))
	out.append("godot=%s" % SysInfo.godot_short())
	out.append("os=%s" % _clean(OS.get_name()))
	out.append("os_version=%s" % _clean(OS.get_version()))
	out.append("cpu=%s" % _clean(OS.get_processor_name()))
	out.append("cpu_threads=%d" % OS.get_processor_count())
	out.append("gpu=%s" % _clean(RenderingServer.get_video_adapter_name()))
	out.append("gpu_vendor=%s" % _clean(RenderingServer.get_video_adapter_vendor()))
	out.append("gpu_type=%s" % _gpu_type_key())
	out.append("driver=%s" % _clean(RenderingServer.get_current_rendering_driver_name()))
	out.append("rendering_method=%s" % _clean(RenderingServer.get_current_rendering_method()))
	out.append("api_version=%s" % _clean(RenderingServer.get_video_adapter_api_version()))
	out.append("driver_version=%s" % _clean(" ".join(OS.get_video_adapter_driver_info())))
	out.append("resolution=%dx%d" % [ws.x, ws.y])
	out.append("screen=%dx%d" % [ss.x, ss.y])
	out.append("refresh_hz=%d" % roundi(refresh))
	out.append("window_mode=%s" % _window_mode_key())
	out.append("vsync_during_bench=%s" % SysInfo.vsync_key(vsync_mode))
	out.append("fps_cap_suspected=%d" % (1 if cap_suspected(b.results, refresh) else 0))
	out.append("segment_seconds=%.1f" % b.seg_time)
	out.append("warmup_seconds=%.1f" % b.warmup)
	out.append("p1_low_definition=mean_of_slowest_1pct_frames")
	for i in b.results.size():
		var r: Dictionary = b.results[i]
		var k: String = Quality.KEYS[r["preset"]]
		out.append("%s.avg_fps=%.1f" % [k, r["avg_fps"]])
		out.append("%s.p1_low_fps=%.1f" % [k, r["p1_low_fps"]])
		out.append("%s.max_frame_ms=%.2f" % [k, r["max_ms"]])
		out.append("%s.hitches_over_50ms=%d" % [k, r["hitches"]])
		out.append("%s.hitches_first_5s=%d" % [k, r["hitches_first5s"]])
		out.append("%s.frames=%d" % [k, r["frames"]])
		out.append("%s.first_frame_ms=%.1f" % [k, r["first_frame_ms"]])
		out.append("%s.draw_calls=%d" % [k, r.get("draw_calls", 0)])
		out.append("%s.primitives=%d" % [k, r.get("primitives", 0)])
		out.append("%s.vram_mb=%.0f" % [k, r.get("vram_mb", 0.0)])
		if i < b.applied.size():
			for line in Quality.kv(b.applied[i]):
				out.append(line)
	out.append("recommended=%s" % (Quality.KEYS[rec] if rec >= 0 else "none"))
	return out
