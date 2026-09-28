import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "새 소설" }).first().click();
  await page.getByRole("dialog").getByLabel("제목").fill("보드 소설");
  await page.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
});

test("캔버스 · 점 격자 · 미니맵 · 줌 컨트롤 표시", async ({ page }) => {
  const board = page.getByTestId("board");
  await expect(board.locator(".react-flow__background")).toBeVisible();
  await expect(board.locator(".react-flow__minimap")).toBeVisible();
  await expect(page.getByRole("button", { name: "100%로 보기" })).toHaveText("100%");
});

test("줌 0.5 미만 간략 표시 · 100% 복귀", async ({ page }) => {
  const flow = page.locator(".react-flow");
  const zoomLabel = page.getByRole("button", { name: "100%로 보기" });
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "축소" }).click();
    await page.waitForTimeout(250); // 줌 애니메이션 200ms
  }
  await expect(zoomLabel).toHaveText("48%");
  await expect(flow).toHaveClass(/board-simple/);

  await zoomLabel.click();
  await expect(zoomLabel).toHaveText("100%");
  await expect(flow).not.toHaveClass(/board-simple/);
});

test("휠 줌 후 새로고침해도 화면 위치 유지", async ({ page }) => {
  const pane = page.locator(".react-flow__pane");
  const box = (await pane.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 400);
  const zoomLabel = page.getByRole("button", { name: "100%로 보기" });
  await expect(zoomLabel).not.toHaveText("100%");
  const zoomed = await zoomLabel.textContent();

  await page.waitForTimeout(300); // onMoveEnd → UiState 기록
  await page.reload();
  await expect(zoomLabel).toHaveText(zoomed!);
});
