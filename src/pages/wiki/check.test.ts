import { expect, it } from "vitest";
import type { EventItem, StateItem, WikiCategory } from "../../db/types";
import { doc, OLD } from "../../test/fixtures";
import { issueCount, settingIssues } from "./check";

const base = { novelId: "n1", updatedAt: OLD, z: 0 };
const cat = (id: string, extra: Partial<WikiCategory> = {}): WikiCategory => ({
  ...base,
  id,
  name: id,
  order: 0,
  templateProps: [],
  color: "brand-mint",
  ...extra,
});
const ev = (id: string, docId: string, undated = false): EventItem => ({
  ...base,
  id,
  kind: "event",
  docId,
  color: "brand-peach",
  place: undated ? { mode: "undated", x: -100, y: 0 } : { mode: "timed", t: 1, y: 0 },
});
const st = (id: string, t: number, stateType: StateItem["stateType"]): StateItem => ({
  ...base,
  id,
  kind: "state",
  docId: "hero",
  place: { mode: "timed", t, y: 40 },
  stateType,
  changes: [],
  note: "",
});

it("설정 점검: 보드에 없는 문서 · 퇴장 이후 · 미정 사건 · 깨진 링크 · 빈 템플릿 속성", () => {
  const categories = {
    ch: cat("ch", { system: "character", templateProps: ["나이"] }),
    evc: cat("evc", { system: "event" }),
    sub: cat("sub", { parentId: "evc" }),
    place: cat("place", { templateProps: ["지역"] }),
  };
  const docs = {
    hero: { ...doc("hero", "n1"), categoryId: "ch", props: [{ key: "나이", value: "17" }] },
    ghost: { ...doc("ghost", "n1"), categoryId: "ch" },
    war: { ...doc("war", "n1"), categoryId: "sub", mentions: ["gone", "gone2", "hero"] },
    myth: { ...doc("myth", "n1"), categoryId: "evc" },
    city: { ...doc("city", "n1"), categoryId: "place", props: [{ key: "지역", value: " " }] },
  };
  const items = {
    e1: ev("e1", "war"),
    e2: ev("e2", "myth", true),
    s1: st("s1", 1, "exit"),
    s2: st("s2", 3, "appear"),
  };
  const r = settingIssues({ categories, docs, items });
  // 하위 분류도 계열 판정, 장소(계열 없음)는 제외
  expect(r.unplaced.map((d) => d.id)).toEqual(["ghost"]);
  expect(r.afterExit.map((s) => s.id)).toEqual(["s2"]);
  expect(r.undated.map((e) => e.id)).toEqual(["e2"]);
  expect(r.broken).toEqual([{ doc: docs.war, count: 2 }]);
  expect(r.emptyProps.map((x) => [x.doc.id, x.keys])).toEqual([
    ["city", ["지역"]],
    ["ghost", ["나이"]],
  ]);
  expect(issueCount(r)).toBe(6);
});
