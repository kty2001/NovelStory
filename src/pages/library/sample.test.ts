import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { db } from "../../db/db";
import { importExport } from "../../db/novelExport";
import { resetDb } from "../../test/fixtures";
import { SAMPLE } from "./sample";

const raw = JSON.parse(readFileSync("public/samples/sample.whitenoard.json", "utf-8"));

beforeEach(resetDb);

// onboarding 4장: 샘플은 가져오기 경로 그대로. 변환 경로 회귀 + 구성 확인
it("샘플 가져오기: 참조 무결성 + 구성", async () => {
  const id = await importExport(raw);
  const novel = await db.novels.get(id);
  const board = (await db.boards.get(id))!;
  const items = await db.boardItems.where({ novelId: id }).toArray();
  const edges = await db.boardEdges.where({ novelId: id }).toArray();
  const docs = await db.wikiDocs.where({ novelId: id }).toArray();
  const cats = await db.wikiCategories.where({ novelId: id }).toArray();
  const lines = await db.storyLines.where({ novelId: id }).toArray();

  // 카드 문구와 일치
  expect(novel).toMatchObject({ title: SAMPLE.title, genre: SAMPLE.genre });
  const events = items.filter((i) => i.kind === "event");
  expect(events).toHaveLength(SAMPLE.events);
  expect(docs).toHaveLength(SAMPLE.docs);

  // 모든 참조가 가져온 레코드를 가리킴
  const itemIds = new Set(items.map((i) => i.id));
  const docIds = new Set(docs.map((d) => d.id));
  const catIds = new Set(cats.map((c) => c.id));
  const lineIds = new Set(lines.map((l) => l.id));
  for (const i of items) {
    if (i.parentFrameId) expect(items.find((f) => f.id === i.parentFrameId)?.kind).toBe("frame");
    if (i.kind === "event" || i.kind === "state") expect(docIds.has(i.docId)).toBe(true);
    if (i.kind === "state" && i.linkedEventItemId) {
      expect(items.find((e) => e.id === i.linkedEventItemId)?.kind).toBe("event");
    }
  }
  for (const e of edges) expect(itemIds.has(e.source) && itemIds.has(e.target)).toBe(true);
  for (const d of docs) {
    expect(catIds.has(d.categoryId)).toBe(true);
    if (d.lineId) expect(lineIds.has(d.lineId)).toBe(true);
    for (const m of d.mentions) expect(docIds.has(m)).toBe(true);
  }
  for (const c of board.stateLanes.order) expect(docIds.has(c)).toBe(true);

  // 보드 구성
  expect(Object.keys(board.timeScale.tickLabels).length).toBeGreaterThan(1);
  expect(board.timeScale.collapsed).toHaveLength(1);
  expect(events.some((e) => e.place.mode === "undated")).toBe(true);
  expect(events.some((e) => e.place.mode === "timed" && e.place.tEnd !== undefined)).toBe(true);
  const eventDocs = events.map((e) => docs.find((d) => d.id === e.docId)!);
  for (const line of lines) expect(eventDocs.some((d) => d.lineId === line.id)).toBe(true);
  expect(eventDocs.some((d) => !d.lineId)).toBe(true);
  const states = items.filter((i) => i.kind === "state");
  expect(new Set(states.map((s) => s.docId)).size).toBe(3);
  expect(new Set(states.map((s) => s.stateType))).toEqual(new Set(["appear", "change", "exit"]));
  for (const kind of ["sticky", "text", "frame"])
    expect(items.some((i) => i.kind === kind)).toBe(true);
  expect(edges.map((e) => e.dashed).sort()).toEqual([false, true]);

  // 사전 구성: 4개 이상 분류에 문서, 멘션, 캐릭터 템플릿 속성 채움
  expect(new Set(docs.map((d) => d.categoryId)).size).toBeGreaterThanOrEqual(4);
  expect(docs.filter((d) => d.mentions.length > 0).length).toBeGreaterThan(3);
  const charCat = cats.find((c) => c.system === "character")!;
  for (const d of docs.filter((d) => d.categoryId === charCat.id)) {
    expect(d.props.map((p) => p.key)).toEqual(charCat.templateProps);
  }
});
