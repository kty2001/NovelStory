import { db } from "../db/db";
import type { Board, Novel, StickyItem, WikiDoc } from "../db/types";

export const OLD = "2026-01-01T00:00:00.000Z";

export async function resetDb() {
  await db.delete();
  await db.open();
}

export const novel = (id: string): Novel => ({
  id,
  title: `소설 ${id}`,
  createdAt: OLD,
  updatedAt: OLD,
});

export const board = (novelId: string): Board => ({
  id: novelId,
  novelId,
  updatedAt: OLD,
  timeScale: { pxPerTick: 120, collapsedPx: 40, tickLabels: {}, collapsed: [], snap: true },
  stateLanes: { enabled: false, order: [] },
});

export const sticky = (id: string, novelId: string, x = 0): StickyItem => ({
  id,
  novelId,
  updatedAt: OLD,
  kind: "sticky",
  z: 0,
  place: { mode: "free", x, y: 0 },
  w: 160,
  h: 160,
  text: id,
  color: "sticky-yellow",
});

export const doc = (id: string, novelId: string): WikiDoc => ({
  id,
  novelId,
  updatedAt: OLD,
  categoryId: "c1",
  title: id,
  aliases: [],
  tags: [],
  props: [],
  body: null,
  createdAt: OLD,
  mentions: [],
  plainText: "",
});

// 소설 n1: 포스트잇 s1·s2(삭제됨), 문서 d1
export async function seedNovel(id = "n1") {
  await db.novels.put(novel(id));
  await db.boards.put(board(id));
  await db.boardItems.bulkPut([sticky("s1", id), { ...sticky("s2", id), deletedAt: OLD }]);
  await db.wikiDocs.put(doc("d1", id));
}
