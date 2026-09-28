import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { useStore, useViewport, ViewportPortal } from "@xyflow/react";
import { GripVertical } from "lucide-react";
import type { BoardItem, StateItem, TimeScale } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { useNovelStore } from "../../store/novelStore";
import { LANE_H, LANE_TOP, laneTop } from "./flow";
import { tickToX } from "./timeAxis";

const HEAD_W = 150;

// 등장 ~ 퇴장 강조 띠 (B-4 메모 3·4): 첫 등장부터 그 뒤 첫 퇴장까지, 퇴장이 없으면 오른쪽 끝. 미정 블록 제외
function band(docId: string, items: Collection<BoardItem>): { from: number; to?: number } | null {
  const states = Object.values(items).filter(
    (i): i is StateItem => i.kind === "state" && i.docId === docId && i.place.mode === "timed",
  );
  const tOf = (s: StateItem) => (s.place.mode === "timed" ? s.place.t : 0);
  const appear = states.filter((s) => s.stateType === "appear").map(tOf);
  if (!appear.length) return null;
  const from = Math.min(...appear);
  const exits = states.filter((s) => s.stateType === "exit" && tOf(s) >= from).map(tOf);
  return { from, to: exits.length ? Math.min(...exits) : undefined };
}

// 캐릭터별 정렬 (UC-13, B-4): 교차 배경 레인 + 등장~퇴장 띠 + 화면 왼쪽에 고정된 레인 머리(끌어서 순서 변경)
export default function Lanes({
  order,
  items,
  scale,
  onReorder,
}: {
  order: string[];
  items: Collection<BoardItem>;
  scale: TimeScale;
  onReorder: (order: string[]) => void;
}) {
  const docs = useNovelStore((s) => s.docs);
  const { x: vx, y: vy, zoom } = useViewport();
  const width = useStore((s) => s.width);
  const [drag, setDrag] = useState<{ id: string; to: number } | null>(null);
  const left = -vx / zoom;
  const right = (width - vx) / zoom;

  const counts = new Map<string, number>();
  for (const i of Object.values(items)) {
    if (i.kind === "state") counts.set(i.docId, (counts.get(i.docId) ?? 0) + 1);
  }

  // 레인 머리 끌기: 놓은 높이의 레인 자리로 이동
  const startDrag = (id: string, e: ReactPointerEvent) => {
    e.preventDefault();
    // currentTarget은 이벤트 처리 후 비워지므로 캔버스 요소를 먼저 잡아 둠
    const canvas = e.currentTarget.closest(".react-flow");
    if (!canvas) return;
    const target = (clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const flowY = (clientY - rect.top - vy) / zoom;
      return Math.max(0, Math.min(order.length - 1, Math.floor((flowY - LANE_TOP) / LANE_H)));
    };
    setDrag({ id, to: target(e.clientY) });
    const onMove = (ev: PointerEvent) => setDrag({ id, to: target(ev.clientY) });
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDrag(null);
      const to = target(ev.clientY);
      const next = order.filter((x) => x !== id);
      next.splice(to, 0, id);
      if (next.join() !== order.join()) onReorder(next);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      <ViewportPortal>
        {order.map((docId, i) => {
          const b = band(docId, items);
          const bx = b ? tickToX(b.from, scale) : 0;
          const bEnd = b?.to !== undefined ? tickToX(b.to, scale) : right;
          return (
            <div key={docId}>
              <div
                data-testid="lane"
                className={`absolute ${i % 2 ? "bg-surface-card/60" : ""}`}
                style={{
                  transform: `translate(${left}px, ${laneTop(i)}px)`,
                  width: right - left,
                  height: LANE_H,
                }}
              />
              {b && bEnd > bx && (
                <div
                  data-testid="lane-band"
                  className="absolute"
                  style={{
                    transform: `translate(${bx}px, ${laneTop(i) + 4}px)`,
                    width: bEnd - bx,
                    height: LANE_H - 8,
                    background:
                      "repeating-linear-gradient(135deg, transparent 0 6px, rgb(10 10 10 / 0.06) 6px 8px)",
                  }}
                />
              )}
            </div>
          );
        })}
      </ViewportPortal>
      {order.map((docId, i) => (
        <div
          key={docId}
          data-testid="lane-head"
          className={`absolute left-0 z-[5] flex items-center gap-1 border-r border-hairline bg-canvas/90 px-2 text-body-sm text-ink ${drag?.id === docId ? "shadow-drag" : ""}`}
          style={{
            top: laneTop(i) * zoom + vy,
            height: LANE_H * zoom,
            width: HEAD_W,
          }}
        >
          <span
            aria-label={`${docs[docId]?.title ?? ""} 레인 순서 변경`}
            className="nodrag cursor-grab touch-none text-muted"
            onPointerDown={(e) => startDrag(docId, e)}
          >
            <GripVertical size={14} />
          </span>
          <span className="truncate">{docs[docId]?.title}</span>
          <span className="ml-auto text-caption text-muted tabular-nums">
            {counts.get(docId) ?? 0}
          </span>
        </div>
      ))}
      {drag && (
        <div
          className="absolute left-0 z-[6] h-0.5 bg-ink"
          style={{ top: laneTop(drag.to) * zoom + vy, width: HEAD_W }}
        />
      )}
    </>
  );
}
