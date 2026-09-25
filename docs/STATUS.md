# 진행 상태 (Status)

## 현재 단계
설계 산출물 진행 중 (유스케이스·데이터 모델·ERD·단축키·데스크톱 와이어프레임 완료) — 다음: 빈 상태·온보딩 → 태블릿·모바일 와이어프레임 → MVP 구현. 원격 실기기 확인은 보류(MVP 배포 전 태블릿 1회 필수)

## 이력
| 날짜 | 내용 |
|---|---|
| 2026-09-24 | 기획 문서 작성: 기능 명세, 기술 스택, UI 가이드(한글 폰트), 레퍼런스 |
| 2026-09-24 | 화이트보드 타임라인(React Flow 채택), 소설별 관리(서재), 위키, 메모 기획 추가 |
| 2026-09-24 | 구현 전 결정·기술 스파이크 목록 작성, 작중 시간 모델·서비스명 확정, dnd kit 패키지 수정 |
| 2026-09-24 | 구현 전 결정 전체 확정 (A2~A11, 기술 선택, GitHub + Workers Builds 배포) |
| 2026-09-25 | 기술 스파이크 자동 검증 1차: C4·C6·C7 채택, C8 대안 적용, C1·C2·C3·C5는 실기기 확인 남음 ([spikes.md](./design/spikes.md)) |
| 2026-09-25 | PC 실제 한글 입력기 확인(C1·C2 통과), 문서 파일명 정리(`tech_stack.md`·`ui_guide.md`) |
| 2026-09-25 | 유스케이스([usecase.md](./design/usecase.md))·데이터 모델 확정본([data_model.md](./design/data_model.md)) 작성, GitHub 원격 연결 확인 |
| 2026-09-25 | ERD([erd.md](./design/erd.md)) 작성, 설계 문서 상단에 Mermaid 다이어그램 추가 |
| 2026-09-25 | 단축키 목록([shortcuts.md](./design/shortcuts.md)) 작성: 보드 도구·편집·이동·화면, 위키 편집, IME 처리 규칙 |
| 2026-09-25 | 사건 스토리 라인(메인·서브·사이드) 기능 추가: 기능 명세·UC-23·데이터 모델·ERD·UI 가이드 반영 |
| 2026-09-25 | 데스크톱 와이어프레임([wireframe.md](./design/wireframe.md)) 작성: 서재 5 · 보드 8 · 위키 6 프레임, 로파이 HTML, MVP 유스케이스 대조 완료 |

## 결정됨
| 항목 | 결정 |
|---|---|
| 서비스명 | WhiteNoard (`whitenoard.<계정>.workers.dev`) |
| 작중 시간 | 상대 순서(정수 눈금) + 눈금별 라벨 |
| 시간 공백 | 시간축 구간 접기 |
| 시점 불명 사건 | 시간축 왼쪽 미정 영역 |
| 캐릭터 상태 변화 | 위키 속성 변경(이전값→새값) + 메모, 시점별 상태 = 누적 계산 |
| 보드 | 소설당 1개, 프레임으로 구분 |
| 서술 순서 | 사건 1개를 여러 회차에 배치 허용 |
| MVP | F0 서재 + F1 보드 + F4 위키 + F6 로컬 저장 |
| 모바일 | 보기 + 간단 편집, 보드 배치 편집은 태블릿 이상 |
| 데이터 유실 대책 | `storage.persist()` + JSON 백업 알림 (로그인·유저별 DB 도입 전까지) |
| 블록 위치 저장 | 사건·상태 = 눈금 좌표(`t`), 그 외 = 보드 절대 좌표 ([data_model.md](./design/data_model.md)) |
| 보드 마우스 조작 | 빈 곳 드래그 = 박스 선택, 팬 = `Space`+드래그·가운데 버튼·`H`·터치 ([shortcuts.md](./design/shortcuts.md)) |
| 사건 스토리 라인 | 사건당 1개, 기본 메인·서브·사이드 + 추가·수정, 배지·테두리·필터로 구분, 색 지정은 MVP 이후 (UC-23) |
| 다크 모드 | MVP 제외 |
| 기술 | React Flow, dnd kit(core), Tiptap, Zustand + zundo, Dexie, React Router, Lucide, ESLint·Prettier·Vitest·Playwright |
| 배포 | GitHub + Cloudflare Workers Builds (무료 티어) |

## 보류
- 2단계 인증 방식, 관계도 보기, 이미지 R2 저장, 보드 공동 편집
