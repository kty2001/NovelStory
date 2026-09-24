# UI 가이드 (UIGuide)

## 개요

Clay.com 디자인 시스템을 기반으로, 스토리 편집 앱에 필요한 요소만 추린 가이드. 크림색 캔버스 위에 짙은 잉크색 텍스트, 채도 높은 단색 블록으로 따뜻하고 경쾌한 인상 유지.

**핵심 특징**
- 크림색 캔버스 (`{colors.canvas}` — #fffaf0). 차가운 회색 배경 사용 금지
- 주요 버튼은 거의 검정색 (`{colors.primary}` — #0a0a0a), 라운드 12px
- 사건·캐릭터 블록에 채도 높은 브랜드 색 사용 → 블록이 화면의 주된 시각 요소
- 넉넉한 라운드: 버튼·입력 12px, 패널·카드 16px, 블록 12~16px
- 그림자 최소화, 깊이는 크림 배경과 채색 블록의 대비로 표현
- 보드는 화이트보드 느낌: 점 격자 배경, 포스트잇·손으로 붙인 듯한 자유 배치, 떠 있는 도구 모음
- 한글 UI는 Pretendard, 소설 본문 미리보기는 Noto Serif KR
- 다크 모드는 MVP 미지원 (크림 테마만)

## 색상

### 브랜드 / 블록 색
블록 유형·태그·캐릭터 대표 색으로 사용.

| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.primary}` | #0a0a0a | 주요 버튼, 제목 텍스트 |
| `{colors.brand-pink}` | #ff4d8b | 사건 블록 (핵심 사건) |
| `{colors.brand-teal}` | #1a3a3a | 선택/강조 상태, 캐릭터 상태 `퇴장` |
| `{colors.brand-lavender}` | #b8a4ed | 캐릭터 상태 `변화` |
| `{colors.brand-peach}` | #ffb084 | 사건 블록 (일반 사건) |
| `{colors.brand-ochre}` | #e8b94a | 복선 / 복선 회수 표시 |
| `{colors.brand-mint}` | #a4d4c5 | 캐릭터 상태 `등장` |
| `{colors.brand-coral}` | #ff6b5a | 회상·시간 역행 구간 하이라이트 |

- 텍스트 색: pink·teal 블록 위는 흰색(`{colors.on-primary}`), lavender·peach·ochre·mint 위는 잉크색(`{colors.ink}`)
- 캐릭터 대표 색은 위 팔레트 순환 사용, 인접 레인에 같은 색 반복 지양

### 위키 분류 색
위키 트리·링크 칩·표의 분류 표시 점에 사용. 캐릭터·사건은 보드 블록 색과 일치.

| 분류 | 색 |
|---|---|
| 캐릭터 | `{colors.brand-mint}` |
| 사건 | `{colors.brand-peach}` |
| 장소 | `{colors.brand-teal}` |
| 세력·조직 | `{colors.brand-pink}` |
| 아이템 | `{colors.brand-ochre}` |
| 세계관 설정 | `{colors.brand-lavender}` |
| 사용자 분류 | `{colors.muted}` (사용자가 팔레트에서 변경 가능) |

### 포스트잇 색
브랜드 색의 연한 버전. 블록과 구분되도록 채도를 낮춤.

| 토큰 | 값 |
|---|---|
| `{colors.sticky-yellow}` | #fff1b8 (기본) |
| `{colors.sticky-pink}` | #ffd6e5 |
| `{colors.sticky-mint}` | #d9efe8 |
| `{colors.sticky-lavender}` | #e6defa |
| `{colors.sticky-peach}` | #ffe3d1 |

### 표면 (Surface)
| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.canvas}` | #fffaf0 | 기본 배경, 보드 캔버스 |
| `{colors.surface-soft}` | #faf5e8 | 위키 패널, 사이드 트리 배경 |
| `{colors.surface-card}` | #f5f0e0 | 카드, 캐릭터별 정렬 시 레인 교차 배경 |
| `{colors.surface-strong}` | #ebe6d6 | 강조 영역, 드롭 대상 하이라이트 |
| `{colors.surface-dark}` | #0a1a1a | 어두운 오버레이 (드묾) |
| `{colors.hairline}` | #e5e5e5 | 카드·입력 1px 테두리, 보드 점 격자 |

### 텍스트
| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.ink}` | #0a0a0a | 제목, 주요 텍스트 |
| `{colors.body-strong}` | #1a1a1a | 강조 본문 |
| `{colors.body}` | #3a3a3a | 기본 본문 |
| `{colors.muted}` | #6a6a6a | 보조 텍스트, 시간축 눈금 |
| `{colors.muted-soft}` | #9a9a9a | 캡션, 플레이스홀더 |
| `{colors.on-primary}` | #ffffff | 어두운 배경 위 텍스트 |

### 시맨틱
| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.success}` | #22c55e | 저장 완료 |
| `{colors.warning}` | #f59e0b | 경고 (시간 모순 등) |
| `{colors.error}` | #ef4444 | 입력 오류 |

