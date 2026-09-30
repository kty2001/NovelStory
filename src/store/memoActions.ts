import type { BoardEdge, BoardItem, Memo, StickyItem } from "../db/types";
import { memoTitleBody } from "../pages/memo/memo";
import { addSticky, deleteItems } from "./boardActions";
import { useNovelStore } from "./novelStore";
import { addDoc, setDocBody } from "./wikiActions";

// 메모 동작 (F5, UC-52). 실행 취소 기록 대상 아님 (사전 · 서술과 동일).
// 변환 = 이동: 원본을 지우고, 되돌리기는 화면 알림에서 (restoreMemo 등)

const store = useNovelStore;
const now = () => new Date().toISOString();

// 새 메모. 메모 ID 반환
export function addMemo(body = ""): string | null {
  const { novelId, memos } = store.getState();
  if (!novelId) return null;
  const at = now();
  const memo: Memo = {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: at,
    createdAt: at,
    body,
    pinned: false,
  };
  store.setState({ memos: { ...memos, [memo.id]: memo } });
  return memo.id;
}

// updatedAt은 자동 저장이 DB에만 찍으므로 정렬(최근 수정순)용으로 스토어에도 갱신
function patchMemo(id: string, patch: Partial<Pick<Memo, "body" | "pinned">>) {
  store.setState(({ memos }) => {
    const m = memos[id];
    if (!m || Object.entries(patch).every(([k, v]) => m[k as keyof Memo] === v)) return {};
    return { memos: { ...memos, [id]: { ...m, ...patch, updatedAt: now() } } };
  });
}

export const setMemoBody = (id: string, body: string) => patchMemo(id, { body });
export const setMemoPinned = (id: string, pinned: boolean) => patchMemo(id, { pinned });

export function deleteMemos(ids: string[]) {
  store.setState(({ memos }) => ({
    memos: Object.fromEntries(Object.entries(memos).filter(([id]) => !ids.includes(id))),
  }));
}

// 되돌리기: 지운 메모를 그대로 다시 넣음
export function restoreMemos(list: Memo[]) {
  store.setState(({ memos }) => ({
    memos: { ...memos, ...Object.fromEntries(list.map((m) => [m.id, m])) },
  }));
}

// 메모 → 포스트잇 (보드 좌표 x, y = 왼쪽 위). 포스트잇 생성은 보드 실행 취소 1건. 포스트잇 ID 반환
export function memoToSticky(id: string, x: number, y: number): string | null {
  const memo = store.getState().memos[id];
  if (!memo) return null;
  const stickyId = addSticky(x, y, undefined, undefined, memo.body);
  if (!stickyId) return null;
  deleteMemos([id]);
  return stickyId;
}

// 포스트잇 → 메모 (여러 개, 보드 위치순). 되돌리기용으로 만든 메모 · 지운 요소 · 연결선 반환
export function stickiesToMemos(ids: string[]): {
  memoIds: string[];
  items: BoardItem[];
  edges: BoardEdge[];
} | null {
  const { novelId, items, edges, memos } = store.getState();
  const stickies = ids
    .map((id) => items[id])
    .filter((i): i is StickyItem => i?.kind === "sticky")
    .sort((a, b) => a.place.y - b.place.y || a.place.x - b.place.x);
  if (!novelId || !stickies.length) return null;
  const gone = new Set(stickies.map((s) => s.id));
  const goneEdges = Object.values(edges).filter((e) => gone.has(e.source) || gone.has(e.target));
  const at = now();
  // 위쪽 포스트잇이 목록 위로 오도록 뒤에서부터 1ms씩 앞선 시각
  const made: Memo[] = stickies.map((s, i) => {
    const stamp = new Date(Date.parse(at) - i).toISOString();
    return {
      id: crypto.randomUUID(),
      novelId,
      updatedAt: stamp,
      createdAt: stamp,
      body: s.text,
      pinned: false,
    };
  });
  deleteItems([...gone]);
  store.setState({ memos: { ...memos, ...Object.fromEntries(made.map((m) => [m.id, m])) } });
  return { memoIds: made.map((m) => m.id), items: stickies, edges: goneEdges };
}

// 메모 → 사전 문서 (분류 템플릿 빈 속성 포함). 문서 ID 반환
export function memoToDoc(id: string, categoryId: string): string | null {
  const memo = store.getState().memos[id];
  if (!memo) return null;
  const { title, body } = memoTitleBody(memo.body);
  const docId = addDoc(categoryId, title);
  if (!docId) return null;
  if (body) setDocBody(docId, body);
  deleteMemos([id]);
  return docId;
}
