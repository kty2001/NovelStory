import { expect, test, type Page } from "@playwright/test";

type N = { id: string; parentId?: string; position: { x: number; y: number }; abs: { x: number; y: number } };
const nodes = (page: Page) => page.evaluate(() => (window.__spike.c7 as { getNodes: () => N[] }).getNodes());
const get = async (page: Page, id: string) => (await nodes(page)).find((n) => n.id === id);
const box = async (page: Page, id: string) => (await page.locator(`.react-flow__node[data-id='${id}']`).boundingBox())!;

async function open(page: Page) {
  await page.goto("/c7");
  await page.waitForFunction(() => !!window.__spike?.c7);
}

async function drag(page: Page, id: string, dx: number, dy: number, grab = { x: 10, y: 10 }) {
  const b = await box(page, id);
  await page.mouse.move(b.x + grab.x, b.y + grab.y);
  await page.mouse.down();
  await page.mouse.move(b.x + grab.x + dx, b.y + grab.y + dy, { steps: 15 });
  await page.mouse.up();
}

const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

test.describe("C7 프레임 @webkit", () => {
  test("넣기·빼기: 부모 변경 후에도 화면 위치 유지 @webkit", async ({ page }) => {
    await open(page);
    // A(700,150) → 프레임 1부(100,100 400×300) 안으로
    await drag(page, "a", -450, 100);
    const dropped = await box(page, "a");
    await expect.poll(async () => (await get(page, "a"))?.parentId).toBe("f1");
    expect(near(await box(page, "a"), dropped)).toBe(true);

    // B(1부 자식) → 밖으로
    await drag(page, "b", 0, 420);
    const out = await box(page, "b");
    await expect.poll(async () => (await get(page, "b"))?.parentId).toBeUndefined();
    expect(near(await box(page, "b"), out)).toBe(true);
  });

  test("프레임 이동 → 자식 동반 이동 @webkit", async ({ page }) => {
    await open(page);
    const child0 = await box(page, "b");
    const frame0 = await box(page, "f1");
    await drag(page, "f1", 100, 50, { x: 200, y: 280 }); // 프레임 빈 영역 잡기
    const child1 = await box(page, "b");
    const frame1 = await box(page, "f1");
    expect(frame1.x - frame0.x).toBeGreaterThan(50); // 프레임이 실제로 이동
    // 자식 이동량 = 프레임 이동량 (드래그 시작 임계값 때문에 마우스 이동량과는 몇 px 차이 가능)
    expect(child1.x - child0.x).toBeCloseTo(frame1.x - frame0.x, 0);
    expect(child1.y - child0.y).toBeCloseTo(frame1.y - frame0.y, 0);
  });

  test("프레임 안에 프레임 넣기 불가 (MVP 1단계) @webkit", async ({ page }) => {
    await open(page);
    // 2부(700,420) → 1부 안으로
    await drag(page, "f2", -500, -250, { x: 150, y: 190 });
    expect((await get(page, "f2"))?.parentId).toBeUndefined();
  });

  test("프레임 삭제 → 자식 유지·위치 보존 @webkit", async ({ page }) => {
    await open(page);
    const before = await box(page, "b");
    await page.locator(".react-flow__node[data-id='f1']").click({ position: { x: 200, y: 280 } });
    await page.keyboard.press("Delete");
    await expect.poll(async () => (await nodes(page)).map((n) => n.id).sort()).toEqual(["a", "b", "f2"]);
    expect((await get(page, "b"))?.parentId).toBeUndefined();
    expect(near(await box(page, "b"), before)).toBe(true);
  });
});
