import { expect, test, type Page } from "@playwright/test";

// 샘플 소설(잿빛 왕관) 기반: 사전 시점 선택 보기 · 개요 · 보드 문서 목록 · 설정 점검

const tree = (page: Page) => page.getByRole("list", { name: "분류 트리" });

async function openWiki(page: Page) {
  await page.getByRole("link", { name: "사전" }).click();
  await expect(page).toHaveURL(/\/wiki$/);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /샘플 소설로 둘러보기/ }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
});

test("사전 시점 선택: 캐릭터 문서 · 표에서 그 시점 상태, 달라진 칸 강조", async ({ page }) => {
  await openWiki(page);
  await tree(page).getByRole("button", { name: "캐릭터 펼치기" }).click();
  await page.getByTestId("doc-row").filter({ hasText: "레아" }).click();

  const pick = page.getByRole("combobox", { name: "시점 선택" });
  await expect(pick.getByRole("option")).toHaveText(["문서 기본값", "1년차 봄", "2년차 봄"]);
  await pick.selectOption({ label: "2년차 봄" });
  const ability = page.getByRole("list", { name: "시점 속성" }).getByLabel("능력 값");
  await expect(ability).toHaveText("재의 불꽃");
  await expect(ability).toHaveAttribute("data-changed", "true");
  await expect(
    page.getByRole("list", { name: "시점 속성" }).getByLabel("나이 값"),
  ).not.toHaveAttribute("data-changed");
  await pick.selectOption({ label: "문서 기본값" });
  await expect(page.getByRole("textbox", { name: "능력 값" })).toHaveValue("없음");

  // 표: 캐릭터들의 눈금 전체, 시점 상태는 읽기 전용
  await tree(page)
    .getByRole("button", { name: /^캐릭터( 기본 분류)?$/ })
    .click();
  await page.getByRole("tab", { name: "표" }).click();
  await page.getByRole("combobox", { name: "시점 선택" }).selectOption({ label: "5년차 가을" });
  const cell = page.getByLabel("카엘 소속");
  await expect(cell).toHaveText("북부 연합");
  await expect(cell).toHaveAttribute("data-changed", "true");
  await expect(page.getByRole("textbox", { name: "카엘 소속" })).toHaveCount(0);
});

test("개요: Alt+3 이동 · 시놉시스 저장 유지 · 스토리 흐름 행 → 보드 블록", async ({ page }) => {
  await page.keyboard.press("Alt+3");
  await expect(page).toHaveURL(/\/overview$/);

  const synopsis = page.getByRole("textbox", { name: "시놉시스" });
  await synopsis.click();
  await page.keyboard.type("왕좌를 잃은 공주의 복수극");
  await page.waitForTimeout(800); // 자동 저장 500ms
  await page.reload();
  await expect(page.getByRole("textbox", { name: "시놉시스" })).toContainText(
    "왕좌를 잃은 공주의 복수극",
  );

  // 1부 프레임 → 라인별 시점순, 프레임 밖 · 미정 사건은 끝
  const flow = page.getByRole("region", { name: "스토리 흐름" });
  await expect(flow.getByRole("heading", { name: "1부" })).toBeVisible();
  await expect(flow.getByRole("heading", { name: "프레임 밖" })).toBeVisible();
  await expect(flow.getByTestId("flow-row").last()).toContainText("미정");

  await flow.getByTestId("flow-row").filter({ hasText: "재의 불꽃 각성" }).click();
  await expect(page).toHaveURL(/\/board/);
  await expect(page.locator(".react-flow__node.selected")).toContainText("재의 불꽃 각성");
});

test("보드 문서 목록: 사전 패널과 동시 표시 · 보드에 없는 문서만 · 끌어 놓아 배치", async ({
  page,
}) => {
  // 블록 없는 사건 문서 준비
  await openWiki(page);
  await tree(page)
    .getByRole("button", { name: /^사건( 기본 분류)?$/ })
    .click();
  await page.getByRole("button", { name: "새 문서" }).first().click();
  await page.getByRole("textbox", { name: "제목" }).fill("밀약");
  await page.getByRole("textbox", { name: "제목" }).press("Enter");
  await page.getByRole("link", { name: "보드" }).click();

  await page.getByRole("button", { name: "문서 목록" }).click();
  const sidebar = page.getByRole("complementary", { name: "문서 목록" });
  await expect(
    sidebar.getByRole("region", { name: "캐릭터" }).getByTestId("sidebar-doc"),
  ).toHaveCount(3);
  await sidebar.getByRole("checkbox", { name: "보드에 없는 문서만" }).check();
  await expect(sidebar.getByTestId("sidebar-doc")).toHaveText(["밀약"]);

  // 클릭 = 사전 패널 (사이드바는 그대로)
  await sidebar.getByRole("button", { name: "밀약" }).click();
  await expect(
    page.getByRole("complementary", { name: "사전 패널" }).getByRole("textbox", { name: "제목" }),
  ).toHaveValue("밀약");
  await expect(sidebar).toBeVisible();

  const pane = (await page.locator(".react-flow__pane").boundingBox())!;
  // 0 눈금 사건 블록 위 빈 곳
  const king = (await page
    .getByTestId("event-block")
    .filter({ hasText: "왕의 서거" })
    .boundingBox())!;
  await sidebar
    .getByTestId("sidebar-doc")
    .filter({ hasText: "밀약" })
    .dragTo(page.locator(".react-flow__pane"), {
      targetPosition: {
        x: king.x + 20 - pane.x,
        y: king.y - 120 - pane.y,
      },
    });
  await expect(page.getByTestId("event-block").filter({ hasText: "밀약" })).toHaveCount(1);
  await expect(sidebar.getByTestId("sidebar-doc")).toHaveCount(0);

  await sidebar.getByRole("button", { name: "문서 목록 닫기" }).click();
  await expect(sidebar).toBeHidden();
});

test("설정 점검: 항목 수 · 문서 항목 = 문서 열기 · 블록 항목 = 보드 그 블록", async ({ page }) => {
  await openWiki(page);
  const button = page.getByRole("button", { name: /^설정 점검/ });
  await expect(button).toContainText("1"); // 샘플: 미정 사건 1개

  // 새 사건 문서 = 보드에 없는 문서
  await tree(page)
    .getByRole("button", { name: /^사건( 기본 분류)?$/ })
    .click();
  await page.getByRole("button", { name: "새 문서" }).first().click();
  await page.getByRole("textbox", { name: "제목" }).fill("밀약");
  await page.getByRole("textbox", { name: "제목" }).press("Enter");
  await expect(button).toContainText("2");

  await button.click();
  await expect(page).toHaveURL(/\?view=check$/);
  const unplaced = page.getByRole("region", { name: "보드에 없는 캐릭터 · 사건" });
  await unplaced.getByTestId("check-row").filter({ hasText: "밀약" }).click();
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue("밀약");

  await button.click();
  await page
    .getByRole("region", { name: "시점 미정 사건" })
    .getByTestId("check-row")
    .filter({ hasText: "예언서의 발견" })
    .click();
  await expect(page).toHaveURL(/\/board/);
  await expect(page.locator(".react-flow__node.selected")).toContainText("예언서의 발견");
});
