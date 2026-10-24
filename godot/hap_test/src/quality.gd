## 품질 단계 4개 (지시서 2.2). 실제로 적용한 값을 엔진에서 다시 읽어 돌려준다 (정보 막대·결과 텍스트에 그대로 적는다).
extends RefCounted

const NAMES := ["낮음", "중간", "높음", "최고"]
const KEYS := ["low", "mid", "high", "max"]

const PRESETS := [
	{"scale": 0.67, "fsr": true, "msaa": Viewport.MSAA_DISABLED, "fxaa": true, "taa": false,
		"sh_size": 1024, "sh_dist": 30.0, "sh_soft": RenderingServer.SHADOW_QUALITY_SOFT_VERY_LOW, "sh_angular": 0.0,
		"ssao": -1, "ssao_half": true, "vfog": false, "lantern_sh": false, "foliage": 0.5, "screen_fx": false},
	{"scale": 0.85, "fsr": true, "msaa": Viewport.MSAA_DISABLED, "fxaa": true, "taa": false,
		"sh_size": 2048, "sh_dist": 40.0, "sh_soft": RenderingServer.SHADOW_QUALITY_SOFT_LOW, "sh_angular": 0.0,
		"ssao": RenderingServer.ENV_SSAO_QUALITY_LOW, "ssao_half": true, "vfog": false, "lantern_sh": false, "foliage": 1.0, "screen_fx": false},
	{"scale": 1.0, "fsr": false, "msaa": Viewport.MSAA_2X, "fxaa": false, "taa": false,
		"sh_size": 4096, "sh_dist": 50.0, "sh_soft": RenderingServer.SHADOW_QUALITY_SOFT_LOW, "sh_angular": 0.0,
		"ssao": RenderingServer.ENV_SSAO_QUALITY_MEDIUM, "ssao_half": true, "vfog": true, "lantern_sh": false, "foliage": 1.0, "screen_fx": true},
	{"scale": 1.0, "fsr": false, "msaa": Viewport.MSAA_4X, "fxaa": false, "taa": false,
		"sh_size": 4096, "sh_dist": 60.0, "sh_soft": RenderingServer.SHADOW_QUALITY_SOFT_HIGH, "sh_angular": 1.0,
		"ssao": RenderingServer.ENV_SSAO_QUALITY_HIGH, "ssao_half": false, "vfog": true, "lantern_sh": true, "foliage": 1.0, "screen_fx": true},
]

const SOFT_NAMES := {0: "단단함", 1: "매우 낮음", 2: "낮음", 3: "보통", 4: "높음", 5: "아주 높음"}
const SSAO_NAMES := {0: "매우 낮음", 1: "낮음", 2: "보통", 3: "높음", 4: "아주 높음"}


static func is_compat() -> bool:
	return RenderingServer.get_current_rendering_method() == "gl_compatibility"


## 적용하고, 엔진에서 다시 읽은 값을 돌려준다.
## foliage: [[MultiMeshInstance3D, 전체 개수, 이름], ...]
static func apply(i: int, vp: Viewport, env: Environment, sun: DirectionalLight3D, lanterns: Array, foliage: Array, screen_fx: CanvasItem) -> Dictionary:
	var p: Dictionary = PRESETS[i]
	var compat := is_compat()
	# 3D 렌더 배율 + 업스케일
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR if (p["fsr"] and not compat) else Viewport.SCALING_3D_MODE_BILINEAR
	vp.scaling_3d_scale = p["scale"]
	vp.fsr_sharpness = 0.2
	# 안티에일리어싱
	vp.msaa_3d = p["msaa"]
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if (p["fxaa"] and not compat) else Viewport.SCREEN_SPACE_AA_DISABLED
	vp.use_taa = p["taa"] and not compat
	# 해 그림자
	RenderingServer.directional_shadow_atlas_set_size(p["sh_size"], true)
	RenderingServer.directional_soft_shadow_filter_set_quality(p["sh_soft"])
	RenderingServer.positional_soft_shadow_filter_set_quality(p["sh_soft"])
	sun.directional_shadow_max_distance = p["sh_dist"]
	sun.light_angular_distance = p["sh_angular"]
	# SSAO
	env.ssao_enabled = p["ssao"] >= 0 and not compat
	if p["ssao"] >= 0:
		RenderingServer.environment_set_ssao_quality(p["ssao"], p["ssao_half"], 0.5, 2, 50.0, 300.0)
	# 볼류메트릭 안개
	env.volumetric_fog_enabled = p["vfog"] and not compat
	# 석등 그림자
	for l in lanterns:
		(l as OmniLight3D).shadow_enabled = p["lantern_sh"]
	vp.positional_shadow_atlas_size = 4096 if p["lantern_sh"] else 1024
	# 풀·낙엽
	var fol := []
	for f in foliage:
		var mmi: MultiMeshInstance3D = f[0]
		var full: int = f[1]
		var n := full if p["foliage"] >= 1.0 else int(round(full * p["foliage"]))
		mmi.multimesh.visible_instance_count = -1 if n >= full else n
		var shown: int = mmi.multimesh.visible_instance_count
		fol.append([f[2], full if shown < 0 else shown, full])
	# 화면 셰이더
	screen_fx.visible = p["screen_fx"]
	# ── 다시 읽기 ──
	return {
		"index": i, "name": NAMES[i], "key": KEYS[i], "compat": compat,
		"scale": vp.scaling_3d_scale,
		"scale_mode": _scale_mode_name(vp.scaling_3d_mode),
		"msaa": _msaa_name(vp.msaa_3d),
		"ssaa": "FXAA" if vp.screen_space_aa == Viewport.SCREEN_SPACE_AA_FXAA else "",
		"taa": vp.use_taa,
		"sh_size": p["sh_size"],
		"sh_dist": sun.directional_shadow_max_distance,
		"sh_soft": SOFT_NAMES.get(p["sh_soft"], str(p["sh_soft"])),
		"sh_angular": sun.light_angular_distance,
		"ssao": env.ssao_enabled,
		"ssao_q": SSAO_NAMES.get(p["ssao"], "") if env.ssao_enabled else "",
		"ssao_half": p["ssao_half"],
		"vfog": env.volumetric_fog_enabled,
		"lantern_sh": (lanterns[0] as OmniLight3D).shadow_enabled if lanterns.size() > 0 else false,
		"foliage": fol,
		"screen_fx": screen_fx.visible,
		"want_ssao": p["ssao"] >= 0, "want_vfog": p["vfog"], "want_fxaa": p["fxaa"],
	}


