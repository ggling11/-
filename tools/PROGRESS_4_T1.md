# 4단계 아트 테스트 T1 '애니 셀' 진행 기록

- 세션 시작: 2026-10-03 13:12 UTC (압축 해제 · 시작 준비)
- 출발점: 3단계 최종 `index.html` md5 e07d1d3f… → `index_v5.html`로 보존(읽기 전용). `splice.py`로 다시 만들어도 같은 md5(확인).
- 시작 확인: `node tools/check15.mjs` 151/151 · `node tools/sim.mjs --replay 7200 --replay2 1` 해시 11줄 = `results/s3/accept/replay.json` (확인).
- 헤드리스 Chromium(SwiftShader)의 프레임 시간은 실제 GPU 프레임이 아니다. 이 문서의 시간 값은 전부 상대값이다.

## 0. 스펙 체크리스트 (ID · 구현 위치 · 확인 방법 · 상태)

| ID | 내용 | 구현 위치 | 확인 방법 | 상태 |
| --- | --- | --- | --- | --- |
| B0 | 3단계 최종 보존 | `index_v5.html` | md5 e07d1d3f | ✓ |
| B1 | 공통 기반 ART 표 (cur · boot · names · key · themes) | `build/splice40.py` → 데이터 구역 0d | 4T1 블록 · T2 | ✓ |
| B2 | SLICE 표 `{ on, boss: 1, chars: ['rapier','great'] }` · 브라우저만 | splice40 (`sliceStart` · `sliceEndFrame` · Rush.onBossDead 분기) | `t1/t1check.py SL1` | ✓ (테마 0) |
| B3 | 훅 `artApply · artDispose · artFrame · artHud` (이름 고정) | splice40 (renderFrame 첫 줄 · drawHud) | 4T1 블록 (PIPE에 함수 있는지부터) | ✓ |
| B4 | 바꾸는 법: F9 · `?art=N` · Esc 메뉴 `ART THEME`(RENDER SCALE 바로 아래) · 기억(try/catch) | splice40 | `t1check.py T2` | 테마 1 등록 뒤 |
| B5 | 판정용 숨은 리그: 3단계 리그 그대로 · 테마 켜지면 레이어 31로 (.visible 안 건드림) | splice40 `artHideRig` | 4T1 블록 L1 | ✓ (함수) |
| B6 | `sim.mjs --art N` (렌더 없이 테마 데이터만) | `tools/sim.mjs` loadGame | T3 ② | ✓ (옵션) |
| T1 | 테마 0 화면 = 3단계 최종 (픽셀 차이 평균 1% 이하) | — | `t1check.py T1` (v5.html vs index.html?art=0, 같은 시드 · Math.random 시드 · 멈춘 채 장면 준비) | ✓ 0.000% · 0.000% (공통 기반 빌드) — 최종 빌드로 다시 |
| T2 | 테마 전환 F9 · 주소 · 메뉴, 왕복 3번 뒤 드로우콜 · 텍스처 누수 없음 | | `t1check.py T2` | |
| T3 | 판정 불변: check15 151 · 재생 해시(테마 0 · `--art 1`) = 3단계 · 4T1 블록 | | `check15.mjs` · `t1/replay_cmp.py` | 테마 0 ✓ (공통 기반 빌드) |
| SL1 | 타이틀 → 아무 키 → 워든(세검 · 대검, 기본 스킬 2개) → 처치 → 결과 → 아무 키 재시작 · 메뉴 2인/태그/AI · 선택/유물 화면 안 거침 | splice40 | `t1check.py SL1` | ✓ (테마 0) |

(아래 표는 라운드마다 채운다)

## 1. 특징 표 (A)

## 2. 디자인 시트 (D1) · UI 목업 (D2)

## 3. 테마 1 스펙 표

## 4. 라운드 기록

| 라운드 | 바꾼 것 | 걸린 시간 | G1 | G2 | 패널 | 시트 |
| --- | --- | --- | --- | --- | --- | --- |

## 5. 거리 게이트 X1~X6

## 6. 제작 단가 (K)

| 항목 | 걸린 시간 | 메모 |
| --- | --- | --- |

## 7. ★ 스펙에 없던 규칙

- ★1 테마 코드는 `Math.random`을 쓰지 않는다(자체 시드 난수 `t1rand`). Node 재생에서 `Math.random`은 봇 입력 쪽 시드 난수라서, 테마가 하나라도 꺼내 쓰면 기록 해시가 달라진다.
- ★2 브라우저 점검 장면은 `Math.random`을 시드 난수로 바꾸고 PIPE가 생기는 순간 멈춘 뒤 장면을 만든다(헤드리스 rAF가 느려 실제 시간 프레임이 섞이면 장면이 매번 달라짐 → T1 비교가 1%대로 흔들렸음).
- ★3 빠른 테스트판 결과 화면은 끝 글자가 다 뜬 뒤 0.4초가 지나야 아무 키를 받는다(보스를 잡는 순간 누르던 공격 키로 바로 재시작되지 않게).
- ★4 빠른 테스트판에서는 Esc 메뉴의 `CHARACTER SELECT` 줄과 끝 화면 C키(선택 화면)를 막는다(선택 화면을 안 거치는 흐름).

## 8. 합칠 때 충돌 가능

| 위치 | 내용 |
| --- | --- |
| splice40 (공통) | renderFrame 첫 줄 · drawHud · keydown(F9 · 결과 화면 아무 키) · Menu3 items(ART THEME 줄 · CHARACTER SELECT 숨김) · Title3.frame(sliceStart) · Rush.onBossDead · update 끝 화면 분기 · 시작 줄(artBoot) — 다섯 세션이 같은 모양이어야 함 |
| sim.mjs | loadGame 끝 `--art N` 적용 줄, 워커에 `--art` 전달 |

## 9. 확인 못 한 것
