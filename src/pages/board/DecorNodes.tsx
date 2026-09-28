import { useStore, type MiniMapNodeProps } from "@xyflow/react";
import { AXIS_ID, UNDATED_ID } from "./flow";

// 시간축 왼쪽 "시점 미정" 영역 (UC-16, ui_guide `undated-zone`). 크기는 노드 width·height
export function UndatedZone() {
  const zoom = useStore((s) => s.transform[2]);
  return (
    <div
      data-testid="undated-zone"
      className="h-full w-full rounded-lg border-dashed border-muted bg-surface-soft"
      style={{ borderWidth: 1.5 / zoom }}
    >
      {/* 화면 크기 고정: 1/zoom 역배율 */}
      <div
        className="px-3 py-2 text-caption whitespace-nowrap text-muted"
        style={{ transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}
      >
        시점 미정
      </div>
    </div>
  );
}

// 시간축 자리 표시 (실제 축은 Axis가 그림). 미니맵 · 화면 맞춤 범위용
export function AxisTrack() {
  return null;
}

// 미니맵: 시간축은 선, 미정 영역은 옅은 상자, 나머지는 채운 사각형
export function MiniMapNode({ id, x, y, width, height, color }: MiniMapNodeProps) {
  if (id === AXIS_ID) {
    return (
      <line
        className="minimap-axis"
        x1={x}
        x2={x + width}
        y1={y + height / 2}
        y2={y + height / 2}
        stroke="var(--color-ink)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  if (id === UNDATED_ID) {
    return (
      <rect
        className="minimap-undated"
        x={x}
        y={y}
        width={width}
        height={height}
        rx={16}
        fill="var(--color-surface-soft)"
        stroke="var(--color-muted)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  return <rect x={x} y={y} width={width} height={height} rx={8} fill={color} />;
}
