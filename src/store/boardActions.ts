import type { BoardItem, EventItem, StoryLine, WikiCategory, WikiDoc } from "../db/types";
import { useNovelStore, type Collection, type NovelState } from "./novelStore";

// 보드 편집 동작. 한 번의 setState = 실행 취소 1건 (보드 데이터만 기록, 사전 문서는 기록 안 함)

const store = useNovelStore;
const now = () => new Date().toISOString();

// 새 요소는 맨 위 (z 최대 + 1)
export const nextZ = (items: NovelState["items"]) =>
  Object.values(items).reduce((z, item) => Math.max(z, item.z), 0) + 1;

// system 분류 (사건 · 캐릭터). 사용자가 지울 수 없으므로 항상 존재
export const systemCategory = (s: NovelState, system: NonNullable<WikiCategory["system"]>) =>
  Object.values(s.categories).find((c) => c.system === system);

// 분류 템플릿 키로 빈 속성을 채운 새 문서 (UC-32)
export function newDoc(novelId: string, category: WikiCategory, title: string): WikiDoc {
  const at = now();
  return {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: at,
    createdAt: at,
    categoryId: category.id,
    title,
    aliases: [],
    tags: [],
    props: category.templateProps.map((key) => ({ key, value: "" })),
    body: null,
    mentions: [],
    plainText: "",
  };
}

// 사건 블록 + 사건 문서 자동 생성 (UC-10). 새 블록 ID 반환
export function addEvent(place: EventItem["place"], title = "새 사건"): string | null {
  const s = store.getState();
  const category = systemCategory(s, "event");
  if (!s.novelId || !category) return null;
  const doc = { ...newDoc(s.novelId, category, title), autoCreated: true };
  const item: EventItem = {
    id: crypto.randomUUID(),
    novelId: s.novelId,
    updatedAt: doc.updatedAt,
    kind: "event",
    z: nextZ(s.items),
    place,
    docId: doc.id,
    color: category.color,
  };
  store.setState({
    docs: { ...s.docs, [doc.id]: doc },
    items: { ...s.items, [item.id]: item },
  });
  return item.id;
}

const samePlace = (a: BoardItem["place"], b: BoardItem["place"]) =>
  JSON.stringify(a) === JSON.stringify(b);

// 여러 요소 위치 변경 (드래그 1회 = 1건). 바뀐 것이 없으면 기록하지 않음
export function moveItems(places: Record<string, BoardItem["place"]>) {
  const { items } = store.getState();
  const changed = Object.entries(places).filter(
    ([id, place]) => items[id] && !samePlace(items[id].place, place),
  );
  if (!changed.length) return;
  const next = { ...items };
  for (const [id, place] of changed) next[id] = { ...next[id], place } as BoardItem;
  store.setState({ items: next });
}

// 요소 일부 필드 변경 (색 등)
export function patchItems(ids: string[], patch: Partial<Pick<EventItem, "color">>) {
  store.setState(({ items }) => {
    const next = { ...items };
    for (const id of ids) if (next[id]) next[id] = { ...next[id], ...patch } as BoardItem;
    return { items: next };
  });
}

// 사전 문서 제목 변경 (블록 제목 = 문서 제목)
export function renameDoc(docId: string, title: string) {
  store.setState(({ docs }) =>
    docs[docId] ? { docs: { ...docs, [docId]: { ...docs[docId], title } } } : {},
  );
}

// ── 스토리 라인 (UC-23). 라인 · 문서는 실행 취소 기록 대상 아님 ──
export const sortedLines = (lines: Collection<StoryLine>) =>
  Object.values(lines).sort((a, b) => a.order - b.order);

// 사건 문서들의 라인 지정 (undefined = 미지정)
export function setDocsLine(docIds: string[], lineId: string | undefined) {
  store.setState(({ docs }) => {
    const next = { ...docs };
    for (const id of docIds) {
      const doc = next[id];
      if (!doc || doc.lineId === lineId) continue;
      const { lineId: _old, ...rest } = doc;
      next[id] = lineId ? { ...rest, lineId } : rest;
    }
    return { docs: next };
  });
}

export function addLine(name: string): string | null {
  const { novelId, lines } = store.getState();
  if (!novelId) return null;
  const order = Object.values(lines).reduce((o, l) => Math.max(o, l.order), -1) + 1;
  const line: StoryLine = {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: now(),
    name,
    order,
    color: "muted",
  };
  store.setState({ lines: { ...lines, [line.id]: line } });
  return line.id;
}

export function renameLine(id: string, name: string) {
  store.setState(({ lines }) =>
    lines[id] ? { lines: { ...lines, [id]: { ...lines[id], name } } } : {},
  );
}

// 끌어서 바꾼 순서대로 order 재지정
export function reorderLines(ids: string[]) {
  store.setState(({ lines }) => {
    const next = { ...lines };
    ids.forEach((id, order) => {
      if (next[id] && next[id].order !== order) next[id] = { ...next[id], order };
    });
    return { lines: next };
  });
}

// 라인 삭제: 쓰던 문서는 미지정 (data_model 5장)
export function deleteLine(id: string) {
  const { docs, lines } = store.getState();
  const { [id]: _removed, ...rest } = lines;
  const used = Object.values(docs).filter((d) => d.lineId === id);
  store.setState({ lines: rest });
  setDocsLine(
    used.map((d) => d.id),
    undefined,
  );
}
