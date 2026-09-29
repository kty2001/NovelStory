# 진행 상태 (Status)

## 현재 단계
1단계(MVP) 진행 중 — 기반 · F0 서재 완료, F1 보드 완료(단축키 도움말 · 방향키 · 줌 단축키는 남음), F4 사전 진행 중(분류 트리 · 문서 편집 · 템플릿 · `@` 링크 + 역링크 · 표 보기 · 검색 완료, 다음: 보드 연동). MVP는 데스크톱 전용, 태블릿·모바일(와이어프레임·반응형·터치·실기기 확인)은 MVP 이후로 연기(확인 기기 없음)

## 이력
| 날짜 | 내용 |
|---|---|
| 2026-09-24 | 기획 문서 작성: 기능 명세, 기술 스택, UI 가이드(한글 폰트), 레퍼런스 |
| 2026-09-24 | 화이트보드 타임라인(React Flow 채택), 소설별 관리(서재), 사전, 메모 기획 추가 |
| 2026-09-24 | 구현 전 결정·기술 스파이크 목록 작성, 작중 시간 모델·서비스명 확정, dnd kit 패키지 수정 |
| 2026-09-24 | 구현 전 결정 전체 확정 (A2~A11, 기술 선택, GitHub + Workers Builds 배포) |
| 2026-09-25 | 기술 스파이크 자동 검증 1차: C4·C6·C7 채택, C8 대안 적용, C1·C2·C3·C5는 실기기 확인 남음 ([spikes.md](./design/spikes.md)) |
| 2026-09-25 | PC 실제 한글 입력기 확인(C1·C2 통과), 문서 파일명 정리(`tech_stack.md`·`ui_guide.md`) |
| 2026-09-25 | 유스케이스([usecase.md](./design/usecase.md))·데이터 모델 확정본([data_model.md](./design/data_model.md)) 작성, GitHub 원격 연결 확인 |
| 2026-09-25 | ERD([erd.md](./design/erd.md)) 작성, 설계 문서 상단에 Mermaid 다이어그램 추가 |
| 2026-09-25 | 단축키 목록([shortcuts.md](./design/shortcuts.md)) 작성: 보드 도구·편집·이동·화면, 사전 편집, IME 처리 규칙 |
| 2026-09-25 | 사건 스토리 라인(메인·서브·사이드) 기능 추가: 기능 명세·UC-23·데이터 모델·ERD·UI 가이드 반영 |
| 2026-09-25 | 데스크톱 와이어프레임([wireframe.md](./design/wireframe.md)) 작성: 서재 5 · 보드 8 · 사전 6 프레임, 로파이 HTML, MVP 유스케이스 대조 완료 |
| 2026-09-25 | 기능 명칭 "위키" → "사전" 변경 (문서·와이어프레임 한글 표기) |
| 2026-09-26 | 빈 상태·온보딩([onboarding.md](./design/onboarding.md)) 작성: 샘플 소설 제공, 빈 보드 안내 카드, L-2 갱신 · B-9 빈 보드 · W-7 빈 사전 프레임 추가 |
| 2026-09-26 | 1단계 착수: 루트에 앱 셋업(Vite 8 + React 19 + TS 6 + Tailwind v4 + Cloudflare Vite 플러그인, `wrangler.jsonc` SPA), ESLint·Prettier·Vitest·Playwright 스모크 테스트 |
| 2026-09-26 | 기반 구현: ui_guide 토큰·폰트(`@theme`, Tailwind 기본 색 제거), 라우팅(서재·작업공간·보드·사전), 소설 스토어(Zustand + zundo, 보드 데이터만 실행 취소·묶음 기록), Dexie 스키마 + 참조 비교 자동 저장(소프트 삭제), 내보내기 `schemaVersion`·변환 틀, Vitest 17건 |
| 2026-09-26 | 데이터 유실 대책(A9): `requestPersistOnce()`(앱 전체 1회, 결과 `AppMeta` 기록), 백업 알림 판단(7일·미백업 3일·나중에 3일) + 작업공간 배너, `UiState` 저장 도우미 |
| 2026-09-26 | F0 서재: 소설 생성(기본 분류 6·템플릿·라인 3)·정보 수정·표지(Web Worker WebP)·복제·삭제+되돌리기, JSON 내보내기/가져오기(ID 재발급·멘션 치환), 빈 서재 + 샘플 소설 "잿빛 왕관", 작업공간 ⋯ 메뉴·마지막 탭 복귀, `persist()` 연결 |
| 2026-09-28 | F1 보드 캔버스: `@xyflow/react` 12 추가, 점 격자·미니맵·줌 컨트롤, 빈 곳 드래그 = 박스 선택 · `Space`/가운데 버튼 팬, 화면 밖 렌더 생략, 줌 0.5 미만 `.board-simple`, 화면 위치 `UiState` 저장·복원, Playwright 3건 |
| 2026-09-28 | F1 시간축: `timeAxis.ts` 이식(+ `insertTick` 블록 t·tEnd 반영, `normalizeCollapsed`), 축 선·눈금·라벨(겹침 제거), 라벨 편집·우클릭 메뉴(눈금 삽입·라벨 지우기), `UiState.viewport` 선택 필드화(첫 화면 0 눈금 중앙), `Menu` 목록·`useDismiss` 분리 |
| 2026-09-28 | F1 구간 접기: 구간 선택(`Shift+클릭` · 우클릭 메뉴) + 접기 버튼, 접힌 막대 · `≈ a~b` 칩(펼치기), 구간 안 눈금 건너뛰기 |
| 2026-09-28 | F1 미정 영역: 0 눈금 왼쪽 "시점 미정" 점선 상자(`undated-zone`), 시간축 세로 중앙 정렬 |
| 2026-09-28 | 태블릿·모바일 작업(와이어프레임·반응형·터치·실기기 확인) MVP 이후로 연기(확인 기기 없음), MVP 데스크톱 전용 |
| 2026-09-28 | F1 미니맵: 시간축 · 미정 영역을 장식 노드로 전환(미니맵 선·상자, 화면 맞춤 포함), 캔버스를 `pages/board/Board.tsx`로 분리 |
| 2026-09-28 | F1 도구 모음 · 배치: 도구 모음 + 끌어 놓기/클릭 배치(Pointer Events), 배치 미리보기 · 스냅 가이드, 스냅 토글, 도구 단축키, 스토어 → 노드 변환(크기 · 선택은 화면 상태로 분리), `boardActions.addEvent`(사건 문서 자동 생성) |
| 2026-09-28 | F1 사건 블록: 제목 인라인 편집(한글 조합 Enter 무시), 끌기 이동 스냅 · 미정 영역 전환(`movedPlace`), 기간 조절 핸들(`spanPlace`, 묶음 기록), 지시선, 블록 메뉴 색, `@theme static`(블록 색 변수 항상 출력) |
| 2026-09-28 | F1 스토리 라인: 보드 단위 블록 메뉴(`NodeToolbar`, 다중 선택), 라인 배지 · 테두리, 필터 메뉴(`UiState.filters.hiddenLineIds`), 라인 편집 대화상자(HTML 끌어 놓기로 순서 변경, 새 의존성 없음) |
| 2026-09-28 | F1 캐릭터 상태 블록: `stateCalc`(시점별 누적 · 퇴장 이후 · 분류 계열 · 검색), 캐릭터 선택 팝오버, 입력 패널(패널 레이어 위 오버레이), 관련 사건 연결선, 캐릭터별 정렬 레인(`laneOrder`, 레인 머리 끌기) |
| 2026-09-28 | F1 포스트잇 · 텍스트 · 프레임: 자유 요소 노드 · 인라인 편집 · `NodeResizer`, 프레임 소속(`withFrames` · `dropPatches` · `frameAt`), 묶기/풀기, 삭제(`deleteItems`), 빈 자동 생성 문서 정리(`readNovel`), 블록 메뉴 일반화, `Board.tsx` 정리(줌 컨트롤 분리) |
| 2026-09-28 | F1 연결선: `Ports`(네 면 + 연결선 도구 중 전체 핸들, `useUpdateNodeInternals`), `EdgeView`(베지어 · 화살촉 · 라벨 · 점선 편집), `ConnectionMode.Loose`, `facingSides`, `addEdge` · `updateEdge` · 삭제 시 연결선 정리 |
| 2026-09-28 | F1 선택 · 복사 · 실행 취소: `clipboard.ts`(`copyClip` · `pasteRecords`, ID 재연결 · 문서 복제), `insertRecords`, 전체 선택 · Tab 순서 선택, 실행 취소 · 다시 실행 단축키 |
| 2026-09-28 | F1 빈 보드 안내 카드 · 필터로 전부 숨김 알림 (B-9), 도구 활성 구분 제거(전 도구 구현). F1 보드 TODO 항목 완료 |
| 2026-09-29 | F4 분류 트리: `wiki/categories.ts`(트리 · 문서 수 · 계열 · 이동 가능 판정 · 순서 재번호), `wikiActions`(분류 추가 · 이름 · 색 · 삭제 · 이동, 새 문서), 트리(HTML 끌어 놓기 앞 · 하위 · 뒤, 분류 메뉴 비활성 이유 `MenuItem.hint`), 최소 분류 화면, Vitest 17건 · Playwright 4건 |
| 2026-09-29 | F4 문서 편집: Tiptap v3 추가, `DocView`(제목 · 별칭 · 태그 · 라인 · 속성 표 · 대표 이미지 · 본문 · ⋯ 분류 이동 / 삭제), `wikiActions` 문서 동작(`updateDoc` · `setDocBody` 파생 필드 · `moveDoc` · `deleteDoc`), `saveImage` · `deleteImage`, 샘플 본문 멘션 노드 표시, Vitest 4건 · Playwright 6건 |
| 2026-09-29 | F4 템플릿: 분류 화면 탭(문서 목록 · 설정), `CategorySettings`(이름 · 상위 분류 · 색 · 템플릿 키), `PropsTable` `keysOnly`, `setTemplateProps`, Vitest 1건 · Playwright 2건 |
| 2026-09-29 | F4 `@` 링크 · 역링크: `mention.ts`(후보 검색 `mentionCandidates` · 스파이크 C1 후보 팝업 이식), `MentionChip`(Tiptap React 노드 뷰, 현재 제목 · 깨진 링크), `Backlinks` + `mentionContext`, 속성 값 링크는 MVP 이후로, Vitest 3건 · Playwright 2건 |
| 2026-09-29 | F4 표 보기 · 검색: `CategoryTable`(정렬 · 셀 수정 · `setPropValue`), `search.ts` `searchWiki` + `SearchResults`(분류 탭), 빠른 이동 `QuickMove`(`Ctrl+K`, 보드 `?tick=` 이동 · 접힌 구간 펼침), Vitest 4건 · Playwright 4건 |