## 타이포그래피

### 폰트 패밀리
| 용도 | 폰트 | 라이선스 | 비고 |
|---|---|---|---|
| UI 전반 (제목·버튼·블록 라벨·본문) | **Pretendard Variable** | SIL OFL | 가변 굵기 100~900, 한·영 조화 |
| 소설 본문 미리보기, 서술 텍스트 | **Noto Serif KR** | SIL OFL | 명조, Google Fonts 제공 |

### 폰트 로드
Pretendard는 **다이나믹 서브셋**(페이지에 쓰인 글자 조각만 다운로드) 사용. 한글 전체 글리프 로드로 인한 용량 문제 방지.

```html
<!-- index.html <head> -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap" />
```

- 버전 고정(`@v1.3.9`)으로 CDN 캐시·예기치 않은 변경 방지
- Noto Serif KR은 필요한 굵기(400, 600)만 요청

### Fallback 스택 (Tailwind v4 `@theme`)
```css
@theme {
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
    system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo",
    "Noto Sans KR", "Malgun Gothic", sans-serif;
  --font-serif: "Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Batang", serif;
}
```

### 위계
| 토큰 | Tailwind | 크기 | 굵기 | 행간 | 자간 | 용도 |
|---|---|---|---|---|---|---|
| `{typography.display}` | `text-3xl` | 30px | 700 | 1.3 | -0.02em | 소설 제목 |
| `{typography.title-lg}` | `text-2xl` | 24px | 700 | 1.35 | -0.01em | 화면 제목 |
| `{typography.title-md}` | `text-lg` | 18px | 600 | 1.4 | 0 | 패널 제목, 회차 제목 |
| `{typography.title-sm}` | `text-base` | 16px | 600 | 1.4 | 0 | 카드 제목, 캐릭터 이름 |
| `{typography.body-md}` | `text-base` | 16px | 400 | 1.6 | 0 | 기본 본문 |
| `{typography.body-sm}` | `text-sm` | 14px | 400 | 1.6 | 0 | 보조 설명 |
| `{typography.block-label}` | `text-sm` | 14px | 600 | 1.3 | 0 | 블록 라벨 |
| `{typography.caption}` | `text-xs` | 12px | 500 | 1.4 | 0 | 시간축 눈금, 배지 |
| `{typography.button}` | `text-sm` | 14px | 600 | 1.0 | 0 | 버튼 |
| `{typography.prose}` | `font-serif text-lg` | 18px | 400 | 1.8 | 0 | 소설 본문 미리보기 (명조) |

### 한글 타이포 규칙
- **줄바꿈**: `word-break: keep-all` (Tailwind `break-keep`) — 단어 중간 줄바꿈 방지. 긴 블록 라벨은 `overflow-wrap: anywhere` 병행
- **자간**: 한글은 음수 자간에 민감 → 제목도 -0.02em 이내, 본문은 0
- **행간**: 본문 1.6 이상, 명조 본문 1.8 권장 (라틴 대비 한글 글자 높이가 커서 답답해 보이기 쉬움)
- **굵기**: 제목 600~700, 본문 400. 가변 폰트이므로 필요 시 중간 굵기(500 등) 자유 사용
- **최소 크기**: 12px 미만 사용 금지 (한글 획 뭉개짐)
- **숫자**: 시간축·회차 번호에는 `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`)로 폭 고정
- **말줄임**: 블록 라벨은 1~2줄 말줄임(`line-clamp-2`), 전체 내용은 위키 패널에서 확인

## 레이아웃

### 간격
- 기본 단위: 4px
- 토큰: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px
- 패널 내부 여백: `{spacing.lg}` 24px (모바일 `{spacing.md}` 16px)
- 블록 내부 여백: 8px × 12px

