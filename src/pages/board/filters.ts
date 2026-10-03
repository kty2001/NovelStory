import type {
  BoardItem,
  ColorToken,
  StoryLine,
  UiState,
  WikiCategory,
  WikiDoc,
} from "../../db/types";
import { sortedLines } from "../../store/boardActions";
import type { Collection } from "../../store/novelStore";
import { categoryPath, flatCategories } from "../wiki/categories";
import { NO_LINE } from "./lines";

// 보드 필터 (B-5): 라인 · 캐릭터 · 태그 · 분류. 순수 함수

export type Filters = NonNullable<UiState["filters"]>;
export const NO_FILTERS: Filters = {
  hiddenDocIds: [],
  hiddenTags: [],
  hiddenCategoryIds: [],
  hiddenLineIds: [],
};

// 필터 없음: 같은 빈 집합 (참조가 그대로라 보드 파생 계산 · 키 처리기가 다시 돌지 않음)
const NONE: ReadonlySet<string> = new Set();

// 하나라도 해당하면 숨김: 사건 = 라인 · 태그 · 분류, 상태 = 캐릭터 · 분류
export function hiddenItemIds(
  items: Collection<BoardItem>,
  docs: Collection<WikiDoc>,
  filters: Filters,
): ReadonlySet<string> {
  const lines = new Set(filters.hiddenLineIds);
  const chars = new Set(filters.hiddenDocIds);
  const tags = new Set(filters.hiddenTags);
  const cats = new Set(filters.hiddenCategoryIds);
  if (!lines.size && !chars.size && !tags.size && !cats.size) return NONE;
  const out = new Set<string>();
  for (const item of Object.values(items)) {
    if (item.kind !== "event" && item.kind !== "state") continue;
    const doc = docs[item.docId];
    const hidden =
      (doc && cats.has(doc.categoryId)) ||
      (item.kind === "event"
        ? lines.has(doc?.lineId ?? NO_LINE) || !!doc?.tags.some((t) => tags.has(t))
        : chars.has(item.docId));
    if (hidden) out.add(item.id);
  }
  return out;
}

export type FilterRow = {
  key: string;
  name: string;
  count: number;
  index?: number; // 라인 순서 (테두리 견본)
  color?: ColorToken; // 라인 색 · 분류 색 점
};

const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) ?? 0) + 1);

// 필터 메뉴 그룹별 행 (보드 블록이 있는 캐릭터 · 태그 · 분류만) + 블록 수
export function filterRows(
  items: Collection<BoardItem>,
  docs: Collection<WikiDoc>,
  categories: Collection<WikiCategory>,
  lines: Collection<StoryLine>,
) {
  const lineCounts = new Map<string, number>();
  const charCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const catCounts = new Map<string, number>();
  for (const item of Object.values(items)) {
    if (item.kind !== "event" && item.kind !== "state") continue;
    const doc = docs[item.docId];
    if (doc) bump(catCounts, doc.categoryId);
    if (item.kind === "event") {
      bump(lineCounts, doc?.lineId ?? NO_LINE);
      for (const t of new Set(doc?.tags)) bump(tagCounts, t);
    } else if (doc) bump(charCounts, doc.id);
  }

  const lineRows: FilterRow[] = [
    ...sortedLines(lines).map((l, i) => ({
      key: l.id,
      name: l.name,
      count: lineCounts.get(l.id) ?? 0,
      index: i,
      color: l.color,
    })),
    { key: NO_LINE, name: "미지정", count: lineCounts.get(NO_LINE) ?? 0 },
  ];
  const charRows: FilterRow[] = [...charCounts]
    .map(([id, count]) => ({
      key: id,
      name: docs[id].title,
      count,
      color: categories[docs[id].categoryId]?.color,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const tagRows: FilterRow[] = [...tagCounts]
    .map(([t, count]) => ({ key: t, name: `#${t}`, count }))
    .sort((a, b) => a.key.localeCompare(b.key, "ko"));
  // 분류 트리 순서
  const catRows: FilterRow[] = flatCategories(categories)
    .filter(({ category }) => catCounts.has(category.id))
    .map(({ category }) => ({
      key: category.id,
      name: categoryPath(categories, category.id)
        .map((c) => c.name)
        .join(" › "),
      count: catCounts.get(category.id)!,
      color: category.color,
    }));
  return { lineRows, charRows, tagRows, catRows };
}
