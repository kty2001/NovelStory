import { useStore, ViewportPortal } from "@xyflow/react";
import type { Segment, SegmentKind } from "../narrative/readingPath";
import type { Rect } from "./Leaders";

const STROKE: Record<SegmentKind, { color: string; width: number; dashed: boolean }> = {
  forward: { color: "var(--color-brand-teal)", width: 2, dashed: false },
  intended: { color: "var(--color-brand-lavender)", width: 2, dashed: true },
  reverse: { color: "var(--color-brand-coral)", width: 3.5, dashed: false },
};

// 서술 비교 읽기 경로 (F2 2차): 블록 위 가운데 → 다음 블록 위 가운데 곡선 + 화살촉, 블록 위 순번 배지.
// 보드 조작을 막지 않도록 포인터 통과
export default function ReadingPath({
  segments,
  labels,
  rectOf,
}: {
  segments: Segment[];
  labels: Map<string, string[]>;
  rectOf: (id: string) => Rect | undefined;
}) {
  const zoom = useStore((s) => s.transform[2]);
  const paths = segments.flatMap((seg, i) => {
    const a = rectOf(seg.from.block.id);
    const b = rectOf(seg.to.block.id);
    if (!a || !b) return [];
    const [ax, ay, bx, by] = [a.x + a.w / 2, a.y, b.x + b.w / 2, b.y];
    // 위로 휘는 곡선, 역행은 더 높게 (정방향과 겹치지 않게)
    const lift = (40 + Math.min(Math.abs(bx - ax) * 0.2, 160)) * (seg.kind === "forward" ? 1 : 1.6);
    const d = `M ${ax} ${ay} Q ${(ax + bx) / 2} ${Math.min(ay, by) - lift} ${bx} ${by}`;
    return [{ key: `${i}-${seg.to.slot.id}`, d, kind: seg.kind }];
  });

  return (
    <ViewportPortal>
      <svg
        className="pointer-events-none absolute overflow-visible"
        style={{ left: 0, top: 0 }}
        width={1}
        height={1}
        aria-hidden
      >
        <defs>
          {(Object.keys(STROKE) as SegmentKind[]).map((k) => (
            <marker
              key={k}
              id={`reading-arrow-${k}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={STROKE[k].color} />
            </marker>
          ))}
        </defs>
        {paths.map((p) => {
          const s = STROKE[p.kind];
          return (
            <path
              key={p.key}
              data-testid="reading-path"
              data-kind={p.kind}
              d={p.d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width / zoom}
              strokeDasharray={s.dashed ? `${6 / zoom} ${4 / zoom}` : undefined}
              markerEnd={`url(#reading-arrow-${p.kind})`}
            />
          );
        })}
      </svg>
      {[...labels].map(([blockId, list]) => {
        const r = rectOf(blockId);
        if (!r) return null;
        return (
          <div
            key={blockId}
            data-testid="reading-badges"
            className="pointer-events-none absolute flex gap-1"
            style={{ transform: `translate(${r.x}px, ${r.y - 24}px)` }}
          >
            {list.map((label) => (
              <span
                key={label}
                className="rounded-full bg-brand-teal px-1.5 text-caption whitespace-nowrap text-on-primary tabular-nums"
              >
                {label}
              </span>
            ))}
          </div>
        );
      })}
    </ViewportPortal>
  );
}