static func _scale_mode_name(m: int) -> String:
	match m:
		Viewport.SCALING_3D_MODE_FSR:
			return "FSR 1"
		Viewport.SCALING_3D_MODE_FSR2:
			return "FSR 2"
		Viewport.SCALING_3D_MODE_BILINEAR:
			return "선형"
		_:
			return str(m)


static func _msaa_name(m: int) -> String:
	match m:
		Viewport.MSAA_2X:
			return "MSAA 2x"
		Viewport.MSAA_4X:
			return "MSAA 4x"
		Viewport.MSAA_8X:
			return "MSAA 8x"
		_:
			return ""


static func aa_text(a: Dictionary) -> String:
	var parts := []
	if a["msaa"] != "":
		parts.append(a["msaa"])
	if a["ssaa"] != "":
		parts.append(a["ssaa"])
	if a["taa"]:
		parts.append("TAA")
	if a.get("want_fxaa", false) and a["ssaa"] == "":
		parts.append("FXAA 미지원(호환 렌더러)")
	return " + ".join(parts) if parts.size() > 0 else "끔"


## 사람이 읽는 한 줄.
static func describe(a: Dictionary) -> String:
	var scale_txt := "%.2f" % a["scale"]
	if a["scale"] < 0.999:
		scale_txt += " (%s)" % a["scale_mode"]
	var sh := "%dpx · %dm · 부드러움 %s" % [a["sh_size"], int(a["sh_dist"]), a["sh_soft"]]
	if a["sh_angular"] > 0.0:
		sh += " · 반그림자 %.1f°" % a["sh_angular"]
	var ssao := ("켬 (%s%s)" % [a["ssao_q"], ", 절반 해상도" if a["ssao_half"] else ""]) if a["ssao"] else "끔"
	if a["want_ssao"] and not a["ssao"]:
		ssao = "끔 (호환 렌더러 미지원)"
	var vf := "켬" if a["vfog"] else "끔"
	if a["want_vfog"] and not a["vfog"]:
		vf = "끔 (호환 렌더러 미지원)"
	var fol := []
	for f in a["foliage"]:
		fol.append("%s %d/%d" % [f[0], f[1], f[2]])
	return "렌더 배율 %s · AA %s · 해 그림자 %s · SSAO %s · 볼류메트릭 안개 %s · 석등 그림자 %s · %s · 화면 셰이더 %s" % [
		scale_txt, aa_text(a), sh, ssao, vf, "켬" if a["lantern_sh"] else "끔", " · ".join(fol), "켬" if a["screen_fx"] else "끔"]


## 기계가 읽는 key=value 줄들.
static func kv(a: Dictionary) -> PackedStringArray:
	var k: String = a["key"]
	var out := PackedStringArray()
	out.append("%s.render_scale=%.2f" % [k, a["scale"]])
	out.append("%s.upscale=%s" % [k, "fsr1" if a["scale_mode"] == "FSR 1" else "bilinear"])
	out.append("%s.aa=%s" % [k, aa_text(a).replace(" + ", "+").replace(" ", "").to_lower().replace("끔", "off")])
	out.append("%s.sun_shadow_size=%d" % [k, a["sh_size"]])
	out.append("%s.sun_shadow_distance=%d" % [k, int(a["sh_dist"])])
	out.append("%s.sun_shadow_angular=%.1f" % [k, a["sh_angular"]])
	out.append("%s.ssao=%s" % [k, "on" if a["ssao"] else "off"])
	out.append("%s.volumetric_fog=%s" % [k, "on" if a["vfog"] else "off"])
	out.append("%s.lantern_shadows=%s" % [k, "on" if a["lantern_sh"] else "off"])
	for f in a["foliage"]:
		out.append("%s.%s=%d" % [k, "grass" if f[0] == "풀" else "leaves", f[1]])
	out.append("%s.screen_shader=%s" % [k, "on" if a["screen_fx"] else "off"])
	return out


## 정보 막대용 짧은 한 줄.
static func short(a: Dictionary) -> String:
	var fol := []
	for f in a["foliage"]:
		fol.append("%s %d" % [f[0], f[1]])
	var ssao := ("SSAO %s" % a["ssao_q"]) if a["ssao"] else "SSAO 끔"
	return "렌더 배율 %.2f%s · AA %s · 해 그림자 %d/%dm%s · %s · 볼류메트릭 안개 %s · 석등 그림자 %s · %s · 화면 셰이더 %s" % [
		a["scale"], (" " + a["scale_mode"]) if a["scale"] < 0.999 else "", aa_text(a), a["sh_size"], int(a["sh_dist"]),
		" 부드럽게" if a["sh_angular"] > 0.0 else "", ssao, "켬" if a["vfog"] else "끔", "켬" if a["lantern_sh"] else "끔",
		" ".join(PackedStringArray(fol)), "켬" if a["screen_fx"] else "끔"]
