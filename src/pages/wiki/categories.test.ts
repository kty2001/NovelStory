import { describe, expect, it } from "vitest";
import type { EventItem, WikiCategory, WikiDoc } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { doc, OLD } from "../../test/fixtures";
import {
  childCategories,
  deleteError,
  docCounts,
  dropError,
  familyOf,
  movedCategories,
} from "./categories";

const cat = (id: string, order: number, extra: Partial<WikiCategory> = {}): WikiCategory => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  name: id,
  order,
  templateProps: [],
  color: "muted",
  ...extra,
});

// 사건(system) · 장소 ─ 왕국 · 용어집
const categories: Collection<WikiCategory> = {
  event: cat("event", 0, { system: "event" }),
  place: cat("place", 1),
  kingdom: cat("kingdom", 0, { parentId: "place" }),
  terms: cat("terms", 2),
};

const docIn = (id: string, categoryId: string): WikiDoc => ({ ...doc(id, "n1"), categoryId });

const eventItem = (docId: string) =>
  ({ id: `i-${docId}`, kind: "event", docId }) as unknown as EventItem;

const ids = (cs: Collection<WikiCategory>, parentId?: string) =>
  childCategories(cs, parentId).map((c) => c.id);

describe("movedCategories", () => {
  it("앞 · 뒤: 같은 단계 순서 재번호", () => {
    expect(ids(movedCategories(categories, "terms", "event", "before"))).toEqual([
      "terms",
      "event",
      "place",
    ]);
    const next = movedCategories(categories, "event", "terms", "after");
    expect(ids(next)).toEqual(["place", "terms", "event"]);
    expect(next.place.order).toBe(0);
  });

  it("가운데: 하위 분류 마지막으로", () => {
    const next = movedCategories(categories, "terms", "place", "inside");
    expect(ids(next, "place")).toEqual(["kingdom", "terms"]);
    expect(ids(next)).toEqual(["event", "place"]);
  });

  it("하위 분류를 최상위로 꺼내면 parentId 제거", () => {
    const next = movedCategories(categories, "kingdom", "place", "after");
    expect(next.kingdom).not.toHaveProperty("parentId");
    expect(ids(next)).toEqual(["event", "place", "kingdom", "terms"]);
  });

  it("바뀌지 않은 레코드는 같은 객체 유지", () => {
    const next = movedCategories(categories, "terms", "place", "inside");
    expect(next.kingdom).toBe(categories.kingdom);
  });
});

describe("dropError", () => {
  const state = { categories, docs: {}, items: {} };

  it("system 분류 · 자기 자신 · 자손에는 놓기 불가", () => {
    expect(dropError(state, "event", "terms", "after")).toBeTruthy();
    expect(dropError(state, "place", "place", "inside")).toBeTruthy();
    expect(dropError(state, "place", "kingdom", "inside")).toBeTruthy();
    expect(dropError(state, "place", "kingdom", "before")).toBeTruthy();
  });

  it("보드에 쓰인 문서가 있으면 다른 계열로 이동 불가", () => {
    const docs = { d1: docIn("d1", "kingdom") };
    const items = { i: eventItem("d1") };
    expect(dropError({ categories, docs, items }, "place", "event", "inside")).toMatch(/계열/);
    // 보드에 없는 문서면 허용, 같은 계열 안 이동도 허용
    expect(dropError({ categories, docs, items: {} }, "place", "event", "inside")).toBeNull();
    expect(dropError({ categories, docs, items }, "place", "terms", "after")).toBeNull();
  });

  it("system 분류 하위로 넣기 · 앞뒤 정렬은 허용", () => {
    expect(dropError(state, "terms", "event", "inside")).toBeNull();
    expect(dropError(state, "terms", "event", "before")).toBeNull();
  });
});

describe("계열 · 문서 수 · 삭제 조건", () => {
  const cs = { ...categories, sub: cat("sub", 0, { parentId: "event" }) };

  it("familyOf: 최상위 분류의 system", () => {
    expect(familyOf(cs, "sub")).toBe("event");
    expect(familyOf(cs, "kingdom")).toBeUndefined();
    expect(familyOf(cs, undefined)).toBeUndefined();
  });

  it("docCounts: 하위 분류 포함", () => {
    const docs = { a: docIn("a", "kingdom"), b: docIn("b", "place") };
    expect(docCounts(cs, docs)).toEqual({ kingdom: 1, place: 2 });
  });

  it("deleteError: system · 하위 분류 · 문서가 있으면 이유", () => {
    const docs = { a: docIn("a", "terms") };
    expect(deleteError(cs, docs, "event")).toBeTruthy();
    expect(deleteError(cs, docs, "place")).toBe("하위 분류 1개");
    expect(deleteError(cs, docs, "terms")).toMatch(/문서 1개/);
    expect(deleteError(cs, docs, "kingdom")).toBeNull();
  });
});
