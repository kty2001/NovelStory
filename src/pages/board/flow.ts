import type { Node } from "@xyflow/react";
import type {
  BoardItem,
  EventItem,
  ShapeKind,
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

// 보드 좌표 사각형 (왼쪽 위 기준)
export type Rect = { x: number; y: number; w: number; h: number };

// 두 점을 대각으로 하는 사각형 (끌어서 그리는 영역)
export const spanRect = (x0: number, y0: number, x1: number, y1: number): Rect => ({
  x: Math.min(x0, x1),
  y: Math.min(y0, y1),
  w: Math.abs(x1 - x0),
  h: Math.abs(y1 - y0),
});

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

// 포인터 위치에 놓을 시간 블록 위치 (포인터 = 블록 세로 가운데)
export const pointerPlace = (p: { x: number; y: number }, scale: TimeScale, snap: boolean) =>
  timePlace(p.x, p.y - EVENT_H / 2, scale, snap);

// 포스트잇 · 텍스트 기본 크기 (ui_guide `sticky-note` 160 × 160), 프레임 기본 크기 (클릭만 했을 때)
export const STICKY_SIZE = 160;
export const TEXT_W = 240;
const TEXT_H = 40;
export const FRAME_SIZE = { w: 400, h: 300 };
// 도형 기본 크기 (모양을 바꿔도 크기는 유지)
export const SHAPE_SIZE: Record<ShapeKind, { w: number; h: number }> = {
  rect: { w: 160, h: 100 },
  ellipse: { w: 120, h: 120 },
  diamond: { w: 140, h: 140 },
};

// 포스트잇 · 텍스트 · 도형 배치 위치: 포인터가 가운데
export function freeRect(
  kind: "sticky" | "text" | "shape",
  x: number,
  y: number,
  shape: ShapeKind = "rect",
) {
  const { w, h } =
    kind === "sticky"
      ? { w: STICKY_SIZE, h: STICKY_SIZE }
      : kind === "text"
        ? { w: TEXT_W, h: TEXT_H }
        : SHAPE_SIZE[shape];
  return { x: x - w / 2, y: y - h / 2, w, h };
}

// 상태 블록: 왼쪽 끝 = 눈금 (ui_guide `state-block`, B-4 메모 6)
export const STATE_W = 160;

// 캐릭터별 정렬 (UC-13): 축 아래 레인. 블록은 레인 세로 가운데
export const LANE_TOP = 40;
export const LANE_H = 72;
const LANE_PAD = 12;
export const laneTop = (index: number) => LANE_TOP + index * LANE_H;

// 레인 순서: 저장된 순서 먼저, 나머지 캐릭터는 첫 상태 블록 시점 순
export function laneOrder(order: string[], items: Collection<BoardItem>): string[] {
  const firstT = new Map<string, number>();
  for (const i of Object.values(items)) {
    if (i.kind !== "state") continue;
    const t = i.place.mode === "timed" ? i.place.t : -Infinity;
    firstT.set(i.docId, Math.min(firstT.get(i.docId) ?? Infinity, t));
  }
  const kept = order.filter((id) => firstT.has(id));
  const rest = [...firstT.keys()]
    .filter((id) => !kept.includes(id))
    .sort((a, b) => firstT.get(a)! - firstT.get(b)!);
  return [...kept, ...rest];
}

// lane: 캐릭터별 정렬 중이면 캐릭터 문서 ID → 레인 번호
export function itemNode(
  item: BoardItem,
  scale: TimeScale,
  lane?: Map<string, number>,
): Node | null {
  const base = { id: item.id, zIndex: item.z, data: {} };
  if (item.kind === "state") {
    const p = item.place;
    const x = p.mode === "timed" ? tickToX(p.t, scale) : p.x;
    const index = lane?.get(item.docId);
    const y = index === undefined ? p.y : laneTop(index) + LANE_PAD;
    return { ...base, type: "state", position: { x, y } };
  }
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
  const { x, y } = item.place;
  if (item.kind === "sticky" || item.kind === "shape") {
    return { ...base, type: item.kind, position: { x, y }, width: item.w, height: item.h };
  }
  if (item.kind === "text") return { ...base, type: "text", position: { x, y }, width: item.w };
  // 프레임은 자식보다 아래 (z 순서와 무관하게 맨 아래 층)
  return { ...base, type: "frame", position: { x, y }, width: item.w, height: item.h, zIndex: 0 };
}

// 프레임 소속 (data_model 4.2): 노드 위치 = 절대 위치 − 프레임 위치, 배열은 프레임 먼저 (C7)
export function withFrames(nodes: Node[], items: Collection<BoardItem>): Node[] {
  const frames = new Map(nodes.filter((n) => n.type === "frame").map((n) => [n.id, n]));
  const out: Node[] = [...frames.values()];
  for (const n of nodes) {
    if (n.type === "frame") continue;
    const frame = frames.get(items[n.id]?.parentFrameId ?? "");
    if (!frame) {
      out.push(n);
      continue;
    }
    out.push({
      ...n,
      parentId: frame.id,
      position: { x: n.position.x - frame.position.x, y: n.position.y - frame.position.y },
    });
  }
  return out;
}

// 점을 품은 프레임 (여럿이면 z가 큰 것)
export function frameAt(
  point: { x: number; y: number },
  items: Collection<BoardItem>,
): string | undefined {
  let best: { id: string; z: number } | undefined;
  for (const f of Object.values(items)) {
    if (f.kind !== "frame") continue;
    const { x, y } = f.place;
    const inside = point.x >= x && point.x <= x + f.w && point.y >= y && point.y <= y + f.h;
    if (inside && (!best || f.z > best.z)) best = { id: f.id, z: f.z };
  }
  return best?.id;
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

// ── 끌기 종료 (data_model 4.2) ──
// x, y = 노드 원점(origin) 기준 절대 좌표, ox = 가로 origin (사건 단일 시점 0.5)
export type Dropped = { id: string; x: number; y: number; w: number; h: number; ox: number };

// 요소를 (dx, dy)만큼 옮긴 위치: 자유 요소는 같은 만큼, 시간 블록은 새 x에서 눈금 재계산
// (프레임과 함께 이동 · 붙여넣기)
export function shifted(c: BoardItem, dx: number, dy: number, scale: TimeScale, snap: boolean) {
  if (c.place.mode === "free")
    return { mode: "free" as const, x: c.place.x + dx, y: c.place.y + dy };
  if (c.kind !== "event" && c.kind !== "state") return c.place;
  const at = itemNode(c, scale)!.position;
  return movedPlace(c, { x: at.x + dx, y: c.place.y + dy }, scale, snap);
}

// 끌어 놓은 요소들의 새 위치 · 프레임 소속 (중심점이 들어간 프레임, 프레임은 소속 불가 · C7).
// keepStateY: 캐릭터별 정렬 중 상태 블록은 세로 위치 유지
export function dropPatches(
  dropped: Dropped[],
  items: Collection<BoardItem>,
  scale: TimeScale,
  snap: boolean,
  keepStateY = false,
): Record<string, Partial<BoardItem>> {
  const patches: Record<string, Partial<BoardItem>> = {};
  const moving = new Set(dropped.map((d) => d.id));
  for (const d of dropped) {
    const item = items[d.id];
    if (!item) continue;
    if (item.kind === "frame") {
      const dx = d.x - item.place.x;
      const dy = d.y - item.place.y;
      patches[d.id] = { place: { mode: "free", x: d.x, y: d.y } };
      for (const c of Object.values(items)) {
        if (c.parentFrameId === d.id && !moving.has(c.id)) {
          patches[c.id] = { place: shifted(c, dx, dy, scale, snap) } as Partial<BoardItem>;
        }
      }
      continue;
    }
    const timeBlock = item.kind === "event" || item.kind === "state";
    const y = keepStateY && item.kind === "state" ? item.place.y : d.y;
    const place = timeBlock
      ? movedPlace(item, { x: d.x, y }, scale, snap)
      : { mode: "free" as const, x: d.x, y: d.y };
    const center = { x: d.x - d.w * d.ox + d.w / 2, y: d.y + d.h / 2 };
    patches[d.id] = { place, parentFrameId: frameAt(center, items) } as Partial<BoardItem>;
  }
  return patches;
}

// ── 방향키 이동 (shortcuts 2.3) ──
// 시간 블록 ←→ = 눈금(0 눈금에서 멈춤), 그 외 = px. 시간축 ↔ 미정 영역은 넘나들지 않음
const NUDGE_PX = 8;
const NUDGE_BIG_PX = 40; // Shift
const NUDGE_BIG_TICKS = 5; // Shift

// dx · dy = 방향 (-1 · 0 · 1). lanes: 캐릭터별 정렬 중이면 상태 블록 세로 이동 무시
export function nudgedPlace(
  item: BoardItem,
  dx: number,
  dy: number,
  big: boolean,
  lanes = false,
): BoardItem["place"] {
  const px = big ? NUDGE_BIG_PX : NUDGE_PX;
  const p = item.place;
  const y = lanes && item.kind === "state" ? p.y : p.y + dy * px;
  if (p.mode === "timed") {
    const d = Math.max(dx * (big ? NUDGE_BIG_TICKS : 1), -p.t);
    return p.tEnd === undefined
      ? { ...p, t: p.t + d, y }
      : { ...p, t: p.t + d, tEnd: p.tEnd + d, y };
  }
  const x = p.x + dx * px;
  return { ...p, x: p.mode === "undated" && x >= 0 ? p.x : x, y };
}

// 선택 요소 방향키 이동 패치. 프레임은 자식도 같은 만큼 (시간 블록은 스냅 없이 눈금 재계산),
// 선택된 프레임의 자식은 프레임과 함께 움직이므로 따로 옮기지 않음
export function nudgePatches(
  ids: string[],
  items: Collection<BoardItem>,
  dx: number,
  dy: number,
  big: boolean,
  scale: TimeScale,
  lanes = false,
): Record<string, Partial<BoardItem>> {
  const patches: Record<string, Partial<BoardItem>> = {};
  const moving = new Set(ids);
  for (const id of ids) {
    const item = items[id];
    if (!item || (item.parentFrameId && moving.has(item.parentFrameId))) continue;
    const place = nudgedPlace(item, dx, dy, big, lanes);
    patches[id] = { place } as Partial<BoardItem>;
    if (item.kind !== "frame" || place.mode !== "free") continue;
    const [fx, fy] = [place.x - item.place.x, place.y - item.place.y];
    for (const c of Object.values(items)) {
      if (c.parentFrameId === id) {
        patches[c.id] = { place: shifted(c, fx, fy, scale, false) } as Partial<BoardItem>;
      }
    }
  }
  return patches;
}

// ── 연결선 ──
// 화살촉 마커 색은 url(#id)에 들어가므로 CSS 변수 대신 토큰 값
export const EDGE_COLOR = "#3a3a3a"; // {colors.body}
export const EDGE_SELECTED = "#1a3a3a"; // {colors.brand-teal}

export type Side = "top" | "right" | "bottom" | "left";

// 두 사각형이 마주 보는 면 (연결선 도구로 이을 때 핸들 자동 선택)
export function facingSides(a: Rect, b: Rect): [Side, Side] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ["right", "left"] : ["left", "right"];
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}
