## 합이 터지는 순간 흉내: 불티 · 먼지 · 사각 데이터 조각 (GPUParticles3D) + 짧은 섬광 조명 + 충격파 고리.
## 섬광은 0.08초 안에 꺼진다 (기준: 0.1초 안에 가라앉는다). 같은 씨앗을 써서 매번 같은 모양으로 터진다.
extends Node3D

const POOL := 6
const FLASH_TIME := 0.08     # 섬광 조명이 0이 되는 시간 (초)
const FLASH_PEAK := 14.0
const RING_TIME := 0.5

var entries: Array = []
var flash_enabled := true    # 섬광 시험의 비교용(섬광 조명만 끈 장면)에서 false
var _next := 0
var bursts := 0


func build() -> void:
	var spark_pm: ParticleProcessMaterial = load("res://materials/spark_process.tres")
	var dust_pm: ParticleProcessMaterial = load("res://materials/dust_process.tres")
	var bits_pm: ParticleProcessMaterial = load("res://materials/bits_process.tres")
	var spark_mesh := QuadMesh.new()
	spark_mesh.size = Vector2(0.035, 0.26)
	spark_mesh.material = load("res://materials/spark_draw.tres")
	var dust_mesh := QuadMesh.new()
	dust_mesh.size = Vector2(0.9, 0.9)
	dust_mesh.material = load("res://materials/dust_draw.tres")
	var bits_mesh := BoxMesh.new()
	bits_mesh.size = Vector3(0.09, 0.09, 0.09)
	bits_mesh.material = load("res://materials/bits_draw.tres")
	var ring_mesh := PlaneMesh.new()
	ring_mesh.size = Vector2(2, 2)
	var shock: ShaderMaterial = load("res://materials/shockwave.tres")
	for i in POOL:
		var root := Node3D.new()
		add_child(root)
		var sparks := _particles(root, 150, 0.75, spark_pm, spark_mesh, 11 + i)
		sparks.transform_align = GPUParticles3D.TRANSFORM_ALIGN_Z_BILLBOARD_Y_TO_VELOCITY
		var dust := _particles(root, 40, 1.6, dust_pm, dust_mesh, 31 + i)
		var bits := _particles(root, 64, 1.1, bits_pm.duplicate(), bits_mesh, 51 + i)
		bits.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var light := OmniLight3D.new()
		light.position = Vector3(0, 1.2, 0)
		light.light_color = Color(1.0, 0.86, 0.72)
		light.omni_range = 10.0
		light.light_energy = 0.0
		light.shadow_enabled = false
		light.light_volumetric_fog_energy = 0.0   # 볼류메트릭 안개의 시간 누적에 섬광이 남지 않게 (0.1초 기준)
		light.visible = false
		root.add_child(light)
		var ring := MeshInstance3D.new()
		ring.mesh = ring_mesh
		ring.material_override = shock.duplicate()
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ring.position = Vector3(0, 0.06, 0)
		ring.visible = false
		root.add_child(ring)
		entries.append({"root": root, "sparks": sparks, "dust": dust, "bits": bits, "light": light, "ring": ring,
			"t": -1.0, "fresh": false, "power": 1.0})


func _particles(parent: Node3D, amount: int, life: float, pm: ParticleProcessMaterial, mesh: Mesh, seed_v: int) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = amount
	p.lifetime = life
	p.one_shot = true
	p.explosiveness = 1.0
	p.emitting = false
	p.process_material = pm
	p.draw_pass_1 = mesh
	p.visibility_aabb = AABB(Vector3(-9, -1, -9), Vector3(18, 12, 18))
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	p.use_fixed_seed = true
	p.seed = seed_v
	parent.add_child(p)
	return p


## 터뜨리기. tint = 데이터 조각과 고리 색 (자리 색).
func burst(pos: Vector3, tint: Color, power: float = 1.0) -> void:
	var e: Dictionary = entries[_next]
	_next = (_next + 1) % POOL
	bursts += 1
	(e["root"] as Node3D).position = pos
	((e["bits"] as GPUParticles3D).process_material as ParticleProcessMaterial).color = tint
	for k in ["sparks", "dust", "bits"]:
		var p: GPUParticles3D = e[k]
		p.restart(true)
		p.emitting = true
	var ring: MeshInstance3D = e["ring"]
	(ring.material_override as ShaderMaterial).set_shader_parameter("col", tint.lerp(Color(1, 0.9, 0.8), 0.35))
	e["t"] = 0.0
	e["fresh"] = true
	e["power"] = power
	_apply(e)


## main이 프레임마다 부른다 (터뜨린 프레임은 t=0 그대로 그린다).
func advance(delta: float) -> void:
	for e in entries:
		if e["t"] < 0.0:
			continue
		if e["fresh"]:
			e["fresh"] = false
			continue
		e["t"] += delta
		_apply(e)
		if e["t"] > 2.0:
			e["t"] = -1.0


func _apply(e: Dictionary) -> void:
	var t: float = e["t"]
	var k := clampf(1.0 - t / FLASH_TIME, 0.0, 1.0)
	var light: OmniLight3D = e["light"]
	if not flash_enabled:
		k = 0.0
	light.light_energy = FLASH_PEAK * e["power"] * k * k
	light.visible = k > 0.0
	var ring: MeshInstance3D = e["ring"]
	var p := t / RING_TIME
	if p < 1.0:
		ring.visible = true
		var s := lerpf(0.6, 6.5 * sqrt(e["power"]), 1.0 - pow(1.0 - p, 3.0))
		ring.scale = Vector3(s, 1, s)
		(ring.material_override as ShaderMaterial).set_shader_parameter("progress", p)
	else:
		ring.visible = false


func any_flash_lit() -> bool:
	for e in entries:
		if (e["light"] as OmniLight3D).visible:
			return true
	return false
