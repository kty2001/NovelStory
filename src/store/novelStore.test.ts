import { beforeEach, describe, expect, it } from "vitest";
import { doc, resetDb, seedNovel, sticky } from "../test/fixtures";
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

  it("기록 상한 100건", () => {
    for (let x = 1; x <= 120; x++) moveS1(x);
    beginBatch();
    moveS1(999);
    endBatch();
    expect(history().pastStates).toHaveLength(100);
  });
});
