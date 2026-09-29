import { beforeEach, describe, expect, it } from "vitest";
import type { WikiCategory } from "../db/types";
import { doc, OLD } from "../test/fixtures";
import { useNovelStore } from "./novelStore";
import { addCategory, addDoc, deleteCategory, moveCategory, setCategoryColor } from "./wikiActions";

const store = useNovelStore;

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

beforeEach(() => {
  store.setState({
    novelId: "n1",
    categories: {
      char: cat("char", 0, {
        system: "character",
        color: "brand-mint",
        templateProps: ["나이", "성별"],
      }),
      event: cat("event", 1, { system: "event", color: "brand-peach" }),
      sub: cat("sub", 0, { parentId: "event", color: "brand-peach" }),
      place: cat("place", 2),
    },
    docs: { d1: { ...doc("d1", "n1"), categoryId: "sub", lineId: "L1" } },
    items: {},
  });
});

describe("분류 동작", () => {
  it("새 분류: 최상위 = muted · 마지막 순서, 하위 = 상위 색", () => {
    const root = addCategory()!;
    expect(store.getState().categories[root]).toMatchObject({ color: "muted", order: 3 });
    const child = addCategory("char")!;
    expect(store.getState().categories[child]).toMatchObject({
      parentId: "char",
      color: "brand-mint",
      order: 0,
    });
  });

  it("색 변경은 사용자 분류만", () => {
    setCategoryColor("char", "brand-pink");
    setCategoryColor("place", "brand-pink");
    const { categories } = store.getState();
    expect(categories.char.color).toBe("brand-mint");
    expect(categories.place.color).toBe("brand-pink");
  });

  it("삭제: 비어 있는 사용자 분류만", () => {
    deleteCategory("event"); // system
    deleteCategory("sub"); // 문서 있음
    deleteCategory("place");
    expect(Object.keys(store.getState().categories).sort()).toEqual(["char", "event", "sub"]);
  });

  it("사건 계열을 벗어나면 하위 문서 라인 제거", () => {
    expect(moveCategory("sub", "place", "inside")).toBeNull();
    const s = store.getState();
    expect(s.categories.sub.parentId).toBe("place");
    expect(s.docs.d1).not.toHaveProperty("lineId");
  });

  it("사건 계열 안 이동은 라인 유지", () => {
    moveCategory("place", "event", "inside");
    moveCategory("sub", "place", "inside");
    expect(store.getState().docs.d1.lineId).toBe("L1");
  });

  it("이동 불가면 이유 반환, 변경 없음", () => {
    const before = store.getState().categories;
    expect(moveCategory("event", "place", "inside")).toBeTruthy();
    expect(store.getState().categories).toBe(before);
  });
});

it("새 문서: 템플릿 속성 빈 값", () => {
  const id = addDoc("char")!;
  expect(store.getState().docs[id]).toMatchObject({
    categoryId: "char",
    title: "새 문서",
    props: [
      { key: "나이", value: "" },
      { key: "성별", value: "" },
    ],
  });
});
