import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../test/fixtures";
import { db } from "./db";
import {
  createNovel,
  deleteNovel,
  duplicateNovel,
  purgeDeletedNovels,
  purgeNovel,
  restoreNovel,
  UNDO_MS,
  updateNovelInfo,
} from "./novels";

beforeEach(resetDb);

const liveNovels = () => db.novels.filter((n) => !n.deletedAt).toArray();

describe("createNovel", () => {
  it("보드·기본 분류 6·기본 라인 3 생성", async () => {
    const id = await createNovel({ title: "새 소설", genre: "판타지" });
    expect(await db.novels.get(id)).toMatchObject({ title: "새 소설", genre: "판타지" });
    expect(await db.boards.get(id)).toMatchObject({ novelId: id, timeScale: { snap: true } });

    const cats = await db.wikiCategories.where({ novelId: id }).sortBy("order");
    expect(cats.map((c) => c.name)).toEqual([
      "캐릭터",
      "사건",
      "장소",
      "세력·조직",
      "아이템",
      "세계관 설정",
    ]);
    expect(cats.filter((c) => c.system).map((c) => c.system)).toEqual(["character", "event"]);
    expect(cats[0].templateProps).toEqual(["나이", "성별", "소속", "능력"]);

    const lines = await db.storyLines.where({ novelId: id }).sortBy("order");
    expect(lines.map((l) => l.name)).toEqual(["메인", "서브", "사이드"]);
  });
});

it("정보 수정: updatedAt 갱신", async () => {
  const id = await createNovel({ title: "a" });
  const before = (await db.novels.get(id))!.updatedAt;
  await new Promise((r) => setTimeout(r, 5));
  const next = await updateNovelInfo(id, { title: "b", synopsis: "소개" });
  expect(next).toMatchObject({ title: "b", synopsis: "소개" });
  expect(next.updatedAt > before).toBe(true);
});

describe("삭제", () => {
  it("삭제 → 목록 제외 → 되돌리기 → 복귀", async () => {
    const id = await createNovel({ title: "a" });
    await deleteNovel(id);
    expect(await liveNovels()).toHaveLength(0);
    await restoreNovel(id);
    expect((await db.novels.get(id))?.deletedAt).toBeUndefined();
    expect(await liveNovels()).toHaveLength(1);
  });

  it("물리 삭제는 하위 레코드까지", async () => {
    const id = await createNovel({ title: "a" });
    await db.uiState.put({ novelId: id, viewport: { x: 0, y: 0, zoom: 1 }, lastTab: "wiki" });
    await purgeNovel(id);
    expect(await db.novels.count()).toBe(0);
    expect(await db.boards.count()).toBe(0);
    expect(await db.wikiCategories.count()).toBe(0);
    expect(await db.storyLines.count()).toBe(0);
    expect(await db.uiState.count()).toBe(0);
  });

  it("되돌리기 시간이 지난 삭제 소설만 정리", async () => {
    const old = await createNovel({ title: "old" });
    const recent = await createNovel({ title: "recent" });
    await deleteNovel(old);
    await deleteNovel(recent);
    await db.novels.update(old, { deletedAt: new Date(Date.now() - UNDO_MS - 1000).toISOString() });
    await purgeDeletedNovels();
    expect(await db.novels.get(old)).toBeUndefined();
    expect(await db.novels.get(recent)).toBeDefined();
  });
});

it("복제: 제목 뒤 (사본), 모든 ID 새로", async () => {
  const id = await createNovel({ title: "원본" });
  const copyId = await duplicateNovel(id);
  expect(copyId).not.toBe(id);
  expect((await db.novels.get(copyId))?.title).toBe("원본 (사본)");
  const orig = await db.wikiCategories.where({ novelId: id }).primaryKeys();
  const copy = await db.wikiCategories.where({ novelId: copyId }).primaryKeys();
  expect(copy).toHaveLength(6);
  expect(copy.some((c) => orig.includes(c))).toBe(false);
});
