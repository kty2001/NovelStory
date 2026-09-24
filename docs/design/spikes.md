# 기술 스파이크 검증 방법 (Spikes)

구현 전 위험 요소(C1~C8)를 소규모 프로토타입으로 검증하는 방법·합격 기준·실패 시 대안. 항목 목록은 [TODO.md](../TODO.md)의 "기술 스파이크" 참고.

## 1. 테스트 환경

보유 기기는 **Windows PC(Chrome / Edge)** 뿐 → 한글 입력·터치·모바일 성능은 아래 수단으로 보완.

| 수단 | 용도 | 비용 / 제약 |
|---|---|---|
| Playwright + CDP `Input.imeSetComposition` (Chromium) | 한글 조합(ㅎ → 하 → 한) 자동 재현. Chromium의 실제 IME 처리 경로 사용 | 무료. Playwright `keyboard`에는 IME API 없음 → `page.context().newCDPSession(page)`로 CDP 직접 호출. 조합 중 Enter는 실제 IME와 다름 → keyCode 229 `rawKeyDown` + `Input.insertText`로 별도 재현 |
| Playwright WebKit (Windows) | Safari 엔진 수준의 렌더링·이벤트 확인 | 무료. 실제 Safari·iOS IME 아님 |
| Chrome DevTools 기기 모드 + CPU 스로틀링(4x / 6x) | 터치 이벤트 기본 확인, 중급 모바일 성능 근사 | 무료. 멀티터치는 제한적 |
| Android Studio 에뮬레이터 | Android Chrome + Gboard 한글 입력, 핀치 근사 | 무료. 삼성 키보드 없음 |
| Samsung Remote Test Lab | 실제 갤럭시 원격 조작 (삼성 키보드, Galaxy A 중급기, Galaxy Tab) | 무료. 하루 20크레딧(1크레딧 = 15분). 원격 조작이라 실제 멀티터치와 다름 |
| BrowserStack / LambdaTest(TestMu AI) | 실제 iPhone·iPad Safari 원격 조작 | 무료 체험·무료 플랜 분량 한정 (가입 시 확인) |

- **원격 기기 접속 URL**: 스파이크 앱을 별도 Worker `whitenoard-spike`로 배포 (`npx wrangler deploy`) → `whitenoard-spike.<계정>.workers.dev`

## 2. 공통 방식

- **스파이크 앱**: 저장소 `spikes/` 폴더에 MVP와 같은 스택(Vite + React + TypeScript + Tailwind + React Flow + Tiptap)의 1회용 앱 1개
  - 항목별 페이지 `/c1` ~ `/c8`
  - MVP 코드에 합치지 않음. 검증 후 참고용으로만 보관
- **3단계 검증**
  1. 자동: Vitest(순수 로직) · Playwright(브라우저 동작), Windows에서 반복 실행
  2. PC 수동: Chrome / Edge + Windows 한글 IME
  3. 원격 실기기: Android 에뮬레이터 → Samsung Remote Test Lab → iOS 체험 서비스
- **진행 순서 (위험도순)**: C1 → C2 → C3 → C5 → C4 → C6 → C7 → C8
- **결과 기록**: 항목별 결과 표 작성 후 결론을 `채택` / `대안 적용` / `위험 수용` 중 하나로 기록

## 3. 항목별 검증 방법

### C1. 한글 IME — Tiptap 위키 본문·`@` 멘션

| 구분 | 내용 |
|---|---|
| 시나리오 | ① 빈 줄 첫 글자 입력 ② 문단 중간 입력 ③ 제목·목록·인용 안 입력 ④ 굵게 적용 직후 입력 ⑤ 조합 중 Backspace ⑥ `@홍길` 입력 → 제목·별칭 후보 필터 → 조합 중 Enter로 선택 ⑦ 실행 취소 |
| 자동 | Playwright(Chromium) + CDP 조합 시퀀스 → 에디터 문서 JSON의 텍스트·멘션 노드 검증 |
| 수동 | PC Chrome·Edge(MS 한글 IME) / 에뮬레이터(Gboard) / Remote Test Lab 갤럭시(삼성 키보드) / iOS Safari(체험 가능 시) |
| 합격 기준 | 글자 누락·중복 없음, 멘션이 조합 완료 후 정확한 문서로 삽입, 서식 유지 |
| 실패 시 | 문제 환경 한정 우회 코드 검토 → 해결 불가 시 위키 본문을 `textarea` + 자체 `@` 자동완성(마크다운 유사)으로 대체 |

