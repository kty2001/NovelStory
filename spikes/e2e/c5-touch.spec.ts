import { expect, test, type Page } from "@playwright/test";
import { gesture, longPress } from "./helpers/touch";

type V = { x: number; y: number; zoom: number };
type C5 = {
  getViewport: () => V;
  getNodes: () => { id: string; position: { x: number; y: number } }[];
  menuOpen: () => boolean;
  toFlow: (x: number, y: number) => { x: number; y: number };
};
const call = <T,>(page: Page, name: keyof C5, ...args: unknown[]) =>
  page.evaluate(([n, a]) => (window.__spike.c5 as Record<string, (...x: unknown[]) => unknown>)[n as string](...(a as unknown[])), [name, args] as const) as Promise<T>;

// 태블릿 가로 크기 + 터치
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } });

async function open(page: Page) {
  await page.goto("/c5");
  await page.waitForFunction(() => !!window.__spike?.c5);
  return page.context().newCDPSession(page);
}

test.describe("C5 터치 (CDP 터치 이벤트)", () => {
  test("두 손가락 핀치 → 확대", async ({ page }) => {
    const s = await open(page);
    const before = await call<V>(page, "getViewport");
    await gesture(s, [{ x: 600, y: 600 }, { x: 700, y: 600 }], [{ x: 450, y: 600 }, { x: 850, y: 600 }]);
    const after = await call<V>(page, "getViewport");
    expect(after.zoom).toBeGreaterThan(before.zoom * 1.5);
  });

  test("두 손가락 팬 → 뷰포트 이동", async ({ page }) => {
    const s = await open(page);
    const before = await call<V>(page, "getViewport");
    await gesture(s, [{ x: 600, y: 500 }, { x: 700, y: 500 }], [{ x: 600, y: 650 }, { x: 700, y: 650 }]);
    const after = await call<V>(page, "getViewport");
    expect(after.y - before.y).toBeGreaterThan(100);
    expect(Math.abs(after.zoom - before.zoom)).toBeLessThan(0.05);
  });

  test("한 손가락: 빈 곳 = 팬, 노드 위 = 노드 이동", async ({ page }) => {
    const s = await open(page);
    const v0 = await call<V>(page, "getViewport");
    await gesture(s, [{ x: 800, y: 600 }], [{ x: 900, y: 650 }]);
    const v1 = await call<V>(page, "getViewport");
    expect(v1.x - v0.x).toBeGreaterThan(80);

    const box = (await page.locator(".react-flow__node[data-id='a']").boundingBox())!;
    const n0 = (await call<C5["getNodes"] extends () => infer R ? R : never>(page, "getNodes")).find((n) => n.id === "a")!;
    await gesture(s, [{ x: box.x + 20, y: box.y + 10 }], [{ x: box.x + 140, y: box.y + 90 }]);
    const n1 = (await call<{ id: string; position: { x: number } }[]>(page, "getNodes")).find((n) => n.id === "a")!;
    expect(n1.position.x - n0.position.x).toBeGreaterThan(80);
    const v2 = await call<V>(page, "getViewport");
    expect(v2).toEqual(v1);
  });

  test("길게 누르기 → 메뉴, 짧게 누르기 → 메뉴 없음", async ({ page }) => {
    const s = await open(page);
    await longPress(s, { x: 700, y: 550 }, 150);
    expect(await call<boolean>(page, "menuOpen")).toBe(false);
    await longPress(s, { x: 700, y: 550 }, 700);
    await expect(page.getByTestId("context-menu")).toBeVisible();
  });

  test("도구 모음 → 캔버스 터치 드래그 배치", async ({ page }) => {
    const s = await open(page);
    const count = (await call<unknown[]>(page, "getNodes")).length;
    const p = (await page.getByTestId("palette-event").boundingBox())!;
    const drop = { x: 600, y: 500 };
    await gesture(s, [{ x: p.x + p.width / 2, y: p.y + p.height / 2 }], [drop], 20);
    const nodes = await call<{ id: string; position: { x: number; y: number } }[]>(page, "getNodes");
    expect(nodes).toHaveLength(count + 1);
    const expected = await call<{ x: number; y: number }>(page, "toFlow", drop.x, drop.y);
    expect(nodes.at(-1)!.position.x).toBeCloseTo(expected.x, 0);
    expect(nodes.at(-1)!.position.y).toBeCloseTo(expected.y, 0);
    // 드래그 중 캔버스가 함께 움직이거나 메뉴가 뜨지 않아야 함
    expect(await call<boolean>(page, "menuOpen")).toBe(false);
  });
});
