import { useStore, ViewportPortal } from "@xyflow/react";
import type { BoardItem, TimeScale } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { tickToX } from "./timeAxis";

// 시간 블록에서 시간축까지 점선 지시선 (ui_guide `event-block`). 기간 사건은 시작·끝 두 줄
export default function Leaders({
  items,
  hiddenIds,
  scale,
  heightOf,
}: {
  items: Collection<BoardItem>;
  hiddenIds: ReadonlySet<string>;
  scale: TimeScale;
  heightOf: (id: string) => number;
}) {
  const zoom = useStore((s) => s.transform[2]);
  const lines: { key: string; x: number; y1: number; y2: number }[] = [];
  for (const item of Object.values(items)) {
    if (item.kind !== "event" || item.place.mode !== "timed" || hiddenIds.has(item.id)) continue;
    const p = item.place;
    const top = p.y;
    const bottom = p.y + heightOf(item.id);
    // 축을 걸친 블록은 지시선 없음
    const [y1, y2] = bottom <= 0 ? [bottom, 0] : top >= 0 ? [0, top] : [0, 0];
    if (y1 === y2) continue;
    const ticks = p.tEnd !== undefined && p.tEnd > p.t ? [p.t, p.tEnd] : [p.t];
    for (const t of ticks) lines.push({ key: `${item.id}-${t}`, x: tickToX(t, scale), y1, y2 });
  }
  return (
    <ViewportPortal>
      {lines.map((l) => (
        <div
          key={l.key}
          data-testid="leader"
          className="absolute border-dashed border-muted"
          style={{
            transform: `translate(${l.x}px, ${l.y1}px)`,
            height: l.y2 - l.y1,
            borderLeftWidth: 1 / zoom,
          }}
        />
      ))}
    </ViewportPortal>
  );
}
