import { expect, test } from "@playwright/test";

test("서재가 열리고 ui_guide 토큰이 적용됨", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "아직 소설이 없어요" })).toBeVisible();
  const body = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.backgroundColor, font: s.fontFamily };
  });
  expect(body.bg).toBe("rgb(255, 250, 240)");
  expect(body.font).toContain("Pretendard");
});

test("없는 소설은 안내 표시", async ({ page }) => {
  await page.goto("/novel/nope/board");
  await expect(page.getByRole("heading", { name: "소설을 찾을 수 없음" })).toBeVisible();
});

test("알 수 없는 경로는 서재로 이동", async ({ page }) => {
  await page.goto("/unknown/path");
  await expect(page).toHaveURL("/");
});
