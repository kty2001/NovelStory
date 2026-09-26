import { db } from "./db";
import {
  EXPORT_FORMAT,
  ExportFormatError,
  SCHEMA_VERSION,
  upgradeExport,
  type NovelExport,
} from "./exportFormat";
import type { BaseRecord, BoardItem, ImageAsset, WikiDoc } from "./types";
import { deriveDoc, remapMentions } from "./wikiDerived";

const live = <T extends BaseRecord>(rows: T[]) => rows.filter((r) => !r.deletedAt);

async function blobToDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

// data_model 7장: 삭제 기록·파생 필드 제외, 이미지는 data URL
export async function buildExport(novelId: string): Promise<NovelExport> {
  const data = await db.transaction(
    "r",
    [
      db.novels,
      db.boards,
      db.boardItems,
      db.boardEdges,
      db.wikiCategories,
      db.wikiDocs,
      db.storyLines,
      db.images,
    ],
    async () => {
      const novel = await db.novels.get(novelId);
      const board = await db.boards.get(novelId);
      if (!novel || !board) throw new Error(`소설 없음: ${novelId}`);
      const byNovel = { novelId };
      return {
        novel,
        board,
        boardItems: live(await db.boardItems.where(byNovel).toArray()),
        boardEdges: live(await db.boardEdges.where(byNovel).toArray()),
        wikiCategories: live(await db.wikiCategories.where(byNovel).toArray()),
        wikiDocs: live(await db.wikiDocs.where(byNovel).toArray()),
        storyLines: live(await db.storyLines.where(byNovel).toArray()),
        images: await db.images.where(byNovel).toArray(),
      };
    },
  );
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
    wikiDocs: data.wikiDocs.map(({ mentions, plainText, ...doc }) => doc),
    images: await Promise.all(
      data.images.map(async ({ blob, ...img }) => ({ ...img, dataUrl: await blobToDataUrl(blob) })),
    ),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function exportFileName(title: string, now = new Date()) {
  const safe = title.replace(/[\\/:*?"<>|]/g, "_").trim() || "소설";
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `${safe}_${ymd}.whitenoard.json`;
}

// UC-04: 파일 다운로드 + 마지막 백업 시각 기록 (updatedAt은 그대로 → 백업 알림 초기화)
export async function exportNovel(novelId: string) {
  const data = await buildExport(novelId);
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(data.novel.title);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  const lastExportedAt = new Date().toISOString();
  await db.novels.update(novelId, { lastExportedAt });
  return { ...data.novel, lastExportedAt };
}

// UC-05: 항상 새 소설로 추가. 모든 ID 재발급 + 참조 치환, 파생 필드 재계산, 1개 트랜잭션
export async function importExport(raw: unknown, opts: { titleSuffix?: string } = {}) {
  const data = upgradeExport(raw);
  if (
    !data.novel ||
    !data.board ||
    ![
      data.boardItems,
      data.boardEdges,
      data.wikiCategories,
      data.wikiDocs,
      data.storyLines,
      data.images,
    ].every(Array.isArray)
  ) {
    throw new ExportFormatError("format", "필수 항목 누락");
  }

  const ids = new Map<string, string>();
  const fresh = (old: string) => {
    const id = crypto.randomUUID();
    ids.set(old, id);
    return id;
  };
  const novelId = fresh(data.novel.id);
  for (const list of [
    data.boardItems,
    data.boardEdges,
    data.wikiCategories,
    data.wikiDocs,
    data.storyLines,
    data.images,
  ]) {
    for (const r of list) fresh(r.id);
  }
  // 참조 대상이 파일에 없으면(삭제된 문서 링크 등) 그대로 둠
  const map = (id: string) => ids.get(id) ?? id;
  const opt = (id: string | undefined) => (id === undefined ? undefined : map(id));
  const now = new Date().toISOString();
  const base = <T extends BaseRecord>(r: T) => ({ ...r, id: map(r.id), novelId, updatedAt: now });

  const images: ImageAsset[] = await Promise.all(
    data.images.map(async ({ dataUrl, ...img }) => ({
      ...base(img),
      blob: await (await fetch(dataUrl)).blob(),
    })),
  );
  const { lastExportedAt, ...novelRest } = data.novel;
  const novel = {
    ...novelRest,
    id: novelId,
    title: data.novel.title + (opts.titleSuffix ?? ""),
    coverImageId: opt(data.novel.coverImageId),
    createdAt: now,
    updatedAt: now,
  };
  const board = {
    ...data.board,
    id: novelId,
    novelId,
    updatedAt: now,
    stateLanes: { ...data.board.stateLanes, order: data.board.stateLanes.order.map(map) },
  };
  const boardItems = data.boardItems.map((item) => {
    const next = { ...base(item), parentFrameId: opt(item.parentFrameId) } as BoardItem;
    if (next.kind === "event" || next.kind === "state") next.docId = map(next.docId);
    if (next.kind === "state") next.linkedEventItemId = opt(next.linkedEventItemId);
    return next;
  });
  const boardEdges = data.boardEdges.map((e) => ({
    ...base(e),
    source: map(e.source),
    target: map(e.target),
  }));
  const wikiCategories = data.wikiCategories.map((c) => ({
    ...base(c),
    parentId: opt(c.parentId),
  }));
  const storyLines = data.storyLines.map(base);
  const wikiDocs: WikiDoc[] = data.wikiDocs.map((d) => {
    const body = remapMentions(d.body, map);
    return {
      ...base(d),
      categoryId: map(d.categoryId),
      lineId: opt(d.lineId),
      imageId: opt(d.imageId),
      body,
      ...deriveDoc(body),
    };
  });

  await db.transaction(
    "rw",
    [
      db.novels,
      db.boards,
      db.boardItems,
      db.boardEdges,
      db.wikiCategories,
      db.wikiDocs,
      db.storyLines,
      db.images,
    ],
    async () => {
      await db.novels.add(novel);
      await db.boards.add(board);
      await db.boardItems.bulkAdd(boardItems);
      await db.boardEdges.bulkAdd(boardEdges);
      await db.wikiCategories.bulkAdd(wikiCategories);
      await db.wikiDocs.bulkAdd(wikiDocs);
      await db.storyLines.bulkAdd(storyLines);
      await db.images.bulkAdd(images);
    },
  );
  return novelId;
}

export async function importFile(file: Blob) {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new ExportFormatError("format", "JSON 파일이 아님");
  }
  return importExport(raw);
}
