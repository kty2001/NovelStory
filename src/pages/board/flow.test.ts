import { describe, expect, it } from "vitest";
import type { EventItem, FrameItem, ShapeItem } from "../../db/types";
import { board, OLD, sticky } from "../../test/fixtures";
import {
  AXIS_ID,
  decorNodes,
  dropPatches,
  EVENT_W,
  facingSides,
  freeRect,
  itemNode,
  movedPlace,
  nudgedPlace,
  nudgePatches,
  SHAPE_SIZE,
  spanPlace,
  UNDATED_GAP,
  UNDATED_ID,
  UNDATED_W,
} from "./flow";

const scale = board("n1").timeScale; // pxPerTick 120

const event = (id: string, place: EventItem["place"]): EventItem => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  kind: "event",
  z: 0,
  place,
  docId: `d-${id}`,
  color: "brand-peach",
});

const byId = (nodes: ReturnType<typeof decorNodes>, id: string) => nodes.find((n) => n.id === id)!;

describe("장식 노드 (시간축 · 미정 영역)", () => {
  it("빈 보드: 축은 0 ~ 15 눈금, 미정 영역은 0 눈금 왼쪽 · 축 기준 세로 중앙", () => {
    const nodes = decorNodes(scale, {});
    expect(byId(nodes, AXIS_ID)).toMatchObject({ position: { x: 0, y: -1 }, width: 15 * 120 });
    expect(byId(nodes, UNDATED_ID)).toMatchObject({
      position: { x: -(UNDATED_GAP + UNDATED_W), y: -280 },
      width: UNDATED_W,
      height: 560,
    });
    expect(nodes.every((n) => n.selectable === false && n.draggable === false)).toBe(true);
  });

  it("축 길이 = 라벨 · 접힌 구간 · 블록 중 가장 늦은 눈금 + 5", () => {
    const items = { a: event("a", { mode: "timed", t: 3, tEnd: 22, y: -100 }) };
    expect(byId(decorNodes(scale, items), AXIS_ID).width).toBe(27 * 120);
    const labelled = { ...scale, tickLabels: { "40": "끝" } };
    expect(byId(decorNodes(labelled, items), AXIS_ID).width).toBe(45 * 120);
  });

  it("미정 블록이 기본 높이를 벗어나면 영역 확장", () => {
    const items = { u: event("u", { mode: "undated", x: -200, y: 400 }) };
    const zone = byId(
      decorNodes(scale, items, () => 60),
      UNDATED_ID,
    );
    expect(zone.position.y).toBe(-280);
    expect(zone.height).toBe(400 + 60 + 40 + 280);
  });
});

describe("끌기 · 기간 조절 위치", () => {
  it("단일 시점: 가까운 눈금 스냅, 스냅 끄면 소수 눈금, x < 0 은 미정", () => {
    const e = event("e", { mode: "timed", t: 2, y: -100 });
    expect(movedPlace(e, { x: 470, y: -80 }, scale, true)).toEqual({ mode: "timed", t: 4, y: -80 });
    expect(movedPlace(e, { x: 420, y: -80 }, scale, false)).toEqual({
      mode: "timed",
      t: 3.5,
      y: -80,
    });
    expect(movedPlace(e, { x: -150, y: 20 }, scale, true)).toEqual({
      mode: "undated",
      x: -150,
      y: 20,
    });
  });

  it("미정 → 시간축으로 옮기면 시점 부여", () => {
    const u = event("u", { mode: "undated", x: -150, y: 0 });
    expect(movedPlace(u, { x: 125, y: 0 }, scale, true)).toEqual({ mode: "timed", t: 1, y: 0 });
  });

  it("기간 사건: 기간 길이 유지, 미정 영역으로 옮기면 단일 블록", () => {
    const d = event("d", { mode: "timed", t: 2, tEnd: 5, y: -100 });
    expect(movedPlace(d, { x: 600, y: -100 }, scale, true)).toEqual({
      mode: "timed",
      t: 5,
      tEnd: 8,
      y: -100,
    });
    expect(movedPlace(d, { x: -250, y: 0 }, scale, true)).toEqual({
      mode: "undated",
      x: -250 + EVENT_W / 2,
      y: 0,
    });
  });

  it("기간 조절: 시작·끝 정렬, 같아지면 단일 시점", () => {
    const p = { mode: "timed" as const, t: 2, y: -100 };
    expect(spanPlace(p, 2, 5)).toEqual({ mode: "timed", t: 2, tEnd: 5, y: -100 });
    expect(spanPlace(p, 5, 1)).toEqual({ mode: "timed", t: 1, tEnd: 5, y: -100 });
    expect(spanPlace({ ...p, tEnd: 5 }, 2, 2)).toEqual({ mode: "timed", t: 2, y: -100 });
  });
});

