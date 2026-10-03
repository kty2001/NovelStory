import { expect, it } from "vitest";
import { doc } from "../test/fixtures";
import { deriveDoc, mentionContext, propText, remapMentions } from "./wikiDerived";

const body = {
  type: "doc",
  content: [
    { type: "heading", content: [{ type: "text", text: "제목" }] },
    {
      type: "paragraph",
      content: [
        { type: "mention", attrs: { id: "a", label: "갑" } },
        { type: "text", text: "와 " },
        { type: "mention", attrs: { id: "a", label: "갑" } },
        { type: "mention", attrs: { id: "b", label: "을" } },
      ],
    },
  ],
};

it("멘션 중복 제거 + 순수 텍스트", () => {
  expect(deriveDoc(body)).toEqual({ mentions: ["a", "b"], plainText: "제목\n갑와 갑을" });
  expect(deriveDoc(null)).toEqual({ mentions: [], plainText: "" });
});

it("속성 값 링크도 mentions에 포함 (중복 제거), 순수 텍스트는 본문만", () => {
  const props = [
    { key: "소속", value: "병", docId: "c" },
    { key: "출신", value: "갑", docId: "a" },
    { key: "나이", value: "17" },
  ];
  expect(deriveDoc(body, props)).toEqual({
    mentions: ["a", "b", "c"],
    plainText: "제목\n갑와 갑을",
  });
  expect(deriveDoc(null, props).mentions).toEqual(["c", "a"]);
});

it("속성 표시 문자열: 링크면 대상 현재 제목, 삭제됐으면 저장값", () => {
  const docs = { a: { ...doc("a", "n1"), title: "새 제목" } };
  expect(propText({ key: "k", value: "옛 제목", docId: "a" }, docs)).toBe("새 제목");
  expect(propText({ key: "k", value: "옛 제목", docId: "gone" }, docs)).toBe("옛 제목");
  expect(propText({ key: "k", value: "글" }, docs)).toBe("글");
});

it("멘션 id 치환, 원본 유지", () => {
  const next = remapMentions(body, (id) => id.toUpperCase());
  expect(deriveDoc(next).mentions).toEqual(["A", "B"]);
  expect(deriveDoc(body).mentions).toEqual(["a", "b"]);
});

it("역링크 문맥: 첫 멘션 문단의 앞뒤 글자, 없으면 null", () => {
  expect(mentionContext(body, "b")).toEqual({ before: "갑와 갑", after: "" });
  const long = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "가".repeat(40) },
          { type: "mention", attrs: { id: "a", label: "갑" } },
          { type: "text", text: "나".repeat(40) },
        ],
      },
    ],
  };
  expect(mentionContext(long, "a")).toEqual({
    before: `…${"가".repeat(30)}`,
    after: `${"나".repeat(30)}…`,
  });
  expect(mentionContext(body, "z")).toBeNull();
  expect(mentionContext(null, "a")).toBeNull();
});
