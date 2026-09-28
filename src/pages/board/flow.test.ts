import { describe, expect, it } from "vitest";
import type { EventItem } from "../../db/types";
import { board, OLD } from "../../test/fixtures";
import { AXIS_ID, decorNodes, UNDATED_GAP, UNDATED_ID, UNDATED_W } from "./flow";

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
