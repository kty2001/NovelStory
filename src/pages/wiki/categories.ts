import type { BoardItem, WikiCategory, WikiDoc } from "../../db/types";
import type { Collection } from "../../store/novelStore";

// 사전 분류 트리 계산 (UC-30). 순수 함수

export type DropPos = "before" | "inside" | "after";

export const childCategories = (categories: Collection<WikiCategory>, parentId?: string) =>
  Object.values(categories)
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order);

export function descendantIds(categories: Collection<WikiCategory>, id: string): Set<string> {
  const found = new Set<string>();
  const visit = (parentId: string) => {
    for (const c of childCategories(categories, parentId)) {
      found.add(c.id);
      visit(c.id);
    }
  };
  visit(id);
  return found;
}

// 최상위 → 해당 분류 순서의 경로
export function categoryPath(categories: Collection<WikiCategory>, id: string): WikiCategory[] {
  const path: WikiCategory[] = [];
  for (
    let c: WikiCategory | undefined = categories[id];
    c;
    c = c.parentId ? categories[c.parentId] : undefined
  )
    path.unshift(c);
  return path;
}

// 최상위 분류의 system (사건 계열 · 캐릭터 계열 · 없음)
export function familyOf(categories: Collection<WikiCategory>, id: string | undefined) {
  let c = id ? categories[id] : undefined;
  while (c?.parentId && categories[c.parentId]) c = categories[c.parentId];
  return c?.system;
}

// 분류별 문서 수 (하위 분류 포함)
export function docCounts(
  categories: Collection<WikiCategory>,
  docs: Collection<WikiDoc>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of Object.values(docs)) {
    for (
      let c: WikiCategory | undefined = categories[d.categoryId];
      c;
      c = c.parentId ? categories[c.parentId] : undefined
    )
      counts[c.id] = (counts[c.id] ?? 0) + 1;
  }
  return counts;
}

// 분류와 그 하위 분류에 속한 문서
export function subtreeDocs(
  categories: Collection<WikiCategory>,
  docs: Collection<WikiDoc>,
  id: string,
): WikiDoc[] {
  const ids = descendantIds(categories, id).add(id);
  return Object.values(docs).filter((d) => ids.has(d.categoryId));
}

// 삭제 불가 이유. 비어 있는 사용자 분류만 삭제 가능 (data_model 5장)
export function deleteError(
  categories: Collection<WikiCategory>,
  docs: Collection<WikiDoc>,
  id: string,
): string | null {
  if (categories[id]?.system) return "기본 분류";
  const children = childCategories(categories, id).length;
  if (children) return `하위 분류 ${children}개`;
  const n = Object.values(docs).filter((d) => d.categoryId === id).length;
  return n ? `문서 ${n}개 — 먼저 옮기세요` : null;
}

type TreeState = {
  categories: Collection<WikiCategory>;
  docs: Collection<WikiDoc>;
  items: Collection<BoardItem>;
};

const newParentOf = (categories: Collection<WikiCategory>, targetId: string, pos: DropPos) =>
  pos === "inside" ? targetId : categories[targetId]?.parentId;

// 끌어 놓기 불가 이유. 보드에 쓰인 문서는 같은 계열 안에서만 이동 (data_model 5장)
export function dropError(
  { categories, docs, items }: TreeState,
  dragId: string,
  targetId: string,
  pos: DropPos,
): string | null {
  const drag = categories[dragId];
  if (!drag || !categories[targetId]) return "분류 없음";
  if (drag.system) return "기본 분류는 옮길 수 없어요";
  if (targetId === dragId || descendantIds(categories, dragId).has(targetId))
    return "자기 하위로는 옮길 수 없어요";
  const parentId = newParentOf(categories, targetId, pos);
  if (familyOf(categories, dragId) === familyOf(categories, parentId)) return null;
  const used = new Set(Object.values(items).flatMap((i) => ("docId" in i ? [i.docId] : [])));
  return subtreeDocs(categories, docs, dragId).some((d) => used.has(d.id))
    ? "보드에 쓰인 문서가 있어 다른 계열로 옮길 수 없어요"
    : null;
}

const withParent = (c: WikiCategory, parentId: string | undefined): WikiCategory => {
  const { parentId: _old, ...rest } = c;
  return parentId ? { ...rest, parentId } : rest;
};

// 이동 결과: 새 상위 분류 + 새 형제 순서 0..n (바뀐 레코드만 새 객체)
export function movedCategories(
  categories: Collection<WikiCategory>,
  dragId: string,
  targetId: string,
  pos: DropPos,
): Collection<WikiCategory> {
  const drag = categories[dragId];
  const parentId = newParentOf(categories, targetId, pos);
  const siblings = childCategories(categories, parentId).filter((c) => c.id !== dragId);
  const at =
    pos === "inside"
      ? siblings.length
      : siblings.findIndex((c) => c.id === targetId) + (pos === "after" ? 1 : 0);
  siblings.splice(at, 0, drag);
  const next = { ...categories };
  siblings.forEach((c, order) => {
    const moved = c.id === dragId && c.parentId !== parentId;
    if (c.order !== order || moved) next[c.id] = withParent({ ...c, order }, parentId);
  });
  return next;
}