### C2. 보드 단축키 × IME

| 구분 | 내용 |
|---|---|
| 시나리오 | ① 포스트잇 편집 중 한글 조합 상태에서 Backspace·Delete ② 편집 중 Ctrl+Z (텍스트 취소여야 함, 보드 취소 X) ③ **한글 입력 모드에서 도구 단축키 V·E·S·T·F** — 한글 모드에선 V가 `ㅍ`으로 들어오므로 `KeyboardEvent.code`(`KeyV`) 기준 처리 확인 |
| 자동 | Playwright로 조합 중 키 입력 후 노드 수·보드 상태 불변 확인 |
| 합격 기준 | 편집 중 노드 삭제 없음, 편집 중엔 텍스트 실행 취소, 편집 밖에선 한/영 모드와 무관하게 단축키 동작 |
| 실패 시 | 편집 중 React Flow 키 처리 비활성(`deleteKeyCode`를 동적으로 `null`), 모든 단축키 핸들러에 `isComposing`·`code` 검사 통일 |

### C3. React Flow 성능

| 구분 | 내용 |
|---|---|
| 방법 | 노드 200 / 500 / 1,000개 + 연결선 300개 자동 생성 페이지. 화면 FPS 표시기(`requestAnimationFrame` 기반) + Chrome Performance 패널 기록. `onlyRenderVisibleElements` on/off 비교. CPU 4x 스로틀링으로 중급 모바일 근사 → Remote Test Lab Galaxy A에서 최종 확인 |
| 합격 기준 | PC 1,000개 줌·드래그 50fps 이상 / 4x 스로틀링 500개 30fps 이상 / 초기 렌더 1초 이내 |
| 실패 시 | 커스텀 노드 DOM 단순화·`memo` 적용, 멀리 축소했을 때 블록 간략 표시(제목만), 권장 요소 수 상한 안내 |

### C4. 시간축

| 구분 | 내용 |
|---|---|
| 자동 (Vitest) | x ↔ 눈금 변환, 눈금 스냅, 구간 접기 적용 시 변환, 눈금 삽입 시 뒤쪽 블록 이동 — 순수 함수 단위 테스트 |
| 수동 | 줌 0.1 ~ 2 범위에서 눈금 밀도 자동 조정·라벨 겹침 없음, 팬 시 축 떨림 없음, 접힌 구간 ≈ 표시·펼치기 |
| 합격 기준 | 단위 테스트 전부 통과 + 전 줌 범위에서 라벨 겹침 없음 |
| 실패 시 | `ViewportPortal` 대신 뷰포트 변환값을 받아 그리는 별도 SVG 레이어로 렌더링 |

### C5. 터치

| 구분 | 내용 |
|---|---|
| 방법 | DevTools 기기 모드(기본 터치) → Android 에뮬레이터(핀치·두 손가락 팬 근사) → Remote Test Lab Galaxy Tab(길게 누르기, Pointer Events 드래그 배치) |
| 합격 기준 | 핀치 줌, 두 손가락 팬, 길게 눌러 메뉴, 도구 모음 → 캔버스 배치 동작. 한 손가락 이동과 선택 충돌 없음 |
| 한계 | 원격 조작은 실제 멀티터치와 다름 → **MVP 배포 전 실기기 태블릿 1회 확인 필요** (지인 기기 등). 확보 전까지 `위험 수용`으로 기록 |

### C6. 캔버스 인라인 편집

| 구분 | 내용 |
|---|---|
| 시나리오 | 포스트잇 더블클릭 → 입력 → 텍스트 안 드래그(글자 선택, 노드 이동 X) → 텍스트 안 휠(텍스트 스크롤, 캔버스 줌 X) → Esc·바깥 클릭으로 편집 종료 |
| 자동 + 수동 | Playwright로 편집 중 드래그 후 노드 좌표 불변 확인, PC에서 수동 확인 |
| 합격 기준 | 위 시나리오 모두 의도대로 동작. React Flow `nodrag`·`nowheel`·`nopan` 클래스로 해결되는지 확인 |

### C7. 프레임

