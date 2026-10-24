## 정적 검사: 프로젝트의 모든 .gd 를 불러 파싱·컴파일 오류를 센다.
##   godot --headless --path <프로젝트> --script res://tools/check_scripts.gd
extends SceneTree


func _walk(dir: String, out: Array) -> void:
	var d := DirAccess.open(dir)
	if d == null:
		return
	d.list_dir_begin()
	var n := d.get_next()
	while n != "":
		if not n.begins_with("."):
			var p := dir.path_join(n)
			if d.current_is_dir():
				_walk(p, out)
			elif n.ends_with(".gd"):
				out.append(p)
			elif n.ends_with(".gdshader"):
				out.append(p)
		n = d.get_next()


func _init() -> void:
	var files: Array = []
	_walk("res://", files)
	files.sort()
	var bad := 0
	for f in files:
		var r = load(f)
		var ok := r != null
		if ok and r is GDScript:
			ok = (r as GDScript).can_instantiate()
		print("%s %s" % ["OK  " if ok else "FAIL", f])
		if not ok:
			bad += 1
	print("CHECK files=%d errors=%d" % [files.size(), bad])
	quit(0 if bad == 0 else 1)
