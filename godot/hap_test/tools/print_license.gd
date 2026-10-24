## Godot 엔진 라이선스 문구(MIT)와 엔진에 들어간 제3자 구성 요소 목록을 텍스트로 뽑는다 (배포 묶음에 넣는다).
##   godot --headless --path <프로젝트> --script res://tools/print_license.gd -- <출력 파일>
extends SceneTree


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var out := args[0] if args.size() > 0 else "GODOT_LICENSE.txt"
	var L := PackedStringArray()
	L.append("This game uses Godot Engine, available under the following license:")
	L.append("")
	L.append(Engine.get_license_text())
	L.append("")
	L.append("Godot Engine third-party components and their licenses:")
	L.append("")
	var lic := Engine.get_license_info()
	for info in Engine.get_copyright_info():
		L.append("- %s" % info["name"])
		for part in info["parts"]:
			for c in part["copyright"]:
				L.append("    Copyright %s" % c)
			L.append("    License: %s" % part["license"])
	L.append("")
	for k in lic:
		L.append("----- %s -----" % k)
		L.append(lic[k])
		L.append("")
	var f := FileAccess.open(out, FileAccess.WRITE)
	f.store_string("\n".join(L))
	f.close()
	print("LICENSE written: %s (%d lines)" % [out, L.size()])
	quit(0)
