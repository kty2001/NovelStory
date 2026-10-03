import { beforeEach, describe, expect, it } from "vitest";
import type { EventItem, StateItem, WikiCategory } from "../db/types";
import { board, doc, OLD } from "../test/fixtures";
import { placeEvent, setLanes } from "./boardActions";
import { useNovelStore } from "./novelStore";
import {
  addCategory,
  addDoc,
  deleteCategory,
  deleteDoc,
  moveCategory,
  moveDoc,
  setCategoryColor,
  setDocBody,
  setPropValue,
  setTemplateProps,
  updateDoc,
} from "./wikiActions";

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

describe("문서 동작", () => {
  const eventBlock = { id: "b1", kind: "event", docId: "d1" } as unknown as EventItem;

  it("본문: 파생 필드 계산, null이면 비움", () => {
    setDocBody("d1", {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "만난 사람 " },
            { type: "mention", attrs: { id: "d9", label: "카엘" } },
          ],
        },
      ],
    });
    expect(store.getState().docs.d1).toMatchObject({
      mentions: ["d9"],
      plainText: "만난 사람 카엘",
    });
    setDocBody("d1", null);
    expect(store.getState().docs.d1).toMatchObject({ body: null, mentions: [], plainText: "" });
  });

  it("대표 이미지 제거는 필드 삭제", () => {
    updateDoc("d1", { imageId: "img" });
    expect(store.getState().docs.d1.imageId).toBe("img");
    updateDoc("d1", { imageId: undefined });
    expect(store.getState().docs.d1).not.toHaveProperty("imageId");
  });

  it("분류 이동: 사건 계열 밖이면 라인 제거, 보드 문서는 다른 계열 불가", () => {
    store.setState({ items: { b1: eventBlock } });
    expect(moveDoc("d1", "place")).toMatch(/계열/);
    expect(store.getState().docs.d1.categoryId).toBe("sub");
    expect(moveDoc("d1", "event")).toBeNull();
    expect(store.getState().docs.d1).toMatchObject({ categoryId: "event", lineId: "L1" });

    store.setState({ items: {} });
    expect(moveDoc("d1", "place")).toBeNull();
    expect(store.getState().docs.d1).not.toHaveProperty("lineId");
  });

  it("삭제: 연결 블록 · 연결선 · 레인 순서도 정리, 보드 실행 취소 기록 비움", () => {
    const state = {
      id: "s1",
      kind: "state",
      docId: "d1",
      linkedEventItemId: "b1",
    } as unknown as StateItem;
    const other = { ...eventBlock, id: "b2", docId: "d2" } as EventItem;
    store.setState({
      board: board("n1"),
      items: { b1: eventBlock, s1: state, b2: other },
      edges: {
        e1: { id: "e1", novelId: "n1", updatedAt: OLD, source: "b1", target: "b2", dashed: false },
      },
    });
    setLanes({ order: ["d1", "d2"] });
    store.setState({ items: { ...store.getState().items } }); // 기록 1건 이상
    deleteDoc("d1");
    const s = store.getState();
    expect(s.docs.d1).toBeUndefined();
    expect(Object.keys(s.items)).toEqual(["b2"]);
    expect(s.edges).toEqual({});
    expect(s.board?.stateLanes.order).toEqual(["d2"]);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });
});

it("템플릿 변경은 새 문서에만 적용", () => {
  const before = addDoc("char")!;
  setTemplateProps("char", ["출신", "나이"]);
  const after = addDoc("char")!;
  const { docs } = store.getState();
  expect(docs[after].props.map((p) => p.key)).toEqual(["출신", "나이"]);
  expect(docs[before].props.map((p) => p.key)).toEqual(["나이", "성별"]);
});

it("표 셀 수정: 있는 키는 값 변경, 없는 키는 끝에 추가", () => {
  const id = addDoc("char")!;
  setPropValue(id, "성별", "여");
  setPropValue(id, "출신", "북부");
  expect(store.getState().docs[id].props).toEqual([
    { key: "나이", value: "" },
    { key: "성별", value: "여" },
    { key: "출신", value: "북부" },
  ]);
});

it("속성 값 링크: mentions에 반영, 본문 변경 후에도 유지, 표 셀 수정 = 링크 해제", () => {
  const a = addDoc("char")!;
  const b = addDoc("char")!;
  updateDoc(a, { props: [{ key: "소속", value: "b", docId: b }] });
  expect(store.getState().docs[a].mentions).toEqual([b]);
  setDocBody(a, { type: "doc", content: [{ type: "paragraph" }] });
  expect(store.getState().docs[a].mentions).toEqual([b]);
  setPropValue(a, "소속", "없음");
  expect(store.getState().docs[a].props).toEqual([{ key: "소속", value: "없음" }]);
  expect(store.getState().docs[a].mentions).toEqual([]);
});

it("문서 → 보드: 사건 블록은 문서당 1개", () => {
  const first = placeEvent({ mode: "timed", t: 1, y: 0 }, "d1");
  expect(store.getState().items[first!]).toMatchObject({ kind: "event", docId: "d1" });
  expect(placeEvent({ mode: "timed", t: 2, y: 0 }, "d1")).toBeNull();
});
