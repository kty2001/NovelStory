import { expect, test, type Page } from "@playwright/test";
import { cdp, commit, keyDuringComposition, koreanModeKey, setComposition, typeKorean, 한글 } from "./helpers/ime";

type N = { id: string; position: { x: number; y: number }; data: { text: string } };
const nodes = (page: Page) => page.evaluate(() => (window.__spike.c2 as { getNodes: () => N[] }).getNodes());
const history = (page: Page) => page.evaluate(() => (window.__spike.c2 as { historyLength: () => number }).historyLength());

async function open(page: Page) {
  await page.goto("/c2");
  await page.waitForFunction(() => !!window.__spike?.c2);
  await expect(page.getByTestId("sticky-n1")).toBeVisible();
}

async function edit(page: Page, id: string) {
  await page.getByTestId(`sticky-${id}`).click();
  await page.getByTestId(`sticky-${id}`).dblclick();
  await expect(page.getByTestId(`sticky-input-${id}`)).toBeFocused();
}

test.describe("C2 보드 단축키 × IME", () => {
  test("편집 중 조합 상태 Backspace·Delete → 노드 삭제 안 됨", async ({ page }) => {
    await open(page);
    await edit(page, "n1"); // n1은 선택 + 편집 상태
    await page.getByTestId("sticky-input-n1").press("Control+a");
    const s = await cdp(page);
    await setComposition(s, "ㅎ");
    await setComposition(s, "하");
    await keyDuringComposition(s, "Backspace");
    await setComposition(s, "ㅎ");
    await keyDuringComposition(s, "Delete");
    await commit(s, "ㅎ");
    expect(await nodes(page)).toHaveLength(3);
    // 조합 확정 후 일반 Backspace·Delete도 텍스트에만 적용
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Delete");
    await page.keyboard.press("Backspace");
    expect(await nodes(page)).toHaveLength(3);
  });

  test("편집 중 Ctrl+Z → 보드 실행 취소 안 됨", async ({ page }) => {
    await open(page);
    // 보드 작업 1건: n3 이동
    const box = (await page.getByTestId("sticky-n3").boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 120, { steps: 10 });
    await page.mouse.up();
    const moved = (await nodes(page)).find((n) => n.id === "n3")!.position;
    expect(await history(page)).toBeGreaterThan(0);

    await edit(page, "n1");
    const s = await cdp(page);
    await typeKorean(s, 한글);
    await page.keyboard.press("Control+z");
    expect((await nodes(page)).find((n) => n.id === "n3")!.position).toEqual(moved);

    // 편집 밖에서 Ctrl+Z → 보드 실행 취소 동작 확인
    // (포스트잇 글자 입력도 보드 기록에 글자 단위로 쌓임 → 이동 취소까지 여러 번 필요)
    await page.keyboard.press("Escape");
    await page.locator(".react-flow__pane").click({ position: { x: 900, y: 600 } });
    const textEntries = (await history(page)) - 1;
    test.info().annotations.push({ type: "텍스트 편집 기록 수", description: String(textEntries) });
    for (let i = 0; i <= textEntries; i++) await page.keyboard.press("Control+z");
    await expect.poll(async () => (await nodes(page)).find((n) => n.id === "n3")!.position).not.toEqual(moved);
  });

  test("한글 입력 모드 단축키: key는 자모, code 기준으로 도구 전환", async ({ page }) => {
    await open(page);
    await page.locator(".react-flow__pane").click({ position: { x: 900, y: 600 } });
    const s = await cdp(page);
    const cases = [
      ["ㄷ", "KeyE", 69, "event"],
      ["ㄴ", "KeyS", 83, "sticky"],
      ["ㅅ", "KeyT", 84, "text"],
      ["ㄹ", "KeyF", 70, "frame"],
      ["ㅍ", "KeyV", 86, "select"],
    ] as const;
    for (const [key, code, vk, tool] of cases) {
      await koreanModeKey(s, key, code, vk);
      await expect(page.getByTestId("tool")).toHaveText(tool);
    }
    await expect(page.getByTestId("last-key")).toHaveText("ㅍ / KeyV");
  });

  test("편집 밖 Delete → 선택 노드 삭제 (정상 동작)", async ({ page }) => {
    await open(page);
    await page.getByTestId("sticky-n2").click();
    await page.keyboard.press("Delete");
    expect(await nodes(page)).toHaveLength(2);
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await nodes(page)).length).toBe(3);
  });
});
