import type { Table } from "dexie";
import { db } from "../db/db";
import type { BaseRecord, Novel } from "../db/types";
import type { NovelData, NovelState, NovelStore } from "./novelStore";

const DELAY_MS = 500;

const COLLECTIONS = {
  items: db.boardItems,
  edges: db.boardEdges,
  categories: db.wikiCategories,
  docs: db.wikiDocs,
  lines: db.storyLines,
} as const;
type CollectionKey = keyof typeof COLLECTIONS;
const KEYS = Object.keys(COLLECTIONS) as CollectionKey[];

type Snapshot = Pick<NovelData, "novel" | "board" | CollectionKey>;

const snapshotOf = (s: NovelState | NovelData): Snapshot => ({
  novel: s.novel!,
  board: s.board!,
  items: s.items,
  edges: s.edges,
  categories: s.categories,
  docs: s.docs,
  lines: s.lines,
});

const isDirty = (base: Snapshot, s: NovelState) =>
  base.novel !== s.novel || base.board !== s.board || KEYS.some((k) => base[k] !== s[k]);

// 마지막 저장 기준과 참조 비교로 바뀐 레코드만 저장. 사라진 레코드는 소프트 삭제
export function createAutosave(store: NovelStore) {
  let base: Snapshot | null = null;
  let session = 0; // reset마다 증가 → 이전 소설의 늦은 저장 결과가 현재 상태를 건드리지 않게
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();

  function flush(): Promise<void> {
    clearTimeout(timer);
    const s = store.getState();
    if (!base || !isDirty(base, s)) return queue;
    const prev = base;
    const next = snapshotOf(s);
    const mySession = session;
    base = next;
    if (s.save !== "saving") store.setState({ save: "saving" });

    queue = queue.then(async () => {
      try {
        await write(prev, next);
        if (mySession === session && base === next) store.setState({ save: "saved" });
      } catch (err) {
        console.error("자동 저장 실패", err);
        if (mySession !== session) return;
        // 실패분이 다음 저장에 다시 포함되도록 기준을 되돌림 (저장은 멱등)
        base = prev;
        store.setState({ save: "error" });
      }
    });
    return queue;
  }

  function reset(data: NovelData | null) {
    clearTimeout(timer);
    session++;
    base = data && snapshotOf(data);
  }

  // DB에 이미 기록된 소설 레코드를 스토어에 반영 (저장·updatedAt 갱신 없음)
  function adoptNovel(novel: Novel) {
    if (base) base = { ...base, novel };
    store.setState({ novel });
  }

  store.subscribe((s) => {
    if (!base || s.batching || !isDirty(base, s)) return;
    clearTimeout(timer);
    timer = setTimeout(flush, DELAY_MS);
  });

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => void flush());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });
  }

  return { flush, reset, adoptNovel };
}

async function write(prev: Snapshot, next: Snapshot) {
  const now = new Date().toISOString();
  const tables = [db.novels, db.boards, ...Object.values(COLLECTIONS)];
  await db.transaction("rw", tables, async () => {
    for (const key of KEYS) {
      const before = prev[key] as Record<string, BaseRecord>;
      const after = next[key] as Record<string, BaseRecord>;
      if (before === after) continue;
      const table = COLLECTIONS[key] as unknown as Table<BaseRecord, string>;
      // 실행 취소로 되살아난 레코드도 put으로 deletedAt 없이 덮어씀
      const puts = Object.values(after)
        .filter((r) => before[r.id] !== r)
        .map((r) => ({ ...r, updatedAt: now }));
      if (puts.length) await table.bulkPut(puts);
      for (const id of Object.keys(before)) {
        if (!(id in after)) await table.update(id, { deletedAt: now, updatedAt: now });
      }
    }
    if (prev.board !== next.board) await db.boards.put({ ...next.board, updatedAt: now });
    // 하위 레코드만 바뀌어도 Novel.updatedAt 갱신 (서재 최근 수정순)
    if (prev.novel !== next.novel) await db.novels.put({ ...next.novel, updatedAt: now });
    else await db.novels.update(next.novel.id, { updatedAt: now });
  });
}
