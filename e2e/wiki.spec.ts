import { expect, test, type Page } from "@playwright/test";
import { cdp, keyDuringComposition, setComposition } from "./helpers/ime";

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

test.describe("분류 설정 · 템플릿", () => {
  const settingsTab = (page: Page) => page.getByRole("tab", { name: "설정" });
  const keyValues = (page: Page) =>
    page
      .getByRole("list", { name: "템플릿 속성" })
      .getByRole("textbox", { name: "속성 이름" })
      .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));

  test("기본 분류: 이동 · 색 잠금, 템플릿 변경은 새 문서에만", async ({ page }) => {
    // 기존 문서 (변경 전 템플릿)
    await page.getByRole("button", { name: "새 문서" }).first().click();
    await nameButton(page, "캐릭터").click();

    await settingsTab(page).click();
    await expect(page.getByText("기본 분류 — 삭제 · 이동 불가")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "상위 분류" })).toBeDisabled();
    await expect(page.getByRole("group", { name: "분류 색" })).toHaveCount(0);
    await expect(page.getByText("기존 문서 1개는 그대로입니다")).toBeVisible();
    expect(await keyValues(page)).toEqual(["나이", "성별", "소속", "능력"]);

    await page.getByRole("button", { name: "키 추가" }).click();
    await page.keyboard.type("나이");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toHaveText("'나이' 속성이 이미 있어요");
    const last = page.getByRole("textbox", { name: "속성 이름" }).last();
    await last.fill("출신");
    await last.press("Enter");
    await page.getByLabel("출신 순서 변경").dragTo(page.getByTestId("prop-row").first(), {
      force: true,
    });
    await page.getByRole("button", { name: "성별 속성 삭제" }).click({ force: true });
    expect(await keyValues(page)).toEqual(["출신", "나이", "소속", "능력"]);

    await page.getByRole("button", { name: "새 문서" }).first().click();
    const keys = page.getByRole("textbox", { name: "속성 이름" });
    await expect(keys).toHaveCount(4);
    expect(await keys.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).toEqual([
      "출신",
      "나이",
      "소속",
      "능력",
    ]);
    // 먼저 만든 문서는 그대로
    await page.getByTestId("doc-row").first().click();
    await expect(page.getByRole("textbox", { name: "성별 값" })).toHaveCount(1);
  });

  test("사용자 분류: 이름 · 색 · 상위 분류 변경", async ({ page }) => {
    await addRoot(page, "용어집");
    await nameButton(page, "용어집").click();
    await settingsTab(page).click();

    const name = page.getByRole("main").getByRole("textbox", { name: "분류 이름" });
    await name.fill("사전 용어");
    await name.press("Enter");
    await expect(row(page, "사전 용어")).toBeVisible();

    await page
      .getByRole("group", { name: "분류 색" })
      .getByRole("button", { name: "코랄" })
      .click();
    await expect(
      page.getByRole("group", { name: "분류 색" }).getByRole("button", { name: "코랄" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("combobox", { name: "상위 분류" }).selectOption({ label: "장소" });
    await expect(row(page, "사전 용어")).toHaveAttribute("data-depth", "1");
    await page.getByRole("combobox", { name: "상위 분류" }).selectOption({ label: "(최상위)" });
    await expect(row(page, "사전 용어")).toHaveAttribute("data-depth", "0");
  });
});

test.describe("@ 링크 · 역링크", () => {
  async function createDoc(page: Page, category: string, title: string, alias?: string) {
    await nameButton(page, category).click();
    await page.getByRole("button", { name: "새 문서" }).first().click();
    const input = page.getByRole("textbox", { name: "제목" });
    await input.fill(title);
    await input.press("Enter");
    await expect(page.getByTestId("doc-row").filter({ hasText: title })).toBeVisible();
    if (alias) {
      await page.getByRole("textbox", { name: "별칭 추가" }).fill(alias);
      await page.getByRole("textbox", { name: "별칭 추가" }).press("Enter");
    }
  }
  const body = (page: Page) => page.getByRole("textbox", { name: "본문" });
  const candidates = (page: Page) => page.getByRole("listbox", { name: "문서 링크 후보" });
  const link = (page: Page) => body(page).getByTestId("wiki-link");

  test("한글 조합 중 Enter는 삽입 안 함 → 칩 · 역링크 · 제목 변경 반영 · 깨진 링크", async ({
    page,
  }) => {
    await createDoc(page, "장소", "왕도");
    await createDoc(page, "장소", "성벽");

    await body(page).click();
    await page.keyboard.type("@");
    const s = await cdp(page);
    for (const step of ["ㅇ", "와", "왕"]) await setComposition(s, step);
    await keyDuringComposition(s, "Enter");
    await expect(link(page)).toHaveCount(0);
    await s.send("Input.insertText", { text: "왕" });
    await expect(candidates(page).getByRole("option")).toHaveText([/왕도/]);
    await page.keyboard.press("Enter");
    await expect(link(page)).toHaveText("왕도");
    await page.keyboard.type("을 지키는 벽");

    await link(page).click();
    await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue("왕도");
    const backlink = page.getByTestId("backlink");
    await expect(backlink).toHaveCount(1);
    await expect(backlink).toContainText("성벽");
    await expect(backlink.locator("mark")).toHaveText("왕도");
    await expect(backlink).toContainText("을 지키는 벽");

    const title = page.getByRole("textbox", { name: "제목" });
    await title.fill("왕성");
    await title.press("Enter");
    await expect(backlink.locator("mark")).toHaveText("왕성");
    await backlink.click();
    await expect(link(page)).toHaveText("왕성");

    await link(page).click();
    await page.getByRole("button", { name: "문서 메뉴" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
    await page.getByRole("main").getByRole("button", { name: "성벽" }).click();
    await expect(link(page)).toHaveAttribute("data-broken", "");
    await expect(link(page)).toHaveText("왕도"); // 삭제 시점 대신 삽입 때 저장한 label
    await link(page).click();
    await expect(page.getByRole("status")).toHaveText("삭제된 문서라 열 수 없어요");
  });

  test("별칭 검색 · Esc 닫기(글자 유지) · Tab 삽입, 빈 역링크", async ({ page }) => {
    await createDoc(page, "캐릭터", "카엘", "붉은 기사");
    await expect(page.getByTestId("backlink")).toHaveCount(0);
    await expect(page.getByText("이 문서를 언급한 문서가 없어요")).toBeVisible();
    await createDoc(page, "장소", "연병장");

    await body(page).click();
    await page.keyboard.type("@붉은");
    const option = candidates(page).getByRole("option");
    await expect(option).toHaveCount(1);
    await expect(option).toContainText("카엘");
    await expect(option).toContainText("별칭 붉은 기사");
    await page.keyboard.press("Escape");
    await expect(candidates(page)).toBeHidden();
    await expect(body(page)).toHaveText("@붉은");

    await page.keyboard.type(" @카");
    await expect(candidates(page).getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(link(page)).toHaveText("카엘");
  });
});
