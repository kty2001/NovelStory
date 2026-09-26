import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { OLD, resetDb, seedNovel, sticky } from "../test/fixtures";
import {
  beginBatch,
  endBatch,
  flushSave,
  loadNovel,
  undo,
  unloadNovel,
  useNovelStore,
} from "./novelStore";

const store = useNovelStore;

const removeS1 = () =>
  store.setState((s) => {
    const items = { ...s.items };
    delete items.s1;
    return { items };
  });

beforeEach(async () => {
  await unloadNovel();
  await resetDb();
  await seedNovel();
  await loadNovel("n1");
});

afterEach(() => vi.useRealTimers());

describe("자동 저장", () => {
  it("추가·수정·삭제 반영, 삭제는 deletedAt 기록, Novel.updatedAt 갱신", async () => {
    removeS1();
    store.setState((s) => ({ items: { ...s.items, s3: sticky("s3", "n1", 50) } }));
    await flushSave();

    const s3 = await db.boardItems.get("s3");
    expect(s3?.updatedAt).not.toBe(OLD);
    expect((await db.boardItems.get("s1"))?.deletedAt).toBeDefined();
    expect((await db.novels.get("n1"))?.updatedAt).not.toBe(OLD);
    expect(store.getState().save).toBe("saved");
  });

  it("실행 취소로 되살아나면 deletedAt 해제", async () => {
    removeS1();
    await flushSave();
    undo();
    await flushSave();
    expect((await db.boardItems.get("s1"))?.deletedAt).toBeUndefined();
  });

  it("로드만으로는 저장하지 않음", async () => {
    await flushSave();
    expect((await db.novels.get("n1"))?.updatedAt).toBe(OLD);
  });

  it("디바운스 후 저장, 묶음 중에는 대기", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    beginBatch();
    store.setState((s) => ({ items: { ...s.items, s1: sticky("s1", "n1", 70) } }));
    await vi.advanceTimersByTimeAsync(2000);
    expect((await db.boardItems.get("s1"))?.place).toMatchObject({ x: 0 });

    endBatch();
    await vi.advanceTimersByTimeAsync(600);
    await flushSave(); // 진행 중인 저장 완료 대기
    expect((await db.boardItems.get("s1"))?.place).toMatchObject({ x: 70 });
  });

  it("소설을 닫으면 미저장분 즉시 저장", async () => {
    store.setState((s) => ({ items: { ...s.items, s1: sticky("s1", "n1", 90) } }));
    await unloadNovel();
    expect((await db.boardItems.get("s1"))?.place).toMatchObject({ x: 90 });
  });
});
