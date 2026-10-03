import { expect, it } from "vitest";
import type { WikiDoc } from "../../db/types";
import { doc } from "../../test/fixtures";
import { searchWiki } from "./search";

const d = (id: string, title: string, aliases: string[] = [], plainText = ""): WikiDoc => ({
  ...doc(id, "n1"),
  title,
  aliases,
  plainText,
});

const docs = {
  a: d("a", "카엘", [], `${"가".repeat(40)}반란에 가담한다${"나".repeat(40)}`),
  b: d("b", "붉은 깃발", ["반란의 깃발"]),
  c: d("c", "반란군"),
  e: d("e", "반란"),
  f: d("f", "무관", [], "없음"),
};

it("제목 → 별칭 → 본문 순, 같은 위치는 가나다", () => {
  const hits = searchWiki(docs, " 반란 ");
  expect(hits.map((h) => [h.doc.id, h.where])).toEqual([
    ["e", "title"],
    ["c", "title"],
    ["b", "alias"],
    ["a", "body"],
  ]);
  expect(hits[1]).toMatchObject({ before: "", match: "반란", after: "군" });
  expect(hits[2]).toMatchObject({ alias: "반란의 깃발", match: "반란", after: "의 깃발" });
});

it("본문 문맥은 앞뒤 30자, 잘리면 …", () => {
  const body = searchWiki(docs, "반란에")[0];
  expect(body.before).toBe(`…${"가".repeat(30)}`);
  expect(body.match).toBe("반란에");
  expect(body.after).toBe(` 가담한다${"나".repeat(25)}…`);
});

it("초성 검색: 제목 · 별칭만 (본문 제외), 일치 부분 강조", () => {
  const hits = searchWiki(docs, "ㅂㄹ");
  expect(hits.map((h) => [h.doc.id, h.where])).toEqual([
    ["e", "title"],
    ["c", "title"],
    ["b", "alias"],
  ]);
  expect(hits[1]).toMatchObject({ before: "", match: "반란", after: "군" });
  expect(hits[2]).toMatchObject({ before: "", match: "반란", after: "의 깃발" });
});

it("빈 검색어는 결과 없음, 대소문자 무시", () => {
  expect(searchWiki(docs, "  ")).toEqual([]);
  expect(searchWiki({ x: d("x", "Alpha") }, "alp")).toHaveLength(1);
});
