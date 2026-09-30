import { beforeEach, describe, expect, it } from "vitest";
import type { StickyItem, WikiCategory } from "../db/types";
import { OLD, sticky } from "../test/fixtures";
import {
  addMemo,
  deleteMemos,
  memoToDoc,
  memoToSticky,
  restoreMemos,
  setMemoBody,
  setMemoPinned,
  stickiesToMemos,
} from "./memoActions";
import { useNovelStore } from "./novelStore";

const store = useNovelStore;

const category: WikiCategory = {
  id: "place",
  novelId: "n1",
  updatedAt: OLD,
  name: "장소",
  order: 0,
  templateProps: ["위치"],
  color: "muted",
};

beforeEach(() => {
  store.setState({
    novelId: "n1",
    categories: { place: category },
    docs: {},
    items: {},
    edges: {},
    memos: {},
  });
  store.temporal.getState().clear();
});

describe("메모", () => {
  it("추가 · 내용 · 고정 변경 시 updatedAt 갱신, 같은 값이면 그대로", () => {
    const id = addMemo()!;
    const created = store.getState().memos[id]!;
    expect(created).toMatchObject({ body: "", pinned: false, novelId: "n1" });

    setMemoBody(id, "생각");
    setMemoPinned(id, true);
    const after = store.getState().memos[id]!;
    expect(after).toMatchObject({ body: "생각", pinned: true, createdAt: created.createdAt });

    setMemoPinned(id, true);
    expect(store.getState().memos[id]).toBe(after);
  });

  it("삭제 · 되돌리기, 실행 취소 기록 밖", () => {
    const id = addMemo("a")!;
    const memo = store.getState().memos[id]!;
    deleteMemos([id]);
    expect(store.getState().memos).toEqual({});
    restoreMemos([memo]);
    expect(store.getState().memos[id]).toBe(memo);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });
});

describe("변환 (이동)", () => {
  it("메모 → 포스트잇: 내용 그대로, 메모 삭제, 보드 실행 취소 1건", () => {
    const id = addMemo("줄1\n줄2")!;
    const stickyId = memoToSticky(id, 10, 20)!;
    expect(store.getState().items[stickyId]).toMatchObject({
      kind: "sticky",
      text: "줄1\n줄2",
      place: { mode: "free", x: 10, y: 20 },
    });
    expect(store.getState().memos).toEqual({});
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });

  it("포스트잇 → 메모: 위쪽 포스트잇이 최근, 포스트잇 · 연결선 삭제 후 반환", () => {
    const low: StickyItem = { ...sticky("low", "n1"), place: { mode: "free", x: 0, y: 200 } };
    store.setState({
      items: { low, high: sticky("high", "n1"), other: sticky("other", "n1", 500) },
      edges: {
        e: {
          id: "e",
          novelId: "n1",
          updatedAt: OLD,
          source: "high",
          target: "other",
          dashed: false,
        },
      },
    });
    const r = stickiesToMemos(["low", "high"])!;
    const memos = store.getState().memos;
    expect(r.memoIds.map((id) => memos[id]!.body)).toEqual(["high", "low"]);
    expect(memos[r.memoIds[0]!]!.updatedAt > memos[r.memoIds[1]!]!.updatedAt).toBe(true);
    expect(Object.keys(store.getState().items)).toEqual(["other"]);
    expect(store.getState().edges).toEqual({});
    expect(r.items.map((i) => i.id)).toEqual(["high", "low"]);
    expect(r.edges.map((e) => e.id)).toEqual(["e"]);
  });

  it("포스트잇이 아닌 선택은 무시", () => {
    expect(stickiesToMemos(["none"])).toBeNull();
  });

  it("메모 → 사전 문서: 첫 줄 제목, 나머지 본문 + 파생 필드, 템플릿 속성, 메모 삭제", () => {
    const id = addMemo("성문\n북쪽 끝")!;
    const docId = memoToDoc(id, "place")!;
    const doc = store.getState().docs[docId]!;
    expect(doc).toMatchObject({
      title: "성문",
      categoryId: "place",
      props: [{ key: "위치", value: "" }],
      plainText: "북쪽 끝",
    });
    expect(store.getState().memos).toEqual({});
  });
});
