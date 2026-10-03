import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import type { EventItem, ImageAsset, StateItem } from "../db/types";
import { patchItems, updateState } from "./boardActions";
import { doc, OLD, resetDb, seedNovel, sticky } from "../test/fixtures";
import {
  beginBatch,
  endBatch,
  loadNovel,
  redo,
  undo,
  unloadNovel,
  useNovelStore,
} from "./novelStore";

const store = useNovelStore;
const history = () => store.temporal.getState();

const moveS1 = (x: number) =>
  store.setState((s) => ({ items: { ...s.items, s1: sticky("s1", "n1", x) } }));

beforeEach(async () => {
  await unloadNovel();
  await resetDb();
  await seedNovel();
});

describe("loadNovel", () => {
  it("살아 있는 레코드만 불러오고 기록은 비어 있음", async () => {
    await loadNovel("n1");
    const s = store.getState();
    expect(s.status).toBe("ready");
    expect(Object.keys(s.items)).toEqual(["s1"]);
    expect(Object.keys(s.docs)).toEqual(["d1"]);
    expect(history().pastStates).toHaveLength(0);
  });

  it("없는 소설은 missing", async () => {
    await loadNovel("nope");
    expect(store.getState().status).toBe("missing");
  });

  it("늦게 끝난 이전 로드는 무시", async () => {
    await seedNovel("n2");
    const first = loadNovel("n1");
    const second = loadNovel("n2");
    await Promise.all([first, second]);
    expect(store.getState().novel?.id).toBe("n2");
  });
});

describe("실행 취소", () => {
  beforeEach(() => loadNovel("n1"));

  it("보드 데이터만 되돌리고 사전·저장 상태는 유지", () => {
    moveS1(100);
    store.setState((s) => ({ docs: { ...s.docs, d2: doc("d2", "n1") } }));
    expect(history().pastStates).toHaveLength(1); // 사전 변경은 기록 안 함

    undo();
    const s = store.getState();
    expect(s.items.s1.place).toMatchObject({ x: 0 });
    expect(Object.keys(s.docs)).toEqual(["d1", "d2"]);

    redo();
    expect(store.getState().items.s1.place).toMatchObject({ x: 100 });
  });

  it("묶음 = 1건", () => {
    beginBatch();
    for (const x of [10, 20, 30]) moveS1(x);
    endBatch();
    expect(history().pastStates).toHaveLength(1);
    undo();
    expect(store.getState().items.s1.place).toMatchObject({ x: 0 });
  });

  it("변경 없는 묶음은 기록 안 함", () => {
    beginBatch();
    endBatch();
    expect(history().pastStates).toHaveLength(0);
  });

  it("값이 그대로인 수정은 기록 안 함 (상태 블록 입력 · 색 지정)", () => {
    const state = {
      id: "st",
      novelId: "n1",
      updatedAt: OLD,
      kind: "state",
      z: 1,
      place: { mode: "timed", t: 1, y: 0 },
      docId: "d1",
      stateType: "change",
      changes: [],
      note: "메모",
    } as StateItem;
    store.setState((s) => ({ items: { ...s.items, st: state } }));
    store.temporal.getState().clear();
    updateState("st", { note: "메모" });
    patchItems(["s1"], { color: "sticky-yellow" });
    expect(history().pastStates).toHaveLength(0);
    updateState("st", { note: "바뀜" });
    expect(history().pastStates).toHaveLength(1);
  });

  it("기록 상한 100건", () => {
    for (let x = 1; x <= 120; x++) moveS1(x);
    beginBatch();
    moveS1(999);
    endBatch();
    expect(history().pastStates).toHaveLength(100);
  });
});

describe("자동 생성 빈 사건 문서 정리 (소설 열 때)", () => {
  const event = (id: string, docId: string): EventItem => ({
    id,
    novelId: "n1",
    updatedAt: OLD,
    kind: "event",
    z: 1,
    place: { mode: "timed", t: 1, y: -100 },
    docId,
    color: "brand-peach",
  });

  it("블록 · 서술 배치가 없고 비어 있는 자동 생성 문서만 소프트 삭제", async () => {
    await db.wikiDocs.bulkPut([
      { ...doc("empty", "n1"), autoCreated: true },
      { ...doc("used", "n1"), autoCreated: true },
      { ...doc("tagged", "n1"), autoCreated: true, tags: ["복선"] },
      { ...doc("narrated", "n1"), autoCreated: true },
      { ...doc("imaged", "n1"), autoCreated: true, imageId: "img" },
    ]);
    await db.boardItems.put(event("e1", "used"));
    await db.narrativeSlots.put({
      id: "slot1",
      novelId: "n1",
      updatedAt: OLD,
      episodeId: "ep1",
      order: 0,
      eventDocId: "narrated",
      mode: "linear",
    });
    await loadNovel("n1");
    expect(Object.keys(store.getState().docs).sort()).toEqual([
      "d1",
      "imaged",
      "narrated",
      "tagged",
      "used",
    ]);
    expect((await db.wikiDocs.get("empty"))?.deletedAt).toBeTruthy();
  });
});

describe("고아 이미지 정리 (소설 열 때)", () => {
  const image = (id: string, novelId = "n1"): ImageAsset => ({
    id,
    novelId,
    updatedAt: OLD,
    blob: new Blob(["x"], { type: "image/webp" }),
    mime: "image/webp",
    width: 1,
    height: 1,
    bytes: 1,
  });

  it("살아 있는 문서 · 표지가 쓰는 이미지만 남김 (다른 소설은 그대로)", async () => {
    await db.images.bulkPut(["doc", "cover", "orphan", "deleted", "shared"].map((id) => image(id)));
    await db.images.put(image("other", "n2"));
    await db.novels.update("n1", { coverImageId: "cover" });
    await db.wikiDocs.bulkPut([
      { ...doc("d1", "n1"), imageId: "doc" },
      { ...doc("gone", "n1"), imageId: "deleted", deletedAt: OLD },
      // 붙여넣은 사건 문서: 원본과 같은 이미지
      { ...doc("a", "n1"), imageId: "shared" },
      { ...doc("b", "n1"), imageId: "shared" },
    ]);
    await loadNovel("n1");
    expect((await db.images.toCollection().primaryKeys()).sort()).toEqual([
      "cover",
      "doc",
      "other",
      "shared",
    ]);
  });
});