| 구분 | 내용 |
|---|---|
| 시나리오 | 요소를 프레임 안으로 드래그(`parentId` 설정·상대 좌표 변환) / 밖으로 빼기 / 프레임 이동·크기 조절 시 자식 / 프레임 삭제 시 자식 처리 / 프레임 중첩 |
| 자동 | Playwright + 스토어 상태 검증 |
| 합격 기준 | 넣기·빼기 전후 화면상 위치 변화 없음, 프레임 이동 시 자식 동반 이동 |
| 결정 산출 | 중첩 허용 여부 (권장: MVP는 1단계만), 프레임 삭제 시 자식 유지 |

### C8. IndexedDB 용량

| 구분 | 내용 |
|---|---|
| 방법 | 3~5MB 사진 50장 저장 — 원본 vs 리사이즈(긴 변 1600px, WebP 품질 0.8, `createImageBitmap` + canvas). `navigator.storage.estimate()`로 사용량·할당량, Dexie 쓰기/읽기 시간 측정. `navigator.storage.persist()` 결과 확인(Chrome·Edge) |
| 합격 기준 | 리사이즈 시 50장 합계 20MB 이하, 이미지 1장 저장 200ms 이내 |
| 결정 산출 | 이미지 업로드 리사이즈 정책 |

## 4. 결과 기록

### 4.1 요약 (2026-09-25, 자동 검증 1차)

- 실행 환경: Windows PC, Playwright 1.63 (Chromium·WebKit), Vitest 5. 스파이크 앱 `spikes/` (`spike` 브랜치)
- 자동 검증: Vitest 10/10 통과, Playwright 55/56 통과 (실패 1 = C8 리사이즈 시간 기준), C3 성능 측정 11/12 기준 충족
- 실기기(PC 실제 한글 입력기, 갤럭시, iOS)는 **미실시** → 5장 체크리스트로 진행

### 4.1.1 PC 실제 입력기 확인 (2026-09-25, 사용자)

- C1 1~8, C2 1~4 모두 정상
- C1 3번(제목·목록·인용): 데이터(JSON)에는 제목으로 저장되나 `#`·`###` 제목이 일반 글자처럼 보임 → 한글 입력 문제 아님. Tailwind 기본 스타일(preflight)이 제목 서식을 초기화하는데 스파이크 CSS에 H2만 지정돼 있던 탓. H1~H3 스타일 추가로 해결 (H1 30px·H2 24px·H3 18px)
- 삼성 키보드·iOS 확인은 **보류** (나중에 진행)

| 항목 | 자동 검증 | 결론 (1차) | 남은 확인 |
|---|---|---|---|
| C1 한글 IME | 통과 (Chromium 10 + WebKit 1), PC 실제 IME 정상 | 채택 (Tiptap 유지) | 삼성 키보드, iOS (보류) |
| C2 단축키 × IME | 통과 (4), PC 실제 IME 정상 | 채택 (`code`·`isComposing` 규칙) | — |
| C3 성능 | PC 기준 충족, 4x 스로틀링 조건부 | 대안 적용 (화면 밖 렌더 생략 + 축소 시 간략 표시) | Galaxy A 실측 |
| C4 시간축 | 통과 (Vitest 10 + Chromium·WebKit 18) | 채택 (`ViewportPortal` 유지) | — |
| C5 터치 | 통과 (5, CDP 터치 근사) | 채택, 실기기 확인 전까지 위험 수용 | 실제 태블릿 |
| C6 인라인 편집 | 통과 (Chromium·WebKit 6) | 채택 | — |
| C7 프레임 | 통과 (Chromium·WebKit 8) | 채택 (중첩 금지, 삭제 시 자식 유지) | — |
| C8 IndexedDB 용량 | 용량 통과, 리사이즈 시간 미달 | 대안 적용 (Web Worker 리사이즈 + 진행 표시) | — |

### 4.2 항목별 상세

