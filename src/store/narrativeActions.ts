import type { NarrativeMode, NarrativeSlot } from "../db/types";
import { episodeSlots, renumbered, sortedEpisodes } from "../pages/narrative/narrative";
import { useNovelStore, type Collection } from "./novelStore";

// 서술 순서 동작 (F2, UC-50). 실행 취소 기록 대상 아님 (사전과 동일)

const store = useNovelStore;

// 회차 하나의 슬롯 목록을 순서대로 다시 번호 매김
const withSlots = (slots: Collection<NarrativeSlot>, list: NarrativeSlot[]) =>
  renumbered(slots, list, "order", 0);

// 새 회차: 끝 또는 beforeId 앞. 회차 ID 반환
export function addEpisode(beforeId?: string): string | null {
  const { novelId, episodes } = store.getState();
  if (!novelId) return null;
  const list = sortedEpisodes(episodes);
  const at = beforeId ? list.findIndex((e) => e.id === beforeId) : -1;
  const episode = {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: new Date().toISOString(),
    number: 0,
  };
  list.splice(at < 0 ? list.length : at, 0, episode);
  store.setState({
    episodes: renumbered({ ...episodes, [episode.id]: episode }, list, "number", 1),
  });
  return episode.id;
}

// 빈 제목 = 번호만
export function renameEpisode(id: string, title: string) {
  store.setState(({ episodes }) => {
    const e = episodes[id];
    if (!e) return {};
    const { title: _old, ...rest } = e;
    const t = title.trim();
    return { episodes: { ...episodes, [id]: t ? { ...rest, title: t } : rest } };
  });
}

// 회차와 그 슬롯 삭제, 뒤 회차 번호 당김
export function deleteEpisode(id: string) {
  store.setState(({ episodes, slots }) => {
    if (!episodes[id]) return {};
    const { [id]: _removed, ...rest } = episodes;
    return {
      episodes: renumbered(rest, sortedEpisodes(rest), "number", 1),
      slots: Object.fromEntries(Object.entries(slots).filter(([, s]) => s.episodeId !== id)),
    };
  });
}

// 사건 문서를 회차의 index 위치에 배치 (같은 사건 여러 회차 허용). 슬롯 ID 반환
export function addSlot(episodeId: string, eventDocId: string, index?: number): string | null {
  const { novelId, episodes, docs, slots } = store.getState();
  if (!novelId || !episodes[episodeId] || !docs[eventDocId]) return null;
  const slot: NarrativeSlot = {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: new Date().toISOString(),
    episodeId,
    order: 0,
    eventDocId,
    mode: "linear",
  };
  const list = episodeSlots(slots, episodeId);
  list.splice(index ?? list.length, 0, slot);
  store.setState({ slots: withSlots({ ...slots, [slot.id]: slot }, list) });
  return slot.id;
}

// 슬롯을 회차(같거나 다른)의 index 위치로. index는 옮기는 슬롯을 뺀 목록 기준
export function moveSlot(slotId: string, episodeId: string, index: number) {
  store.setState(({ episodes, slots }) => {
    const slot = slots[slotId];
    if (!slot || !episodes[episodeId]) return {};
    const from = episodeSlots(slots, slot.episodeId).filter((s) => s.id !== slotId);
    const moved = slot.episodeId === episodeId ? slot : { ...slot, episodeId };
    let next = { ...slots, [slotId]: moved };
    const to = episodeSlots(next, episodeId).filter((s) => s.id !== slotId);
    to.splice(Math.min(index, to.length), 0, moved);
    if (slot.episodeId !== episodeId) next = withSlots(next, from);
    return { slots: withSlots(next, to) };
  });
}

export function setSlotMode(id: string, mode: NarrativeMode) {
  store.setState(({ slots }) =>
    slots[id] && slots[id].mode !== mode
      ? { slots: { ...slots, [id]: { ...slots[id], mode } } }
      : {},
  );
}

// 빈 메모 = 필드 제거
export function setSlotNote(id: string, note: string) {
  store.setState(({ slots }) => {
    const s = slots[id];
    if (!s || (s.note ?? "") === note) return {};
    const { note: _old, ...rest } = s;
    return { slots: { ...slots, [id]: note ? { ...rest, note } : rest } };
  });
}

export function removeSlot(id: string) {
  store.setState(({ slots }) => {
    const s = slots[id];
    if (!s) return {};
    const { [id]: _removed, ...rest } = slots;
    return { slots: withSlots(rest, episodeSlots(rest, s.episodeId)) };
  });
}

// 문서 삭제 · 사건 계열 이탈 시 그 문서의 슬롯 삭제 (data_model 5장)
export function removeDocSlots(docIds: string[]) {
  const ids = new Set(docIds);
  store.setState(({ slots }) => {
    const gone = Object.values(slots).filter((s) => ids.has(s.eventDocId));
    if (!gone.length) return {};
    let next = Object.fromEntries(Object.entries(slots).filter(([, s]) => !ids.has(s.eventDocId)));
    for (const episodeId of new Set(gone.map((s) => s.episodeId)))
      next = withSlots(next, episodeSlots(next, episodeId));
    return { slots: next };
  });
}
