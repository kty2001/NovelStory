import { describe, expect, it } from "vitest";
import { dropOverlaps, insertTick, pickStep, snapTick, tickToX, xToTick, type Scale } from "./timeAxis";

const plain: Scale = { pxPerTick: 100, collapsed: [], collapsedPx: 40 };
const folded: Scale = { pxPerTick: 100, collapsed: [{ from: 10, to: 30 }], collapsedPx: 40 };

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
    const s: Scale = { pxPerTick: 50, collapsed: [{ from: 40, to: 60 }, { from: 5, to: 20 }], collapsedPx: 30 };
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

describe("눈금 삽입", () => {
  it("at 이상 블록·라벨·접힌 구간이 1칸 이동", () => {
    const r = insertTick(
      5,
      [{ id: "a", tick: 3 }, { id: "b", tick: 5 }, { id: "c", tick: 9 }],
      { 3: "봄", 5: "여름" },
      [{ from: 4, to: 8 }],
    );
    expect(r.items.map((i) => i.tick)).toEqual([3, 6, 10]);
    expect(r.labels).toEqual({ 3: "봄", 6: "여름" });
    expect(r.collapsed).toEqual([{ from: 4, to: 9 }]);
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