#### C1 한글 IME
| 환경 | 시나리오 | 결과 | 메모 |
|---|---|---|---|
| 자동 Chromium (CDP 조합) | ① 빈 줄 첫 글자 | 통과 | |
| 자동 Chromium | ② 문단 중간 | 통과 | |
| 자동 Chromium | ③ 제목·목록·인용 | 통과 | StarterKit v3의 뒤쪽 빈 문단(TrailingNode) 존재 — 커서 위치 주의 |
| 자동 Chromium | ④ 굵게 직후 | 통과 | 서식 유지 |
| 자동 Chromium | ⑤ 조합 중 Backspace | 통과 | 기존 글자 손상 없음 |
| 자동 Chromium | ⑥ `@홍길` → 조합 중 Enter → Enter | 통과 | 조합 중 Enter는 확정만, 다음 Enter로 선택. 입력한 조회어는 멘션으로 대체 |
| 자동 Chromium | ⑥-2 별칭 `@의적` | 통과 | 홍길동·활빈당 모두 후보 |
| 자동 Chromium | ⑦ 실행 취소 | 통과 | 잔여 자모 없음. 초기 내용은 `addToHistory: false`로 기록 제외 필요 |
| 자동 WebKit | 기본 입력 + `@` 멘션 | 통과 | IME 경로 아님 (WebKit은 CDP 조합 불가) |
| PC 실제 IME (사용자) | ①~⑦ 전체 | 통과 | ③ 제목 표시 문제는 CSS 누락 (4.1.1) |
| 삼성 키보드 · iOS | 전체 | 보류 | 5장 체크리스트 |

- **발견**: Tailwind preflight가 `h1`~`h6` 서식을 초기화 → 위키 본문 제목(H1~H3) 스타일을 UIGuide 기준으로 명시 필요
- 구현 규칙: 후보 목록 키 처리에서 `event.isComposing`이면 무시(IME에 맡김). ProseMirror는 조합 중 `handleKeyDown`을 호출하지 않음

**결론**: 채택 — 자동 검증 범위에선 문제 없음. 삼성 키보드는 보고된 이슈가 있어 실기기 확인 후 확정

#### C2 보드 단축키 × IME
| 환경 | 시나리오 | 결과 | 메모 |
|---|---|---|---|
| 자동 Chromium | 조합 중 Backspace·Delete | 통과 | 편집 중 선택된 노드도 삭제 안 됨 (React Flow가 입력 요소 이벤트 무시) |
| 자동 Chromium | 편집 중 Ctrl+Z | 통과 | 보드 실행 취소 안 됨 |
| 자동 Chromium | 한글 모드 단축키 (`key: 'ㅍ'`, `code: 'KeyV'`) | 통과 | `code` 기준이라 한/영 무관 동작 |
| 자동 Chromium | 편집 밖 Delete → 삭제, Ctrl+Z → 복구 | 통과 | zundo 실행 취소 동작 |
| PC 실제 IME (사용자) | 1~4 전체 | 통과 | |

- **발견**: 포스트잇 글자 입력이 보드 실행 취소 기록에 **글자 단위로** 쌓임 → MVP에선 편집 시작~종료를 1건으로 기록
- **발견**: zundo 기본 `undo()`는 `partialize`한 값으로 상태를 덮어써 React Flow 노드의 `type`·크기 정보가 사라짐 → 되돌릴 때 현재 노드와 병합하는 자체 `undo` 필요 (스파이크 `src/c2/store.ts`). 드래그는 시작 시점 1건만 기록

**결론**: 채택 — 단축키는 `KeyboardEvent.code`, 편집 요소·`isComposing`·keyCode 229 검사 규칙 확정

#### C3 React Flow 성능
프로덕션 빌드, 화면 표시 Chromium, 1440×900, 모니터 165Hz. 줌·팬 = 3초간 줌 0.5~1.5 왕복하며 4,000px 이동, 드래그 = 노드 1개 120단계 이동

| 노드 | 화면 밖 렌더 생략 | CPU | 초기 렌더 | 줌·팬 FPS | 줌·팬 p95 | 드래그 FPS |
|---|---|---|---|---|---|---|
| 200 | off | 1x | 183ms | 161 | 6ms | 163 |
| 200 | off | 4x | 1,906ms | 22 | 84ms | 72 |
| 200 | on | 1x | 273ms | 147 | 12ms | 153 |
| 200 | on | 4x | 728ms | 83 | 24ms | 159 |
| 500 | off | 1x | 215ms | 154 | 12ms | 150 |
| 500 | off | 4x | 2,486ms | **23** | 61ms | 54 |
| 500 | on | 1x | 249ms | 154 | 12ms | 164 |
| 500 | on | 4x | 1,271ms | **35** | 61ms | 154 |
| 1,000 | off | 1x | 512ms | **97** | 18ms | 139 |
| 1,000 | off | 4x | 2,252ms | 21 | 61ms | 87 |
| 1,000 | on | 1x | 308ms | **145** | 12ms | 165 |
| 1,000 | on | 4x | 2,431ms | 15 | 243ms | 145 |

