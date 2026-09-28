import { describe, expect, it } from "vitest";
import type { StateItem, WikiCategory } from "../../db/types";
import { doc, OLD } from "../../test/fixtures";
import { afterExit, categoryFamily, searchDocs, stateAt } from "./stateCalc";

const state = (
  id: string,
  t: number | null,
  stateType: StateItem["stateType"],
  changes: StateItem["changes"],
  extra: Partial<StateItem> = {},
): StateItem => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  kind: "state",
  z: 0,
  place: t === null ? { mode: "undated", x: -100, y: 40 } : { mode: "timed", t, y: 40 },
  docId: "kael",
  stateType,
  changes,
  note: "",
  ...extra,
});

const kael = {
  ...doc("kael", "n1"),
  props: [
    { key: "소속", value: "기사단" },
    { key: "나이", value: "" },
  ],
};
const docs = { kael };

describe("시점별 상태 누적", () => {
  const items = {
    a: state("a", 1, "appear", [{ key: "나이", to: "17" }]),
    b: state("b", 4, "change", [{ key: "소속", from: "기사단", to: "반란군" }]),
    c: state("c", 4, "change", [{ key: "소속", to: "망명" }], {
      place: { mode: "timed", t: 4, y: 90 },
    }),
    u: state("u", null, "change", [{ key: "나이", to: "99" }]),
  };

  it("문서 속성 위에 시점 ≤ t 블록의 새값을 덮어씀 (같은 시점은 y 순)", () => {
    expect(stateAt("kael", 0, items, docs)).toEqual({ 소속: "기사단" });
    expect(stateAt("kael", 2, items, docs)).toEqual({ 소속: "기사단", 나이: "17" });
    expect(stateAt("kael", 4, items, docs)).toEqual({ 소속: "망명", 나이: "17" });
  });

  it("미정 블록 · 입력 중인 자기 자신은 제외", () => {
    expect(stateAt("kael", 9, items, docs, "c")).toEqual({ 소속: "반란군", 나이: "17" });
  });
});

describe("퇴장 이후 경고", () => {
  it("앞선 시점에 같은 캐릭터 퇴장이 있으면 경고", () => {
    const items = {
      x: state("x", 3, "exit", []),
      y: state("y", 5, "appear", []),
      z: state("z", 2, "change", []),
    };
    expect(afterExit(items.y, items)).toBe(true);
    expect(afterExit(items.z, items)).toBe(false);
    expect(afterExit(items.x, items)).toBe(false);
  });
});

describe("분류 계열 · 검색", () => {
  const cat = (id: string, extra: Partial<WikiCategory>): WikiCategory => ({
    id,
    novelId: "n1",
    updatedAt: OLD,
    name: id,
    order: 0,
    templateProps: [],
    color: "brand-mint",
    ...extra,
  });

  it("system 분류의 하위 분류까지 포함", () => {
    const cats = {
      c: cat("c", { system: "character" }),
      c1: cat("c1", { parentId: "c" }),
      c2: cat("c2", { parentId: "c1" }),
      e: cat("e", { system: "event" }),
    };
    expect([...categoryFamily(cats, "character")].sort()).toEqual(["c", "c1", "c2"]);
  });

  it("제목 · 별칭 부분 일치", () => {
    const list = [
      { ...doc("a", "n1"), title: "카엘", aliases: ["흑기사"] },
      { ...doc("b", "n1"), title: "레아", aliases: [] },
    ];
    expect(searchDocs(list, "기사").map((d) => d.id)).toEqual(["a"]);
    expect(searchDocs(list, "레").map((d) => d.id)).toEqual(["b"]);
    expect(searchDocs(list, " ").length).toBe(2);
  });
});
