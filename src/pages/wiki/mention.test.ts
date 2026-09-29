import { describe, expect, it } from "vitest";
import type { WikiDoc } from "../../db/types";
import { doc } from "../../test/fixtures";
import { mentionCandidates } from "./mention";

const d = (id: string, title: string, aliases: string[] = []): WikiDoc => ({
  ...doc(id, "n1"),
  title,
  aliases,
});

const docs = Object.fromEntries(
  [
    d("a", "왕도 습격"),
    d("b", "카엘", ["붉은 기사"]),
    d("c", "기사단 원정"),
    d("self", "기사 수업"),
    ...Array.from({ length: 10 }, (_, i) => d(`n${i}`, `이름${i}`)),
  ].map((x) => [x.id, x]),
);

describe("mentionCandidates", () => {
  it("제목 앞부분 일치 우선, 현재 문서 제외, 별칭 일치 표시", () => {
    const r = mentionCandidates(docs, "기사", "self");
    expect(r.map((c) => c.doc.id)).toEqual(["c", "b"]);
    expect(r[1].alias).toBe("붉은 기사");
    expect(r[0].alias).toBeUndefined();
  });

  it("최대 8개", () => {
    expect(mentionCandidates(docs, "이름", "self")).toHaveLength(8);
  });
});
