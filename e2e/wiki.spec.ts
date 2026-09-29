import { expect, test, type Page } from "@playwright/test";

// 분류 이름 버튼 (기본 분류는 🔒 "기본 분류"가 이름에 붙음)
const nameButton = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name}( 기본 분류)?$`) });
const row = (page: Page, name: string) =>
  page.getByTestId("category-row").filter({ has: nameButton(page, name) });
const rootNames = (page: Page) =>
  page
    .locator('[data-testid="category-row"][data-depth="0"] button:nth-of-type(2)')
    .allTextContents();

async function addRoot(page: Page, name: string) {
  await page.getByRole("button", { name: "분류", exact: true }).click();
  await page.getByRole("textbox", { name: "분류 이름" }).fill(name);
  await page.getByRole("textbox", { name: "분류 이름" }).press("Enter");
  await expect(row(page, name)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "새 소설" }).first().click();
  await page.getByRole("dialog").getByLabel("제목").fill("사전 소설");
  await page.getByRole("button", { name: "만들기" }).click();
  await page.getByRole("link", { name: "사전" }).click();
  await expect(page).toHaveURL(/\/wiki$/);
});

test("기본 분류 6개 · 🔒 캐릭터 · 사건, 첫 진입은 캐릭터 분류 화면", async ({ page }) => {
  expect(await rootNames(page)).toEqual([
    "캐릭터",
    "사건",
    "장소",
    "세력·조직",
    "아이템",
    "세계관 설정",
  ]);
  await expect(page.getByRole("img", { name: "기본 분류" })).toHaveCount(2);
  await expect(row(page, "캐릭터")).toHaveAttribute("draggable", "false");
  await expect(row(page, "장소")).toHaveAttribute("draggable", "true");
  await expect(page.getByRole("heading", { name: "캐릭터" })).toBeVisible();
});

test("분류 추가 · 하위 분류 · 이름 변경 취소", async ({ page }) => {
  await addRoot(page, "용어집");
  expect((await rootNames(page)).at(-1)).toBe("용어집");

  await row(page, "용어집").click({ button: "right" });
  await page.getByRole("menuitem", { name: "하위 분류 만들기" }).click();
  await page.getByRole("textbox", { name: "분류 이름" }).fill("마법");
  await page.getByRole("textbox", { name: "분류 이름" }).press("Enter");
  await expect(row(page, "마법")).toHaveAttribute("data-depth", "1");

  await nameButton(page, "마법").dblclick();
  await page.getByRole("textbox", { name: "분류 이름" }).fill("주문");
  await page.getByRole("textbox", { name: "분류 이름" }).press("Escape");
  await expect(row(page, "마법")).toBeVisible();

  // 하위 분류가 있으면 삭제 비활성 + 이유
  await row(page, "용어집").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: /삭제/ })).toBeDisabled();
  await expect(page.getByRole("menuitem", { name: /삭제/ })).toContainText("하위 분류 1개");
});

test("끌어 놓기: 가운데 = 하위로, 위쪽 = 앞으로", async ({ page }) => {
  await addRoot(page, "용어집");

  await row(page, "용어집").dragTo(row(page, "장소"), { targetPosition: { x: 60, y: 16 } });
  await expect(row(page, "용어집")).toHaveAttribute("data-depth", "1");
  expect(await rootNames(page)).not.toContain("용어집");

  await row(page, "용어집").dragTo(row(page, "캐릭터"), { targetPosition: { x: 60, y: 2 } });
  await expect(row(page, "용어집")).toHaveAttribute("data-depth", "0");
  expect((await rootNames(page))[0]).toBe("용어집");

  await page.waitForTimeout(800); // 자동 저장 500ms
  await page.reload();
  await expect(row(page, "용어집")).toHaveAttribute("data-depth", "0");
  expect((await rootNames(page))[0]).toBe("용어집");
});

test("새 문서: 선택 분류에 생성 · 문서 열기, 문서 있는 분류는 삭제 비활성", async ({ page }) => {
  await nameButton(page, "장소").click();
  await expect(page).toHaveURL(/\/wiki\?category=/);
  await page.getByRole("button", { name: "새 문서" }).first().click();
  await expect(page).toHaveURL(/\/wiki\/[^/?]+$/);
  await expect(page.getByRole("heading", { name: "새 문서" })).toBeVisible();
  await expect(page.getByTestId("doc-row")).toHaveText("새 문서");
  await expect(row(page, "장소")).toContainText("1");

  await row(page, "장소").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: /삭제/ })).toContainText("문서 1개");
  await page.keyboard.press("Escape");

  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByTestId("doc-row")).toHaveText("새 문서");
});
