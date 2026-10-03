import { describe, expect, it } from "vitest";
import type { EventItem, StateItem, StoryLine, WikiCategory } from "../../db/types";
import { doc, OLD } from "../../test/fixtures";
import { filterRows, hiddenItemIds, NO_FILTERS } from "./filters";
import { NO_LINE } from "./lines";

const base = { novelId: "n1", updatedAt: OLD, z: 0 };
const event = (id: string, docId: string): EventItem => ({
  ...base,
  id,
  kind: "event",
  place: { mode: "timed", t: 1, y: -80 },
  docId,
  color: "brand-peach",
});
const state = (id: string, docId: string): StateItem => ({
  ...base,
  id,
  kind: "state",
  place: { mode: "timed", t: 1, y: 40 },
  docId,
  stateType: "appear",
  changes: [],
  note: "",
});
const category = (id: string, name: string, order: number, parentId?: string): WikiCategory => ({
  ...base,
  id,
  name,
  order,
  parentId,
  templateProps: [],
  color: `c-${id}`,
});

const categories = {
  ev: category("ev", "사건", 0),
  past: category("past", "과거사", 0, "ev"),
  ch: category("ch", "캐릭터", 1),
};
const lines: Record<string, StoryLine> = {
  main: { ...base, id: "main", name: "메인", order: 0, color: "muted" },
};
const docs = {
  war: { ...doc("war", "n1"), categoryId: "ev", lineId: "main", tags: ["전투", "정치"] },
  myth: { ...doc("myth", "n1"), categoryId: "past", tags: ["복선"] },
  kael: { ...doc("kael", "n1"), title: "카엘", categoryId: "ch" },
  ria: { ...doc("ria", "n1"), title: "리아", categoryId: "ch" },
};
const items = {
  e1: event("e1", "war"),
  e2: event("e2", "myth"),
  s1: state("s1", "kael"),
  s2: state("s2", "ria"),
  s3: state("s3", "kael"),
};
const hide = (patch: Partial<typeof NO_FILTERS>) =>
  [...hiddenItemIds(items, docs, { ...NO_FILTERS, ...patch })].sort();

describe("보드 필터 숨김", () => {
  it("필터 없음 = 숨김 없음", () => {
    expect(hide({})).toEqual([]);
  });

  it("라인: 사건 문서 lineId, 미지정 = NO_LINE", () => {
    expect(hide({ hiddenLineIds: ["main"] })).toEqual(["e1"]);
    expect(hide({ hiddenLineIds: [NO_LINE] })).toEqual(["e2"]);
  });

  it("캐릭터: 그 캐릭터의 상태 블록만", () => {
    expect(hide({ hiddenDocIds: ["kael"] })).toEqual(["s1", "s3"]);
  });

  it("태그: 사건 태그 중 하나라도 숨김이면 숨김", () => {
    expect(hide({ hiddenTags: ["정치"] })).toEqual(["e1"]);
    expect(hide({ hiddenTags: ["없는 태그"] })).toEqual([]);
  });

  it("분류: 문서 분류만 (상위 숨김이 하위를 포함하지 않음), 상태 블록도 해당", () => {
    expect(hide({ hiddenCategoryIds: ["ev"] })).toEqual(["e1"]);
    expect(hide({ hiddenCategoryIds: ["past"] })).toEqual(["e2"]);
    expect(hide({ hiddenCategoryIds: ["ch"] })).toEqual(["s1", "s2", "s3"]);
  });

  it("여러 그룹은 하나라도 해당하면 숨김", () => {
    expect(hide({ hiddenTags: ["복선"], hiddenDocIds: ["ria"] })).toEqual(["e2", "s2"]);
  });
});

describe("필터 메뉴 행", () => {
  const rows = filterRows(items, docs, categories, lines);

  it("라인 순서 + 미지정, 사건 수", () => {
    expect(rows.lineRows.map((r) => [r.key, r.count])).toEqual([
      ["main", 1],
      [NO_LINE, 1],
    ]);
  });

  it("캐릭터: 상태 블록이 있는 문서, 제목 가나다순 + 블록 수 + 분류 색", () => {
    expect(rows.charRows.map((r) => [r.name, r.count, r.color])).toEqual([
      ["리아", 1, "c-ch"],
      ["카엘", 2, "c-ch"],
    ]);
  });

  it("태그: 가나다순", () => {
    expect(rows.tagRows.map((r) => r.name)).toEqual(["#복선", "#전투", "#정치"]);
  });

  it("분류: 트리 순서, 상위 › 하위 이름", () => {
    expect(rows.catRows.map((r) => [r.name, r.count])).toEqual([
      ["사건", 1],
      ["사건 › 과거사", 1],
      ["캐릭터", 3],
    ]);
  });
});
