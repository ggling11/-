## 캐릭터 대역 (기본 도형 조합). 흰 세라믹 장갑(clearcoat) + 검은 금속 골격 + 발광 네온. 모두 그림자를 드리운다.
##   boss : 앞으로 숙인 덩치, 붉은 네온, 큰 주먹
##   p1   : 1P 모루 — 넓은 챙 투구, 넓은 어깨판, 짧은 망토, 망치, 주황 네온
##   p2   : 2P 제비 — 가늘고 긴 몸, 긴 코트 자락, 뒤로 뻗은 볏, 긴 칼, 파랑 네온
extends Node3D

const SPEED := 6.2
const PLAYER_R := 0.5
const ARENA_R := 14.0

var kind := ""
var body: Node3D           # 기울임·통통 튐
var weapon: Node3D         # 휘두르는 팔/무기 피벗
var guard_arm: Node3D
var arms: Node3D           # 보스 두 팔 (내려찍기)
var head: Node3D
var neon: StandardMaterial3D
var neon_base := 5.0
var facing := 0.0
var walk := 0.0
var speed_now := 0.0
var atk_t := -1.0
var rcv_t := -1.0
var dodge_t := -1.0
var hop_t := -1.0
var M := {}


func build(k: String) -> void:
	kind = k
	for n in ["ceramic", "frame", "cloth"]:
		M[n] = load("res://materials/%s.tres" % n)
	var neon_name: String = {"boss": "neon_boss", "p1": "neon_p1", "p2": "neon_p2"}[k]
	neon = (load("res://materials/%s.tres" % neon_name) as StandardMaterial3D).duplicate()
	neon_base = neon.emission_energy_multiplier
	M["neon"] = neon
	body = Node3D.new()
	add_child(body)
	match k:
		"boss":
			_build_boss()
		"p1":
			_build_moru()
		_:
			_build_jebi()