describe("끌기 종료: 위치 · 프레임 소속", () => {
  const frame: FrameItem = {
    id: "f",
    novelId: "n1",
    updatedAt: OLD,
    kind: "frame",
    z: 0,
    place: { mode: "free", x: 0, y: -300 },
    w: 600,
    h: 280,
    title: "1부",
  };

  it("중심점이 프레임 안이면 소속, 밖으로 빼면 해제", () => {
    const items = { f: frame, s: sticky("s", "n1", 800) };
    const inside = dropPatches(
      [{ id: "s", x: 100, y: -250, w: 160, h: 160, ox: 0 }],
      items,
      scale,
      true,
    );
    expect(inside.s).toEqual({ place: { mode: "free", x: 100, y: -250 }, parentFrameId: "f" });
    const outside = dropPatches(
      [{ id: "s", x: 700, y: -250, w: 160, h: 160, ox: 0 }],
      items,
      scale,
      true,
    );
    expect(outside.s.parentFrameId).toBeUndefined();
  });

  it("프레임 이동 → 자식도 같은 만큼, 시간 블록은 눈금 재계산", () => {
    const items = {
      f: frame,
      s: { ...sticky("s", "n1", 50), parentFrameId: "f" },
      e: { ...event("e", { mode: "timed", t: 1, y: -200 }), parentFrameId: "f" },
    };
    const p = dropPatches(
      [{ id: "f", x: 240, y: -250, w: 600, h: 280, ox: 0 }],
      items,
      scale,
      true,
    );
    expect(p.f).toEqual({ place: { mode: "free", x: 240, y: -250 } });
    expect(p.s).toEqual({ place: { mode: "free", x: 290, y: 50 } });
    expect(p.e).toEqual({ place: { mode: "timed", t: 3, y: -150 } });
  });

  it("캐릭터별 정렬 중 상태 블록은 세로 위치 유지", () => {
    const st = {
      id: "st",
      novelId: "n1",
      updatedAt: OLD,
      kind: "state" as const,
      z: 1,
      place: { mode: "timed" as const, t: 1, y: 60 },
      docId: "d",
      stateType: "appear" as const,
      changes: [],
      note: "",
    };
    const p = dropPatches(
      [{ id: "st", x: 360, y: 300, w: 160, h: 48, ox: 0 }],
      { st },
      scale,
      true,
      true,
    );
    expect(p.st.place).toEqual({ mode: "timed", t: 3, y: 60 });
  });
});

