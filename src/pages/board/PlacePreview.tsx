import { useStore, ViewportPortal } from "@xyflow/react";
import type { ShapeKind, TimeScale } from "../../db/types";
import { EVENT_H, EVENT_W, freeRect, timePlace } from "./flow";
import { ShapeOutline } from "./FreeNodes";
import { tickToX } from "./timeAxis";
import type { PlaceTool } from "./tools";

export type Preview = { tool: PlaceTool; x: number; y: number; snap: boolean; shape: ShapeKind };

// 배치 미리보기 (B-1 메모 13): 반투명 요소 + (시간 블록이면) 스냅될 눈금까지 세로 가이드 + 눈금 번호
export default function PlacePreview({ preview, scale }: { preview: Preview; scale: TimeScale }) {
  const zoom = useStore((s) => s.transform[2]);
  const border = { borderWidth: 1.5 / zoom };

  if (preview.tool === "shape") {
    const r = freeRect("shape", preview.x, preview.y, preview.shape);
    return (
      <ViewportPortal>
        <div
          data-testid="place-preview"
          className="absolute"
          style={{ transform: `translate(${r.x}px, ${r.y}px)`, width: r.w, height: r.h }}
        >
          <ShapeOutline shape={preview.shape} w={r.w} h={r.h} stroke={1.5 / zoom} dashed />
        </div>
      </ViewportPortal>
    );
  }

  if (preview.tool === "sticky" || preview.tool === "text") {
    const r = freeRect(preview.tool, preview.x, preview.y);
    return (
      <ViewportPortal>
        <div
          data-testid="place-preview"
          className={`absolute rounded-xs border-dashed border-ink ${preview.tool === "sticky" ? "bg-sticky-yellow/70" : ""}`}
          style={{ transform: `translate(${r.x}px, ${r.y}px)`, width: r.w, height: r.h, ...border }}
        />
      </ViewportPortal>
    );
  }

  const top = preview.y - EVENT_H / 2;
  const place = timePlace(preview.x, top, scale, preview.snap);
  const x = place.mode === "timed" ? tickToX(place.t, scale) : preview.x;
  // 사건은 가운데 = 눈금, 상태는 왼쪽 끝 = 눈금
  const left = preview.tool === "state" ? x : x - EVENT_W / 2;
  const guideTop = Math.min(top + EVENT_H, 0);
  const guideBottom = Math.max(top, 0);
  return (
    <ViewportPortal>
      <div
        data-testid="place-preview"
        className={`absolute rounded-md border-dashed border-ink ${preview.tool === "state" ? "bg-brand-mint/50" : "bg-brand-peach/50"}`}
        style={{
          transform: `translate(${left}px, ${top}px)`,
          width: EVENT_W,
          height: EVENT_H,
          ...border,
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

// 프레임 도구로 그리는 중인 영역
export function FrameDraft({ rect }: { rect: { x: number; y: number; w: number; h: number } }) {
  const zoom = useStore((s) => s.transform[2]);
  return (
    <ViewportPortal>
      <div
        data-testid="frame-draft"
        className="absolute rounded-lg border-dashed border-brand-teal bg-brand-teal/5"
        style={{
          transform: `translate(${rect.x}px, ${rect.y}px)`,
          width: rect.w,
          height: rect.h,
          borderWidth: 1.5 / zoom,
        }}
      />
    </ViewportPortal>
  );
}
