import { describe, expect, it } from "vitest";
import type { EventItem } from "../../db/types";
import { board, OLD, sticky } from "../../test/fixtures";
import {
  dropOverlaps,
  insertTick,
  normalizeCollapsed,
  pickStep,
  snapTick,
  tickToX,
  xToTick,
  type Scale,
} from "./timeAxis";

const plain: Scale = { pxPerTick: 100, collapsed: [], collapsedPx: 40 };
const folded: Scale = { pxPerTick: 100, collapsed: [{ from: 10, to: 30 }], collapsedPx: 40 };

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

describe("x ↔ 눈금 변환", () => {
  it("접힌 구간 없음: 선형", () => {
    expect(tickToX(0, plain)).toBe(0);
    expect(tickToX(7, plain)).toBe(700);
    expect(xToTick(350, plain)).toBe(3.5);
  });

  it("x < 0 은 시점 미정", () => {
    expect(xToTick(-1, plain)).toBeNull();
    expect(snapTick(-50, plain)).toBeNull();
  });

  it("접힌 구간: 구간 전·안·후 변환", () => {
    expect(tickToX(10, folded)).toBe(1000);
    expect(tickToX(20, folded)).toBe(1020); // 구간 중간 = 40px 중 절반
    expect(tickToX(30, folded)).toBe(1040);
    expect(tickToX(31, folded)).toBe(1140);
  });

  it("왕복 변환 일치", () => {
    for (const t of [0, 3, 9.5, 10, 15, 29, 30, 42]) {
      expect(xToTick(tickToX(t, folded), folded)).toBeCloseTo(t, 9);
    }
  });

  it("접힌 구간 여러 개", () => {
    const s: Scale = {
      pxPerTick: 50,
      collapsed: [
        { from: 40, to: 60 },
        { from: 5, to: 20 },
      ],
      collapsedPx: 30,
    };
    for (const t of [0, 5, 12, 20, 33, 40, 50, 60, 70]) {
      expect(xToTick(tickToX(t, s), s)).toBeCloseTo(t, 9);
    }
    expect(tickToX(20, s)).toBe(5 * 50 + 30);
  });
});

describe("스냅", () => {
  it("가장 가까운 정수 눈금", () => {
    expect(snapTick(340, plain)).toBe(3);
    expect(snapTick(360, plain)).toBe(4);
  });

  it("접힌 구간 안은 가까운 경계", () => {
    expect(snapTick(1005, folded)).toBe(10);
    expect(snapTick(1035, folded)).toBe(30);
  });
});

describe("접힌 구간 정리", () => {
  it("정렬 · 겹치거나 맞닿은 구간 병합 · 빈 구간 제거", () => {
    expect(
      normalizeCollapsed([
        { from: 20, to: 25 },
        { from: 3, to: 8 },
        { from: 6, to: 10 },
        { from: 10, to: 12 },
        { from: 15, to: 15 },
      ]),
    ).toEqual([
      { from: 3, to: 12 },
      { from: 20, to: 25 },
    ]);
  });
});

describe("눈금 삽입", () => {
  it("at 이상 블록 t·tEnd, 라벨, 접힌 구간이 1칸 이동", () => {
    const scale = {
      ...board("n1").timeScale,
      tickLabels: { "3": "봄", "5": "여름" },
      collapsed: [{ from: 4, to: 8 }],
    };
    const items = {
      a: event("a", { mode: "timed", t: 3, y: 0 }),
      b: event("b", { mode: "timed", t: 5, y: 0 }),
      c: event("c", { mode: "timed", t: 2, tEnd: 6, y: 0 }),
      u: event("u", { mode: "undated", x: -100, y: 0 }),
      s: sticky("s", "n1", 500),
    };
    const r = insertTick(5, scale, items);
    expect(r.items.a.place).toMatchObject({ t: 3 });
    expect(r.items.b.place).toMatchObject({ t: 6 });
    expect(r.items.c.place).toMatchObject({ t: 2, tEnd: 7 });
    expect(r.timeScale.tickLabels).toEqual({ "3": "봄", "6": "여름" });
    expect(r.timeScale.collapsed).toEqual([{ from: 4, to: 9 }]);
    // 바뀌지 않은 블록은 같은 객체 (자동 저장 참조 비교)
    for (const id of ["a", "u", "s"] as const) expect(r.items[id]).toBe(items[id]);
  });
});

describe("눈금 밀도·라벨 겹침", () => {
  it("줌이 작을수록 간격이 커짐", () => {
    expect(pickStep(100, 1, 60)).toBe(1);
    expect(pickStep(100, 0.25, 60)).toBe(5);
    expect(pickStep(100, 0.05, 60)).toBe(20);
  });

  it("우선순위 높은 라벨을 남기고 겹침 제거", () => {
    const kept = dropOverlaps([
      { key: "1", x: 0, width: 40, text: "1", priority: 0 },
      { key: "봄", x: 20, width: 60, text: "1년차 봄", priority: 1 },
      { key: "5", x: 200, width: 40, text: "5", priority: 0 },
    ]);
    expect(kept.map((k) => k.key)).toEqual(["봄", "5"]);
  });
});
