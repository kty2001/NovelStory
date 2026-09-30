import type { Rect } from "./Leaders";

// 정렬 보조선 (features_spec F1): 끄는 요소 묶음의 시작 · 가운데 · 끝을 다른 요소에 맞춤
// axis x = 세로선 (x = at, y from ~ to), axis y = 가로선 (y = at, x from ~ to)
export type Guide = { axis: "x" | "y"; at: number; from: number; to: number };

const SAME = 0.5; // 이 차이 안이면 같은 위치로 보고 보조선 표시

type Span = { start: number; size: number; cross: number; crossSize: number };
const spanX = (r: Rect): Span => ({ start: r.x, size: r.w, cross: r.y, crossSize: r.h });
const spanY = (r: Rect): Span => ({ start: r.y, size: r.h, cross: r.x, crossSize: r.w });
const anchors = (s: Span) => [s.start, s.start + s.size / 2, s.start + s.size];

// 가장 가까운 기준점 차이 (threshold 초과면 0)
function snapAxis(moving: Span, others: Span[], threshold: number): number {
  let d = 0;
  let best = Infinity;
  for (const o of others) {
    for (const a of anchors(o)) {
      for (const m of anchors(moving)) {
        const diff = Math.abs(a - m);
        if (diff <= threshold && diff < best) [best, d] = [diff, a - m];
      }
    }
  }
  return d;
}

// 일치하는 기준점마다 보조선 하나 (구간 = 묶음 + 맞춰진 요소들)
function guidesAxis(axis: Guide["axis"], moved: Span, others: Span[]): Guide[] {
  const lines = new Map<number, Guide>();
  for (const o of others) {
    for (const a of anchors(o)) {
      const at = anchors(moved).find((m) => Math.abs(a - m) <= SAME);
      if (at === undefined) continue;
      const g = lines.get(at) ?? { axis, at, from: moved.cross, to: moved.cross + moved.crossSize };
      g.from = Math.min(g.from, o.cross);
      g.to = Math.max(g.to, o.cross + o.crossSize);
      lines.set(at, g);
    }
  }
  return [...lines.values()];
}

export function alignSnap(
  moving: Rect,
  others: Rect[],
  threshold: number,
  axes: { x: boolean; y: boolean },
): { dx: number; dy: number; guides: Guide[] } {
  const dx = axes.x ? snapAxis(spanX(moving), others.map(spanX), threshold) : 0;
  const dy = axes.y ? snapAxis(spanY(moving), others.map(spanY), threshold) : 0;
  const moved = { ...moving, x: moving.x + dx, y: moving.y + dy };
  return {
    dx,
    dy,
    guides: [
      ...(axes.x ? guidesAxis("x", spanX(moved), others.map(spanX)) : []),
      ...(axes.y ? guidesAxis("y", spanY(moved), others.map(spanY)) : []),
    ],
  };
}
