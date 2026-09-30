import { expect, test, type Page } from "@playwright/test";
import { cdp, setComposition } from "./helpers/ime";

// 메모 (F5, UC-52): 목록 · 고정 · 포스트잇 ↔ 메모 · 메모 → 사전 문서

const memos = (page: Page) => page.getByTestId("memo");
const memoText = (page: Page, n: number) =>
  memos(page).nth(n).getByRole("textbox", { name: "메모 내용" });

async function writeMemo(page: Page, text: string) {
  await page.getByRole("button", { name: "메모", exact: true }).click();
  await expect(memoText(page, 0)).toBeFocused();
  await memoText(page, 0).fill(text);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "새 소설" }).first().click();
  await page.getByRole("dialog").getByLabel("제목").fill("메모 소설");
  await page.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
  await expect(page.getByTestId("time-axis")).toBeVisible();
  await page.keyboard.press("Alt+5");
  await expect(page).toHaveURL(/\/memo$/);
});

test("빈 상태 → 추가 · 한글 조합 입력 · 고정 순서 · 삭제 되돌리기 · 새로고침 유지", async ({
  page,
}) => {
  await page.getByRole("button", { name: "첫 메모 쓰기" }).click();
  await expect(memoText(page, 0)).toBeFocused();
  const s = await cdp(page);
  await setComposition(s, "한");
  await s.send("Input.insertText", { text: "한" });
  await page.keyboard.insertText("글 메모");
  await expect(memoText(page, 0)).toHaveValue("한글 메모");

  await writeMemo(page, "둘째");
  await expect(memoText(page, 1)).toHaveValue("한글 메모");

  // 아래 메모 고정 → 맨 위 "고정됨"
  await memos(page).nth(1).getByRole("button", { name: "고정" }).click();
  await expect(page.getByRole("heading", { name: "고정됨" })).toBeVisible();
  await expect(memoText(page, 0)).toHaveValue("한글 메모");

  // 삭제 → 되돌리기
  await memos(page).nth(1).getByRole("button", { name: "메모 메뉴" }).click();
  await page.getByRole("menuitem", { name: "삭제" }).click();
  await expect(memos(page)).toHaveCount(1);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(memos(page)).toHaveCount(2);

  await page.waitForTimeout(800); // 자동 저장 500ms
  await page.reload();
  await expect(memoText(page, 0)).toHaveValue("한글 메모");
  await expect(memoText(page, 1)).toHaveValue("둘째");
  await expect(memos(page).first().getByRole("button", { name: "고정 해제" })).toBeVisible();
});

test("메모 → 포스트잇(보드에서 선택) → 다시 메모로 · 되돌리기", async ({ page }) => {
  await writeMemo(page, "복선 아이디어");
  await memos(page).first().getByRole("button", { name: "메모 메뉴" }).click();
  await page.getByRole("menuitem", { name: "보드에 포스트잇으로" }).click();

  await expect(page).toHaveURL(/\/board/);
  const sticky = page.getByTestId("sticky");
  await expect(sticky).toHaveText("복선 아이디어");
  const menu = page.getByRole("toolbar", { name: "블록 메뉴" });
  await expect(menu).toBeVisible(); // 선택됨

  await menu.getByRole("button", { name: "메모로" }).click();
  await expect(sticky).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("메모 1개로 옮김");
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(sticky).toHaveText("복선 아이디어");

  await sticky.click();
  await menu.getByRole("button", { name: "메모로" }).click();
  await page.getByRole("button", { name: "메모 보기" }).click();
  await expect(page).toHaveURL(/\/memo\?memo=/);
  await expect(memoText(page, 0)).toHaveValue("복선 아이디어");
});

test("메모 → 사전 문서: 첫 줄 제목 · 나머지 본문, 되돌리기", async ({ page }) => {
  await writeMemo(page, "북문\n성벽 북쪽의 오래된 문");
  await memos(page).first().getByRole("button", { name: "메모 메뉴" }).click();
  await page.getByRole("menuitem", { name: "사전 문서로…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "장소" }).click();

  await expect(memos(page)).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("'북문' 문서로 옮김");
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(memoText(page, 0)).toHaveValue("북문\n성벽 북쪽의 오래된 문");

  await memos(page).first().getByRole("button", { name: "메모 메뉴" }).click();
  await page.getByRole("menuitem", { name: "사전 문서로…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "장소" }).click();
  await page.getByRole("button", { name: "열기" }).click();
  await expect(page).toHaveURL(/\/wiki\/[^/?]+$/);
  await expect(page.getByRole("textbox", { name: "제목", exact: true })).toHaveValue("북문");
  await expect(page.getByText("성벽 북쪽의 오래된 문")).toBeVisible();
});
