## 성능 측정 (지시서 2.3). 4단계 × 12초, 앞 2초는 데우기라 빼고 잰다. 장면은 매번 같다(main이 단계 시간 t로 움직인다).
##
## 프레임 시간 = 연속한 두 _process 호출 사이의 실제 경과 시간 (Time.get_ticks_usec).
## 단계마다:
##   평균 FPS     = (측정 구간 프레임 수) / (그 프레임 시간의 합)
##   1% 하위 FPS  = 측정 구간 프레임 시간을 긴 순서로 늘어놓고, 가장 긴 1%(올림, 최소 1프레임)의 평균 시간 -> 1000/평균ms
##   최장 프레임  = 측정 구간에서 가장 긴 프레임 시간 (ms)
##   끊김 수      = 측정 구간에서 50ms를 넘은 프레임 수
##   처음 5초 끊김 = 단계 시작(데우기 포함)부터 5초 안에 시작한 프레임 중 50ms를 넘은 수 (셰이더 준비 끊김 확인용)
## 측정 구간 = 단계 시작 후 데우기 시간 이후에 시작한 프레임.
extends RefCounted

const HITCH_MS := 50.0
const FIRST_WINDOW := 5.0

var seg_time := 12.0
var warmup := 2.0
var min_frames := 3
var order: Array = [0, 1, 2, 3]
var running := false
var pos := -1
var seg_start_us := 0
var last_us := 0
var seg_t := 0.0
var starts := PackedFloat64Array()
var durs := PackedFloat64Array()
var results: Array = []
var applied: Array = []
var started_at := ""
var finished_at := ""


func configure(seconds: float, warm: float, minimum_frames: int) -> void:
	seg_time = seconds
	warmup = warm
	min_frames = minimum_frames


func start() -> void:
	running = true
	pos = -1
	results = []
	applied = []
	started_at = Time.get_datetime_string_from_system(false, true)


func has_next() -> bool:
	return pos + 1 < order.size()


## 다음 단계 번호 (main이 품질을 적용한 뒤 begin_segment를 부른다).
func next_preset() -> int:
	pos += 1
	return order[pos]


func current_preset() -> int:
	return order[pos] if pos >= 0 and pos < order.size() else -1


func begin_segment(now_us: int, applied_settings: Dictionary) -> void:
	applied.append(applied_settings)
	seg_start_us = now_us
	last_us = now_us
	seg_t = 0.0
	starts = PackedFloat64Array()
	durs = PackedFloat64Array()


## 프레임마다 한 번. "" = 계속, "next" = 이 단계 끝 (결과 저장됨).
func tick(now_us: int) -> String:
	var dt_us := now_us - last_us
	last_us = now_us
	var t_end := float(now_us - seg_start_us) / 1e6
	starts.append(t_end - float(dt_us) / 1e6)
	durs.append(float(dt_us) / 1000.0)
	seg_t = t_end
	if t_end >= seg_time and _measured_count() >= min_frames:
		results.append(stats())
		return "next"
	return ""


func finish() -> void:
	running = false
	finished_at = Time.get_datetime_string_from_system(false, true)


func cancel() -> void:
	running = false


func in_warmup() -> bool:
	return seg_t < warmup


func _measured_count() -> int:
	var n := 0
	for s in starts:
		if s >= warmup:
			n += 1
	return n


func stats() -> Dictionary:
	var meas: Array = []
	var total_ms := 0.0
	for i in starts.size():
		if starts[i] >= warmup:
			meas.append(durs[i])
			total_ms += durs[i]
	var first5 := 0
	for i in starts.size():
		if starts[i] < FIRST_WINDOW and durs[i] > HITCH_MS:
			first5 += 1
	var n := meas.size()
	var r := {
		"preset": current_preset(), "frames": n, "seconds": total_ms / 1000.0,
		"avg_fps": 0.0, "p1_low_fps": 0.0, "max_ms": 0.0, "hitches": 0, "hitches_first5s": first5,
		"first_frame_ms": durs[0] if durs.size() > 0 else 0.0, "worst_n": 0,
	}
	if n == 0 or total_ms <= 0.0:
		return r
	var sorted := meas.duplicate()
	sorted.sort()
	sorted.reverse()
	var k := maxi(1, ceili(n * 0.01))
	var worst := 0.0
	for i in k:
		worst += sorted[i]
	worst /= k
	var hitches := 0
	for d in meas:
		if d > HITCH_MS:
			hitches += 1
	r["avg_fps"] = n / (total_ms / 1000.0)
	r["p1_low_fps"] = 1000.0 / worst if worst > 0.0 else 0.0
	r["max_ms"] = sorted[0]
	r["hitches"] = hitches
	r["worst_n"] = k
	return r


## 추천: 평균 FPS가 모니터 주사율(최소 60) 이상이고 1% 하위가 45 이상인 가장 높은 단계. 없으면 -1.
static func recommend(res: Array, refresh: float) -> int:
	var target := maxf(60.0, roundf(refresh))
	var best := -1
	for r in res:
		if r["avg_fps"] >= target and r["p1_low_fps"] >= 45.0:
			best = maxi(best, r["preset"])
	return best