### 화면 구성
- **보드**: 전체 화면 캔버스 + 상단 중앙에 떠 있는 도구 모음 + 우측 위키 패널(열고 닫기) + 우하단 미니맵·줌 컨트롤
- 보드 배경: `{colors.canvas}` + 옅은 점 격자(`{colors.hairline}`)
- 시간축: 캔버스 가로 기준선. 축 위 사건 영역, 축 아래 캐릭터 상태 영역
- **서재·위키·메모·서술 순서**: 최대 1280px 중앙 정렬
- **위키**: 좌측 분류 트리(240px) · 우측 문서 본문

## 깊이 (Elevation)

| 단계 | 처리 | 용도 |
|---|---|---|
| Flat | 그림자·테두리 없음 | 캔버스, 상단 바 |
| Hairline | 1px `{colors.hairline}` 테두리 | 입력, 패널, 카드 |
| 채색 블록 | 브랜드 색 채움, 그림자 없음 | 사건·상태 블록 |
| 드래그 중 | 약한 그림자 + 살짝 확대(1.02) | 드래그 중인 블록 |
| 포스트잇 | 약한 그림자 (0 1px 3px, 알파 0.12) | 포스트잇 (종이 느낌) |
| 떠 있는 UI | hairline 테두리 + 약한 그림자 | 보드 도구 모음, 미니맵, 컨텍스트 메뉴 |

그림자는 드래그 피드백, 포스트잇, 보드 위에 떠 있는 UI에만 사용.

## 모양 (Shapes)

| 토큰 | 값 | 용도 |
|---|---|---|
| `{rounded.xs}` | 6px | 작은 배지, 드롭다운 항목 |
| `{rounded.sm}` | 8px | 작은 버튼, 상태 블록 |
| `{rounded.md}` | 12px | 버튼, 입력, 사건 블록 |
| `{rounded.lg}` | 16px | 패널, 카드 |
| `{rounded.pill}` | 9999px | 탭, 태그 |
| `{rounded.full}` | 50% | 캐릭터 아바타, 아이콘 버튼 |

## 컴포넌트

### 버튼
- **`button-primary`**: 배경 `{colors.primary}`, 텍스트 흰색, `{typography.button}`, 패딩 12px × 20px, 높이 44px, `{rounded.md}`
- **`button-secondary`**: 배경 `{colors.canvas}`, 텍스트 `{colors.ink}`, 1px hairline 테두리
- **`button-on-color`**: 채색 배경 위 흰색 버튼 (텍스트 잉크색)
- **`button-text`**: 배경 없는 텍스트 버튼

### 입력
- **`text-input`**: 배경 `{colors.canvas}`, `{typography.body-md}`, `{rounded.md}`, 패딩 12px × 16px, 높이 44px, 1px hairline
- **`text-input-focused`**: 테두리를 잉크색으로 강조

### 탭 / 배지
- **`tab`** / **`tab-active`**: 알약형 탭. 비활성 투명 + muted 텍스트, 활성 `{colors.surface-card}` + ink 텍스트, 패딩 8px × 16px
- **`badge-pill`**: 태그·서술 방식(회상, 복선 등) 표시, `{typography.caption}`, `{rounded.pill}`

### 서재
- **`novel-card`**: 소설 카드. 표지 이미지(3:4) + 제목(`{typography.title-sm}`) + 장르 배지 + 최근 수정일(`{typography.caption}`). `{colors.surface-card}`, `{rounded.lg}`, 그리드 4열 → 2열(태블릿) → 1열(모바일)

### 보드 (화이트보드)
- **`board-toolbar`**: 상단 중앙에 떠 있는 도구 모음. `{colors.canvas}` + hairline + 약한 그림자, `{rounded.lg}`, 아이콘 버튼 40px(터치 44px), 선택된 도구는 `{colors.primary}` 채움 + 흰 아이콘. 모바일은 하단 시트
- **`time-axis`**: 2px `{colors.ink}` 가로선, 눈금 `{colors.muted}`, 라벨 `{typography.caption}` + `tabular-nums`(라벨 지정 눈금은 라벨 텍스트, 없으면 숫자). 줌 수준에 따라 눈금 밀도 자동 조정
  - 접힌 구간: 축 위 물결 기호 ≈ + 접힌 눈금 범위 라벨(예: `12~40`), `{colors.surface-strong}` 배경 칩, 클릭 시 펼침
