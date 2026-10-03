import type { BoardItem, EventItem, FrameItem, StoryLine, WikiDoc } from "../../db/types";
import { sortedLines } from "../../store/boardActions";
import type { Collection } from "../../store/novelStore";
import { byPlace } from "../wiki/boardLinks";

type FlowLine = { line: StoryLine | null; events: EventItem[] };
type FlowSection = { frame: FrameItem | null; lines: FlowLine[] };

// 개요 스토리 흐름 (F7): 프레임(가로 위치순, 프레임 밖은 마지막) → 라인(라인 순서, 미지정 마지막)
// → 사건(시점순, 미정은 끝). 빈 묶음은 뺌
export function storyFlow(
  items: Collection<BoardItem>,
  docs: Collection<WikiDoc>,
  lines: Collection<StoryLine>,
): FlowSection[] {
  const all = Object.values(items);
  const frames = all
    .filter((i): i is FrameItem => i.kind === "frame")
    .sort((a, b) => a.place.x - b.place.x || a.place.y - b.place.y);
  const events = all.filter((i): i is EventItem => i.kind === "event");
  const lineOf = (e: EventItem) => {
    const id = docs[e.docId]?.lineId;
    return id && lines[id] ? id : null;
  };
  const byLine = (list: EventItem[]): FlowLine[] =>
    [...sortedLines(lines), null]
      .map((line) => ({
        line,
        events: list.filter((e) => lineOf(e) === (line?.id ?? null)).sort(byPlace),
      }))
      .filter((l) => l.events.length);
  const frameIds = new Set(frames.map((f) => f.id));
  return [
    ...frames.map((frame) => ({
      frame,
      lines: byLine(events.filter((e) => e.parentFrameId === frame.id)),
    })),
    {
      frame: null,
      lines: byLine(events.filter((e) => !e.parentFrameId || !frameIds.has(e.parentFrameId))),
    },
  ].filter((s) => s.lines.length);
}
