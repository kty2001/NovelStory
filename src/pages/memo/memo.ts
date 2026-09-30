import type { Memo, TiptapJSON } from "../../db/types";
import type { Collection } from "../../store/novelStore";

const TITLE_MAX = 50;

// 표시 순서: 고정 메모 → 나머지, 각각 최근 수정순 (F5)
export const sortedMemos = (memos: Collection<Memo>) =>
  Object.values(memos).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );

// 메모 → 사전 문서: 첫 비어 있지 않은 줄 = 제목(최대 50자), 나머지 줄 = 문단 (비면 본문 없음).
// 제목이 잘리면 첫 줄 전체도 본문에 남김 (내용 손실 없음)
export function memoTitleBody(text: string): { title: string; body: TiptapJSON | null } {
  const lines = text.split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim());
  if (first < 0) return { title: "새 문서", body: null };
  const head = lines[first]!.trim();
  const title = head.slice(0, TITLE_MAX);
  const rest = lines.slice(head.length > TITLE_MAX ? first : first + 1);
  while (rest.length && !rest[0]!.trim()) rest.shift();
  while (rest.length && !rest.at(-1)!.trim()) rest.pop();
  if (!rest.length) return { title, body: null };
  return {
    title,
    body: {
      type: "doc",
      content: rest.map((l) =>
        l ? { type: "paragraph", content: [{ type: "text", text: l }] } : { type: "paragraph" },
      ),
    },
  };
}
