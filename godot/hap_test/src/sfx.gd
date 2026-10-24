## 효과음: tools/make_sfx.py 로 미리 만든 WAV를 튼다 (공격 · 받기 · 합 · 메뉴 이동 · 보스 · 참가/나가기/거절).
extends Node

const NAMES := ["atk", "rcv", "hap", "tick", "slam", "join", "leave", "reject"]

var players := {}
var muted := false


func build() -> void:
	for n in NAMES:
		var path := "res://assets/sfx/%s.wav" % n
		if not ResourceLoader.exists(path):
			push_warning("효과음 없음: %s (tools/make_sfx.py 를 먼저 돌리세요)" % path)
			continue
		var p := AudioStreamPlayer.new()
		p.stream = load(path)
		p.max_polyphony = 4
		add_child(p)
		players[n] = p


func play(n: String, volume_db: float = 0.0) -> void:
	if muted or not players.has(n):
		return
	var p: AudioStreamPlayer = players[n]
	p.volume_db = volume_db
	p.play()


## 끝내기 전에 소리를 멈추고 놓는다 (재생 중인 소리가 있으면 종료 때 누수 경고가 난다).
func stop_all() -> void:
	muted = true
	for n in players:
		var p: AudioStreamPlayer = players[n]
		p.stop()
		p.stream = null
