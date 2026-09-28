import { useStore, ViewportPortal } from "@xyflow/react";
import type { TimeScale } from "../../db/types";
import { EVENT_H, EVENT_W, timePlace } from "./flow";
import { tickToX } from "./timeAxis";
import type { PlaceTool } from "./tools";

export type Preview = { tool: PlaceTool; x: number; y: number; snap: boolean };

// 배치 미리보기 (B-1 메모 13): 반투명 블록 + 스냅될 눈금까지 세로 가이드 + 눈금 번호
export default function PlacePreview({ preview, scale }: { preview: Preview; scale: TimeScale }) {
  const zoom = useStore((s) => s.transform[2]);
  const top = preview.y - EVENT_H / 2;
  const place = timePlace(preview.x, top, scale, preview.snap);
  const x = place.mode === "timed" ? tickToX(place.t, scale) : preview.x;
  const guideTop = Math.min(top + EVENT_H, 0);
  const guideBottom = Math.max(top, 0);
  return (
    <ViewportPortal>
      <div
        data-testid="place-preview"
        className="absolute rounded-md border-dashed border-ink bg-brand-peach/50"
        style={{
          transform: `translate(${x - EVENT_W / 2}px, ${top}px)`,
          width: EVENT_W,
          height: EVENT_H,
          borderWidth: 1.5 / zoom,
        }}
      />
      {place.mode === "timed" && (
        <>
          <div
            className="absolute border-l border-dashed border-ink"
            style={{
              transform: `translate(${x}px, ${guideTop}px)`,
              height: guideBottom - guideTop,
              borderLeftWidth: 1 / zoom,
            }}
          />
          <div className="absolute" style={{ transform: `translate(${x}px, 0px)` }}>
            <div style={{ transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}>
              <span
                data-testid="place-tick"
                className="absolute -top-7 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-caption whitespace-nowrap text-on-primary tabular-nums"
              >
                {Number.isInteger(place.t) ? place.t : place.t.toFixed(1)}
              </span>
            </div>
          </div>
        </>
      )}
    </ViewportPortal>
  );
}
