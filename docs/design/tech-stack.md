# 기술 스택 (Tech Stack)

## 1. 요약

| 영역 | 선택 | 비고 |
|---|---|---|
| 빌드 도구 | Vite | 빠른 HMR, Cloudflare 공식 플러그인 지원 |
| UI 프레임워크 | React + TypeScript | SPA |
| 스타일 | Tailwind CSS v4 | `@tailwindcss/vite` 플러그인, PostCSS 설정 불필요 |
| 화이트보드 캔버스 | React Flow (`@xyflow/react`) | 무한 캔버스·줌·팬·연결선·그룹. 사건/상태 블록을 커스텀 노드로 구현 |
| 드래그앤드롭 (캔버스 밖) | dnd kit (`@dnd-kit/core` + `@dnd-kit/sortable`, v6 안정판) | 서술 순서 회차 목록, 위키 트리 정렬. `@dnd-kit/react`는 1.0 이전(v0.5)이라 제외 |
| 위키 본문 에디터 | Tiptap | 서식 텍스트 + Mention 확장으로 `@` 문서 링크. 한글 IME 검증 필요 (TODO 기술 스파이크 C1) |
| 상태 관리 | Zustand + zundo | React Flow 공식 문서의 Zustand 연동 방식, zundo로 실행 취소/다시 실행 |
| IndexedDB 래퍼 | Dexie | 스키마 버전·마이그레이션, 반응형 쿼리 |
| 라우팅 | React Router | `/`, `/novel/:id/board`, `/novel/:id/narrative`, `/novel/:id/wiki`, `/novel/:id/memo` |
| 아이콘 | Lucide | 오픈 라이선스, React 패키지 |
| 품질 도구 | ESLint + Prettier + Vitest + Playwright | Vitest = 로직(시간 변환, 상태 누적), Playwright = 드래그·IME E2E |
| 검색 | 부분 일치 (1단계) | 초성 검색(es-hangul)은 MVP 이후 |
| 저장 1단계 | IndexedDB (브라우저 로컬) + JSON 내보내기/가져오기 | 서버 비용·한도 부담 없음. 보드 요소·위키·이미지(Blob) 저장 |
| 저장 2단계 | Cloudflare Workers API + D1 | 로그인·기기 간 동기화, 인증 방식 미정 |
| 배포 | GitHub + Cloudflare Workers Builds → Workers Static Assets | main 푸시 시 자동 빌드·배포, 무료 티어. `@cloudflare/vite-plugin` + wrangler |
| 폰트 | Pretendard Variable, Noto Serif KR | [UIGuide.md](./UIGuide.md) 참고 |

## 2. Cloudflare 무료 티어 + React + Tailwind 호환성 확인

- **결론: 사용 가능**
- React(Vite) 빌드 결과물은 정적 파일(HTML/JS/CSS) → Workers Static Assets로 그대로 서빙
- Tailwind v4는 빌드 타임에 CSS 생성 → 런타임 의존성 없음, 배포 환경 제약 없음
- 2026년 기준 Cloudflare는 신규 프로젝트에 **Pages 대신 Workers(Static Assets)** 권장 (Pages는 지원 유지, 신규 기능은 Workers에 집중)
- 1단계(로컬 저장)는 Worker 스크립트 없이 정적 자산만 배포 → 요청·CPU 한도 거의 무관

## 3. 화이트보드 라이브러리 비교

| 라이브러리 | 라이선스 | 커스텀 React 블록 | 판단 |
|---|---|---|---|
| **React Flow (xyflow)** | MIT | 가능 (커스텀 노드) | **채택** |
| tldraw | 자체 라이선스. 프로덕션은 라이선스 키 필요, 무료 hobby 키는 비상업 한정 | 가능 | 제외 (상업화 시 비용·제약) |
| Excalidraw | MIT | 미지원 (자체 도형만) | 제외 (사건/상태 블록 구현 어려움) |

### React Flow로 구현할 요소
| 요소 | 구현 방식 |
|---|---|
| 사건·상태 블록, 포스트잇, 텍스트, 도형 | 커스텀 노드 (`nodeTypes`) |
| 기간 사건 폭 조절, 도형 크기 조절 | `NodeResizer` |
| 프레임 | 그룹 노드 + `parentId` (Sub-flows) |
| 연결선·라벨 | 커스텀 엣지 (`edgeTypes`) |
| 시간축 선·눈금 | `ViewportPortal`로 캔버스 좌표계에 렌더링 |
| 도구 모음 → 캔버스 배치 | 드래그앤드롭 예제의 **Pointer Events 방식** + `screenToFlowPosition` (HTML Drag and Drop API는 터치 기기 미지원) |
| 눈금 스냅 | x좌표를 `pxPerTick` 배수로 보정 (정수 눈금) |
| 다중 선택 | 기본 선택 박스 (라소 선택은 공식 화이트보드 예제 참고) |
| 미니맵 | `MiniMap` |
| 실행 취소 / 다시 실행 | Zustand 스토어 + zundo (`temporal` 미들웨어) |
| 정렬 보조선 | 직접 구현 (공식 helper lines 예제는 **Pro 라이선스**) |

