import { describe, expect, it } from "vitest";
import type { EventItem, FrameItem, StoryLine } from "../../db/types";
import { doc, OLD } from "../../test/fixtures";
import { storyFlow } from "./storyFlow";

const base = { novelId: "n1", updatedAt: OLD, z: 0 };
const ev = (id: string, t: number | null, parentFrameId?: string): EventItem => ({
  ...base,
  id,
  kind: "event",
  docId: id,
  color: "brand-peach",
  parentFrameId,
  place: t === null ? { mode: "undated", x: 0, y: 0 } : { mode: "timed", t, y: 0 },
});
const frame = (id: string, x: number): FrameItem => ({
  ...base,
  id,
  kind: "frame",
  place: { mode: "free", x, y: 0 },
  w: 100,
  h: 100,
  title: id,
});
const line = (id: string, order: number): StoryLine => ({
  ...base,
  id,
  name: id,
  order,
  color: "muted",
});

describe("개요 스토리 흐름", () => {
  const lines = { main: line("main", 0), sub: line("sub", 1) };
  const docs = {
    a: { ...doc("a", "n1"), lineId: "sub" },
    b: { ...doc("b", "n1"), lineId: "main" },
    c: { ...doc("c", "n1"), lineId: "main" },
    d: doc("d", "n1"),
    e: { ...doc("e", "n1"), lineId: "gone" },
  };

  it("프레임 가로 순 → 라인 순서(미지정 마지막) → 시점순(미정 끝), 프레임 밖은 마지막", () => {
    const items = {
      p2: frame("p2", 900),
      p1: frame("p1", 0),
      empty: frame("empty", 500),
      a: ev("a", 3, "p1"),
      b: ev("b", null, "p1"),
      c: ev("c", 1, "p1"),
      d: ev("d", 5, "p2"),
      e: ev("e", 7),
    };
    const flow = storyFlow(items, docs, lines).map((s) => ({
      frame: s.frame?.id ?? null,
      lines: s.lines.map((l) => [l.line?.id ?? null, l.events.map((e) => e.id)]),
    }));
    expect(flow).toEqual([
      {
        frame: "p1",
        lines: [
          ["main", ["c", "b"]],
          ["sub", ["a"]],
        ],
      },
      { frame: "p2", lines: [[null, ["d"]]] },
      // 없는 라인을 가리키면 미지정
      { frame: null, lines: [[null, ["e"]]] },
    ]);
  });

  it("사건이 없으면 빈 목록", () => {
    expect(storyFlow({ p1: frame("p1", 0) }, docs, lines)).toEqual([]);
  });
});
