import { describe, expect, it } from "vitest";
import type { EventItem, NarrativeSlot, WikiCategory } from "../../db/types";
import { doc, OLD } from "../../test/fixtures";
import { docEpisodes, eventDocsInOrder, renumbered, slotCounts } from "./narrative";

const cat = (id: string, extra: Partial<WikiCategory> = {}): WikiCategory => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  name: id,
  order: 0,
  templateProps: [],
  color: "muted",
  ...extra,
});

const event = (id: string, docId: string, place: EventItem["place"]): EventItem => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  kind: "event",
  z: 0,
  place,
  docId,
  color: "brand-peach",
});

const slot = (id: string, episodeId: string, eventDocId: string, order = 0): NarrativeSlot => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  episodeId,
  order,
  eventDocId,
  mode: "linear",
});

describe("eventDocsInOrder", () => {
  it("보드 시점순 → 미정 → 보드에 없는 사건 문서(제목순), 다른 계열 제외", () => {
    const categories = { ev: cat("ev", { system: "event" }), sub: cat("sub", { parentId: "ev" }) };
    const docs = {
      late: { ...doc("late", "n1"), categoryId: "ev" },
      early: { ...doc("early", "n1"), categoryId: "sub" },
      undated: { ...doc("undated", "n1"), categoryId: "ev" },
      나중: { ...doc("나중", "n1"), categoryId: "ev" },
      가나: { ...doc("가나", "n1"), categoryId: "ev" },
      hero: { ...doc("hero", "n1"), categoryId: "other" },
    };
    const items = {
      e1: event("e1", "late", { mode: "timed", t: 5, y: 0 }),
      e2: event("e2", "early", { mode: "timed", t: 1, y: 0 }),
      e3: event("e3", "undated", { mode: "undated", x: -100, y: 0 }),
    };
    expect(eventDocsInOrder(items, docs, categories).map((e) => e.doc.id)).toEqual([
      "early",
      "late",
      "undated",
      "가나",
      "나중",
    ]);
  });
});

describe("배치 집계", () => {
  const slots = {
    s1: slot("s1", "ep2", "a", 1),
    s2: slot("s2", "ep1", "a"),
    s3: slot("s3", "ep2", "b"),
    s4: slot("s4", "gone", "a"),
  };
  const episodes = {
    ep1: { id: "ep1", novelId: "n1", updatedAt: OLD, number: 1 },
    ep2: { id: "ep2", novelId: "n1", updatedAt: OLD, number: 2 },
  };

  it("문서별 배치 수", () => {
    expect(slotCounts(slots)).toEqual({ a: 3, b: 1 });
  });

  it("사건 문서의 배치 회차: 회차 번호순, 없는 회차 제외", () => {
    expect(docEpisodes(slots, episodes, "a").map((r) => r.slot.id)).toEqual(["s2", "s1"]);
  });
});

it("renumbered: 바뀐 레코드만 새 객체", () => {
  const a = slot("a", "e", "x", 0);
  const b = slot("b", "e", "y", 5);
  const next = renumbered({ a, b }, [a, b], "order", 0);
  expect(next.a).toBe(a);
  expect(next.b).toEqual({ ...b, order: 1 });
});
