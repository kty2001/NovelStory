import { beforeEach, describe, expect, it } from "vitest";
import { OLD, resetDb } from "../test/fixtures";
import { db } from "./db";
import { formatBytes, imageUsageByNovel, isQuotaError } from "./storage";

beforeEach(resetDb);

describe("저장 공간", () => {
  it("공간 부족 판정: 직접 · Dexie가 감싼 inner", () => {
    const quota = new DOMException("가득 참", "QuotaExceededError");
    expect(isQuotaError(quota)).toBe(true);
    expect(isQuotaError({ name: "AbortError", inner: quota })).toBe(true);
    expect(isQuotaError(new Error("x"))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });

  it("소설별 이미지 수 · 용량 합, 용량 큰 순", async () => {
    const img = (id: string, novelId: string, bytes: number) => ({
      id,
      novelId,
      updatedAt: OLD,
      blob: new Blob(["x"]),
      mime: "image/webp",
      width: 1,
      height: 1,
      bytes,
    });
    await db.images.bulkPut([img("a", "n1", 100), img("b", "n2", 300), img("c", "n1", 50)]);
    expect(await imageUsageByNovel()).toEqual([
      { novelId: "n2", count: 1, bytes: 300 },
      { novelId: "n1", count: 2, bytes: 150 },
    ]);
  });

  it("용량 표기", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(620 * 1024 ** 2)).toBe("620 MB");
    expect(formatBytes(1.8 * 1024 ** 3)).toBe("1.8 GB");
  });
});
