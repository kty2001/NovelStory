import type {
  BoardItem,
  Episode,
  EventItem,
  NarrativeMode,
  NarrativeSlot,
  WikiCategory,
  WikiDoc,
} from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { byPlace } from "../wiki/boardLinks";
import { familyOf } from "../wiki/categories";

// 서술 순서 (F2) 계산. 회차 번호 = 목록 순서, 슬롯 order = 회차 안 순서

export const MODE_LABEL: Record<NarrativeMode, string> = {
  linear: "정상 진행",
  flashback: "회상",
  flashforward: "예고",
  foreshadow: "복선",
  payoff: "복선 회수",
};
export const MODES = Object.keys(MODE_LABEL) as NarrativeMode[];

export const sortedEpisodes = (episodes: Collection<Episode>) =>
  Object.values(episodes).sort((a, b) => a.number - b.number);

export const episodeSlots = (slots: Collection<NarrativeSlot>, episodeId: string) =>
  Object.values(slots)
    .filter((s) => s.episodeId === episodeId)
    .sort((a, b) => a.order - b.order);

export const episodeName = (e: Episode) => `${e.number}화${e.title ? ` ${e.title}` : ""}`;

export type EventEntry = { doc: WikiDoc; block?: EventItem };

// 사건 계열 문서: 보드 시점순(미정은 뒤) → 보드에 없는 문서(제목순)
export function eventDocsInOrder(
  items: Collection<BoardItem>,
  docs: Collection<WikiDoc>,
  categories: Collection<WikiCategory>,
): EventEntry[] {
  const blocks = Object.values(items)
    .filter((i): i is EventItem => i.kind === "event" && !!docs[i.docId])
    .sort(byPlace);
  const placed = new Set(blocks.map((b) => b.docId));
  const rest = Object.values(docs)
    .filter((d) => !placed.has(d.id) && familyOf(categories, d.categoryId) === "event")
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  return [
    ...blocks.map((block) => ({ doc: docs[block.docId], block })),
    ...rest.map((doc) => ({ doc })),
  ];
}

// 문서별 배치 수 (미서술 = 0)
export function slotCounts(slots: Collection<NarrativeSlot>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of Object.values(slots)) counts[s.eventDocId] = (counts[s.eventDocId] ?? 0) + 1;
  return counts;
}

// 사건 문서가 배치된 회차 (회차 번호 → 회차 안 순서)
export function docEpisodes(
  slots: Collection<NarrativeSlot>,
  episodes: Collection<Episode>,
  docId: string,
): { slot: NarrativeSlot; episode: Episode }[] {
  return Object.values(slots)
    .filter((s) => s.eventDocId === docId && episodes[s.episodeId])
    .map((slot) => ({ slot, episode: episodes[slot.episodeId] }))
    .sort((a, b) => a.episode.number - b.episode.number || a.slot.order - b.slot.order);
}

// 목록 순서대로 번호를 다시 매겨 바뀐 레코드만 교체 (자동 저장 참조 비교)
export function renumbered<T extends { id: string }, K extends keyof T>(
  collection: Collection<T>,
  list: T[],
  key: K,
  start: number,
): Collection<T> {
  const next = { ...collection };
  list.forEach((r, i) => {
    const value = (start + i) as T[K];
    next[r.id] = r[key] === value ? r : { ...r, [key]: value };
  });
  return next;
}