- 기준 대비: PC 1,000개 50fps 이상 **충족** / 4x 500개 30fps는 **렌더 생략 on일 때만 충족**(35fps) / 초기 렌더 1초 이내 **충족**(1x)
- 4x에서 1,000개 + 렌더 생략 on은 빠른 팬 중 노드 생성·제거가 반복돼 오히려 느림(15fps)

**결론**: 대안 적용 — `onlyRenderVisibleElements` 기본 on, 축소(줌 0.5 미만) 시 블록 간략 표시(제목만), 연결선 단순화. Galaxy A 실측 후 권장 요소 수 상한 결정

#### C4 시간축
| 환경 | 시나리오 | 결과 |
|---|---|---|
| Vitest | x ↔ 눈금 변환·왕복, 접힌 구간(1개·여러 개), 스냅, 미정 영역(x < 0), 눈금 삽입, 눈금 간격, 라벨 겹침 제거 | 10/10 통과 |
| 자동 Chromium·WebKit | 줌 0.05·0.1·0.25·0.5·1·2 × 위치 3곳 라벨 겹침 없음 | 통과 |
| 자동 Chromium·WebKit | 팬 후 라벨-블록 상대 위치 유지 (±1px) | 통과 |
| 자동 Chromium·WebKit | ≈ 표시 클릭 → 펼침, 블록 위치 재계산 | 통과 |
| 자동 Chromium·WebKit | 드래그 → 눈금 스냅, 미정 영역으로 이동 → 시점 없음 | 통과 |

- **발견**: `ViewportPortal` 내용은 기본적으로 포인터 이벤트를 받지 않음 → 클릭할 요소(≈ 표시)에 `pointer-events: all` + `nopan` 필요
- 라벨은 `ViewportPortal` 안에서 `scale(1/zoom)` 역배율로 화면 크기 고정, 겹침은 우선순위(접힌 구간 > 사용자 라벨 > 숫자) 순 제거

**결론**: 채택 — `ViewportPortal` 방식 유지 (대안인 별도 SVG 레이어 불필요)

#### C5 터치 (Chromium 터치 에뮬레이션, 1024×768)
| 시나리오 | 결과 |
|---|---|
| 두 손가락 핀치 → 확대 (1.5배 이상) | 통과 |
| 두 손가락 팬 → 뷰포트 이동, 줌 변화 없음 | 통과 |
| 한 손가락: 빈 곳 = 팬, 노드 위 = 노드 이동 (뷰포트 불변) | 통과 |
| 길게 누르기 700ms → 메뉴, 150ms → 메뉴 없음 | 통과 |
| 도구 모음 → 캔버스 터치 드래그 배치 (드롭 좌표 일치, 메뉴 오작동 없음) | 통과 |

**결론**: 채택 — Pointer Events 배치·자체 길게 누르기 구현 유지. CDP 터치는 실제 손가락과 다르므로 **실기기 태블릿 확인 전까지 위험 수용**

#### C6 캔버스 인라인 편집
| 시나리오 | Chromium | WebKit |
|---|---|---|
| 편집 중 텍스트 드래그 → 글자 선택, 노드 이동 없음 | 통과 | 통과 |
| 편집 중 휠 → 텍스트 스크롤, 캔버스 줌 없음 (대조군: 빈 캔버스 휠은 줌) | 통과 | 통과 |
| Esc·바깥 클릭 → 편집 종료, 내용 유지 | 통과 | 통과 |

**결론**: 채택 — 편집 요소에 `nodrag nowheel nopan` 클래스로 충분

#### C7 프레임
| 시나리오 | Chromium | WebKit |
|---|---|---|
| 넣기·빼기 후 화면 위치 유지 (±1px) | 통과 | 통과 |
| 프레임 이동 → 자식 동반 이동 | 통과 | 통과 |
| 프레임 안에 프레임 넣기 불가 | 통과 | 통과 |
| 프레임 삭제 → 자식 유지·위치 보존 | 통과 | 통과 |

