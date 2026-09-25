# ERD (Entity Relationship Diagram)

[data_model.md](./data_model.md)의 엔터티 관계를 시각화. 필드 의미·계산 규칙·무결성은 data_model.md가 기준.

- 모든 레코드 공통 필드: `id`(PK), `updatedAt`, `deletedAt`(소프트 삭제) — 아래 다이어그램에선 생략
- `json` = 배열·객체 필드, 괄호 안은 구조
- 저장소: IndexedDB(Dexie) 테이블 이름은 data_model.md 6장

## 1. MVP (F0 서재 · F1 보드 · F4 사전 · F6 저장)

```mermaid
erDiagram
    NOVEL ||--|| BOARD : "보드 1개 (Board.id = novelId)"
    NOVEL ||--o{ WIKI_CATEGORY : "분류"
    NOVEL ||--o{ WIKI_DOC : "문서"
    NOVEL ||--o{ BOARD_ITEM : "보드 요소"
    NOVEL ||--o{ BOARD_EDGE : "연결선"
    NOVEL ||--o{ IMAGE_ASSET : "이미지"
    NOVEL }o--o| IMAGE_ASSET : "표지 coverImageId"
    NOVEL ||--o{ STORY_LINE : "스토리 라인"
    STORY_LINE |o--o{ WIKI_DOC : "lineId (사건 계열)"

    WIKI_CATEGORY |o--o{ WIKI_CATEGORY : "하위 분류 parentId"
    WIKI_CATEGORY ||--o{ WIKI_DOC : "categoryId"
    WIKI_DOC }o--o| IMAGE_ASSET : "대표 이미지 imageId"
    WIKI_DOC }o--o{ WIKI_DOC : "@ 멘션 mentions"

    WIKI_DOC ||--o{ BOARD_ITEM : "docId (사건 0..1 / 캐릭터 상태 0..N)"
    BOARD_ITEM |o--o{ BOARD_ITEM : "프레임 소속 parentFrameId"
    BOARD_ITEM |o--o{ BOARD_ITEM : "관련 사건 linkedEventItemId"
    BOARD_ITEM ||--o{ BOARD_EDGE : "source"
    BOARD_ITEM ||--o{ BOARD_EDGE : "target"
    BOARD }o..o{ WIKI_DOC : "캐릭터 레인 순서 stateLanes.order"

    NOVEL {
        string id PK
        string title
        string genre
        string synopsis
        string coverImageId FK
        datetime createdAt
        datetime lastExportedAt "마지막 JSON 백업"
    }
    BOARD {
        string id PK "= novelId"
        string novelId FK
        json timeScale "pxPerTick, collapsedPx, tickLabels, collapsed, snap"
        json stateLanes "enabled, order(캐릭터 docId)"
    }
    IMAGE_ASSET {
        string id PK
        string novelId FK
        blob blob "WebP, 긴 변 1600px"
        string mime
        number width
        number height
        number bytes
    }
    WIKI_CATEGORY {
        string id PK
        string novelId FK
        string parentId FK
        string name
        number order
        json templateProps "속성 키 목록"
        string color "색 토큰"
        string system "character | event | 없음"
    }
    STORY_LINE {
        string id PK
        string novelId FK
        string name "메인 | 서브 | 사이드 | 사용자 추가"
        number order "표시 순서 = 테두리 모양"
        string color "색 토큰 (MVP 이후 사용)"
    }
    WIKI_DOC {
        string id PK
        string novelId FK
        string categoryId FK
        string title
        json aliases "별칭 목록"
        json tags "태그 목록"
        string lineId FK "스토리 라인 (사건 계열만)"
        json props "key-value 목록 (순서 유지)"
        json body "Tiptap JSON (mention 노드)"
        string imageId FK
        string color "캐릭터 대표 색 토큰"
        datetime createdAt
        boolean autoCreated "보드에서 자동 생성"
        json mentions "파생: 멘션 docId 목록"
        string plainText "파생: 검색용 텍스트"
    }
    BOARD_ITEM {
        string id PK
        string novelId FK
        string kind "event | state | sticky | text | frame"
        json place "timed(t, tEnd, y) | undated(x, y) | free(x, y)"
        number z "쌓임 순서"
        string parentFrameId FK "frame은 없음 (중첩 금지)"
        string docId FK "event, state"
        string color "event, sticky 색 토큰"
        string stateType "state: appear | change | exit"
        json changes "state: key, from, to 목록"
        string note "state 메모"
        string linkedEventItemId FK "state → event"
        number w "sticky, text, frame"
        number h "sticky, frame"
        string text "sticky, text"
        string title "frame"
    }
    BOARD_EDGE {
        string id PK
        string novelId FK
        string source FK
        string target FK
        string sourceHandle
        string targetHandle
        string label
        boolean dashed
    }
```

### 관계 읽는 법
| 관계 | 설명 |
|---|---|
| `WIKI_DOC` → `BOARD_ITEM` | 사건 문서 1개 ↔ 사건 블록 최대 1개 (1:1). 캐릭터 문서 1개 ↔ 상태 블록 여러 개 (1:N). 블록 제목은 문서 제목을 그대로 표시 |
| `BOARD_ITEM` 자기 참조 | `parentFrameId`: 프레임 소속 (좌표는 절대 좌표라 소속만 표시). `linkedEventItemId`: 상태 블록 → 관련 사건 블록 |
| `WIKI_DOC` 자기 참조 | 본문 `@` 멘션. 원본은 `body`의 mention 노드, `mentions`는 역링크 조회용 파생 색인 |
| `STORY_LINE` → `WIKI_DOC` | 사건 문서 1개 ↔ 라인 0..1개. 라인 1개에 사건 여러 개. 라인 삭제 시 문서는 미지정 |
| `BOARD` ⇢ `WIKI_DOC` (점선) | 캐릭터별 정렬의 레인 순서. 외래 키가 아닌 ID 목록 |

## 2. 로컬 전용 (동기화·내보내기 제외)

```mermaid
erDiagram
    NOVEL ||--o| UI_STATE : "novelId"
    UI_STATE {
        string novelId PK
        json viewport "x, y, zoom"
        string lastTab "board | wiki"
        string wikiPanelDocId
        datetime backupSnoozedUntil
        json filters "숨긴 캐릭터, 태그, 분류, 라인"
    }
    APP_META {
        string key PK "persist | librarySort"
        json value
    }
```

## 3. MVP 이후 (F2 서술 순서 · F5 메모)

```mermaid
erDiagram
    NOVEL ||--o{ EPISODE : "회차"
    NOVEL ||--o{ MEMO : "메모"
    EPISODE ||--o{ NARRATIVE_SLOT : "회차 안 순서"
    WIKI_DOC ||--o{ NARRATIVE_SLOT : "사건 문서 eventDocId (여러 회차 배치)"

    EPISODE {
        string id PK
        string novelId FK
        number number
        string title
    }
    NARRATIVE_SLOT {
        string id PK
        string novelId FK
        string episodeId FK
        string eventDocId FK
        number order
        string mode "linear | flashback | flashforward | foreshadow | payoff"
        string note
    }
    MEMO {
        string id PK
        string novelId FK
        string body
        boolean pinned
        datetime createdAt
    }
```
