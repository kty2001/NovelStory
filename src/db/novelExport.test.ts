import { beforeEach, describe, expect, it } from "vitest";
import { doc, OLD, resetDb } from "../test/fixtures";
import { db } from "./db";
import { ExportFormatError, SCHEMA_VERSION } from "./exportFormat";
import { buildExport, exportFileName, importExport, importFile } from "./novelExport";
import { createNovel } from "./novels";
import type { BoardItem } from "./types";

beforeEach(resetDb);

// 모든 참조 필드를 쓰는 소설: 하위 분류, 라인, 멘션, 속성 값 링크, 프레임 소속, 상태 → 사건 연결, 연결선, 레인 순서,
// 서술 순서(회차 · 슬롯)
async function richNovel() {
  const id = await createNovel({ title: "원본" });
  const cats = await db.wikiCategories.where({ novelId: id }).sortBy("order");
  const [line] = await db.storyLines.where({ novelId: id }).sortBy("order");
  const sub = { ...cats[2], id: "sub", name: "도시", parentId: cats[2].id, order: 0 };
  await db.wikiCategories.add(sub);
  const hero = {
    ...doc("hero", id),
    categoryId: cats[0].id,
    props: [{ key: "소속", value: "ev", docId: "ev" }],
    mentions: ["ev"],
  };
  const ev = {
    ...doc("ev", id),
    categoryId: cats[1].id,
    lineId: line.id,
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "주인공 " },
            { type: "mention", attrs: { id: "hero", label: "주인공" } },
          ],
        },
      ],
    },
    mentions: ["hero"],
  };
  await db.wikiDocs.bulkAdd([hero, ev, { ...doc("gone", id), deletedAt: OLD }]);
  const items: BoardItem[] = [
    {
      id: "frame",
      novelId: id,
      updatedAt: OLD,
      kind: "frame",
      z: 0,
      place: { mode: "free", x: 0, y: 0 },
      w: 500,
      h: 300,
      title: "1부",
    },
    {
      id: "e1",
      novelId: id,
      updatedAt: OLD,
      kind: "event",
      z: 0,
      parentFrameId: "frame",
      place: { mode: "timed", t: 1, y: -100 },
      docId: "ev",
      color: "brand-peach",
    },
    {
      id: "s1",
      novelId: id,
      updatedAt: OLD,
      kind: "state",
      z: 0,
      place: { mode: "timed", t: 1, y: 100 },
      docId: "hero",
      stateType: "appear",
      changes: [{ key: "나이", to: "17" }],
      note: "",
      linkedEventItemId: "e1",
    },
  ];
  await db.boardItems.bulkAdd(items);
  await db.boardEdges.add({
    id: "edge",
    novelId: id,
    updatedAt: OLD,
    source: "e1",
    target: "s1",
    dashed: false,
  });
  await db.boards.update(id, { stateLanes: { enabled: true, order: ["hero"] } });
  await db.episodes.add({ id: "ep1", novelId: id, updatedAt: OLD, number: 1, title: "프롤로그" });
  await db.narrativeSlots.add({
    id: "slot1",
    novelId: id,
    updatedAt: OLD,
    episodeId: "ep1",
    order: 0,
    eventDocId: "ev",
    mode: "flashback",
    note: "일부만",
  });
  await db.memos.add({
    id: "memo1",
    novelId: id,
    updatedAt: OLD,
    createdAt: OLD,
    body: "떠오른 생각",
    pinned: true,
  });
  await db.novels.update(id, {
    synopsisBody: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "mention", attrs: { id: "hero", label: "주인공" } }],
        },
      ],
    },
  });
  return id;
}

describe("buildExport", () => {
  it("삭제 기록·파생 필드 제외", async () => {
    const id = await richNovel();
    const data = await buildExport(id);
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.wikiDocs.map((d) => d.id).sort()).toEqual(["ev", "hero"]);
    expect(data.wikiDocs[0]).not.toHaveProperty("mentions");
    expect(data.wikiDocs[0]).not.toHaveProperty("plainText");
  });

  it("레코드를 넘기면 DB 대신 사용 (저장 안 된 변경 포함), 이미지는 DB", async () => {
    const id = await createNovel({ title: "원본" });
    const fromDb = await buildExport(id);
    await db.images.put({
      id: "img",
      novelId: id,
      updatedAt: OLD,
      blob: new Blob(["x"], { type: "image/webp" }),
      mime: "image/webp",
      width: 1,
      height: 1,
      bytes: 1,
    });
    const data = await buildExport(id, {
      ...fromDb,
      novel: { ...fromDb.novel, title: "저장 안 됨" },
      wikiDocs: [{ ...doc("new", id), mentions: ["x"] }],
    });
    expect(data.novel.title).toBe("저장 안 됨");
    expect(data.wikiDocs.map((d) => d.id)).toEqual(["new"]);
    expect(data.wikiDocs[0]).not.toHaveProperty("mentions");
    expect(data.images.map((i) => i.id)).toEqual(["img"]);
  });
});