## 결정됨
| 항목 | 결정 |
|---|---|
| 서비스명 | WhiteNoard (`whitenoard.<계정>.workers.dev`) |
| 작중 시간 | 상대 순서(정수 눈금) + 눈금별 라벨 |
| 시간 공백 | 시간축 구간 접기 |
| 시점 불명 사건 | 시간축 왼쪽 미정 영역 |
| 캐릭터 상태 변화 | 사전 속성 변경(이전값→새값) + 메모, 시점별 상태 = 누적 계산 |
| 보드 | 소설당 1개, 프레임으로 구분 |
| 서술 순서 | 사건 1개를 여러 회차에 배치 허용 |
| MVP | F0 서재 + F1 보드 + F4 사전 + F6 로컬 저장, **데스크톱 전용** |
| 기능 명칭 | "사전" (구 "위키"). 영문 식별자 `wiki`·`WikiDoc` 등은 유지 |
| 태블릿 · 모바일 | MVP 이후 (확인 기기 없음). 지원 수준은 A8 유지: 보기 + 간단 편집, 보드 배치 편집은 태블릿 이상 |
| 데이터 유실 대책 | `storage.persist()` + JSON 백업 알림 (로그인·유저별 DB 도입 전까지) |
| 블록 위치 저장 | 사건·상태 = 눈금 좌표(`t`), 그 외 = 보드 절대 좌표 ([data_model.md](./design/data_model.md)) |
| 보드 마우스 조작 | 빈 곳 드래그 = 박스 선택, 팬 = `Space`+드래그·가운데 버튼·`H`·터치 ([shortcuts.md](./design/shortcuts.md)) |
| 사건 스토리 라인 | 사건당 1개, 기본 메인·서브·사이드 + 추가·수정, 배지·테두리·필터로 구분, 색 지정은 MVP 이후 (UC-23) |
| 다크 모드 | MVP 제외 |
| 온보딩 | 샘플 소설(빈 서재, 가져오기 경로 재사용) + 빈 보드 안내 카드(요소 0개일 때만), 투어 없음 ([onboarding.md](./design/onboarding.md)) |
| `persist()` 요청 시점 | 첫 소설이 생기는 순간 1회 (새 소설 · 샘플 · 가져오기) |
| 기술 | React Flow, dnd kit(core), Tiptap, Zustand + zundo, Dexie, React Router, Lucide, ESLint·Prettier·Vitest·Playwright |
| 배포 | GitHub + Cloudflare Workers Builds (무료 티어) |

## 보류
- 2단계 인증 방식, 관계도 보기, 이미지 R2 저장, 보드 공동 편집
