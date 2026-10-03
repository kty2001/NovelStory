import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { OLD, resetDb, seedNovel, sticky } from "../test/fixtures";
import { addMemo, setMemoBody } from "./memoActions";
import {
  adoptExport,
  adoptNovel,
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

  it("메모는 스토어 updatedAt 그대로 저장 (새로고침 후에도 최근 수정순 유지)", async () => {
    const a = addMemo("a")!;
    const b = addMemo("b")!;
    setMemoBody(a, "a2");
    const { memos } = store.getState();
    await flushSave();
    expect((await db.memos.get(a))?.updatedAt).toBe(memos[a].updatedAt);
    expect((await db.memos.get(b))?.updatedAt).toBe(memos[b].updatedAt);
  });

  it("소설 필드 반영: 미저장 소설 변경이 있으면 덮지 않고 합쳐 다음 저장에 포함", async () => {
    store.setState((s) => ({ novel: { ...s.novel!, synopsisBody: { type: "doc" } } }));
    adoptNovel({ title: "정보 수정" });
    expect(store.getState().novel).toMatchObject({
      title: "정보 수정",
      synopsisBody: { type: "doc" },
    });
    await flushSave();
    expect(await db.novels.get("n1")).toMatchObject({
      title: "정보 수정",
      synopsisBody: { type: "doc" },
    });
  });

  it("소설 필드 반영: 미저장 변경이 없으면 다시 저장하지 않음", async () => {
    adoptNovel({ title: "정보 수정" });
    await flushSave();
    expect((await db.novels.get("n1"))?.updatedAt).toBe(OLD);
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

  it("저장 실패: 공간 부족 = full, 그 외 = error, 다시 flush하면 실패분까지 저장", async () => {
    const put = vi.spyOn(db.boardItems, "bulkPut");
    put.mockRejectedValueOnce(new DOMException("가득 참", "QuotaExceededError"));
    store.setState((s) => ({ items: { ...s.items, s3: sticky("s3", "n1", 50) } }));
    await flushSave();
    expect(store.getState().save).toBe("full");
    expect(await db.boardItems.get("s3")).toBeUndefined();

    put.mockRejectedValueOnce(new Error("알 수 없음"));
    await flushSave();
    expect(store.getState().save).toBe("error");

    await flushSave();
    expect(store.getState().save).toBe("saved");
    expect(await db.boardItems.get("s3")).toBeDefined();
    put.mockRestore();
  });

  it("저장 실패 중 내보내기 반영: 미저장 소설 변경은 유지하고 백업 시각은 다음 저장에 포함", async () => {
    const put = vi.spyOn(db.novels, "put").mockRejectedValueOnce(new Error("실패"));
    store.setState((s) => ({ novel: { ...s.novel!, title: "바뀐 제목" } }));
    await flushSave();
    expect(store.getState().save).toBe("error");

    adoptExport({ ...(await db.novels.get("n1"))!, lastExportedAt: "2026-10-01T00:00:00.000Z" });
    expect(store.getState().novel).toMatchObject({
      title: "바뀐 제목",
      lastExportedAt: "2026-10-01T00:00:00.000Z",
    });
    await flushSave();
    expect(await db.novels.get("n1")).toMatchObject({
      title: "바뀐 제목",
      lastExportedAt: "2026-10-01T00:00:00.000Z",
    });
    put.mockRestore();
  });
});
