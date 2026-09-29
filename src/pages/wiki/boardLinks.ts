import type { BoardItem, EventItem, StateItem, TimeScale, WikiDoc } from "../../db/types";
import type { Collection } from "../../store/novelStore";

// 사전 문서의 보드 연동 정보 (UC-22 · 33, W-1 ⑧ · W-2 · W-3 ⑥). 보드 블록에서 계산, 편집 불가

type Place = EventItem["place"];

const events = (items: Collection<BoardItem>) =>
  Object.values(items).filter((i): i is EventItem => i.kind === "event");
const states = (items: Collection<BoardItem>) =>
  Object.values(items).filter((i): i is StateItem => i.kind === "state");

// 시점순 정렬 키: 눈금 → 세로 위치, 미정 영역은 뒤
const order = (p: Place) => (p.mode === "timed" ? p.t : Infinity);
const byPlace = (a: { place: Place; z: number }, b: { place: Place; z: number }) =>
  order(a.place) - order(b.place) || a.place.y - b.place.y || a.z - b.z;

export const eventBlock = (items: Collection<BoardItem>, docId: string) =>
  events(items).find((i) => i.docId === docId);

export const tickText = (scale: Pick<TimeScale, "tickLabels">, t: number) =>
  scale.tickLabels[t] || String(t);

// 작중 시점 표시: 단일 · 기간(a ~ b) · 미정. 블록이 없으면 null
export function placeText(place: Place | undefined, scale: Pick<TimeScale, "tickLabels">) {
  if (!place) return null;
  if (place.mode === "undated") return "미정";
  const start = tickText(scale, place.t);
  return place.tEnd !== undefined && place.tEnd !== place.t
    ? `${start} ~ ${tickText(scale, place.tEnd)}`
    : start;
}

// 사건 문서의 관련 캐릭터: 이 사건 블록에 연결된 상태 블록의 캐릭터 (중복 제거)
export function relatedCharacters(
  items: Collection<BoardItem>,
  docs: Collection<WikiDoc>,
  docId: string,
): WikiDoc[] {
  const ev = eventBlock(items, docId);
  if (!ev) return [];
  const ids = new Set(
    states(items)
      .filter((s) => s.linkedEventItemId === ev.id)
      .sort(byPlace)
      .map((s) => s.docId),
  );
  return [...ids].flatMap((id) => (docs[id] ? [docs[id]] : []));
}

// 캐릭터 문서의 등장 사건: 이 캐릭터 상태 블록이 연결한 사건 블록 (시점순)
export function characterEvents(items: Collection<BoardItem>, docId: string): EventItem[] {
  const ids = new Set(
    states(items).flatMap((s) =>
      s.docId === docId && s.linkedEventItemId ? [s.linkedEventItemId] : [],
    ),
  );
  return [...ids]
    .flatMap((id) => (items[id]?.kind === "event" ? [items[id] as EventItem] : []))
    .sort(byPlace);
}

// 캐릭터 상태 변화 이력 (시점순, 미정은 뒤)
export const stateHistory = (items: Collection<BoardItem>, docId: string) =>
  states(items)
    .filter((s) => s.docId === docId)
    .sort(byPlace);

// ▲ 등장 / ◆ 키: 이전 → 새 / ▼ 퇴장
export function stateText(s: StateItem): string {
  if (s.stateType === "appear") return "▲ 등장";
  if (s.stateType === "exit") return "▼ 퇴장";
  const changes = s.changes.map((c) =>
    c.from ? `${c.key}: ${c.from} → ${c.to}` : `${c.key}: ${c.to}`,
  );
  return `◆ ${changes.join(", ") || s.note || "변화"}`;
}
