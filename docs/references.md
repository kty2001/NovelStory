# 레퍼런스 (References)

조사일: 2026-09-24

## 1. 스토리 / 타임라인 도구

| 이름 | URL | 참고 포인트 |
|---|---|---|
| Aeon Timeline — 시간순 vs 서술순 | https://help.timeline.app/article/149-chronological-vs-narrative-order | 시간순(날짜 기준)과 서술순을 완전히 분리. 서술순에는 명시적으로 추가한 항목만 포함 → 배경 설정 사건 구분 |
| Aeon Timeline — Narrative View | https://www.aeontimeline.com/features/narrative-storytelling | 사건을 챕터/막 폴더에 배치, 회상·비선형 구성 관리 |
| Aeon Timeline — 비선형 스토리 추적 | https://help.timeline.app/article/152-how-to-track-your-non-linear-story | 플래시백 등 비선형 서술 관리 방법 |
| Aeon Timeline — 캐릭터 추적 | https://www.aeontimeline.com/guides/story/track-characters | 사건 × 캐릭터 교차 지점에 참여자/목격자 관계 지정 (다대다). Subway 뷰 = 캐릭터별 평행 트랙 |
| Aeon Timeline — Story Arcs | https://help.timeline.app/article/150-how-to-use-story-arcs | 사건을 서브플롯(아크)별로 분류 |
| Plottr | https://plottr.com/features/ | 씬 카드 타임라인, 플롯라인 행 구조, 색상·태그, 가로/세로 전환, 플롯 템플릿 |
| Campfire — Timeline | https://www.campfirewriting.com/learn/timeline-tutorial | 이벤트 카드 이동, 다중 타임라인 겹쳐 보기 |
| Campfire — Arcs | https://campfirewriting.com/learn/arcs-tutorial | 캐릭터 변화 궤적(시작 → 전환점 → 결말) 추적, Timeline과 연동 |
| bibisco | https://bibisco.com/ | 씬·캐릭터·타임라인 연결, 무료 오픈소스 버전 존재 |
| StoryLine (Obsidian 플러그인) | https://www.storyline.pixero.com/ | 시간순 씬 타임라인, POV·장소별 스윔레인 그룹핑 |

## 2. 국내 웹소설 도구

| 이름 | URL | 참고 포인트 |
|---|---|---|
| 뮤블 (Muvel) | https://muvel.app/ | 웹소설 특화 편집기. 에피소드(원고) / 위키(설정) / 메모 3구성, 웹·설치형, 로컬·클라우드 저장 |
| 뮤블 가이드북 | https://guide.muvel.app/ | 집필 도구 7종 비교 문서 포함 |
| 뮤블 — 소설 프로젝트 | https://guide.muvel.app/novel | 소설 = 에피소드·위키·메모·캔버스 묶음, 로컬 소설 / 클라우드 소설 선택 |
| 뮤블 — 위키 | https://guide.muvel.app/wiki | 계층 분류, 드래그 정렬, 커스텀 속성, 템플릿, 프로필 이미지, 데이터베이스(표) 보기, 마인드맵 보기, `@` 다이나믹 링크(제목·별칭 인식) |
| 뮤블 — 메모 | https://guide.muvel.app/memo | 구조화 전 아이디어 보관, 위키와 분리 |
| 스토리 플로터 | https://storyplotter.net/ko | 캐릭터 시트, 세계관, 연표, 관계도 |
| 라이트메이트 | https://www.write-mate.net/ | 인물 관계도, 시놉시스 출력 |

## 3. 화이트보드 / 블록 UI

| 이름 | URL | 참고 포인트 |
|---|---|---|
| Scratch | https://scratch.mit.edu/ | 팔레트 → 캔버스 드래그, 블록 색상별 카테고리, 스냅 연결 UX |
| Blockly | https://developers.google.com/blockly | Scratch류 블록 에디터 엔진. 코드 생성용이라 본 프로젝트엔 과함 → UX 참고용 |
| Miro — Story Plot Board | https://miro.com/templates/story-plot-board-template/ | 포스트잇으로 막·장면 배치, 색으로 서브플롯 구분 — 화이트보드 플롯 UX |
| tldraw | https://tldraw.dev/pricing | 화이트보드 SDK. 프로덕션은 라이선스 키 필요, 무료 hobby는 비상업 한정 → **제외** |
| Excalidraw | https://github.com/excalidraw/excalidraw | MIT 화이트보드. 커스텀 React 요소 미지원 → **제외**, 손그림 느낌 UX 참고 |

## 4. 라이브러리 / 배포

