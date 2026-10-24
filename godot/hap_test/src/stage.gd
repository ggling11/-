## 노을 마당 (모비드 메탈 무대 흉내).
## 정적 배경을 거대한 덩어리 하나로 합치지 않는다: 조각마다 MeshInstance3D라서 화면·그림자 컬링이 된다.
## 크기는 프로토타입과 같다 (아레나 반지름 14, 마당 원판 16.5, 난간 15.3).
extends Node3D

const ARENA_R := 14.0
const S2 := 0.70710678
const FWD := Vector3(-S2, 0.0, -S2)      # 화면 위쪽 (카메라에서 멀어지는 쪽)
const RIGHT := Vector3(S2, 0.0, -S2)     # 화면 오른쪽
const GRASS_N := 900
const LEAVES_N := 1500
const FALLING_N := 70

var sun_dir := Vector3(-0.55, 0.6, -0.75).normalized()   # 해 쪽 (고도 약 33°, 보스 너머 오른쪽 위)
var lanterns: Array[OmniLight3D] = []
var grass_mmi: MultiMeshInstance3D
var leaves_mmi: MultiMeshInstance3D
var falling: GPUParticles3D
var piece_count := 0
var rng := RandomNumberGenerator.new()
var M := {}
var _boxes := {}
var _rock_mesh: SphereMesh


static func to_w(along: float, side: float) -> Vector3:
	return FWD * along + RIGHT * side


func build() -> void:
	rng.seed = 4242
	for n in ["plaza", "outer", "stone", "rock", "steel", "ceramic", "frame", "lacquer", "wood", "bark", "roof",
			"evergreen", "maple_red", "maple_orange", "neon_ring", "lantern_glow", "leaf", "grass", "light_shaft"]:
		M[n] = load("res://materials/%s.tres" % n)
	_rock_mesh = SphereMesh.new()
	_rock_mesh.radius = 0.5
	_rock_mesh.height = 1.0
	_rock_mesh.radial_segments = 9
	_rock_mesh.rings = 5
	_ground()
	_balustrade()
	_steel_plates()
	_lanterns()
	_terrace()
	_machine_ring()
	_armor_pieces()
	_rocks()
	_trees()
	_foliage()
	_falling_leaves()
	_light_shafts()


# ───────────── 도우미 ─────────────

func _box(size: Vector3) -> BoxMesh:
	var key := "%.3f,%.3f,%.3f" % [size.x, size.y, size.z]
	if not _boxes.has(key):
		var b := BoxMesh.new()
		b.size = size
		_boxes[key] = b
	return _boxes[key]


