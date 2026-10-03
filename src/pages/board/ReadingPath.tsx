import { useStore, ViewportPortal } from "@xyflow/react";
import { arcPath, badgeChips, type Segment, type SegmentKind } from "../narrative/readingPath";
import type { Rect } from "./flow";

// 블록(노드 z-index = 블록 z, 선택 시 +1000)보다 위. 뷰포트 안에서만 비교되므로 패널 · 메뉴는 가리지 않음
const OVER_NODES = 100000;

const STROKE: Record<SegmentKind, { color: string; width: number; dashed: boolean }> = {
  forward: { color: "var(--color-brand-teal)", width: 2, dashed: false },
  intended: { color: "var(--color-brand-lavender)", width: 2, dashed: true },
  reverse: { color: "var(--color-brand-coral)", width: 3.5, dashed: false },
};

// 서술 비교 읽기 경로 (F2 2차): 블록 윗변 → 다음 블록 윗변 곡선 + 화살촉(arcPath),
// 순번 배지는 블록 오른쪽 위 모서리에 걸침(위 블록 · 제목을 덜 가림).
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
    return [{ key: `${i}-${seg.to.slot.id}`, d: arcPath(a, b, seg.kind).d, kind: seg.kind }];
  });

  return (
    <ViewportPortal>
      <svg
        className="pointer-events-none absolute overflow-visible"
        style={{ left: 0, top: 0, zIndex: OVER_NODES }}
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
            aria-label={list.join(", ")}
            className="pointer-events-none absolute flex gap-1"
            style={{
              transform: `translate(${r.x + r.w}px, ${r.y}px) translate(-100%, -50%)`,
              zIndex: OVER_NODES,
            }}
          >
            {badgeChips(list).map((label) => (
              <span
                key={label}
                className="rounded-full bg-brand-teal px-1.5 text-caption whitespace-nowrap text-on-primary tabular-nums ring-2 ring-canvas"
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
