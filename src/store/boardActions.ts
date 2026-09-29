import type {
  Board,
  BoardEdge,
  BoardItem,
  EventItem,
  FrameItem,
  StateItem,
  StickyItem,
  TextItem,
  StoryLine,
  WikiCategory,
  WikiDoc,
} from "../db/types";
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
  // 문서는 실행 취소 기록 밖이라 블록 생성만 1건으로 기록됨
  store.setState({ docs: { ...s.docs, [doc.id]: doc } });
  return placeEvent(place, doc.id);
}

// 기존 사건 문서의 블록 배치 (문서 → 보드 끌기, UC-22). 문서당 블록 1개 — 이미 있으면 null
export function placeEvent(place: EventItem["place"], docId: string): string | null {
  const s = store.getState();
  if (!s.novelId || !s.docs[docId]) return null;
  if (Object.values(s.items).some((i) => i.kind === "event" && i.docId === docId)) return null;
  const item: EventItem = {
    id: crypto.randomUUID(),
    novelId: s.novelId,
    updatedAt: now(),
    kind: "event",
    z: nextZ(s.items),
    place,
    docId,
    color: systemCategory(s, "event")?.color ?? "brand-peach",
  };
  store.setState({ items: { ...s.items, [item.id]: item } });
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
    // 색은 사건 · 포스트잇만
    for (const id of ids) {
      const item = next[id];
      if (item?.kind === "event" || item?.kind === "sticky") next[id] = { ...item, ...patch };
    }
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

// ── 캐릭터 상태 (UC-12 · 13) ──

// 캐릭터 분류에 새 캐릭터 문서 (템플릿 적용). 문서 ID 반환
export function addCharacter(name: string): string | null {
  const s = store.getState();
  const category = systemCategory(s, "character");
  if (!s.novelId || !category) return null;
  const doc = newDoc(s.novelId, category, name);
  store.setState({ docs: { ...s.docs, [doc.id]: doc } });
  return doc.id;
}

export function addState(
  place: StateItem["place"],
  docId: string,
  stateType: StateItem["stateType"],
): string | null {
  const s = store.getState();
  if (!s.novelId) return null;
  const item: StateItem = {
    id: crypto.randomUUID(),
    novelId: s.novelId,
    updatedAt: now(),
    kind: "state",
    z: nextZ(s.items),
    place,
    docId,
    stateType,
    changes: [],
    note: "",
  };
  store.setState({ items: { ...s.items, [item.id]: item } });
  return item.id;
}

type StatePatch = Partial<Pick<StateItem, "stateType" | "changes" | "note" | "linkedEventItemId">>;

// 상태 블록 입력 변경 (입력 확정 1회 = 1건). linkedEventItemId: undefined = 연결 해제
export function updateState(id: string, patch: StatePatch) {
  store.setState(({ items }) => {
    const item = items[id];
    if (item?.kind !== "state") return {};
    const next = { ...item, ...patch };
    if ("linkedEventItemId" in patch && !patch.linkedEventItemId) delete next.linkedEventItemId;
    return { items: { ...items, [id]: next } };
  });
}

// 캐릭터별 정렬 설정 (보드 기록 대상)
export function setLanes(patch: Partial<Board["stateLanes"]>) {
  store.setState(({ board }) =>
    board ? { board: { ...board, stateLanes: { ...board.stateLanes, ...patch } } } : {},
  );
}

// ── 포스트잇 · 텍스트 · 프레임 (UC-17 · 18) ──
type FreeFields<T extends BoardItem> = Omit<T, "id" | "novelId" | "updatedAt" | "z" | "kind">;

function addFree<T extends StickyItem | TextItem | FrameItem>(
  kind: T["kind"],
  fields: FreeFields<T>,
  z?: number,
): string | null {
  const s = store.getState();
  if (!s.novelId) return null;
  const item = {
    ...fields,
    id: crypto.randomUUID(),
    novelId: s.novelId,
    updatedAt: now(),
    kind,
    z: z ?? nextZ(s.items),
  } as T;
  store.setState({ items: { ...s.items, [item.id]: item } });
  return item.id;
}

export const addSticky = (x: number, y: number, w = 160, h = 160) =>
  addFree<StickyItem>("sticky", {
    place: { mode: "free", x, y },
    w,
    h,
    text: "",
    color: "sticky-yellow",
  });

export const addText = (x: number, y: number, w = 240) =>
  addFree<TextItem>("text", { place: { mode: "free", x, y }, w, text: "" });

// 프레임 + 안에 든 요소 소속 지정 (1건). 프레임은 다른 요소보다 아래 (z 최소 - 1)
export function addFrame(
  rect: { x: number; y: number; w: number; h: number },
  childIds: string[] = [],
  title = "프레임",
): string | null {
  const { items } = store.getState();
  const z = Object.values(items).reduce((m, i) => Math.min(m, i.z), 1) - 1;
  const id = addFree<FrameItem>(
    "frame",
    { place: { mode: "free", x: rect.x, y: rect.y }, w: rect.w, h: rect.h, title },
    z,
  );
  if (!id) return null;
  adopt(childIds, id);
  return id;
}

// 직전 동작(요소 생성)에 이어 프레임 소속 지정 → 실행 취소 1건으로 묶음 (기록 일시 정지)
export function adopt(ids: string[], frameId: string | undefined) {
  if (!frameId || !ids.length) return;
  store.temporal.getState().pause();
  store.setState(({ items }) => {
    const next = { ...items };
    for (const id of ids) {
      if (next[id] && next[id].kind !== "frame") next[id] = { ...next[id], parentFrameId: frameId };
    }
    return { items: next };
  });
  store.temporal.getState().resume();
}

// 여러 요소 필드 변경 (끌기 · 크기 조절 · 편집 1회 = 1건). undefined 값은 필드 제거
export function updateItems(patches: Record<string, Partial<BoardItem>>) {
  const { items } = store.getState();
  const next = { ...items };
  let changed = false;
  for (const [id, patch] of Object.entries(patches)) {
    const item = next[id];
    if (!item) continue;
    const merged = { ...item, ...patch } as Record<string, unknown>;
    for (const [k, v] of Object.entries(patch)) if (v === undefined) delete merged[k];
    if (JSON.stringify(merged) === JSON.stringify(item)) continue;
    next[id] = merged as BoardItem;
    changed = true;
  }
  if (changed) store.setState({ items: next });
}

// 삭제 (확인 없음, 실행 취소 가능 · UC-20): 프레임 자식은 그 자리에 남고(절대 좌표), 관련 사건 연결 · 연결선 정리
export function deleteItems(ids: string[], edgeIds: string[] = []) {
  const gone = new Set(ids);
  const goneEdges = new Set(edgeIds);
  const { items, edges } = store.getState();
  if (!ids.some((id) => items[id]) && !edgeIds.some((id) => edges[id])) return;
  const next: typeof items = {};
  for (const item of Object.values(items)) {
    if (gone.has(item.id)) continue;
    let kept = item;
    if (kept.parentFrameId && gone.has(kept.parentFrameId)) {
      const { parentFrameId: _p, ...rest } = kept;
      kept = rest as BoardItem;
    }
    if (kept.kind === "state" && kept.linkedEventItemId && gone.has(kept.linkedEventItemId)) {
      const { linkedEventItemId: _l, ...rest } = kept;
      kept = rest as BoardItem;
    }
    next[item.id] = kept;
  }
  const nextEdges = Object.fromEntries(
    Object.entries(edges).filter(
      ([id, e]) => !goneEdges.has(id) && !gone.has(e.source) && !gone.has(e.target),
    ),
  );
  store.setState({ items: next, edges: nextEdges });
}

// ── 연결선 (UC-19) ──
export function addEdge(
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): string | null {
  const { novelId, edges, items } = store.getState();
  if (!novelId || source === target || !items[source] || !items[target]) return null;
  const edge: BoardEdge = {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: now(),
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
    ...(targetHandle ? { targetHandle } : {}),
    dashed: false,
  };
  store.setState({ edges: { ...edges, [edge.id]: edge } });
  return edge.id;
}

// 라벨 · 실선/점선 (편집 1회 = 1건). 빈 라벨은 필드 제거
export function updateEdge(id: string, patch: Partial<Pick<BoardEdge, "label" | "dashed">>) {
  store.setState(({ edges }) => {
    const edge = edges[id];
    if (!edge) return {};
    const next = { ...edge, ...patch };
    if ("label" in patch && !patch.label) delete next.label;
    if (JSON.stringify(next) === JSON.stringify(edge)) return {};
    return { edges: { ...edges, [id]: next } };
  });
}

export function deleteEdges(ids: string[]) {
  const gone = new Set(ids);
  store.setState(({ edges }) =>
    ids.some((id) => edges[id])
      ? { edges: Object.fromEntries(Object.entries(edges).filter(([id]) => !gone.has(id))) }
      : {},
  );
}

// ── 붙여넣기 · 복제 (UC-20): 요소 · 연결선 · 복제한 사건 문서를 한 번에 (실행 취소 1건) ──
export function insertRecords(r: { items: BoardItem[]; edges: BoardEdge[]; docs: WikiDoc[] }) {
  if (!r.items.length) return;
  store.setState(({ items, edges, docs }) => ({
    items: { ...items, ...Object.fromEntries(r.items.map((i) => [i.id, i])) },
    edges: { ...edges, ...Object.fromEntries(r.edges.map((e) => [e.id, e])) },
    docs: { ...docs, ...Object.fromEntries(r.docs.map((d) => [d.id, d])) },
  }));
}
