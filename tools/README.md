# tools — 듀오 프로토 1.5·1.6단계 테스트 도구

게임은 `../index.html` 한 파일입니다(1단계 결과 = `../index_v2.html`, 원본 = `../index_v1.html`). 이 폴더는 테스트와 빌드용입니다.

## 준비
```
cd tools
npm install        # three@0.170.0 (봇 테스트용)
pip install playwright && playwright install chromium   # 브라우저 점검(browser/)을 돌릴 때만
```

## 봇 테스트 (`sim.mjs`)
index.html의 게임 스크립트를 Node에서 그대로 돌립니다. WebGLRenderer만 빈 클래스로 바꾸고, `PIPE.step(1/60, false)`로 진행합니다. 판마다 시드가 고정됩니다(게임 = 게임 안 시드 난수, 봇 선택 = 판 번호로 시드). 한 판 = 보스 2체 러시 전체.

```
node sim.mjs --mode duo --bots coop,coop --runs 20       # 합 봇 2인
node sim.mjs --mode duo --bots ignore,ignore --runs 20   # 무시 봇 2인 (시동은 씀 · 마무리·커버 안 함 · 부활은 함)
node sim.mjs --mode duo --bots spam,spam --runs 20       # K 연타 봇 2인
node sim.mjs --mode duo --bots coop,spam --runs 20       # 혼합 페어 (합 1 + 연타 1)
node sim.mjs --mode tag --bots tag --runs 20             # 태그 솔로
node sim.mjs --mode duo --bots selfish,selfish --runs 20 # (참고) 무시 봇 + 부활도 안 함
node sim.mjs --replay 7200                               # 입력 기록 → 2회 재생 → 최종 상태 해시 비교 (보스 1·2 × 2인·태그)
```
옵션: `--seed 1`(첫 시드) `--max 1500`(판당 최대 초) `--workers 2` `--out 파일.jsonl` `--quiet` `--boss 1`(보스 2부터 시작: 보스 하나만 볼 때)

`./accept.sh` = 합격 기준 테스트 전체(위 5가지 × 20판 + 재생). 결과는 `results/`:
- `summary.jsonl`: 조건별 요약 한 줄씩. 1.6 지표: `wave`(사람별 흡수·사용, 넘쳐서 밀려남, 강화 시동·마무리, 자파, 컷인 · 판당 자파/컷인). 1.5단계 지표: `fin`(8가지 연계별 20판 합계) · `finMin` · `shuttle`(시작·스매시·실패·받아치기·완주율) · `mark`(공격·커버·실패·커버 성공률) · `bossT`(보스별 평균 처치 시간) · 그 밖에 클리어율, 랠리 2 도달, 보스 활동 비중, 전체 정지 비중, 에러 수 …
- `*.jsonl`: 판마다 한 줄 (결과, 시간, 도달 보스·페이즈, 전체 통계)
- `replay.json`: 재생 일치 여부 + 그 기록에 셔틀·표식·마무리가 몇 번 들어 있었는지

## 규칙 점검 (`check15.mjs`, 1.6 항목 포함)
스펙 규칙을 하나씩 게임 코드에 직접 걸어 보고 통과/실패를 적습니다(봇 통계와 별개). 결과는 `results/check15.json`.
```
node check15.mjs
```
- C: 두 캐릭터 · 시동 4개 · 상태 4개 · 면역 공유 · 자기 시동 못 받음
- F: 8가지 마무리를 끝까지 돌려 효과를 잼(타 수·피해·약점타·랠리·정지·그로기·선회 봉인), 태그 솔로 8가지
- S: 셔틀 수정구(색·모양, 번갈아, 비행 시간, 랠리, 스매시, 색 잠금, 폭발, 버팀, 태그 솔로)
- M · K: 표식 넘기기(봉인, 커버→넘어감, 횟수, 회피 무적 관통, 랠리, 태그 솔로) · 보스 2(방패 패턴, 방패 막기, 페이즈 모습)
- W (1.6): 청파·적파 — 자기 색만 흡수, 3칸·밀려남, 소모 순서·빈 칸, 청/적 강화 시동, 파트너 마무리 ×1.3, 자기 파장 마무리, 자파, 커버·셔틀 흡수, 평타 쿨타임, 보스 공격 색, 태그 솔로
- ST · KB (1.6): 연출(빛줄·정지·줌·컷인, 두 번째는 컷인 없음) · 한 키보드 2인 키 전환·키 겹침 없음

## 브라우저 점검 (`browser/`, 헤드리스 Chromium)
먼저 `browser/serve.sh`로 로컬 서버를 띄웁니다(127.0.0.1:8766). 그 다음:
- `python3 browser/input15.py` — 실제 키 이벤트로 한 키보드 2인(1P G H Space T Y B · 2P L K / O I . 방향키 · 숫자패드), 그때 1P 옛 키 J·U 무시, 1P·2P 같은 프레임 동시 입력, 혼자·AI 2P일 때 1P J K U I, 키 겹침 없음, O로 2P 참가 → 키 전환, 키 표시, R 꾹 재시작 + 가짜 Gamepad 객체로 패드 RT·LT·LB·RB (실제 패드·실제 노트북 키보드 기기는 아님)
- `python3 browser/render15.py` — 8가지 마무리 적중 순간 · 셔틀 비행 · 표식 커버 · 보스 2 방패 · 태그 솔로 연계 스크린샷 + 드로우콜 → `results/shots/`
- `python3 browser/clipshot.py 출력.png player2:gs1:0,2,5,7 boss:kneelDown:3` — 쇼케이스에서 클립 키포즈 모음 (`--skin 1` = 보스 2 모습)
- `python3 browser/finshot.py 출력.png lift:1 turn:2` — 실제 전투에서 마무리 한 번을 필름처럼 (`:tag` 붙이면 태그 솔로)

## 빌드 (`build/`)
`build/parts/*.js`를 `build/parts/base.html`(원본 + 1단계 첫 수치 편집)에 문자열 기준으로 끼워 `../index.html`을 만듭니다.
`splice.py` = 1단계 편집, `splice15.py` = 1.5단계 편집(원본 쪽 문자열 · 새 FEEL/FIGHT 값 · 10단계 수치 조정 기록), `splice16.py` = 1.6 편집(키 표 · FEEL.WAVE/STAGE · 바닥 표시 색 · 카메라 줌). 1.5단계 새 코드는 `parts/link15.js`(시동·상태·마무리), `parts/shuttle.js`, `parts/mark.js`, 1.6은 `parts/waves16.js`(청파·적파 3칸), `parts/stage16.js`(연계 연출·컷인·새 소리)와 기존 part 파일들에 있습니다.
```
python3 build/splice.py
```
index.html을 직접 고쳐도 됩니다. 그 경우 이 빌드는 다시 쓰지 마세요(덮어씁니다).

`PROGRESS_1.6.md` = 1.6 변경(한 키보드 2인 · 청파·적파 3칸 · 연계 연출) 체크리스트·결정 기록. `PROGRESS_1.5.md` = 스펙 항목별 체크리스트(어디에 구현했고 무엇으로 확인했는지, 스펙에 없던 규칙 ★ 목록, 수치 조정 기록).
