import { appendFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

type Result = {
  mode: string;
  count: number;
  sourceAvgMB: number;
  totalBlobMB: number;
  usageDeltaMB: number;
  avgSaveMs: number;
  maxSaveMs: number;
  readAllMs: number;
};
type C8 = { run: (n: number, m: string) => Promise<Result>; persist: () => Promise<Record<string, unknown>> };

const save = (row: unknown) => {
  mkdirSync("test-results", { recursive: true });
  appendFileSync("test-results/c8.jsonl", `${JSON.stringify(row)}\n`);
  console.log(JSON.stringify(row));
};

async function open(page: Page) {
  await page.goto("/c8");
  await page.waitForFunction(() => !!window.__spike?.c8);
}

test.describe("C8 IndexedDB 이미지 용량", () => {
  test.setTimeout(600_000);

  test("원본 50장", async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => (window.__spike.c8 as C8).run(50, "original"));
    save(r);
    expect(r.count).toBe(50);
  });

  test("리사이즈 50장 (긴 변 1600px, WebP 0.8)", async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => (window.__spike.c8 as C8).run(50, "resized"));
    save(r);
    expect.soft(r.totalBlobMB, "50장 합계 20MB 이하").toBeLessThanOrEqual(20);
    expect.soft(r.avgSaveMs, "장당 저장 200ms 이내").toBeLessThanOrEqual(200);
  });

  test("storage.persist() 결과", async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => (window.__spike.c8 as C8).persist());
    save({ persist: r });
    expect(r.persistApi).toBe(true);
  });
});