describe("importExport", () => {
  it("모든 ID 재발급 + 참조가 새 ID로 일치", async () => {
    const orig = await richNovel();
    const id = await importExport(await buildExport(orig));

    const origIds = new Set([
      orig,
      ...(await db.boardItems.where({ novelId: orig }).primaryKeys()),
      ...(await db.wikiDocs.where({ novelId: orig }).primaryKeys()),
      ...(await db.wikiCategories.where({ novelId: orig }).primaryKeys()),
      ...(await db.storyLines.where({ novelId: orig }).primaryKeys()),
      "edge",
      "ep1",
      "slot1",
      "memo1",
    ]);
    const items = await db.boardItems.where({ novelId: id }).toArray();
    const docs = await db.wikiDocs.where({ novelId: id }).toArray();
    const cats = await db.wikiCategories.where({ novelId: id }).toArray();
    const lines = await db.storyLines.where({ novelId: id }).toArray();
    const [edge] = await db.boardEdges.where({ novelId: id }).toArray();
    const [episode] = await db.episodes.where({ novelId: id }).toArray();
    const [slot] = await db.narrativeSlots.where({ novelId: id }).toArray();
    const [memo] = await db.memos.where({ novelId: id }).toArray();
    const board = await db.boards.get(id);
    for (const r of [...items, ...docs, ...cats, ...lines, edge, episode, slot, memo])
      expect(origIds.has(r.id)).toBe(false);

    const byOld = <T extends { id: string }>(list: T[], pick: (r: T) => boolean) =>
      list.find(pick)!;
    const frame = byOld(items, (i) => i.kind === "frame");
    const event = byOld(items, (i) => i.kind === "event");
    const state = byOld(items, (i) => i.kind === "state");
    const hero = byOld(docs, (d) => d.title === "hero");
    const ev = byOld(docs, (d) => d.title === "ev");

    expect(event).toMatchObject({ parentFrameId: frame.id, docId: ev.id });
    expect(state).toMatchObject({ docId: hero.id, linkedEventItemId: event.id });
    expect(edge).toMatchObject({ source: event.id, target: state.id });
    expect(board?.stateLanes.order).toEqual([hero.id]);
    expect(episode).toMatchObject({ number: 1, title: "프롤로그" });
    expect(slot).toMatchObject({
      episodeId: episode.id,
      eventDocId: ev.id,
      mode: "flashback",
      note: "일부만",
    });
    expect(memo).toMatchObject({ body: "떠오른 생각", pinned: true });
    expect(cats.some((c) => c.id === ev.categoryId)).toBe(true);
    expect(lines.some((l) => l.id === ev.lineId)).toBe(true);
    const sub = byOld(cats, (c) => c.name === "도시");
    expect(cats.some((c) => c.id === sub.parentId)).toBe(true);
    // 본문 멘션 치환 + 파생 필드 재계산
    expect(ev.mentions).toEqual([hero.id]);
    expect(JSON.stringify(ev.body)).toContain(hero.id);
    expect(ev.plainText).toBe("주인공 주인공");
    // 속성 값 링크 치환 + mentions 반영
    expect(hero.props).toEqual([{ key: "소속", value: "ev", docId: ev.id }]);
    expect(hero.mentions).toEqual([ev.id]);
    // 개요 시놉시스 멘션도 치환
    const novel = await db.novels.get(id);
    expect(JSON.stringify(novel?.synopsisBody)).toContain(hero.id);
    expect(JSON.stringify(novel?.synopsisBody)).not.toContain('"hero"');
  });

  it("가져온 소설은 새로 만든 것으로 취급 (lastExportedAt 없음)", async () => {
    const orig = await createNovel({ title: "a" });
    await db.novels.update(orig, { lastExportedAt: OLD });
    const id = await importExport(await buildExport(orig));
    const novel = await db.novels.get(id);
    expect(novel?.lastExportedAt).toBeUndefined();
    expect(novel?.createdAt).not.toBe(OLD);
  });

  it("이미지는 data: URL만, 삭제 표시는 가져오지 않음", async () => {
    const data = await buildExport(await createNovel({ title: "a" }));
    const image = {
      id: "img",
      novelId: data.novel.id,
      updatedAt: OLD,
      mime: "image/webp",
      width: 1,
      height: 1,
      bytes: 1,
    };
    await expect(
      importExport({ ...data, images: [{ ...image, dataUrl: "https://example.com/x.webp" }] }),
    ).rejects.toMatchObject({ reason: "format" });

    const id = await importExport({
      ...data,
      novel: { ...data.novel, deletedAt: OLD },
      wikiDocs: [{ ...doc("d", data.novel.id), deletedAt: OLD }],
    });
    expect((await db.novels.get(id))?.deletedAt).toBeUndefined();
    const [imported] = await db.wikiDocs.where({ novelId: id }).toArray();
    expect(imported.deletedAt).toBeUndefined();
  });

  it("잘못된 파일·새 버전 거부", async () => {
    await expect(importFile(new Blob(["not json"]))).rejects.toBeInstanceOf(ExportFormatError);
    await expect(
      importExport({ format: "whitenoard-novel", schemaVersion: SCHEMA_VERSION }),
    ).rejects.toMatchObject({ reason: "format" });
    await expect(
      importExport({ format: "whitenoard-novel", schemaVersion: SCHEMA_VERSION + 1 }),
    ).rejects.toMatchObject({ reason: "newer", fileVersion: SCHEMA_VERSION + 1 });
    expect(await db.novels.count()).toBe(0);
  });
});

it("파일명: 금지 문자 치환 + 날짜", () => {
  expect(exportFileName("검/은:왕관?", new Date(2026, 8, 5))).toBe(
    "검_은_왕관__20260905.whitenoard.json",
  );
});
