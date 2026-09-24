import { expect, test, type Page } from "@playwright/test";

type Box = { key: string; text: string; left: number; right: number; top: number; bottom: number };
type C4 = {
  setViewport: (v: { x: number; y: number; zoom: number }) => void;
  getViewport: () => { x: number; y: number; zoom: number };
  labelBoxes: () => Box[];
  blockTicks: () => Record<string, number | null>;
  collapsed: () => unknown[];
};
const c4 = <T,>(page: Page, fn: (api: C4, arg: never) => T, arg?: unknown) =>
  page.evaluate(([f, a]) => new Function("api", "arg", `return (${f})(api, arg)`)(window.__spike.c4, a), [fn.toString(), arg] as const) as Promise<T>;

async function open(page: Page) {
  await page.goto("/c4");
  await page.waitForFunction(() => !!window.__spike?.c4);
  await page.evaluate(() => document.fonts.ready);
}

async function setViewport(page: Page, v: { x: number; y: number; zoom: number }) {
  await c4(page, (api, a) => api.setViewport(a), v);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

function overlaps(boxes: Box[]) {
  const sorted = [...boxes].sort((a, b) => a.left - b.left);
  const hits: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].left < sorted[i - 1].right - 0.5) hits.push(`${sorted[i - 1].text} ↔ ${sorted[i].text}`);
  }
  return hits;
}

test.describe("C4 시간축 @webkit", () => {
  for (const zoom of [0.05, 0.1, 0.25, 0.5, 1, 2]) {
    test(`줌 ${zoom}: 라벨 겹침 없음 @webkit`, async ({ page }) => {
      await open(page);
      for (const x of [640, 200, -1500 * zoom]) {
        await setViewport(page, { x, y: 400, zoom });
        const boxes = await c4(page, (api) => api.labelBoxes());
        expect(boxes.length).toBeGreaterThan(0);
        expect(overlaps(boxes), `x=${x}`).toEqual([]);
      }
    });
  }

  test("팬 후 축 라벨과 블록 상대 위치 유지 @webkit", async ({ page }) => {
    await open(page);
    const measure = async () => {
      const label = await page.locator(".tick-label", { hasText: "1년차 봄" }).boundingBox();
      const block = await page.locator(".react-flow__node[data-id='e2']").boundingBox();
      return label!.x + label!.width / 2 - block!.x;
    };
    const before = await measure();
    await setViewport(page, { x: 340, y: 250, zoom: 1 });
    expect(Math.abs((await measure()) - before)).toBeLessThanOrEqual(1);
  });

  test("접힌 구간 표시 클릭 → 펼침, 블록 위치 재계산 @webkit", async ({ page }) => {
    await open(page);
    await setViewport(page, { x: -500, y: 400, zoom: 0.5 });
    const marker = page.locator(".tick-label", { hasText: "≈ 12~40" });
    await expect(marker).toBeVisible();
    const e5Before = (await page.locator(".react-flow__node[data-id='e5']").boundingBox())!.x;
    await marker.click();
    await expect(marker).toHaveCount(0);
    // 28칸 × 120px − 48px = 3312px 펼쳐짐, 줌 0.5 → 화면 1656px 이동
    await expect
      .poll(async () => (await page.locator(".react-flow__node[data-id='e5']").boundingBox())!.x - e5Before)
      .toBeCloseTo(1656, 0);
  });

  test("블록 드래그 → 눈금 스냅, 미정 영역으로 옮기면 시점 없음 @webkit", async ({ page }) => {
    await open(page);
    const block = page.locator(".react-flow__node[data-id='e2']");
    const b = (await block.boundingBox())!;
    // 오른쪽으로 2.4칸(288px) → 5 눈금으로 스냅
    await page.mouse.move(b.x + 10, b.y + 10);
    await page.mouse.down();
    await page.mouse.move(b.x + 10 + 288, b.y + 10, { steps: 10 });
    await page.mouse.up();
    await expect.poll(() => c4(page, (api) => api.blockTicks().e2)).toBe(5);

    // 축 왼쪽(미정 영역)으로
    const b2 = (await block.boundingBox())!;
    await page.mouse.move(b2.x + 10, b2.y + 10);
    await page.mouse.down();
    await page.mouse.move(b2.x - 900, b2.y + 10, { steps: 10 });
    await page.mouse.up();
    await expect.poll(() => c4(page, (api) => api.blockTicks().e2)).toBeNull();
  });
});
