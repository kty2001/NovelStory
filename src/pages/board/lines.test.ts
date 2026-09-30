import { describe, expect, it } from "vitest";
import { lineBorder, lineDotColor } from "./lines";

describe("스토리 라인 테두리 · 색", () => {
  it("기본 색: 순서별 ink 굵은 실선 · muted 실선 · muted 점선", () => {
    expect(lineBorder(0, "muted")).toEqual({ border: "2px solid var(--color-ink)" });
    expect(lineBorder(1)).toEqual({ border: "1.5px solid var(--color-muted)" });
    expect(lineBorder(2, "muted")).toEqual({ border: "1.5px dashed var(--color-muted)" });
    expect(lineBorder(5)).toEqual({ border: "1.5px solid var(--color-muted)" });
  });

  it("라인 색: 색만 바뀌고 굵기 · 점선은 순서 유지", () => {
    expect(lineBorder(0, "brand-coral")).toEqual({ border: "2px solid var(--color-brand-coral)" });
    expect(lineBorder(2, "brand-teal")).toEqual({
      border: "1.5px dashed var(--color-brand-teal)",
    });
  });

  it("미지정은 기본 테두리(스타일 없음), 기본 색은 점 없음", () => {
    expect(lineBorder(undefined, "brand-coral")).toEqual({});
    expect(lineDotColor("muted")).toBeUndefined();
    expect(lineDotColor(undefined)).toBeUndefined();
    expect(lineDotColor("brand-mint")).toBe("var(--color-brand-mint)");
  });
});