func _mi(mesh: Mesh, mat: Material, pos: Vector3, rot: Vector3 = Vector3.ZERO, parent: Node3D = null, shadow: bool = true, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = mesh
	m.material_override = mat
	m.position = pos
	m.rotation = rot
	m.scale = scl
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	(parent if parent != null else self).add_child(m)
	piece_count += 1
	return m


func _rock(pos: Vector3, size: float, rot_y: float, flat: float = 0.6, mat_name: String = "rock") -> MeshInstance3D:
	var s := Vector3(size * (0.9 + rng.randf() * 0.4), size * flat, size * (0.8 + rng.randf() * 0.4))
	return _mi(_rock_mesh, M[mat_name], pos, Vector3(rng.randf() * 0.3, rot_y, rng.randf() * 0.3), null, true, s)


# ───────────── 바닥 ─────────────

func _ground() -> void:
	var outer := PlaneMesh.new()
	outer.size = Vector2(220, 220)
	_mi(outer, M["outer"], Vector3(0, -0.02, 0), Vector3.ZERO, null, false)
	var plaza := CylinderMesh.new()
	plaza.top_radius = 16.5
	plaza.bottom_radius = 16.5
	plaza.height = 0.1
	plaza.radial_segments = 96
	plaza.rings = 1
	_mi(plaza, M["plaza"], Vector3(0, -0.04, 0), Vector3.ZERO, null, false)


## 무너진 돌난간 (반지름 15.3): 기둥 28개, 몇 군데는 무너져 돌무더기와 쓰러진 토막.
func _balustrade() -> void:
	var rr := 15.3
	var posts := 28
	var broken := [3, 4, 11, 19, 20, 24]
	var stone: Material = M["stone"]
	var seg_len := 2.0 * rr * sin(PI / posts) - 0.5
	for i in posts:
		var a0 := float(i) / posts * TAU
		var a1 := float(i + 1) / posts * TAU
		var am := (a0 + a1) * 0.5
		var lean := 0.12 if (i in broken or (i - 1) in broken) else 0.0
		var p := Vector3(cos(a0) * rr, 0.62, sin(a0) * rr)
		_mi(_box(Vector3(0.55, 1.25, 0.55)), stone, p, Vector3(lean * (rng.randf() - 0.5), -a0, lean * (rng.randf() - 0.5)))
		if lean == 0.0 or rng.randf() < 0.5:
			_mi(_box(Vector3(0.7, 0.16, 0.7)), stone, Vector3(p.x, 1.32, p.z), Vector3(0, -a0, 0))
		if i in broken:
			for k in 6:
				var r2 := rr + (rng.randf() - 0.4) * 1.6
				var aa := a0 + rng.randf() * (a1 - a0)
				var s := 0.25 + rng.randf() * 0.35
				_rock(Vector3(cos(aa) * r2, s * 0.2, sin(aa) * r2), s, k * 1.3, 0.7, "stone")
			if i % 2 == 1:
				var aa2 := am + 0.03
				_mi(_box(Vector3(1.6, 0.4, 0.75)), stone, Vector3(cos(aa2) * (rr + 0.9), 0.2, sin(aa2) * (rr + 0.9)), Vector3(0, -aa2 + 0.5, 0.18))
			continue
		_mi(_box(Vector3(seg_len, 0.75, 0.4)), stone, Vector3(cos(am) * rr, 0.375, sin(am) * rr), Vector3(0, -am + PI / 2, 0))
		_mi(_box(Vector3(seg_len, 0.12, 0.5)), stone, Vector3(cos(am) * rr, 0.81, sin(am) * rr), Vector3(0, -am + PI / 2, 0))


## 차가운 쇠 바닥판: 마당 끝과 난간 사이 띠.
func _steel_plates() -> void:
	for k in 20:
		if rng.randf() < 0.3:
			continue
		var a0 := float(k) / 20.0 * TAU + rng.randf() * 0.08
		var span := 0.16 + rng.randf() * 0.1
		var am := a0 + span * 0.5
		var r := 14.66
		_mi(_box(Vector3(span * r, 0.04, 0.64)), M["steel"], Vector3(cos(am) * r, 0.02, sin(am) * r), Vector3(0, -am + PI / 2, 0), null, false)


## 석등 4개: 돌 상자 쌓기 + 등불 + OmniLight3D (그림자는 품질 '최고'에서만).
func _lanterns() -> void:
	var stack := [[0.95, 0.3, 0.95, 0.15], [0.32, 1.1, 0.32, 0.85], [0.8, 0.18, 0.8, 1.49], [0.62, 0.55, 0.62, 1.86], [1.0, 0.16, 1.0, 2.2], [0.5, 0.22, 0.5, 2.38]]
	for pos in [to_w(17.4, -5.6), to_w(17.4, 5.6), to_w(4, -16.4), to_w(-6, 16.6)]:
		var g := Node3D.new()
		g.position = pos
		g.rotation.y = rng.randf() * 0.3
		add_child(g)
		for s in stack:
			_mi(_box(Vector3(s[0], s[1], s[2])), M["stone"], Vector3(0, s[3], 0), Vector3.ZERO, g)
		for ry in [0.0, PI / 2]:
			_mi(_box(Vector3(0.4, 0.34, 0.66)), M["lantern_glow"], Vector3(0, 1.86, 0), Vector3(0, ry, 0), g, false)
		var l := OmniLight3D.new()
		l.position = pos + Vector3(0, 1.9, 0)
		l.light_color = Color(1.0, 0.66, 0.38)
		l.light_energy = 2.4
		l.omni_range = 13.0
		l.omni_attenuation = 1.4
		l.shadow_enabled = false
		l.shadow_bias = 0.08
		add_child(l)
		lanterns.append(l)


## 화면 위쪽(보스 너머): 축대 + 돌계단 + 문 + 기와 전각 + 탑.
func _terrace() -> void:
	var back := Node3D.new()
	back.position = to_w(19.6, 0)
	back.rotation.y = atan2(FWD.x, FWD.z) + PI
	add_child(back)
	var wall_h := 3.4
	var tw := 34.0
	var stone: Material = M["stone"]
	for side in [-1.0, 1.0]:
		var x := 4.45
		while x < tw:
			var w := minf(tw - x, 5.0 + rng.randf() * 3.0)
			var h := wall_h + (rng.randf() - 0.5) * 0.2
			_mi(_box(Vector3(w, h, 2)), stone, Vector3(side * (x + w / 2), h / 2, -1), Vector3.ZERO, back)
			_mi(_box(Vector3(w + 0.1, 0.22, 2.25)), stone, Vector3(side * (x + w / 2), h + 0.11, -1.05), Vector3.ZERO, back)
			_mi(_box(Vector3(0.9, h * 0.8, 0.7)), stone, Vector3(side * (x + w), h * 0.4, 0.25), Vector3.ZERO, back)
			x += w
	var steps := 14
	for k in steps:
		var sh := (k + 1) * (wall_h / steps)
		_mi(_box(Vector3(7.5, sh, 0.42)), stone, Vector3(0, sh / 2, 1.6 - k * 0.42), Vector3.ZERO, back)
	for side in [-1.0, 1.0]:
		_mi(_box(Vector3(0.7, wall_h + 0.5, 6.2)), stone, Vector3(side * 4.1, (wall_h + 0.5) / 2, -1.3), Vector3.ZERO, back)
	var upper := PlaneMesh.new()
	upper.size = Vector2(tw * 2, 60)
	_mi(upper, M["outer"], Vector3(0, wall_h, -32), Vector3.ZERO, back, false)
	# 문: 바랜 주칠 두 기둥 + 가로대
	var pillar := CylinderMesh.new()
	pillar.top_radius = 0.42
	pillar.bottom_radius = 0.5
	pillar.height = 7.6
	pillar.radial_segments = 16
	for side in [-1.0, 1.0]:
		_mi(pillar, M["lacquer"], Vector3(side * 3.3, wall_h + 3.8, -4.5), Vector3.ZERO, back)
		_mi(_box(Vector3(1.4, 0.5, 1.4)), stone, Vector3(side * 3.3, wall_h + 0.25, -4.5), Vector3.ZERO, back)
	_mi(_box(Vector3(10.2, 0.55, 0.9)), M["wood"], Vector3(0, wall_h + 7.8, -4.5), Vector3.ZERO, back)
	_mi(_box(Vector3(9.0, 0.4, 0.7)), M["lacquer"], Vector3(0, wall_h + 7.35, -4.5), Vector3.ZERO, back)
	_mi(_box(Vector3(8.0, 0.36, 0.42)), M["lacquer"], Vector3(0, wall_h + 6.1, -4.5), Vector3.ZERO, back)
	_mi(_box(Vector3(0.9, 1.1, 0.16)), M["wood"], Vector3(0, wall_h + 6.75, -4.42), Vector3.ZERO, back)
	_hall(back, Vector3(-14, wall_h, -13), 9, 5.5, 3.2, 1)
	_hall(back, Vector3(15, wall_h, -15), 11, 6, 3.6, 1)
	_hall(back, Vector3(-27, wall_h, -24), 4.4, 4.4, 2.6, 4)


func _hall(parent: Node3D, at: Vector3, w: float, d: float, hgt: float, tiers: int) -> void:
	var g := Node3D.new()
	g.position = at
	parent.add_child(g)
	_mi(_box(Vector3(w + 1.2, 0.7, d + 1.2)), M["stone"], Vector3(0, 0.35, 0), Vector3.ZERO, g)
	_mi(_box(Vector3(w, hgt, d)), M["wood"], Vector3(0, 0.7 + hgt / 2, 0), Vector3.ZERO, g)
	var col := CylinderMesh.new()
	col.top_radius = 0.16
	col.bottom_radius = 0.18
	col.height = hgt
	col.radial_segments = 8
	for k in range(-2, 3):
		_mi(col, M["lacquer"], Vector3(k * w / 4.4, 0.7 + hgt / 2, d / 2 + 0.25), Vector3.ZERO, g)
	var y := 0.7 + hgt
	var rw := w + 2.6
	var rd := d + 2.6
	for t in tiers:
		var roof := PrismMesh.new()
		roof.size = Vector3(rw, 1.6 + rd * 0.12, rd)
		_mi(roof, M["roof"], Vector3(0, y + roof.size.y / 2 - 0.15, 0), Vector3(0, PI / 2, 0) if rw < rd else Vector3.ZERO, g)
		if t < tiers - 1:
			_mi(_box(Vector3(rw * 0.55, 1.2, rd * 0.55)), M["wood"], Vector3(0, y + 1.0, 0), Vector3.ZERO, g)
			y += 1.7
			rw *= 0.72
			rd *= 0.72


## 거대한 기계 고리: 보스 너머 멀리 반쯤 묻혀 선 고리 (흰 장갑판 + 검은 골격 + 끊긴 네온).
func _machine_ring() -> void:
	var r0 := 19.0
	var ring := Node3D.new()
	ring.position = to_w(52, 4) + Vector3(0, 5.5, 0)
	ring.rotation.y = atan2(FWD.x, FWD.z) + 0.35
	add_child(ring)
	var span := PI * 1.72
	var start := PI * 0.62
	var segs := 36
	var core := CylinderMesh.new()
	core.top_radius = 1.0
	core.bottom_radius = 1.0
	core.height = span / segs * r0 + 0.1
	core.radial_segments = 10
	core.rings = 1
	for k in segs:
		var an := start + (k + 0.5) / segs * span
		_mi(core, M["frame"], Vector3(cos(an) * r0, sin(an) * r0, 0), Vector3(0, 0, an), ring)
	for k in 44:
		var an := start + (k + 0.5) / 44.0 * span
		if rng.randf() < 0.08:
			continue
		_mi(_box(Vector3(2.6, 1.2, 2.8)), M["ceramic"], Vector3(cos(an) * r0, sin(an) * r0, 0), Vector3(0, 0, an - PI / 2), ring)
		if k % 4 == 0:
			_mi(_box(Vector3(0.5, 2.4, 3.4)), M["frame"], Vector3(cos(an) * r0, sin(an) * r0, 0), Vector3(0, 0, an - PI / 2), ring)
	for k in 9:
		var a0 := start + span * (k / 9.0 + 0.01)
		var ln := span / 9.0 * (0.35 + rng.randf() * 0.5)
		var pieces := 4
		for j in pieces:
			var an := a0 + (j + 0.5) / pieces * ln
			var rr := r0 - 1.45
			_mi(_box(Vector3(0.14, ln / pieces * rr + 0.02, 0.14)), M["neon_ring"], Vector3(cos(an) * rr, sin(an) * rr, 1.45), Vector3(0, 0, an), ring, false)


## 난간 바깥에 흩어진 기계 장갑 조각.
func _armor_pieces() -> void:
	for k in 26:
		var a := rng.randf() * TAU
		var rr := 15.9 + rng.randf() * 4.0
		var w := 0.3 + rng.randf() * 0.7
		var mat: Material = M["ceramic"] if rng.randf() < 0.7 else M["frame"]
		_mi(_box(Vector3(w, 0.08 + rng.randf() * 0.1, w * (0.5 + rng.randf() * 0.6))), mat,
			Vector3(cos(a) * rr, 0.05, sin(a) * rr), Vector3((rng.randf() - 0.5) * 0.5, rng.randf() * 7.0, (rng.randf() - 0.5) * 0.5))


## 바위 노두 + 잔돌.
func _rocks() -> void:
	var outcrops := [[6, -20, 3.2], [-2, -21, 2.8], [-9, -19.5, 3.6], [-14, -17, 2.6], [5, 19.5, 3.0], [-12, 18, 2.4],
		[12, 18.5, 2.2], [-18, 6, 2.5], [-19, -4, 3.0], [-17, 13, 2.0], [16, -14, 2.2], [17, 13, 2.0]]
	for i in outcrops.size():
		var o: Array = outcrops[i]
		var p := to_w(o[0], o[1])
		p.y = o[2] * 0.12
		_rock(p, o[2] * 1.4, i * 1.7, 0.55)
	for i in 40:
		var a := rng.randf() * TAU
		var rr := 16.8 + rng.randf() * 7.0
		var s := 0.25 + rng.randf() * 0.6
		_rock(Vector3(cos(a) * rr, s * 0.1, sin(a) * rr), s, i, 0.6)


## 나무: 단풍(둥근 잎 덩이)과 상록수(원뿔 겹). 카메라 앞(화면 아래)과 축대 자리는 비운다.
func _trees() -> void:
	var spots: Array[Vector3] = []
	for i in 56:
		var a := float(i) / 56.0 * TAU + rng.randf() * 0.08
		var rr := 22.5 + rng.randf() * 14.0
		var p := Vector3(cos(a) * rr, 0, sin(a) * rr)
		var al := p.dot(FWD)
		var sd := p.dot(RIGHT)
		if al < -13.0:
			continue
		if al > 17.1 and al < 23.6 and absf(sd) < 35.0:
			continue
		if al >= 23.6 and absf(sd) < 34.0:
			if absf(sd) < 22.0:
				continue
			p.y = 3.4
		spots.append(p)
	for ex in [[27, -24], [29, 24], [36, -30], [38, 28]]:
		var q := to_w(ex[0], ex[1])
		q.y = 3.4
		spots.append(q)
	var trunk := CylinderMesh.new()
	trunk.top_radius = 0.16
	trunk.bottom_radius = 0.38
	trunk.height = 1.0
	trunk.radial_segments = 7
	trunk.rings = 1
	var blob := SphereMesh.new()
	blob.radius = 1.0
	blob.height = 1.4
	blob.radial_segments = 10
	blob.rings = 6
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 1.0
	cone.height = 1.0
	cone.radial_segments = 9
	cone.rings = 1
	for i in spots.size():
		var p: Vector3 = spots[i]
		var maple := rng.randf() < 0.55
		var h := (7.0 + rng.randf() * 3.0) if maple else (11.0 + rng.randf() * 6.0)
		var g := Node3D.new()
		g.position = p
		g.rotation = Vector3((rng.randf() - 0.5) * 0.08, rng.randf() * 6.0, (rng.randf() - 0.5) * 0.08)
		add_child(g)
		_mi(trunk, M["bark"], Vector3(0, h / 2, 0), Vector3.ZERO, g, true, Vector3(1, h, 1))
		if maple:
			var mm: Material = M["maple_red"] if rng.randf() < 0.5 else M["maple_orange"]
			for k in 7:
				var an := rng.randf() * TAU
				var r := rng.randf() * 2.2
				var s := 1.1 + rng.randf() * 1.1
				_mi(blob, mm, Vector3(cos(an) * r, h * 0.72 + rng.randf() * 1.8, sin(an) * r), Vector3(0, rng.randf() * 3.0, 0), g, true, Vector3(s, s * 0.8, s))
		else:
			var tiers := 5 + (i % 3)
			var r0 := 2.3 + rng.randf() * 0.8
			for k in tiers:
				var f := float(k) / (tiers - 1)
				var rad := r0 * (1.0 - f * 0.75)
				var ch := 2.6 - f * 0.8
				_mi(cone, M["evergreen"], Vector3(0, h * 0.42 + f * h * 0.55, 0), Vector3(0, k * 0.9, 0), g, true, Vector3(rad, ch, rad))


## 풀 900포기, 바닥 낙엽 1,500장 (MultiMesh). 품질 '낮음'은 절반만 그린다 (visible_instance_count).
func _foliage() -> void:
	var gq := QuadMesh.new()
	gq.size = Vector2(0.9, 0.7)
	gq.center_offset = Vector3(0, 0.35, 0)
	var gm := MultiMesh.new()
	gm.transform_format = MultiMesh.TRANSFORM_3D
	gm.use_colors = true
	gm.mesh = gq
	gm.instance_count = GRASS_N
	var back_al := 19.6
	var i := 0
	var tries := 0
	while i < GRASS_N and tries < GRASS_N * 4:
		tries += 1
		var pos: Vector3
		if i < 420:
			var a := rng.randf() * TAU
			var rr := 15.0 + rng.randf() * 2.6
			pos = Vector3(cos(a) * rr, 0, sin(a) * rr)
		elif i < 560:
			var sd := (rng.randf() - 0.5) * 68.0
			if absf(sd) < 4.6:
				continue
			pos = to_w(back_al - 0.4 - rng.randf() * 1.2, sd)
		else:
			var a := rng.randf() * TAU
			var rr := 17.8 + rng.randf() * 16.0
			pos = Vector3(cos(a) * rr, 0, sin(a) * rr)
			if pos.dot(FWD) > back_al - 0.5:
				continue
		var s := 0.6 + rng.randf() * 0.9
		var b := Basis(Vector3.UP, rng.randf() * PI).scaled(Vector3(s, s * (0.7 + rng.randf() * 0.6), s))
		gm.set_instance_transform(i, Transform3D(b, pos))
		var tint := 0.8 + rng.randf() * 0.35
		gm.set_instance_color(i, Color(tint, tint * (0.95 + rng.randf() * 0.1), tint * 0.9))
		i += 1
	grass_mmi = MultiMeshInstance3D.new()
	grass_mmi.multimesh = gm
	grass_mmi.material_override = M["grass"]
	grass_mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(grass_mmi)

	var lp := PlaneMesh.new()
	lp.size = Vector2(0.22, 0.22)
	var lm := MultiMesh.new()
	lm.transform_format = MultiMesh.TRANSFORM_3D
	lm.use_colors = true
	lm.mesh = lp
	lm.instance_count = LEAVES_N
	var cols := [Color(0.78, 0.25, 0.11), Color(0.88, 0.48, 0.14), Color(0.91, 0.66, 0.23), Color(0.54, 0.23, 0.11), Color(0.42, 0.29, 0.16)]
	for k in LEAVES_N:
		var r := 4.0 + sqrt(rng.randf()) * 22.0
		if r < 12.0 and rng.randf() < 0.75:
			r = 12.0 + rng.randf() * 4.0
		var a := rng.randf() * TAU
		var pos := Vector3(cos(a) * r, 0.02 + rng.randf() * 0.01, sin(a) * r)
		var s := 0.7 + rng.randf() * 0.8
		var b := Basis.from_euler(Vector3((rng.randf() - 0.5) * 0.4, rng.randf() * 7.0, (rng.randf() - 0.5) * 0.4)).scaled(Vector3(s, s, s))
		lm.set_instance_transform(k, Transform3D(b, pos))
		lm.set_instance_color(k, cols[rng.randi() % cols.size()])
	leaves_mmi = MultiMeshInstance3D.new()
	leaves_mmi.multimesh = lm
	leaves_mmi.material_override = M["leaf"]
	leaves_mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(leaves_mmi)


## 떨어지는 잎 70장 (GPUParticles3D).
func _falling_leaves() -> void:
	falling = GPUParticles3D.new()
	falling.amount = FALLING_N
	falling.lifetime = 16.0
	falling.preprocess = 16.0
	falling.process_material = load("res://materials/fall_process.tres")
	var q := QuadMesh.new()
	q.size = Vector2(0.2, 0.2)
	q.material = M["leaf"]
	falling.draw_pass_1 = q
	falling.position = Vector3(0, 11, 0)
	falling.visibility_aabb = AABB(Vector3(-24, -14, -24), Vector3(48, 18, 48))
	falling.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	falling.use_fixed_seed = true
	falling.seed = 77
	add_child(falling)


## 빛줄기 몇 줄: 해 쪽에서 비스듬히 내려오는 옅은 판 (가산 혼합, 큰 투명 겹침).
func _light_shafts() -> void:
	var lean := atan2(sun_dir.dot(RIGHT), sun_dir.y) * 0.8
	var k := 0
	for spec in [[20, -13, 3.5], [24, -4, 5.0], [26, 8, 4.5], [21, 16, 3.5], [30, 20, 5.0]]:
		var q := QuadMesh.new()
		q.size = Vector2(spec[2], 22)
		var mat: ShaderMaterial = M["light_shaft"].duplicate()
		mat.set_shader_parameter("phase", k * 1.7)
		var base := to_w(spec[0], spec[1])
		var m := _mi(q, mat, base + sun_dir * 9.0 + Vector3(0, 8.0, 0), Vector3.ZERO, null, false)
		m.look_at(m.position + FWD, Vector3.UP)
		m.rotate_object_local(Vector3(0, 0, 1), -lean)
		m.rotate_object_local(Vector3(1, 0, 0), -0.35)
		k += 1
