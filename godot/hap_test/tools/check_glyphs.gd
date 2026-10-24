## 글자 검사: 소스(.gd)의 문자열에 쓴 모든 비ASCII 글자가 묶은 본문 글꼴(IBM Plex Sans KR)에 있는지,
## 제목 글꼴(Black Han Sans)로 그리는 문자열의 글자가 그 글꼴에 있는지 센다. (기본 글꼴에는 한글이 없다)
##   godot --headless --path <프로젝트> --script res://tools/check_glyphs.gd
extends SceneTree

const TITLE_STRINGS := ["합", "· 시험판", "끝낼까요?", "측정 결과", "두 명 입력 시험", "1P · 모루", "2P · 제비"]


func _init() -> void:
	var body: FontFile = load("res://assets/fonts/IBMPlexSansKR-Regular.ttf")
	var bold: FontFile = load("res://assets/fonts/IBMPlexSansKR-Bold.ttf")
	var title: FontFile = load("res://assets/fonts/BlackHanSans-Regular.ttf")
	var chars := {}
	for dir in ["res://src"]:
		for f in DirAccess.get_files_at(dir):
			if not f.ends_with(".gd"):
				continue
			var text := FileAccess.get_file_as_string(dir.path_join(f))
			for line in text.split("\n"):
				var t := line.strip_edges()
				if t.begins_with("#"):
					continue
				var code := t.split("#")[0] if not t.contains("\"") else t
				for ch in code:
					if ch.unicode_at(0) >= 0x80 and ch.unicode_at(0) != 0xFEFF:
						chars[ch] = true
	var missing_body := []
	var missing_bold := []
	for ch in chars:
		if not body.has_char(ch.unicode_at(0)):
			missing_body.append(ch)
		if not bold.has_char(ch.unicode_at(0)):
			missing_bold.append(ch)
	var missing_title := []
	for s in TITLE_STRINGS:
		for ch in s:
			# 제목 글꼴에 없으면 ui.gd 의 f_title_dot(FontVariation)이 굵은 본문 글꼴로 이어 그린다
			if ch != " " and not title.has_char(ch.unicode_at(0)) and not bold.has_char(ch.unicode_at(0)):
				missing_title.append(ch)
	var hangul := 0
	for ch in chars:
		var u: int = ch.unicode_at(0)
		if u >= 0xAC00 and u <= 0xD7A3:
			hangul += 1
	print("GLYPHS distinct_non_ascii=%d hangul=%d missing_body=%s missing_bold=%s missing_title=%s" % [chars.size(), hangul, missing_body, missing_bold, missing_title])
	var ok := missing_body.is_empty() and missing_bold.is_empty() and missing_title.is_empty()
	print("GLYPHS %s" % ("PASS" if ok else "FAIL"))
	quit(0 if ok else 1)
