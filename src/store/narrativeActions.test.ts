import { beforeEach, describe, expect, it } from "vitest";
import type { WikiCategory } from "../db/types";
import { episodeSlots, sortedEpisodes } from "../pages/narrative/narrative";
import { doc, OLD } from "../test/fixtures";
import {
  addEpisode,
  addSlot,
  deleteEpisode,
  moveSlot,
  removeSlot,
  renameEpisode,
  setSlotMode,
  setSlotNote,
} from "./narrativeActions";
import { useNovelStore } from "./novelStore";
import { deleteDoc, moveCategory, moveDoc } from "./wikiActions";

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

const episodeTitles = () =>
  sortedEpisodes(store.getState().episodes).map((e) => e.title ?? e.number);
const titles = (episodeId: string) =>
  episodeSlots(store.getState().slots, episodeId).map((s) => s.eventDocId);

beforeEach(() => {
  store.setState({
    novelId: "n1",
    categories: {
      ev: cat("ev", 0, { system: "event" }),
      sub: cat("sub", 0, { parentId: "ev" }),
      place: cat("place", 1),
    },
    docs: {
      a: { ...doc("a", "n1"), categoryId: "ev" },
      b: { ...doc("b", "n1"), categoryId: "ev" },
      c: { ...doc("c", "n1"), categoryId: "sub" },
    },
    items: {},
    episodes: {},
    slots: {},
  });
});

describe("회차", () => {
  it("끝 추가 · 앞에 삽입 · 삭제 시 1부터 연속 번호", () => {
    const e1 = addEpisode()!;
    const e2 = addEpisode()!;
    renameEpisode(e1, "하나");
    renameEpisode(e2, "둘");
    const e0 = addEpisode(e2)!;
    renameEpisode(e0, "사이");
    expect(episodeTitles()).toEqual(["하나", "사이", "둘"]);
    expect(sortedEpisodes(store.getState().episodes).map((e) => e.number)).toEqual([1, 2, 3]);

    addSlot(e0, "a");
    deleteEpisode(e0);
    expect(episodeTitles()).toEqual(["하나", "둘"]);
    expect(store.getState().episodes[e2].number).toBe(2);
    expect(store.getState().slots).toEqual({});
  });

  it("빈 제목 = 제목 필드 제거", () => {
    const e = addEpisode()!;
    renameEpisode(e, "  프롤로그 ");
    expect(store.getState().episodes[e].title).toBe("프롤로그");
    renameEpisode(e, " ");
    expect(store.getState().episodes[e]).not.toHaveProperty("title");
  });

  it("같은 제목이면 바꾸지 않음 (blur마다 저장 방지)", () => {
    const e = addEpisode()!;
    renameEpisode(e, "프롤로그");
    const before = store.getState().episodes;
    renameEpisode(e, " 프롤로그 ");
    expect(store.getState().episodes).toBe(before);
  });
});

describe("슬롯", () => {
  it("같은 사건 여러 회차 · 위치 지정 삽입", () => {
    const e1 = addEpisode()!;
    const e2 = addEpisode()!;
    addSlot(e1, "a");
    addSlot(e1, "b", 0);
    addSlot(e2, "a");
    expect(titles(e1)).toEqual(["b", "a"]);
    expect(titles(e2)).toEqual(["a"]);
    expect(addSlot(e1, "없는 문서")).toBeNull();
  });

  it("회차 안 · 회차 사이 이동 후 order 연속", () => {
    const e1 = addEpisode()!;
    const e2 = addEpisode()!;
    const sa = addSlot(e1, "a")!;
    addSlot(e1, "b");
    addSlot(e1, "c");
    moveSlot(sa, e1, 2);
    expect(titles(e1)).toEqual(["b", "c", "a"]);
    moveSlot(sa, e2, 0);
    expect(titles(e1)).toEqual(["b", "c"]);
    expect(titles(e2)).toEqual(["a"]);
    const orders = Object.values(store.getState().slots)
      .filter((s) => s.episodeId === e1)
      .map((s) => s.order)
      .sort();
    expect(orders).toEqual([0, 1]);
  });

  it("서술 방식 · 메모 · 빼기", () => {
    const e = addEpisode()!;
    const s = addSlot(e, "a")!;
    addSlot(e, "b");
    setSlotMode(s, "foreshadow");
    setSlotNote(s, "이름만 언급");
    expect(store.getState().slots[s]).toMatchObject({ mode: "foreshadow", note: "이름만 언급" });
    setSlotNote(s, "");
    expect(store.getState().slots[s]).not.toHaveProperty("note");
    removeSlot(s);
    expect(titles(e)).toEqual(["b"]);
    expect(episodeSlots(store.getState().slots, e)[0].order).toBe(0);
  });
});

describe("문서 연쇄", () => {
  it("사건 문서 삭제 → 그 슬롯 삭제, 나머지 재번호", () => {
    const e = addEpisode()!;
    addSlot(e, "a");
    addSlot(e, "b");
    deleteDoc("a");
    expect(titles(e)).toEqual(["b"]);
    expect(episodeSlots(store.getState().slots, e)[0].order).toBe(0);
  });

  it("사건 계열 밖으로 문서 · 분류 이동 → 슬롯 삭제, 계열 안 이동은 유지", () => {
    const e = addEpisode()!;
    addSlot(e, "a");
    addSlot(e, "b");
    addSlot(e, "c");
    moveDoc("b", "sub");
    expect(titles(e)).toEqual(["a", "b", "c"]);
    moveDoc("a", "place");
    expect(titles(e)).toEqual(["b", "c"]);
    expect(moveCategory("sub", "place", "inside")).toBeNull();
    expect(titles(e)).toEqual([]);
  });
});