- **발견**: WebKit에선 `onNodeDragStop` 시점의 `getInternalNode().internals.positionAbsolute`가 **드래그 전 값**일 수 있음 → 이벤트 인자 `node.position` + 부모 절대 위치로 계산해야 함
- **발견**: React Flow 기본 삭제는 부모 삭제 시 자식까지 삭제 → 프레임 삭제는 자체 처리(`deleteKeyCode={null}` + 자식 절대 좌표 변환 후 부모 제거)
- 부모 노드는 배열에서 자식보다 앞에 있어야 함

**결론**: 채택 — 중첩 금지(MVP 1단계), 프레임 삭제 시 자식 유지

#### C8 IndexedDB 용량 (자동 Chromium, 합성 사진 평균 4.5MB × 50장)
| 방식 | 50장 합계 | 사용량 증가 | 장당 저장 | 전체 읽기 |
|---|---|---|---|---|
| 원본 | 225MB | 225.3MB | 4ms | 239ms |
| 리사이즈 (긴 변 1600px, WebP 0.8) | **8.9MB** (장당 약 0.18MB) | 8.9MB | **334ms** (리사이즈 포함) | 19ms |

- `navigator.storage.persist()`: API 지원, 새 사이트에선 **거부(false)** — Chrome은 방문 빈도·설치(PWA)·북마크 등으로 자동 판단
- 할당량: 약 6GB (테스트 환경)
- 디코딩 2회 → 1회로 줄여 421ms → 334ms. 저장 자체는 4ms이고 12MP 디코딩·WebP 인코딩이 대부분

**결론**: 대안 적용 — 업로드 시 **긴 변 1600px WebP 0.8 리사이즈 확정**(25배 절감). 리사이즈는 Web Worker(OffscreenCanvas)에서 처리하고 진행 표시. `persist()` 거부를 전제로 JSON 백업 알림을 기본 대책으로 유지(A9)

## 5. 사용자 수동 확인 체크리스트

### 실행
```bash
cd spikes
npm install
npm run dev        # http://localhost:5173
```

### PC 실제 한글 입력기 (Chrome / Edge 각각)
- [x] `/c1` 빈 에디터에 "안녕하세요 반갑습니다" 입력 → 글자 누락·중복 없음
- [x] `/c1` 문단 중간에 커서를 두고 한글 입력
- [x] `/c1` 제목(`## ` 입력 후 스페이스)·목록(`- `)·인용(`> `) 안에서 한글 입력
- [x] `/c1` Ctrl+B 후 한글 입력 → 굵게 유지
- [x] `/c1` 조합 중(예: "하" 상태) Backspace 여러 번 → 기존 글자 손상 없음
- [x] `/c1` `@홍길` 입력 → 후보 1개 → Enter 1번(조합 확정) → Enter 1번(선택) → 멘션 칩 삽입, "홍길" 글자 남지 않음
- [x] `/c1` `@의적` → 홍길동·활빈당 후보
- [x] `/c1` 한글 입력 후 Ctrl+Z → 자모 잔여 없음
- [x] `/c2` 포스트잇 더블클릭 → 한글 입력 중 Backspace·Delete → 포스트잇 삭제 안 됨
- [x] `/c2` 편집 밖에서 한글 모드 그대로 V·E·S·T·F → 도구 표시 변경

### 원격 실기기 (Samsung Remote Test Lab, 배포 후) — 보류
- [ ] 삼성 키보드로 `/c1` 시나리오 전체
- [ ] Galaxy A에서 `/c3?n=500&visible=1` 줌·팬 체감, `/c3?n=1000&visible=1`
- [ ] Galaxy Tab에서 `/c5` 핀치·두 손가락 팬·길게 누르기·도구 모음 드래그

### iOS Safari (BrowserStack / LambdaTest 체험)
- [ ] `/c1` 한글 입력·`@` 멘션
- [ ] `/c5` 터치 조작

### 자동 검증 재실행
```bash
cd spikes
npx playwright install chromium webkit   # 최초 1회
npm test                                  # Vitest
npx playwright test --project=chromium --project=webkit
npx playwright test --project=perf       # C3 성능 (브라우저 창이 열림)
```
