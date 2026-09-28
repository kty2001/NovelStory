import { describe, expect, it } from "vitest";
import type { EventItem } from "../../db/types";
import { board, OLD } from "../../test/fixtures";
import {
  AXIS_ID,
  decorNodes,
  EVENT_W,
  movedPlace,
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
