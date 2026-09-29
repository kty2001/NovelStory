import { describe, expect, it } from "vitest";
import type { EventItem, StateItem, WikiDoc } from "../../db/types";
import { doc, OLD } from "../../test/fixtures";
import {
  characterEvents,
  placeText,
  relatedCharacters,
  stateHistory,
  stateText,
} from "./boardLinks";

const base = { novelId: "n1", updatedAt: OLD, z: 0 };
const ev = (id: string, docId: string, t: number | null, tEnd?: number): EventItem => ({
  ...base,
  id,
  kind: "event",
  docId,
  color: "brand-peach",
  place: t === null ? { mode: "undated", x: 0, y: 0 } : { mode: "timed", t, tEnd, y: 0 },
});
const st = (
  id: string,
  docId: string,
  t: number | null,
  extra: Partial<StateItem> = {},
): StateItem => ({
  ...base,
  id,
  kind: "state",
  docId,
  stateType: "change",
  changes: [],
  note: "",
  place: t === null ? { mode: "undated", x: 0, y: 0 } : { mode: "timed", t, y: 0 },
  ...extra,
});

const items = {
  e1: ev("e1", "war", 5),
  e2: ev("e2", "flight", 2),
  s1: st("s1", "kael", 5, { linkedEventItemId: "e1" }),
  s2: st("s2", "lea", 5, { linkedEventItemId: "e1" }),
  s3: st("s3", "kael", 2, { linkedEventItemId: "e2", stateType: "appear" }),
  s4: st("s4", "kael", null, { changes: [{ key: "소속", from: "기사단", to: "반란군" }] }),
};
const docs: Record<string, WikiDoc> = {
  kael: { ...doc("kael", "n1"), title: "카엘" },
  lea: { ...doc("lea", "n1"), title: "레아" },
};

describe("보드 연동 계산", () => {
  it("사건의 관련 캐릭터 = 연결된 상태 블록의 캐릭터", () => {
    expect(relatedCharacters(items, docs, "war").map((d) => d.title)).toEqual(["카엘", "레아"]);
    expect(relatedCharacters(items, docs, "none")).toEqual([]);
  });

  it("캐릭터의 등장 사건 · 상태 이력은 시점순, 미정은 뒤", () => {
    expect(characterEvents(items, "kael").map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(stateHistory(items, "kael").map((s) => s.id)).toEqual(["s3", "s1", "s4"]);
  });

  it("시점 · 상태 문구", () => {
    const scale = { tickLabels: { "2": "봄" } };
    expect(placeText(ev("x", "d", 2, 4).place, scale)).toBe("봄 ~ 4");
    expect(placeText(ev("x", "d", 3).place, scale)).toBe("3");
    expect(placeText(ev("x", "d", null).place, scale)).toBe("미정");
    expect(placeText(undefined, scale)).toBeNull();
    expect(stateText(items.s4)).toBe("◆ 소속: 기사단 → 반란군");
    expect(stateText(items.s3)).toBe("▲ 등장");
  });
});
