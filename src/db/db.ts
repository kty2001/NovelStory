import { Dexie, type EntityTable, type Table } from "dexie";
import type {
  AppMeta,
  Board,
  BoardEdge,
  BoardItem,
  ImageAsset,
  Novel,
  StoryLine,
  UiState,
  WikiCategory,
  WikiDoc,
} from "./types";

// data_model.md 6장. DB 버전과 내보내기 schemaVersion은 별개
export const db = new Dexie("whitenoard") as Dexie & {
  novels: EntityTable<Novel, "id">;
  boards: EntityTable<Board, "id">;
  boardItems: EntityTable<BoardItem, "id">;
  boardEdges: EntityTable<BoardEdge, "id">;
  wikiCategories: EntityTable<WikiCategory, "id">;
  wikiDocs: EntityTable<WikiDoc, "id">;
  storyLines: EntityTable<StoryLine, "id">;
  images: EntityTable<ImageAsset, "id">;
  uiState: EntityTable<UiState, "novelId">;
  meta: Table<AppMeta, AppMeta["key"]>; // 유니온 타입이라 EntityTable 대신 Table
};

db.version(1).stores({
  novels: "id, updatedAt",
  boards: "id",
  boardItems: "id, novelId, docId, parentFrameId",
  boardEdges: "id, novelId, source, target",
  wikiCategories: "id, novelId, parentId",
  wikiDocs: "id, novelId, [novelId+categoryId], *mentions",
  storyLines: "id, novelId",
  images: "id, novelId",
  uiState: "novelId",
  meta: "key",
});
