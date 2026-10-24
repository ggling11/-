## 시스템 정보 (결과 텍스트와 정보 막대에 쓴다).
extends RefCounted

const VERSION := "0.1.0"


static func driver_key() -> String:
	return RenderingServer.get_current_rendering_driver_name()


static func driver_name() -> String:
	var d := driver_key()
	match d:
		"vulkan":
			return "Vulkan"
		"d3d12":
			return "Direct3D 12"
		"opengl3", "opengl3_es":
			return "OpenGL"
		"opengl3_angle":
			return "OpenGL (ANGLE)"
		"metal":
			return "Metal"
		"dummy", "":
			return "없음 (headless)"
		_:
			return d


static func method_name() -> String:
	match RenderingServer.get_current_rendering_method():
		"forward_plus":
			return "Forward+"
		"mobile":
			return "Mobile"
		"gl_compatibility":
			return "호환(Compatibility)"
		var m:
			return str(m)


static func gpu_name() -> String:
	var n := RenderingServer.get_video_adapter_name()
	return n if n != "" else "(알 수 없음)"


static func gpu_vendor() -> String:
	return RenderingServer.get_video_adapter_vendor()


static func gpu_type() -> String:
	match RenderingServer.get_video_adapter_type():
		RenderingDevice.DEVICE_TYPE_DISCRETE_GPU:
			return "외장"
		RenderingDevice.DEVICE_TYPE_INTEGRATED_GPU:
			return "내장"
		RenderingDevice.DEVICE_TYPE_VIRTUAL_GPU:
			return "가상"
		RenderingDevice.DEVICE_TYPE_CPU:
			return "CPU 소프트웨어"
		_:
			return "종류 모름"


static func api_version() -> String:
	return RenderingServer.get_video_adapter_api_version()


static func driver_info() -> String:
	var a := OS.get_video_adapter_driver_info()
	return " ".join(a) if a.size() > 0 else ""


static func os_text() -> String:
	var alias := OS.get_version_alias()
	var base := OS.get_name()
	if OS.get_name() == "Linux" or OS.get_name() == "FreeBSD":
		base = "%s (%s)" % [OS.get_distribution_name(), OS.get_name()]
	return "%s %s" % [base, alias if alias != "" else OS.get_version()]


static func cpu_text() -> String:
	return "%s (%d 스레드)" % [OS.get_processor_name(), OS.get_processor_count()]


static func godot_text() -> String:
	var v := Engine.get_version_info()
	return "%s [%s]" % [v.get("string", "?"), str(v.get("hash", "")).substr(0, 9)]


static func godot_short() -> String:
	var v := Engine.get_version_info()
	return "%d.%d.%d.%s" % [v.get("major", 0), v.get("minor", 0), v.get("patch", 0), v.get("status", "")]


static func refresh_rate() -> float:
	var r := DisplayServer.screen_get_refresh_rate()
	return r if r > 0.0 else 0.0


static func window_size() -> Vector2i:
	return DisplayServer.window_get_size()


static func screen_size() -> Vector2i:
	return DisplayServer.screen_get_size()


static func window_mode_text() -> String:
	match DisplayServer.window_get_mode():
		DisplayServer.WINDOW_MODE_FULLSCREEN:
			return "전체 화면"
		DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN:
			return "전체 화면(독점)"
		DisplayServer.WINDOW_MODE_MAXIMIZED:
			return "창(최대화)"
		_:
			return "창"


static func vsync_text(mode: int) -> String:
	match mode:
		DisplayServer.VSYNC_DISABLED:
			return "끔"
		DisplayServer.VSYNC_ENABLED:
			return "켬"
		DisplayServer.VSYNC_ADAPTIVE:
			return "적응형"
		DisplayServer.VSYNC_MAILBOX:
			return "메일박스"
		_:
			return str(mode)


static func vsync_key(mode: int) -> String:
	match mode:
		DisplayServer.VSYNC_DISABLED:
			return "off"
		DisplayServer.VSYNC_ENABLED:
			return "on"
		DisplayServer.VSYNC_ADAPTIVE:
			return "adaptive"
		DisplayServer.VSYNC_MAILBOX:
			return "mailbox"
		_:
			return str(mode)


static func gpu_line() -> String:
	var parts := [gpu_name()]
	var extra := []
	if gpu_vendor() != "":
		extra.append(gpu_vendor())
	extra.append(gpu_type())
	return "%s (%s)" % [parts[0], ", ".join(extra)]


static func driver_line() -> String:
	var s := "%s · %s" % [driver_name(), method_name()]
	if api_version() != "":
		s += " · API %s" % api_version()
	if driver_info() != "":
		s += " · 드라이버 %s" % driver_info()
	return s