describe("방향키 이동", () => {
  const st = {
    id: "st",
    novelId: "n1",
    updatedAt: OLD,
    kind: "state" as const,
    z: 1,
    place: { mode: "timed" as const, t: 1, y: 60 },
    docId: "d",
    stateType: "appear" as const,
    changes: [],
    note: "",
  };

  it("시간 블록 ←→ = 1 눈금 · Shift 5 눈금, 기간 유지, 0 눈금에서 멈춤", () => {
    const e = event("e", { mode: "timed", t: 2, tEnd: 4, y: -100 });
    expect(nudgedPlace(e, 1, 0, false)).toEqual({ mode: "timed", t: 3, tEnd: 5, y: -100 });
    expect(nudgedPlace(e, 1, 0, true)).toEqual({ mode: "timed", t: 7, tEnd: 9, y: -100 });
    expect(nudgedPlace(e, -1, 0, true)).toEqual({ mode: "timed", t: 0, tEnd: 2, y: -100 });
    expect(nudgedPlace(e, 0, -1, true)).toEqual({ mode: "timed", t: 2, tEnd: 4, y: -140 });
  });

  it("자유 요소 · 미정 블록 = 8px · Shift 40px, 미정 블록은 시간축으로 넘어가지 않음", () => {
    expect(nudgedPlace(sticky("s", "n1", 100), 1, 1, false)).toEqual({
      mode: "free",
      x: 108,
      y: 8,
    });
    expect(nudgedPlace(sticky("s", "n1", 100), -1, 0, true)).toEqual({ mode: "free", x: 60, y: 0 });
    const u = event("u", { mode: "undated", x: -4, y: 0 });
    expect(nudgedPlace(u, 1, 0, false)).toEqual({ mode: "undated", x: -4, y: 0 });
    expect(nudgedPlace(u, -1, 0, false)).toEqual({ mode: "undated", x: -12, y: 0 });
  });

  it("캐릭터별 정렬 중 상태 블록 ↑↓ 무시", () => {
    expect(nudgedPlace(st, 0, 1, false, true)).toEqual(st.place);
    expect(nudgedPlace(st, 1, 1, false, true)).toEqual({ mode: "timed", t: 2, y: 60 });
  });

  it("프레임 이동 → 자식도 같은 만큼, 선택된 자식은 한 번만 이동", () => {
    const frame: FrameItem = {
      id: "f",
      novelId: "n1",
      updatedAt: OLD,
      kind: "frame",
      z: 0,
      place: { mode: "free", x: 0, y: -300 },
      w: 600,
      h: 280,
      title: "1부",
    };
    const items = {
      f: frame,
      s: { ...sticky("s", "n1", 50), parentFrameId: "f" },
      e: { ...event("e", { mode: "timed", t: 1, y: -200 }), parentFrameId: "f" },
    };
    const p = nudgePatches(["f", "s"], items, 1, 0, true, scale);
    expect(p.f).toEqual({ place: { mode: "free", x: 40, y: -300 } });
    expect(p.s).toEqual({ place: { mode: "free", x: 90, y: 0 } });
    expect(p.e).toEqual({ place: { mode: "timed", t: 1 + 40 / 120, y: -200 } });
  });
});

describe("연결선 면 자동 선택", () => {
  const box = (x: number, y: number) => ({ x, y, w: 100, h: 50 });
  it("가로 차이가 크면 좌우, 세로 차이가 크면 위아래", () => {
    expect(facingSides(box(0, 0), box(300, 40))).toEqual(["right", "left"]);
    expect(facingSides(box(300, 0), box(0, 40))).toEqual(["left", "right"]);
    expect(facingSides(box(0, 0), box(20, 200))).toEqual(["bottom", "top"]);
    expect(facingSides(box(0, 200), box(20, 0))).toEqual(["top", "bottom"]);
  });
});

describe("도형", () => {
  it("기본 크기: 모양별, 포인터가 가운데", () => {
    expect(freeRect("shape", 100, 100, "rect")).toEqual({ x: 20, y: 50, w: 160, h: 100 });
    expect(freeRect("shape", 100, 100, "ellipse")).toEqual({ x: 40, y: 40, w: 120, h: 120 });
    expect(freeRect("shape", 100, 100, "diamond")).toEqual({ x: 30, y: 30, ...SHAPE_SIZE.diamond });
  });

  it("노드 = 자유 위치 · 저장된 크기", () => {
    const shape: ShapeItem = {
      id: "s",
      novelId: "n1",
      updatedAt: OLD,
      kind: "shape",
      z: 3,
      place: { mode: "free", x: 10, y: 20 },
      w: 200,
      h: 80,
      shape: "diamond",
      text: "",
    };
    expect(itemNode(shape, scale)).toMatchObject({
      type: "shape",
      position: { x: 10, y: 20 },
      width: 200,
      height: 80,
      zIndex: 3,
    });
  });
});
