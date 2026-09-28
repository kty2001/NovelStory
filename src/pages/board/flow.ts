import type { Node } from "@xyflow/react";
import type {
  BoardItem,
  EventItem,
  StateItem,
  TimedPlace,
  TimeScale,
  UndatedPlace,
} from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { snapTick, tickToX, xToTick } from "./timeAxis";

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

// ── 블록 ──
export const EVENT_W = 160; // 단일 시점 사건 폭 (가운데 = 눈금)
export const EVENT_H = 56; // 배치 미리보기 높이 (실제 높이는 내용에 따름)

// 시간 블록 위치: x → 눈금 (snap이면 정수 눈금). x < 0 이면 미정 영역
export function timePlace(
  x: number,
  y: number,
  scale: TimeScale,
  snap: boolean,
): TimedPlace | UndatedPlace {
  const t = snap ? snapTick(x, scale) : xToTick(x, scale);
  return t === null ? { mode: "undated", x, y } : { mode: "timed", t, y };
}

export function itemNode(item: BoardItem, scale: TimeScale): Node | null {
  const base = { id: item.id, zIndex: item.z, data: {} };
  if (item.kind === "event") {
    const p = item.place;
    // 기간 사건: 왼쪽 끝 = 시작 눈금, 폭 = 기간
    if (p.mode === "timed" && p.tEnd !== undefined && p.tEnd > p.t) {
      const x = tickToX(p.t, scale);
      const width = tickToX(p.tEnd, scale) - x;
      return { ...base, type: "event", position: { x, y: p.y }, width, data: { span: true } };
    }
    // 단일 시점 · 미정: 가운데 = 눈금 (origin 0.5)
    const x = p.mode === "timed" ? tickToX(p.t, scale) : p.x;
    return { ...base, type: "event", position: { x, y: p.y }, origin: [0.5, 0] };
  }
  return null;
}

// 드래그 종료 위치 → 새 place (data_model 4.1). 기간 사건은 왼쪽 끝 기준, 기간 길이(눈금 수) 유지
export function movedPlace(
  item: EventItem | StateItem,
  pos: { x: number; y: number },
  scale: TimeScale,
  snap: boolean,
): TimedPlace | UndatedPlace {
  const p = item.place;
  const next = timePlace(pos.x, pos.y, scale, snap);
  if (p.mode !== "timed" || p.tEnd === undefined) return next;
  // 미정 영역으로 옮긴 기간 사건은 단일 블록 (가운데 기준)
  if (next.mode === "undated") return { ...next, x: pos.x + EVENT_W / 2 };
  return { ...next, tEnd: next.t + (p.tEnd - p.t) };
}

// 기간 조절: 시작·끝 눈금. 같으면 단일 시점
export function spanPlace(place: TimedPlace, start: number, end: number): TimedPlace {
  const [t, tEnd] = start <= end ? [start, end] : [end, start];
  return tEnd > t ? { mode: "timed", t, tEnd, y: place.y } : { mode: "timed", t, y: place.y };
}