| 이름 | URL | 참고 포인트 |
|---|---|---|
| dnd kit | https://dndkit.com/ | 캔버스 밖 목록(회차, 위키 트리) 드래그 정렬, 터치·키보드 지원 |
| dnd kit — core vs react 로드맵 | https://github.com/clauderic/dnd-kit/discussions/1842 | `@dnd-kit/core`(v6 안정) 채택, `@dnd-kit/react`(v0.5) 제외 근거 |
| React Flow — 상태 관리 | https://reactflow.dev/learn/advanced-use/state-management | Zustand 연동 방식 |
| zundo | https://github.com/charkour/zundo | Zustand용 실행 취소/다시 실행 미들웨어 |
| Dexie | https://dexie.org/ | IndexedDB 래퍼, 스키마 버전·마이그레이션 |
| es-hangul | https://es-hangul.slash.page/ | 한글 초성 검색 등 (위키 검색 검토) |
| Lucide | https://lucide.dev/ | 아이콘 세트 |
| React Flow (xyflow) | https://reactflow.dev/ | **화이트보드 캔버스 채택**. MIT, 커스텀 노드·엣지, 줌·팬, 미니맵 |
| React Flow — 화이트보드 예제 | https://reactflow.dev/examples/whiteboard/rectangle | 사각형 그리기, 라소 선택, 지우개 (MIT) |
| React Flow — 드래그앤드롭 | https://reactflow.dev/examples/interaction/drag-and-drop | 도구 모음 → 캔버스 배치 |
| React Flow — NodeResizer | https://reactflow.dev/examples/nodes/node-resizer | 기간 사건 폭·도형 크기 조절 |
| React Flow — Sub-flows | https://reactflow.dev/learn/layouting/sub-flows | 프레임(그룹) 구현 |
| React Flow — ViewportPortal | https://reactflow.dev/api-reference/components/viewport-portal | 캔버스 좌표계에 시간축 렌더링 |
| React Flow — Helper Lines | https://reactflow.dev/examples/interaction/helper-lines | 정렬 보조선 참고. **Pro 라이선스** 예제 → 직접 구현 |
| Tiptap — Mention | https://tiptap.dev/docs/editor/extensions/nodes/mention | 위키 본문 `@` 문서 링크 |
| vis-timeline | https://visjs.github.io/vis-timeline/docs/timeline/ | 그룹(레인)별 타임라인 아이템 드래그 — 타임라인 UX 참고 |
| Tailwind CSS v4 + Vite | https://tailwindcss.com/docs/guides/vite | `@tailwindcss/vite` 설치 가이드 |
| Cloudflare Workers — React | https://developers.cloudflare.com/workers/framework-guides/web-apps/react/ | React SPA 생성·배포 명령, Vite 플러그인 설정 |
| Cloudflare Workers — SPA 라우팅 | https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/ | `not_found_handling: "single-page-application"` |
| Cloudflare Vite 플러그인 | https://developers.cloudflare.com/workers/vite-plugin/ | 로컬 개발을 workerd 런타임에서 실행 |
| Cloudflare Workers 한도 | https://developers.cloudflare.com/workers/platform/limits/ | Free: 10만 요청/일, CPU 10ms, 파일 20,000개 |
| Cloudflare Workers Builds | https://developers.cloudflare.com/workers/ci-cd/builds/ | GitHub 연동 자동 배포, 브랜치별 미리보기 URL, Worker 이름 = wrangler `name` 필수 |
| Workers Builds 한도 | https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/ | Free: 빌드 3,000분/월, 동시 1개, 20분 제한 |
| Cloudflare Pages vs Workers (2026) | https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/ | 신규 프로젝트는 Workers 권장 배경 |
| D1 요금 / 한도 | https://developers.cloudflare.com/d1/platform/pricing/ | Free: 읽기 500만 행/일, 쓰기 10만 행/일, 5GB |
| D1 Free 한도 강제 적용 공지 | https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/ | 2026-09-01부터 초과 시 쿼리 에러 |

## 5. 한글 입력 (IME) 이슈

| 이름 | URL | 참고 포인트 |
|---|---|---|
| ProseMirror — 안드로이드 한글 입력 | https://discuss.prosemirror.net/t/issue-with-applying-text-marks-bold-italic-etc-and-first-korean-character-input-not-working-correctly-on-android-smartphones/6702 | 삼성 기기에서 첫 한글 입력·서식 적용 문제 (기술 스파이크 C1) |
| ProseMirror — Chrome 한글 IME | https://github.com/ProseMirror/prosemirror/issues/1484 | Chrome 업데이트 후 한글 입력 문제 사례 |

## 6. 폰트

| 이름 | URL | 참고 포인트 |
|---|---|---|
| Pretendard | https://github.com/orioncactus/pretendard | OFL, v1.3.9, 가변 폰트 + 다이나믹 서브셋 CDN, 권장 fallback 스택 |
| Noto Serif KR | https://fonts.google.com/noto/specimen/Noto+Serif+KR | OFL 명조, 소설 본문 미리보기용 |

## 7. 차용할 아이디어 요약

| 아이디어 | 출처 | 적용 기능 |
|---|---|---|
| 소설 단위로 원고·위키·메모 묶음 관리 | 뮤블 | F0 서재 |
| 무한 캔버스 + 포스트잇·화살표·프레임 자유 배치 | Miro, tldraw, Excalidraw | F1 화이트보드 타임라인 |
| 사건 × 캐릭터 교차 관계(다대다) | Aeon Timeline | F1 상태 블록 ↔ 사건 연결 |
| 캐릭터별 평행 트랙 (Subway / 스윔레인) | Aeon Timeline, StoryLine | F1 "캐릭터별 정렬" |
| 씬 카드 + 색상·태그 | Plottr | F1 사건 블록 |
| 도구 모음 → 캔버스 드래그, 색상별 블록 유형 | Scratch | F1 도구 모음 |
| 시간순 / 서술순 독립 관리, 서술에 명시적으로 넣은 사건만 포함 | Aeon Timeline | F2 서술 순서 |
| 캐릭터 변화 궤적 (시작 → 전환점 → 결말) | Campfire Arcs | F3 캐릭터 상태 조회 |
| 계층 분류 + 커스텀 속성 + 템플릿 | 뮤블 위키 | F4 위키 문서 |
| 표(데이터베이스) 보기로 속성 비교 | 뮤블 위키 | F4 위키 표 보기 |
| `@` 다이나믹 링크 (제목·별칭 인식) | 뮤블 위키 | F4 문서 링크 |
| 구조화 전 아이디어 보관 | 뮤블 메모 | F5 메모 |
