import { expect, test, type Page } from "@playwright/test";

type C6 = { getViewport: () => { x: number; y: number; zoom: number }; getNode: (id: string) => { position: { x: number; y: number }; data: { text: string } } };
const viewport = (page: Page) => page.evaluate(() => (window.__spike.c6 as C6).getViewport());
const node = (page: Page, id: string) => page.evaluate((i) => (window.__spike.c6 as C6).getNode(i), id);

async function open(page: Page) {
  await page.goto("/c6");
  await page.waitForFunction(() => !!window.__spike?.c6);
}

test.describe("C6 캔버스 인라인 편집 @webkit", () => {
  test("편집 중 텍스트 드래그 → 글자 선택, 노드 이동 없음 @webkit", async ({ page }) => {
    await open(page);
    await page.getByTestId("sticky-s1").dblclick();
    const input = page.getByTestId("sticky-input-s1");
    await expect(input).toBeFocused();
    await input.fill("첫 번째 줄 설정 메모 입니다");
    const before = await node(page, "s1");
    const box = (await input.boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 10, box.y + 40, { steps: 10 });
    await page.mouse.up();
    expect((await node(page, "s1")).position).toEqual(before.position);
    const selected = await input.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart);
    expect(selected).toBeGreaterThan(0);
  });

  test("편집 중 텍스트 휠 → 텍스트 스크롤, 캔버스 줌 없음 @webkit", async ({ page }) => {
    await open(page);
    // 대조군: 빈 캔버스 휠은 줌
    const v0 = await viewport(page);
    await page.mouse.move(900, 600);
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await viewport(page)).zoom).not.toBe(v0.zoom);

    await page.reload();
    await page.waitForFunction(() => !!window.__spike?.c6);
    await page.getByTestId("sticky-s2").dblclick();
    const input = page.getByTestId("sticky-input-s2");
    await expect(input).toBeFocused();
    const v1 = await viewport(page);
    const box = (await input.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => input.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await viewport(page)).toEqual(v1);
  });

  test("Esc·바깥 클릭 → 편집 종료, 내용 유지 @webkit", async ({ page }) => {
    await open(page);
    await page.getByTestId("sticky-s1").dblclick();
    await page.getByTestId("sticky-input-s1").fill("Esc로 종료");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sticky-input-s1")).toHaveCount(0);
    expect((await node(page, "s1")).data.text).toBe("Esc로 종료");

    await page.getByTestId("sticky-s1").dblclick();
    await page.getByTestId("sticky-input-s1").fill("바깥 클릭으로 종료");
    await page.mouse.click(900, 600);
    await expect(page.getByTestId("sticky-input-s1")).toHaveCount(0);
    expect((await node(page, "s1")).data.text).toBe("바깥 클릭으로 종료");
  });
});
