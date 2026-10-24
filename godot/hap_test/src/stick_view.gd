## 스틱 값 그림: 바깥 원(길이 1), 데드존 원(0.2), 날값 점(흰색), 데드존을 거친 이동 값(자리 색).
extends Control

var raw := Vector2.ZERO
var move := Vector2.ZERO
var accent := Color(1, 1, 1)


func set_values(r: Vector2, m: Vector2) -> void:
	if r.is_equal_approx(raw) and m.is_equal_approx(move):
		return
	raw = r
	move = m
	queue_redraw()


func _draw() -> void:
	var c := size * 0.5
	var rad := minf(size.x, size.y) * 0.5 - 3.0
	draw_circle(c, rad, Color(0, 0, 0, 0.35))
	draw_arc(c, rad, 0, TAU, 48, Color(1, 1, 1, 0.45), 1.5, true)
	draw_arc(c, rad * 0.2, 0, TAU, 24, Color(1, 1, 1, 0.25), 1.0, true)
	draw_line(c - Vector2(rad, 0), c + Vector2(rad, 0), Color(1, 1, 1, 0.12), 1.0)
	draw_line(c - Vector2(0, rad), c + Vector2(0, rad), Color(1, 1, 1, 0.12), 1.0)
	var m := c + Vector2(move.x, -move.y) * rad
	draw_line(c, m, accent, 3.0, true)
	draw_circle(m, 5.0, accent)
	var r := c + Vector2(clampf(raw.x, -1.5, 1.5), -clampf(raw.y, -1.5, 1.5)) * rad
	draw_circle(r, 3.5, Color(1, 1, 1, 0.9))
