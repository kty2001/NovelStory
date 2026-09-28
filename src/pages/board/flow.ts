import type { Node } from "@xyflow/react";
import type { BoardItem, TimeScale } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { tickToX } from "./timeAxis";

// 보드 좌표 ↔ React Flow 노드 변환 (data_model.md 4.2)

// 장식 노드: 시간축 · 미정 영역. 미니맵 · 화면 맞춤에 포함되도록 노드로 둠 (조작 불가)
export const AXIS_ID = "__axis";
export const UNDATED_ID = "__undated";

// 미정 영역: 0 눈금 왼쪽. 판정은 x < 0 (xToTick → null), 상자는 안내 표시
export const UNDATED_W = 240;
export const UNDATED_GAP = 40;
const UNDATED_MIN_H = 560; // 시간축(y = 0) 기준 세로 중앙
const UNDATED_PAD = 40;
// 축 오른쪽 끝 = 마지막으로 쓰인 눈금 + 여유
const AXIS_MIN_TICKS = 10;
const AXIS_TAIL_TICKS = 5;

const DECOR = {
  selectable: false,
  draggable: false,
  focusable: false,
  deletable: false,
  connectable: false,
  zIndex: -1,
  style: { pointerEvents: "none" },
} satisfies Partial<Node>;

// 시간축에 놓인 블록 중 가장 늦은 눈금
function lastTick(scale: TimeScale, items: Collection<BoardItem>): number {
  let max = AXIS_MIN_TICKS;
  for (const k of Object.keys(scale.tickLabels)) max = Math.max(max, Number(k));
  for (const c of scale.collapsed) max = Math.max(max, c.to);
  for (const item of Object.values(items)) {
    if ((item.kind === "event" || item.kind === "state") && item.place.mode === "timed") {
      max = Math.max(max, Math.ceil(item.place.tEnd ?? item.place.t));
    }
  }
  return max;
}

// 미정 영역 세로 범위: 기본 높이 + 미정 블록이 벗어나면 확장
function undatedRange(items: Collection<BoardItem>, heightOf: (item: BoardItem) => number) {
  let top = -UNDATED_MIN_H / 2;
  let bottom = UNDATED_MIN_H / 2;
  for (const item of Object.values(items)) {
    if ((item.kind === "event" || item.kind === "state") && item.place.mode === "undated") {
      top = Math.min(top, item.place.y - UNDATED_PAD);
      bottom = Math.max(bottom, item.place.y + heightOf(item) + UNDATED_PAD);
    }
  }
  return { top, bottom };
}

export function decorNodes(
  scale: TimeScale,
  items: Collection<BoardItem>,
  heightOf: (item: BoardItem) => number = () => 0,
): Node[] {
  const { top, bottom } = undatedRange(items, heightOf);
  return [
    {
      ...DECOR,
      id: UNDATED_ID,
      type: "undated",
      position: { x: -(UNDATED_GAP + UNDATED_W), y: top },
      width: UNDATED_W,
      height: bottom - top,
      data: {},
    },
    {
      ...DECOR,
      id: AXIS_ID,
      type: "axis",
      position: { x: 0, y: -1 },
      width: tickToX(lastTick(scale, items) + AXIS_TAIL_TICKS, scale),
      height: 2,
      data: {},
    },
  ];
}
