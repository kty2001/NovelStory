import { describe, expect, it } from "vitest";
import type { Episode, EventItem, NarrativeMode, NarrativeSlot } from "../../db/types";
import { OLD } from "../../test/fixtures";
import { narratedDocIds, pathSegments, readingSteps, stepLabels, type Step } from "./readingPath";

const episode = (id: string, number: number): Episode => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  number,
});

const slot = (
  id: string,
  episodeId: string,
  order: number,
  eventDocId: string,
  mode: NarrativeMode = "linear",
): NarrativeSlot => ({ id, novelId: "n1", updatedAt: OLD, episodeId, order, eventDocId, mode });

const event = (docId: string, t: number | null): EventItem => ({
  id: `b-${docId}`,
  novelId: "n1",
  updatedAt: OLD,
  kind: "event",
  z: 0,
  place: t === null ? { mode: "undated", x: -100, y: 0 } : { mode: "timed", t, y: 0 },
  docId,
  color: "brand-peach",
});

const collect = <T extends { id: string }>(...rows: T[]) =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

const episodes = collect(episode("ep2", 2), episode("ep1", 1));
const items = collect(event("a", 1), event("b", 5), event("c", 3), event("u", null));

const steps = (slots: NarrativeSlot[], scope = "all") =>
  readingSteps(episodes, collect(...slots), items, scope);
const kinds = (list: Step[], hidden: string[] = []) =>
  pathSegments(list, new Set(hidden)).map((s) => `${s.from.slot.id}>${s.to.slot.id}:${s.kind}`);

describe("readingSteps", () => {
  it("회차 번호 → 회차 안 순서, 범위 = 회차 하나", () => {
    const list = [slot("s3", "ep2", 0, "c"), slot("s2", "ep1", 1, "b"), slot("s1", "ep1", 0, "a")];
    expect(steps(list).map((s) => s.slot.id)).toEqual(["s1", "s2", "s3"]);
    expect(steps(list, "ep2").map((s) => s.slot.id)).toEqual(["s3"]);
    expect(steps(list)[1]).toMatchObject({ index: 2, block: { id: "b-b" } });
  });
});

describe("pathSegments", () => {
  it("역행: 회상 도착 · 예고에서 복귀 = 의도, 그 외 = 역행", () => {
    const list = steps([
      slot("s1", "ep1", 0, "b"), // t5
      slot("s2", "ep1", 1, "a", "flashback"), // t1 ← 회상
      slot("s3", "ep1", 2, "c"), // t3 정방향
      slot("s4", "ep2", 0, "b", "flashforward"), // t5 예고
      slot("s5", "ep2", 1, "a"), // t1 예고에서 복귀
      slot("s6", "ep2", 2, "c"), // t3
      slot("s7", "ep2", 3, "a"), // t1 표시 없는 역행
    ]);
    expect(kinds(list)).toEqual([
      "s1>s2:intended",
      "s2>s3:forward",
      "s3>s4:forward",
      "s4>s5:intended",
      "s5>s6:forward",
      "s6>s7:reverse",
    ]);
  });

  it("미정 · 보드에 없는 사건은 판정 제외, 숨긴 블록은 건너뛰고 같은 블록 연속은 생략", () => {
    const list = steps([
      slot("s1", "ep1", 0, "b"),
      slot("s2", "ep1", 1, "u"), // 미정
      slot("s3", "ep1", 2, "none"), // 보드에 없음
      slot("s4", "ep1", 3, "b"),
      slot("s5", "ep1", 4, "c"), // 숨김
      slot("s6", "ep1", 5, "a"),
    ]);
    expect(kinds(list, ["b-c"])).toEqual(["s1>s2:forward", "s2>s4:forward", "s4>s6:reverse"]);
  });
});

it("배지 라벨 · 서술된 문서", () => {
  const list = steps([
    slot("s1", "ep1", 0, "a"),
    slot("s2", "ep2", 0, "b"),
    slot("s3", "ep2", 1, "a"),
    slot("s4", "ep2", 2, "none"),
  ]);
  expect(Object.fromEntries(stepLabels(list))).toEqual({
    "b-a": ["1화·1", "2화·2"],
    "b-b": ["2화·1"],
  });
  expect([...narratedDocIds(list)].sort()).toEqual(["a", "b", "none"]);
});
