import { describe, expect, it } from "vitest";
import type { Memo } from "../../db/types";
import { memoTitleBody, sortedMemos } from "./memo";

const memo = (id: string, updatedAt: string, pinned = false): Memo => ({
  id,
  novelId: "n1",
  updatedAt,
  createdAt: updatedAt,
  body: id,
  pinned,
});

const para = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("sortedMemos", () => {
  it("고정 먼저, 각각 최근 수정순", () => {
    const list = sortedMemos({
      a: memo("a", "2026-09-01T00:00:00.000Z"),
      b: memo("b", "2026-09-03T00:00:00.000Z"),
      c: memo("c", "2026-08-01T00:00:00.000Z", true),
      d: memo("d", "2026-09-02T00:00:00.000Z", true),
    });
    expect(list.map((m) => m.id)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("memoTitleBody", () => {
  it("첫 비어 있지 않은 줄 = 제목, 나머지 = 문단 (앞뒤 빈 줄 제거, 중간 빈 줄 유지)", () => {
    expect(memoTitleBody("\n  왕관의 행방 \n\n첫째\n\n둘째\n\n")).toEqual({
      title: "왕관의 행방",
      body: { type: "doc", content: [para("첫째"), { type: "paragraph" }, para("둘째")] },
    });
  });

  it("한 줄이면 본문 없음, 빈 메모는 '새 문서'", () => {
    expect(memoTitleBody("한 줄")).toEqual({ title: "한 줄", body: null });
    expect(memoTitleBody("  \n ")).toEqual({ title: "새 문서", body: null });
  });

  it("50자 넘는 첫 줄은 제목을 자르고 본문에 전체를 남김", () => {
    const long = "가".repeat(60);
    const { title, body } = memoTitleBody(`${long}\n다음`);
    expect(title).toBe("가".repeat(50));
    expect(body).toEqual({ type: "doc", content: [para(long), para("다음")] });
  });
});