func _part(mesh: Mesh, mat: String, pos: Vector3, rot: Vector3 = Vector3.ZERO, parent: Node3D = null, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = mesh
	m.material_override = M[mat]
	m.position = pos
	m.rotation = rot
	m.scale = scl
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	(parent if parent != null else body).add_child(m)
	return m


static func box(x: float, y: float, z: float) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = Vector3(x, y, z)
	return b


static func cyl(top: float, bottom: float, h: float, seg: int = 12) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = h
	c.radial_segments = seg
	c.rings = 1
	return c


static func sphere(r: float, seg: int = 16) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = seg
	s.rings = seg / 2
	return s


func _pivot(pos: Vector3, parent: Node3D = null) -> Node3D:
	var p := Node3D.new()
	p.position = pos
	(parent if parent != null else body).add_child(p)
	return p


# ───────────── 1P 모루 ─────────────
func _build_moru() -> void:
	for sx in [-1.0, 1.0]:
		_part(cyl(0.11, 0.13, 0.6), "frame", Vector3(sx * 0.16, 0.3, 0))
		_part(box(0.2, 0.12, 0.3), "ceramic", Vector3(sx * 0.16, 0.06, 0.04))
	_part(box(0.66, 0.62, 0.44), "ceramic", Vector3(0, 0.95, 0))
	_part(box(0.56, 0.16, 0.4), "frame", Vector3(0, 0.62, 0))
	_part(box(0.42, 0.05, 0.02), "neon", Vector3(0, 1.02, 0.225))
	for sx in [-1.0, 1.0]:
		_part(box(0.38, 0.13, 0.48), "ceramic", Vector3(sx * 0.45, 1.24, 0), Vector3(0, 0, -sx * 0.22))
	_part(box(0.62, 0.62, 0.04), "cloth", Vector3(0, 0.88, -0.25), Vector3(0.12, 0, 0))
	head = _pivot(Vector3(0, 1.3, 0))
	_part(sphere(0.22), "ceramic", Vector3(0, 0.16, 0), Vector3.ZERO, head)
	_part(cyl(0.54, 0.54, 0.05, 24), "ceramic", Vector3(0, 0.2, 0), Vector3.ZERO, head)
	_part(cyl(0.3, 0.3, 0.06, 16), "frame", Vector3(0, 0.24, 0), Vector3.ZERO, head)
	_part(box(0.3, 0.04, 0.02), "neon", Vector3(0, 0.1, 0.21), Vector3.ZERO, head)
	var brim := TorusMesh.new()
	brim.inner_radius = 0.5
	brim.outer_radius = 0.56
	brim.rings = 32
	brim.ring_segments = 6
	_part(brim, "neon", Vector3(0, 0.2, 0), Vector3.ZERO, head, Vector3(1, 0.4, 1))
	guard_arm = _pivot(Vector3(-0.42, 1.12, 0))
	_part(cyl(0.07, 0.08, 0.55), "frame", Vector3(0, -0.27, 0.02), Vector3.ZERO, guard_arm)
	_part(box(0.2, 0.26, 0.2), "ceramic", Vector3(0, -0.5, 0.04), Vector3.ZERO, guard_arm)
	weapon = _pivot(Vector3(0.42, 1.12, 0))
	_part(cyl(0.07, 0.08, 0.55), "frame", Vector3(0, -0.27, 0.02), Vector3.ZERO, weapon)
	_part(cyl(0.035, 0.035, 1.05), "frame", Vector3(0, -0.5, 0.42), Vector3(PI / 2, 0, 0), weapon)
	_part(box(0.34, 0.24, 0.24), "ceramic", Vector3(0, -0.5, 0.95), Vector3.ZERO, weapon)
	_part(box(0.36, 0.05, 0.26), "neon", Vector3(0, -0.5, 0.95), Vector3.ZERO, weapon)


# ───────────── 2P 제비 ─────────────
func _build_jebi() -> void:
	for sx in [-1.0, 1.0]:
		_part(cyl(0.06, 0.075, 0.8), "frame", Vector3(sx * 0.11, 0.4, 0))
	_part(cyl(0.2, 0.34, 0.95, 16), "ceramic", Vector3(0, 0.62, -0.03))
	_part(box(0.34, 0.62, 0.24), "frame", Vector3(0, 1.18, 0))
	_part(box(0.3, 0.36, 0.06), "ceramic", Vector3(0, 1.26, 0.13))
	_part(box(0.03, 0.4, 0.02), "neon", Vector3(0, 1.2, 0.165))
	for sx in [-1.0, 1.0]:
		_part(box(0.2, 0.08, 0.26), "ceramic", Vector3(sx * 0.24, 1.47, 0))
		_part(box(0.2, 0.025, 0.04), "neon", Vector3(sx * 0.24, 1.52, 0.1))
	head = _pivot(Vector3(0, 1.55, 0))
	_part(box(0.19, 0.25, 0.22), "ceramic", Vector3(0, 0.13, 0), Vector3.ZERO, head)
	_part(box(0.17, 0.035, 0.02), "neon", Vector3(0, 0.15, 0.115), Vector3.ZERO, head)
	_part(box(0.035, 0.07, 0.55), "neon", Vector3(0, 0.3, -0.2), Vector3(0.35, 0, 0), head)
	_part(box(0.03, 0.06, 0.4), "frame", Vector3(0.07, 0.24, -0.18), Vector3(0.25, 0.15, 0), head)
	guard_arm = _pivot(Vector3(-0.24, 1.42, 0))
	_part(cyl(0.045, 0.05, 0.7), "frame", Vector3(0, -0.35, 0), Vector3.ZERO, guard_arm)
	weapon = _pivot(Vector3(0.24, 1.42, 0))
	_part(cyl(0.045, 0.05, 0.7), "frame", Vector3(0, -0.35, 0), Vector3.ZERO, weapon)
	_part(box(0.04, 0.09, 1.15), "frame", Vector3(0, -0.68, 0.55), Vector3.ZERO, weapon)
	_part(box(0.012, 0.025, 1.05), "neon", Vector3(0, -0.63, 0.57), Vector3.ZERO, weapon)


# ───────────── 보스 ─────────────
## 앞으로 숙인 고릴라형 기계: 가장 큰 덩어리는 어깨와 주먹. 위에서 내려다봐도 읽히게 등 위에 붉은 네온 환기구.
func _build_boss() -> void:
	body.scale = Vector3(1.35, 1.35, 1.35)
	for sx in [-1.0, 1.0]:
		_part(cyl(0.2, 0.26, 0.9), "frame", Vector3(sx * 0.5, 0.45, -0.25), Vector3(0.2, 0, 0))
		_part(box(0.46, 0.22, 0.66), "ceramic", Vector3(sx * 0.5, 0.11, -0.12))
	_part(box(1.1, 0.42, 0.8), "frame", Vector3(0, 1.0, -0.25))
	var torso := _pivot(Vector3(0, 1.25, -0.2))
	torso.rotation.x = 0.32
	_part(box(1.7, 1.35, 1.15), "ceramic", Vector3(0, 0.7, 0), Vector3.ZERO, torso)
	_part(box(1.2, 0.9, 0.12), "ceramic", Vector3(0, 0.62, 0.62), Vector3.ZERO, torso)
	_part(sphere(0.19), "neon", Vector3(0, 0.75, 0.7), Vector3.ZERO, torso)
	for sx in [-1.0, 1.0]:
		_part(box(0.05, 0.62, 0.04), "neon", Vector3(sx * 0.42, 0.62, 0.69), Vector3.ZERO, torso)
	_part(box(1.0, 0.5, 0.9), "frame", Vector3(0, 1.45, -0.15), Vector3.ZERO, torso)
	for k in 3:
		_part(box(0.7, 0.06, 0.1), "neon", Vector3(0, 1.71, -0.45 + k * 0.28), Vector3.ZERO, torso)
	head = _pivot(Vector3(0, 1.25, 0.72), torso)
	_part(box(0.62, 0.46, 0.55), "frame", Vector3.ZERO, Vector3(-0.32, 0, 0), head)
	_part(box(0.52, 0.08, 0.05), "neon", Vector3(0, 0.05, 0.28), Vector3(-0.32, 0, 0), head)
	arms = _pivot(Vector3(0, 2.25, 0.15))
	for sx in [-1.0, 1.0]:
		_part(sphere(0.6, 20), "ceramic", Vector3(sx * 1.08, 0.05, 0), Vector3.ZERO, arms)
		_part(box(0.5, 0.08, 0.5), "neon", Vector3(sx * 1.08, 0.62, 0), Vector3.ZERO, arms)
		var arm := _pivot(Vector3(sx * 1.2, 0, 0), arms)
		_part(cyl(0.17, 0.22, 1.4), "frame", Vector3(0, -0.72, 0.18), Vector3(0.22, 0, 0), arm)
		_part(box(0.9, 0.85, 0.9), "ceramic", Vector3(0, -1.62, 0.45), Vector3.ZERO, arm)
		_part(box(0.94, 0.09, 0.94), "neon", Vector3(0, -1.36, 0.45), Vector3.ZERO, arm)


## 자리 표시 고리 (1P 주황 · 2P 파랑): 발밑에 납작한 네온 고리.
func add_seat_ring() -> void:
	var t := TorusMesh.new()
	t.inner_radius = 0.56
	t.outer_radius = 0.64
	t.rings = 32
	t.ring_segments = 6
	var m := MeshInstance3D.new()
	m.mesh = t
	m.material_override = neon
	m.scale = Vector3(1, 0.25, 1)
	m.position = Vector3(0, 0.03, 0)
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(m)


# ───────────── 움직임 ─────────────

## 플레이어 이동 (move = 월드 평면 벡터, 길이 1 이하). 아레나 밖으로 나가지 않는다.
func step(move: Vector3, delta: float) -> void:
	var spd := SPEED * (2.4 if dodge_t >= 0.0 and dodge_t < 0.18 else 1.0)
	var mv := move
	if dodge_t >= 0.0 and dodge_t < 0.18 and mv.length() < 0.1:
		mv = Vector3(sin(facing), 0, cos(facing))
	position += mv * spd * delta
	var flat := Vector2(position.x, position.z)
	var lim := ARENA_R - PLAYER_R
	if flat.length() > lim:
		flat = flat.normalized() * lim
		position.x = flat.x
		position.z = flat.y
	speed_now = mv.length()
	if mv.length() > 0.05:
		facing = lerp_angle(facing, atan2(mv.x, mv.z), 1.0 - exp(-14.0 * delta))
	tick(delta)


func face_towards(p: Vector3) -> void:
	var d := p - position
	facing = atan2(d.x, d.z)


func attack() -> void:
	atk_t = 0.0


func receive() -> void:
	rcv_t = 0.0


func dodge() -> void:
	dodge_t = 0.0


func tag() -> void:
	hop_t = 0.0


## 애니메이션 시간 진행 (위치는 바꾸지 않는다).
func tick(delta: float) -> void:
	rotation.y = facing
	walk += delta * (4.0 + 8.0 * speed_now)
	var bob := absf(sin(walk)) * 0.06 * speed_now
	var hop := 0.0
	if hop_t >= 0.0:
		hop_t += delta
		hop = sin(clampf(hop_t / 0.3, 0.0, 1.0) * PI) * 0.35
		if hop_t > 0.3:
			hop_t = -1.0
	body.position.y = bob + hop
	body.rotation.x = 0.16 * speed_now
	var glow := 1.0
	if weapon != null:
		var sw := 0.0
		if atk_t >= 0.0:
			atk_t += delta
			if atk_t < 0.07:
				sw = -1.4 * (atk_t / 0.07)
			elif atk_t < 0.16:
				sw = lerpf(-1.4, 1.5, (atk_t - 0.07) / 0.09)
			elif atk_t < 0.42:
				sw = lerpf(1.5, 0.0, (atk_t - 0.16) / 0.26)
			else:
				atk_t = -1.0
			glow = 1.6
		weapon.rotation.x = -0.25 + sw
	if guard_arm != null:
		var g := 0.0
		if rcv_t >= 0.0:
			rcv_t += delta
			g = -1.3 * sin(clampf(rcv_t / 0.32, 0.0, 1.0) * PI)
			glow = maxf(glow, 1.8)
			if rcv_t > 0.32:
				rcv_t = -1.0
		guard_arm.rotation.x = -0.15 + g
	if dodge_t >= 0.0:
		dodge_t += delta
		body.rotation.x += 0.35
		if dodge_t > 0.3:
			dodge_t = -1.0
	neon.emission_energy_multiplier = neon_base * glow


## 보스 내려찍기 자세: phase는 0~2초 주기 안의 위치. 1.25초에 주먹이 땅에 닿는다.
func slam_pose(phase: float) -> void:
	var lift := 0.0
	if phase < 1.0:
		lift = smoothstep(0.0, 1.0, phase)
	elif phase < 1.25:
		lift = 1.0 - pow((phase - 1.0) / 0.25, 2.0) * 2.0
	elif phase < 1.6:
		lift = -1.0 + (phase - 1.25) / 0.35 * 0.4
	else:
		lift = lerpf(-0.6, 0.0, (phase - 1.6) / 0.4)
	arms.rotation.x = lift * 2.1 if lift > 0.0 else lift * 0.45
	body.rotation.x = -0.12 * maxf(lift, 0.0) + 0.16 * maxf(-lift, 0.0)
	var glow := 1.0 + 1.2 * maxf(lift, 0.0)
	if phase >= 1.25 and phase < 1.45:
		glow = 3.0
	neon.emission_energy_multiplier = neon_base * glow


## 보스 숨쉬기 (내려찍지 않을 때).
func idle_pose(t: float) -> void:
	arms.rotation.x = 0.06 * sin(t * 1.3)
	body.rotation.x = 0.03 * sin(t * 1.3 + 0.6)
	body.position.y = 0.03 * sin(t * 1.3)
	neon.emission_energy_multiplier = neon_base * (0.9 + 0.15 * sin(t * 2.1))


## 주먹이 땅에 닿는 자리 (보스 앞).
func impact_point() -> Vector3:
	return global_position + global_transform.basis.z.normalized() * 2.3 + Vector3(0, 0.15, 0)