## 4. 무료 티어 한도 (2026-09 기준)

### Workers (Free)
| 항목 | 한도 |
|---|---|
| 정적 자산 요청 | 무료·무제한 (대역폭 과금 없음) |
| Worker 스크립트 요청 | 100,000 / 일 (자정 UTC 리셋) |
| CPU 시간 | 10ms / 요청 |
| 파일 수 | 버전당 20,000개 |
| 파일 크기 | 파일당 25 MiB |

### Workers Builds (Free, GitHub 자동 배포)
| 항목 | 한도 |
|---|---|
| 빌드 시간 | 3,000분 / 월 |
| 동시 빌드 | 1개 |
| 빌드 제한 시간 | 20분 |
| 빌드 환경 | 2 vCPU, 8 GB 메모리 |

### D1 (2단계, Workers Free)
| 항목 | 한도 |
|---|---|
| 행 읽기 | 5,000,000 / 일 |
| 행 쓰기 | 100,000 / 일 |
| 저장 용량 | 5 GB (전체) |

- **주의**: 2026-09-01부터 Free 계정의 D1 일일 한도 초과 시 쿼리가 **에러로 실패** (자정 UTC까지)
- 대응
  - 자동 저장은 디바운스(예: 변경 후 수 초 대기) + 변경분만 전송
  - 블록 단위 행 쓰기 대신 소설 스냅샷(JSON) 단위 저장 검토
  - 조회 컬럼에 인덱스 추가로 행 읽기 절감
  - 로컬(IndexedDB)을 원본으로 두고 D1은 동기화용으로 사용 → 한도 초과 시에도 작업 유지

## 5. 초기 설정 예시

### 프로젝트 생성
```bash
npm create cloudflare@latest -- whitenoard --framework=react
```

### 수동 설정 시 패키지
```bash
npm i -D @cloudflare/vite-plugin wrangler tailwindcss @tailwindcss/vite
npm i @xyflow/react @dnd-kit/core @dnd-kit/sortable
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-mention
npm i zustand zundo dexie react-router lucide-react
npm i -D vitest @playwright/test eslint prettier
```

### `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
});
```

### `src/index.css`
```css
@import "tailwindcss";
/* UIGuide 토큰은 @theme 블록에 정의 */
```

### `wrangler.jsonc` (SPA 라우팅)
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "whitenoard",
  "compatibility_date": "2026-09-24",
  "assets": {
    "not_found_handling": "single-page-application"
  }
}
```

### 배포 (GitHub + Workers Builds)
1. GitHub 원격 저장소 생성 후 푸시
2. Cloudflare 대시보드 → Workers & Pages → Create application → Import a repository → GitHub 저장소 선택
   - 빌드 명령: `npm run build`
   - 배포 명령: `npx wrangler deploy`
   - **대시보드의 Worker 이름 = `wrangler.jsonc`의 `name`(`whitenoard`)** 이어야 빌드 성공
3. main(프로덕션 브랜치) 푸시 → 자동 빌드·배포
4. 그 외 브랜치 푸시 → 미리보기(Preview) URL 생성, PR에 URL 게시

- 배포 주소: `whitenoard.<계정>.workers.dev` (커스텀 도메인은 추후)
- 수동 배포(`npm run deploy`)는 긴급 시에만 사용

## 6. 데이터 규칙 (2단계 동기화 대비)
- ID: `crypto.randomUUID()`
- 모든 레코드에 `updatedAt` 필수, 삭제는 `deletedAt` 기록(소프트 삭제) → 2단계 D1 동기화 시 최종 수정 우선(last-write-wins) 병합 가능
- JSON 내보내기에 `schemaVersion` 포함, 가져오기 시 버전별 변환
- 로컬 데이터 유실 대비 (**로그인·유저별 DB 도입 전까지**): `navigator.storage.persist()` 요청 + 주기적 JSON 백업 알림

## 7. 단계별 로드맵
1. **1단계 (MVP)**: 정적 SPA + IndexedDB 로컬 저장 + JSON 백업
2. **2단계**: Workers API 라우트 추가 + D1 스키마(유저별 데이터) + 인증 → 로컬 ↔ 서버 동기화, 로컬 유실 대책 재검토. 이미지 저장소는 Cloudflare R2 검토 (보류)

## 8. 참고
- 관련 링크는 [references.md](../references.md)의 "라이브러리 / 배포" 항목 참고
