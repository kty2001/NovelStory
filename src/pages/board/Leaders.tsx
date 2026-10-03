import { useStore, ViewportPortal } from "@xyflow/react";
import type { BoardItem, TimeScale } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import type { Rect } from "./flow";
import { tickToX } from "./timeAxis";

// 시간 블록에서 시간축까지 점선 지시선 (ui_guide `event-block` · `state-block`).
// 사건: 가운데(기간 사건은 시작·끝 두 줄), 상태: 왼쪽 끝. 캐릭터별 정렬 중에는 상태 지시선 생략 (B-4 메모 6)
// + 상태 블록 ↔ 관련 사건 옅은 점선 (UC-12)
export default function Leaders({
  items,
  hiddenIds,
  scale,
  lanes,
  rectOf,
}: {
  items: Collection<BoardItem>;
  hiddenIds: ReadonlySet<string>;
  scale: TimeScale;
  lanes: boolean;
  rectOf: (id: string) => Rect | undefined;
}) {
  const zoom = useStore((s) => s.transform[2]);
  const lines: { key: string; x: number; y1: number; y2: number }[] = [];
  const links: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const item of Object.values(items)) {
    if (item.kind !== "event" && item.kind !== "state") continue;
    if (hiddenIds.has(item.id)) continue;
    const r = rectOf(item.id);
    if (!r) continue;

    if (item.kind === "state" && item.linkedEventItemId && !hiddenIds.has(item.linkedEventItemId)) {
      const e = rectOf(item.linkedEventItemId);
      if (e) {
        links.push({
          key: `${item.id}-link`,
          x1: r.x + r.w / 2,
          y1: r.y,
          x2: e.x + e.w / 2,
          y2: e.y + e.h,
        });
      }
    }

    const p = item.place;
    if (p.mode !== "timed" || (item.kind === "state" && lanes)) continue;
    // 축을 걸친 블록은 지시선 없음
    const [y1, y2] = r.y + r.h <= 0 ? [r.y + r.h, 0] : r.y >= 0 ? [0, r.y] : [0, 0];
    if (y1 === y2) continue;
    const ticks =
      item.kind === "event" && p.tEnd !== undefined && p.tEnd > p.t ? [p.t, p.tEnd] : [p.t];
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
      {links.length > 0 && (
        <svg className="absolute overflow-visible" style={{ left: 0, top: 0 }} width={1} height={1}>
          {links.map((l) => (
            <line
              key={l.key}
              data-testid="state-link"
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="var(--color-muted-soft)"
              strokeWidth={1.5 / zoom}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            />
          ))}
        </svg>
      )}
    </ViewportPortal>
  );
}
