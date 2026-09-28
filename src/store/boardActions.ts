import type { BoardItem, EventItem, WikiCategory, WikiDoc } from "../db/types";
import { useNovelStore, type NovelState } from "./novelStore";

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
