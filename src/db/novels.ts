import { db } from "./db";
import { defaultBoard, defaultCategories, defaultLines } from "./defaults";
import { buildExport, importExport } from "./novelExport";
import type { ImageAsset, Novel } from "./types";

export type NovelInfo = Pick<Novel, "title" | "genre" | "synopsis">;
export type ResizedImage = { blob: Blob; width: number; height: number };

// 삭제 후 되돌리기 가능한 시간. 이보다 오래된 삭제 소설은 서재를 열 때 물리 삭제
export const UNDO_MS = 5000;

const NOVEL_TABLES = [
  db.boardItems,
  db.boardEdges,
  db.wikiCategories,
  db.wikiDocs,
  db.storyLines,
  db.images,
];

const toAsset = (novelId: string, img: ResizedImage, now: string): ImageAsset => ({
  id: crypto.randomUUID(),
  novelId,
  updatedAt: now,
  blob: img.blob,
  mime: img.blob.type,
  width: img.width,
  height: img.height,
  bytes: img.blob.size,
});

// UC-01: 소설 + 보드 1 + 기본 분류 6 + 기본 라인 3
export async function createNovel(info: NovelInfo, cover?: ResizedImage) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const asset = cover && toAsset(id, cover, now);
  await db.transaction(
    "rw",
    [db.novels, db.boards, db.wikiCategories, db.storyLines, db.images],
    async () => {
      await db.novels.add({ ...info, id, createdAt: now, updatedAt: now, coverImageId: asset?.id });
      await db.boards.add(defaultBoard(id, now));
      await db.wikiCategories.bulkAdd(defaultCategories(id, now));
      await db.storyLines.bulkAdd(defaultLines(id, now));
      if (asset) await db.images.add(asset);
    },
  );
  return id;
}

// cover: undefined = 그대로, null = 제거, 값 = 교체. 이전 표지 이미지는 삭제
export async function updateNovelInfo(id: string, info: NovelInfo, cover?: ResizedImage | null) {
  const now = new Date().toISOString();
  return db.transaction("rw", [db.novels, db.images], async () => {
    const novel = await db.novels.get(id);
    if (!novel) throw new Error(`소설 없음: ${id}`);
    let coverImageId = novel.coverImageId;
    if (cover !== undefined) {
      if (coverImageId) await db.images.delete(coverImageId);
      const asset = cover && toAsset(id, cover, now);
      if (asset) await db.images.add(asset);
      coverImageId = asset?.id;
    }
    const next: Novel = { ...novel, ...info, coverImageId, updatedAt: now };
    await db.novels.put(next);
    return next;
  });
}

// data_model: 복제 = 가져오기와 같은 ID 재발급
export async function duplicateNovel(id: string) {
  return importExport(await buildExport(id), { titleSuffix: " (사본)" });
}

export async function deleteNovel(id: string) {
  await db.novels.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreNovel(id: string) {
  await db.novels.update(id, { deletedAt: undefined });
}

// 하위 레코드·이미지·화면 상태까지 물리 삭제 (data_model 2장)
export async function purgeNovel(id: string) {
  await db.transaction("rw", [db.novels, db.boards, db.uiState, ...NOVEL_TABLES], async () => {
    for (const table of NOVEL_TABLES) await table.where({ novelId: id }).delete();
    await db.boards.delete(id);
    await db.uiState.delete(id);
    await db.novels.delete(id);
  });
}

// 되돌리기 알림 중 앱이 닫힌 경우 대비
export async function purgeDeletedNovels(now = Date.now()) {
  const expired = await db.novels
    .filter((n) => !!n.deletedAt && now - Date.parse(n.deletedAt) > UNDO_MS)
    .primaryKeys();
  for (const id of expired) await purgeNovel(id);
}
