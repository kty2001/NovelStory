import { describe, expect, it } from "vitest";
import type { BoardEdge, EventItem, FrameItem, StateItem } from "../../db/types";
import { board, doc, OLD, sticky } from "../../test/fixtures";
import { copyClip, pasteRecords } from "./clipboard";

const scale = board("n1").timeScale; // pxPerTick 120

const frame: FrameItem = {
  id: "f",
  novelId: "n1",
  updatedAt: OLD,
  kind: "frame",
  z: 0,
  place: { mode: "free", x: 0, y: -300 },
  w: 400,
  h: 200,
  title: "1부",
};
const event: EventItem = {
  id: "e",
  novelId: "n1",
  updatedAt: OLD,
  kind: "event",
  z: 2,
  place: { mode: "timed", t: 1, y: -200 },
  docId: "de",
  color: "brand-peach",
  parentFrameId: "f",
};
const state: StateItem = {
  id: "s",
  novelId: "n1",
  updatedAt: OLD,
  kind: "state",
  z: 3,
  place: { mode: "timed", t: 1, y: 60 },
  docId: "kael",
  stateType: "appear",
  changes: [],
  note: "",
  linkedEventItemId: "e",
};
const edge = (id: string, source: string, target: string): BoardEdge => ({
  id,
  novelId: "n1",
  updatedAt: OLD,
  source,
  target,
  dashed: false,
});
const items = { f: frame, e: event, s: state, x: sticky("x", "n1", 900) };
const edges = { ab: edge("ab", "e", "s"), out: edge("out", "e", "x") };
const docs = { de: { ...doc("de", "n1"), title: "습격", tags: ["복선"], lineId: "main" } };

let seq = 0;
const ctx = { novelId: "n1", scale, snap: true, zStart: 10, now: "NOW", newId: () => `n${seq++}` };

describe("복사", () => {
  it("선택한 프레임의 자식 · 양 끝이 포함된 연결선 · 사건 문서를 함께 담음", () => {
    const clip = copyClip(["f", "s"], items, edges, docs, { x: 0, y: 0 })!;
    expect(clip.items.map((i) => i.id).sort()).toEqual(["e", "f", "s"]);
    expect(clip.edges.map((e) => e.id)).toEqual(["ab"]);
    expect(clip.docs.map((d) => d.id)).toEqual(["de"]);
  });

  it("아무것도 없으면 null", () => {
    expect(copyClip(["nope"], items, edges, docs, { x: 0, y: 0 })).toBeNull();
  });
});

describe("붙여넣기", () => {
  it("새 ID · 이동(시간 블록은 눈금 재계산) · 소속 · 관련 사건 · 연결선 재연결 · 문서 복제", () => {
    seq = 0;
    const clip = copyClip(["f", "s"], items, edges, docs, { x: 0, y: 0 })!;
    const r = pasteRecords(clip, 240, 24, ctx);
    const byOld = (old: string) =>
      r.items[[...clip.items].sort((a, b) => a.z - b.z).findIndex((i) => i.id === old)];
    const f2 = byOld("f") as FrameItem;
    const e2 = byOld("e") as EventItem;
    const s2 = byOld("s") as StateItem;

    expect(f2.place).toEqual({ mode: "free", x: 240, y: -276 });
    expect(e2.place).toEqual({ mode: "timed", t: 3, y: -176 });
    expect(e2.parentFrameId).toBe(f2.id);
    expect(s2.linkedEventItemId).toBe(e2.id);
    expect(s2.docId).toBe("kael"); // 캐릭터 문서는 공유
    expect(r.items.map((i) => i.z)).toEqual([10, 11, 12]);

    expect(r.docs).toHaveLength(1);
    expect(r.docs[0]).toMatchObject({ title: "습격", tags: ["복선"], lineId: "main" });
    expect(e2.docId).toBe(r.docs[0].id);
    expect(r.edges).toEqual([expect.objectContaining({ source: e2.id, target: s2.id })]);
  });

  it("복사에 없는 프레임 소속은 해제", () => {
    const clip = copyClip(["e"], items, edges, docs, { x: 0, y: 0 })!;
    const r = pasteRecords(clip, 24, 24, ctx);
    expect(r.items[0].parentFrameId).toBeUndefined();
  });
});
