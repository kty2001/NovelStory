import { create } from "zustand";
import { shallow } from "zustand/shallow";
import { temporal } from "zundo";
import type { EntityTable } from "dexie";
import { db } from "../db/db";
import type {
  BaseRecord,
  Board,
  BoardEdge,
  BoardItem,
  Novel,
  NovelScoped,
  StoryLine,
  WikiCategory,
  WikiDoc,
} from "../db/types";
import { createAutosave } from "./autosave";

export type Collection<T> = Record<string, T>;

// 열려 있는 소설 1개의 데이터. 살아 있는 레코드만 보관, 변경은 항상 새 객체로 교체 (자동 저장이 참조 비교)
export type NovelData = {
  novel: Novel;
  board: Board;
  items: Collection<BoardItem>;
  edges: Collection<BoardEdge>;
  categories: Collection<WikiCategory>;
  docs: Collection<WikiDoc>;
  lines: Collection<StoryLine>;
};

export type NovelState = Omit<NovelData, "novel" | "board"> & {
  novel: Novel | null;
  board: Board | null;
  novelId: string | null;
  status: "idle" | "loading" | "ready" | "missing";
  save: "saved" | "saving" | "error";
  batching: boolean;
};

// 실행 취소 대상: 보드 데이터만 (UC-20 보드 단위 기록, 사전 본문은 Tiptap 자체 기록)
type HistoryState = Pick<NovelState, "board" | "items" | "edges">;
const pickHistory = ({ board, items, edges }: NovelState): HistoryState => ({
  board,
  items,
  edges,
});
const HISTORY_LIMIT = 100;

const initialState: NovelState = {
  novel: null,
  board: null,
  items: {},
  edges: {},
  categories: {},
  docs: {},
  lines: {},
  novelId: null,
  status: "idle",
  save: "saved",
  batching: false,
};

// partialize가 최상위 키만 고르므로 zundo undo()는 나머지 키(저장 상태·사전·F1 화면 상태)를 건드리지 않음
export const useNovelStore = create<NovelState>()(
  temporal(() => initialState, {
    partialize: pickHistory,
    equality: shallow,
    limit: HISTORY_LIMIT,
  }),
);

export type NovelStore = typeof useNovelStore;

const autosave = createAutosave(useNovelStore);
export const flushSave = autosave.flush;
// 내보내기(lastExportedAt)·소설 정보 수정처럼 DB에 직접 쓴 소설 레코드를 반영
export const adoptNovel = autosave.adoptNovel;

const toCollection = <T extends BaseRecord>(rows: T[]): Collection<T> =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

async function readNovel(novelId: string): Promise<NovelData | null> {
  const tables = [
    db.novels,
    db.boards,
    db.boardItems,
    db.boardEdges,
    db.wikiCategories,
    db.wikiDocs,
    db.storyLines,
  ];
  return db.transaction("r", tables, async () => {
    const novel = await db.novels.get(novelId);
    const board = await db.boards.get(novelId);
    if (!novel || novel.deletedAt || !board) return null;
    const live = <T extends NovelScoped>(table: EntityTable<T, "id">) =>
      table
        .where("novelId")
        .equals(novelId)
        .filter((r) => !r.deletedAt)
        .toArray()
        .then(toCollection);
    return {
      novel,
      board,
      items: await live(db.boardItems),
      edges: await live(db.boardEdges),
      categories: await live(db.wikiCategories),
      docs: await live(db.wikiDocs),
      lines: await live(db.storyLines),
    };
  });
}

let loadSeq = 0;

export async function loadNovel(novelId: string) {
  const seq = ++loadSeq;
  void autosave.flush();
  autosave.reset(null);
  useNovelStore.setState({ ...initialState, novelId, status: "loading" });
  const data = await readNovel(novelId);
  if (seq !== loadSeq) return; // 늦게 끝난 이전 로드는 무시
  useNovelStore.setState(data ? { ...data, status: "ready" } : { status: "missing" });
  useNovelStore.temporal.getState().clear();
  if (data) autosave.reset(data);
}

// 미저장분은 즉시 저장 시작, 스토어는 바로 비움 (새 로드와 겹쳐도 안전)
export function unloadNovel() {
  loadSeq++;
  const saving = autosave.flush();
  autosave.reset(null);
  endBatch();
  useNovelStore.setState(initialState);
  useNovelStore.temporal.getState().clear();
  return saving;
}

// 묶음 기록: 드래그 1회·방향키 연속 이동 = 실행 취소 1건. 묶음 중에는 자동 저장도 대기
let batchStart: HistoryState | null = null;

export function beginBatch() {
  if (batchStart) return;
  batchStart = pickHistory(useNovelStore.getState());
  useNovelStore.temporal.getState().pause();
  useNovelStore.setState({ batching: true });
}

export function endBatch() {
  if (!batchStart) return;
  const start = batchStart;
  batchStart = null;
  useNovelStore.setState({ batching: false });
  const t = useNovelStore.temporal;
  t.getState().resume();
  if (shallow(start, pickHistory(useNovelStore.getState()))) return;
  t.setState(({ pastStates }) => ({
    pastStates: [...pastStates, start].slice(-HISTORY_LIMIT),
    futureStates: [],
  }));
}

export const undo = () => useNovelStore.temporal.getState().undo();
export const redo = () => useNovelStore.temporal.getState().redo();
