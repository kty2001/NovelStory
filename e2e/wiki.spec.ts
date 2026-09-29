import { expect, test, type Page } from "@playwright/test";
import { cdp, setComposition } from "./helpers/ime";

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
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue("새 문서");
  await expect(page.getByTestId("doc-row")).toHaveText("새 문서");
  await expect(row(page, "장소")).toContainText("1");

  await row(page, "장소").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: /삭제/ })).toContainText("문서 1개");
  await page.keyboard.press("Escape");

  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByTestId("doc-row")).toHaveText("새 문서");
});

test.describe("문서 편집", () => {
  // 1×1 PNG
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );

  async function newDocIn(page: Page, category: string) {
    await nameButton(page, category).click();
    await page.getByRole("button", { name: "새 문서" }).first().click();
    await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue("새 문서");
  }

  test("제목 · 별칭 · 태그: 트리 반영, 비운 제목은 유지, 칩 추가 · 삭제", async ({ page }) => {
    await newDocIn(page, "장소");
    const title = page.getByRole("textbox", { name: "제목" });
    await title.fill("왕도");
    await title.press("Enter");
    await expect(page.getByTestId("doc-row")).toHaveText("왕도");
    await title.fill("");
    await title.press("Enter");
    await expect(title).toHaveValue("왕도");

    const alias = page.getByRole("textbox", { name: "별칭 추가" });
    await alias.fill("수도");
    await alias.press("Enter");
    await alias.fill("수도"); // 중복 무시
    await alias.press("Enter");
    await page.getByRole("textbox", { name: "태그 추가" }).fill("거점");
    await page.getByRole("textbox", { name: "태그 추가" }).press("Enter");
    await expect(page.getByRole("button", { name: "별칭 수도 삭제" })).toHaveCount(1);
    await page.getByRole("button", { name: "태그 거점 삭제" }).click();
    await expect(page.getByRole("button", { name: "태그 거점 삭제" })).toBeHidden();

    await page.waitForTimeout(800); // 자동 저장 500ms
    await page.reload();
    await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue("왕도");
    await expect(page.getByRole("button", { name: "별칭 수도 삭제" })).toBeVisible();
  });

  test("속성: 템플릿 키 · 값 입력 · 중복 키 거부 · 끌어서 순서", async ({ page }) => {
    await newDocIn(page, "장소");
    const keys = page.getByRole("textbox", { name: "속성 이름" });
    await expect(keys).toHaveCount(2);
    expect(await keys.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).toEqual([
      "지역",
      "특징",
    ]);
    await page.getByRole("textbox", { name: "지역 값" }).fill("북부");
    await page.getByRole("textbox", { name: "지역 값" }).press("Enter");

    await page.getByRole("button", { name: "속성 추가" }).click();
    await expect(keys.nth(2)).toBeFocused();
    await page.keyboard.type("특징");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toHaveText("'특징' 속성이 이미 있어요");
    await expect(keys.nth(2)).toHaveValue("새 속성");

    await page
      .getByLabel("새 속성 순서 변경")
      .dragTo(page.getByTestId("prop-row").first(), { force: true });
    expect(await keys.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).toEqual([
      "새 속성",
      "지역",
      "특징",
    ]);

    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "지역 값" })).toHaveValue("북부");
  });

  test("본문: 서식 도구 · 한글 조합 입력, 새로고침 후 유지", async ({ page }) => {
    await newDocIn(page, "장소");
    const body = page.getByRole("textbox", { name: "본문" });
    await body.click();
    await page.getByRole("button", { name: "제목 2" }).click();
    await expect(page.getByRole("button", { name: "제목 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const s = await cdp(page);
    for (const step of ["ㅎ", "하", "한"]) await setComposition(s, step);
    await s.send("Input.insertText", { text: "한" });
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "굵게" }).click();
    await page.keyboard.type("bold");
    await expect(body.locator("h2")).toHaveText("한");
    await expect(body.locator("strong")).toHaveText("bold");

    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "본문" }).locator("h2")).toHaveText("한");
    await expect(page.getByRole("textbox", { name: "본문" }).locator("strong")).toHaveText("bold");
  });

  test("대표 이미지: 업로드 → 표시 · 제거", async ({ page }) => {
    await newDocIn(page, "장소");
    await page
      .getByLabel("대표 이미지")
      .setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("img", { name: "대표 이미지" })).toBeVisible();
    await page.getByRole("button", { name: "이미지 제거" }).click();
    await expect(page.getByRole("img", { name: "대표 이미지" })).toBeHidden();
  });

  test("사건 문서: 라인 선택 · 분류 이동 시 라인 칸 사라짐 · 삭제", async ({ page }) => {
    await newDocIn(page, "사건");
    await page.getByRole("combobox", { name: "스토리 라인" }).selectOption({ label: "메인" });

    await page.getByRole("button", { name: "문서 메뉴" }).click();
    await page.getByRole("menuitem", { name: "분류 이동" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "장소" }).click();
    await expect(page.getByRole("combobox", { name: "스토리 라인" })).toBeHidden();
    await expect(row(page, "장소")).toContainText("1");

    await page.getByRole("button", { name: "문서 메뉴" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(/\/wiki\?category=/);
    await expect(page.getByTestId("doc-row")).toHaveCount(0);
  });
});
