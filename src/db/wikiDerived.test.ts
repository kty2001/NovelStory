import { expect, it } from "vitest";
import { deriveDoc, remapMentions } from "./wikiDerived";

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

it("멘션 id 치환, 원본 유지", () => {
  const next = remapMentions(body, (id) => id.toUpperCase());
  expect(deriveDoc(next).mentions).toEqual(["A", "B"]);
  expect(deriveDoc(body).mentions).toEqual(["a", "b"]);
});
