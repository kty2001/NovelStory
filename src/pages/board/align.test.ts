import { describe, expect, it } from "vitest";
import { alignSnap } from "./align";

const both = { x: true, y: true };
const box = (x: number, y: number, w = 100, h = 50) => ({ x, y, w, h });

describe("정렬 보조선", () => {
  it("threshold 안이면 윗변에 붙고 가로 보조선 (구간 = 두 요소)", () => {
    // 높이가 다르면 윗변만 일치 (같은 높이면 가운데 · 아랫변도 함께 일치)
    const r = alignSnap(box(300, 103, 100, 30), [box(0, 100)], 6, both);
    expect(r).toMatchObject({ dx: 0, dy: -3 });
    expect(r.guides).toEqual([{ axis: "y", at: 100, from: 0, to: 400 }]);
  });

  it("threshold 밖이면 그대로, 보조선 없음", () => {
    expect(alignSnap(box(300, 110), [box(0, 100)], 6, both)).toEqual({
      dx: 0,
      dy: 0,
      guides: [],
    });
  });

  it("가운데 · 끝 기준점도 맞춤, 가장 가까운 것 선택", () => {
    // 가운데 x: 이동 150+2 → 다른 요소 가운데 150
    const center = alignSnap(box(102, 300), [box(100, 0)], 6, both);
    expect(center.dx).toBe(-2);
    // 오른쪽 끝(205) → 다른 요소 왼쪽(206)이 1px, 오른쪽(200)은 5px → 가까운 쪽
    const edge = alignSnap(box(105, 300), [box(206, 0, 50), box(100, 600)], 6, both);
    expect(edge.dx).toBe(1);
  });

  it("축을 끄면 그 축은 맞추지 않음", () => {
    const r = alignSnap(box(302, 103), [box(302 - 4, 100)], 6, { x: false, y: true });
    expect(r).toMatchObject({ dx: 0, dy: -3 });
    expect(r.guides.every((g) => g.axis === "y")).toBe(true);
  });

  it("같은 위치의 보조선은 하나로, 구간은 맞춰진 요소 전부", () => {
    const r = alignSnap(box(300, 102, 100, 50), [box(0, 100), box(600, 100, 100, 80)], 6, {
      x: false,
      y: true,
    });
    expect(r.dy).toBe(-2);
    expect(r.guides).toContainEqual({ axis: "y", at: 100, from: 0, to: 700 });
    expect(r.guides.filter((g) => g.at === 100)).toHaveLength(1);
  });
});