- **`undated-zone`**: 시간축 왼쪽의 시점 미정 영역. `{colors.surface-soft}` 배경 + 1.5px 점선 `{colors.muted}` 테두리 + `{rounded.lg}`, 상단에 "시점 미정" 라벨(`{typography.caption}`)
- **`event-block`**: 사건 블록. 브랜드 색 채움, `{rounded.md}`, `{typography.block-label}`, 기간 사건은 가로 길이로 기간 표현, 선택 시 양 끝 리사이즈 핸들. 하단에 시간축까지 이어지는 점선 지시선
- **`state-block`**: 캐릭터 상태 블록. `{rounded.sm}`, 유형별 색 (등장 mint / 변화 lavender / 퇴장 teal) + 아이콘, 좌측에 캐릭터 이름. 상단에 시간축까지 이어지는 점선 지시선
- **`sticky-note`**: 포스트잇. 포스트잇 색, `{rounded.xs}`, 약한 그림자, 기본 160 × 160px, 텍스트 `{typography.body-sm}`
- **`board-text`**: 배경 없는 자유 텍스트, `{typography.title-md}` 기본
- **`board-shape`**: 사각형·원·마름모. 테두리 2px `{colors.ink}`, 채움 없음 또는 포스트잇 색
- **`frame`**: 영역 묶음. 1.5px 점선 `{colors.muted}` 테두리, `{rounded.lg}`, 좌상단 바깥에 제목(`{typography.title-sm}`)
- **`board-edge`**: 연결선. 2px `{colors.body}`, 화살촉, 점선 옵션, 라벨은 선 중앙의 `badge-pill`. 선택 시 `{colors.brand-teal}`
- **`selection-box`**: 드래그 선택 영역. `{colors.brand-teal}` 1px 테두리 + 8% 채움
- **`alignment-guide`**: 정렬 보조선. 1px `{colors.brand-coral}`
- **`palette-item`**: 도구 모음의 블록 원형. 드래그해 보드에 배치, hover 없이 커서·그림자 피드백만

### 위키
- **`wiki-tree`**: 분류 트리. 분류 색 점 + 이름 + 문서 수, 들여쓰기 16px, 선택 항목은 `{colors.surface-card}` 배경
- **`wiki-doc`**: 문서 화면. 상단 제목(`{typography.title-lg}`) + 별칭 배지 → 속성 표(2열 키-값, hairline 구분선) + 대표 이미지(우측, 모바일은 상단) → 본문(`{typography.body-md}`) → 역링크 / 보드 연동 정보(등장 사건, 상태 이력)
- **`wiki-link`**: 본문 내 문서 링크 칩. 분류 색 점 + 문서명, `{colors.surface-card}` 배경, `{rounded.xs}`. 삭제된 문서는 점선 테두리 + `{colors.muted}` 텍스트
- **`wiki-table`**: 분류별 속성 비교 표. 헤더 `{colors.surface-soft}`, 행 구분 hairline, 첫 열(제목) 고정

### 메모
- **`memo-card`**: 메모 카드. `{colors.surface-card}`, `{rounded.lg}`, 본문 `{typography.body-sm}` 최대 6줄 말줄임, 핀 고정 아이콘

## Do / Don't

### Do
- 모든 화면을 크림 캔버스(`{colors.canvas}`) 위에 구성
- 블록 색은 유형·의미별로 일관되게 유지
- 한글 텍스트에 `break-keep` 적용
- 토큰 참조 사용, hex 직접 입력 지양

### Don't
- 차가운 회색 배경 사용 금지
- 한글 제목에 과도한 음수 자간(-0.02em 초과) 금지
- 12px 미만 한글 텍스트 금지
- 정의된 색 토큰 외 임의 색상 추가 금지

## 반응형

### 브레이크포인트
| 이름 | 폭 | 주요 변화 |
|---|---|---|
| Mobile | < 768px | 하단 탭 내비게이션, 위키 패널은 하단 시트, 미니맵 숨김. 보드는 보기·블록 내용 수정만 (도구 모음·배치 편집 비활성) |
| Tablet | 768–1023px | 도구 모음 축소(아이콘만), 위키 패널 오버레이 |
| Desktop | 1024–1439px | 전체 화면 보드 + 떠 있는 도구 모음 + 우측 위키 패널 |
| Wide | ≥ 1440px | 데스크톱과 동일, 캔버스 영역 확대 |

### 터치 타깃
- 버튼·입력 최소 44 × 44px (WCAG AAA)
- 블록은 터치 시 최소 높이 44px 확보, 길게 눌러 드래그 시작

### 축소 전략
- 보드 + 패널 → 보드 + 오버레이 → 보드 + 하단 시트
- 위키: 트리 + 문서 2단 → 모바일은 트리 화면 → 문서 화면 이동
- 블록 색·모양은 모든 폭에서 유지
