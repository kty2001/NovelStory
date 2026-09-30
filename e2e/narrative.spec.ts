import { expect, test, type Page } from "@playwright/test";

// 서술 순서 (F2 1차): 샘플 소설(잿빛 왕관) 기반

const episode = (page: Page, n: number) => page.getByTestId("episode").nth(n);
const eventRow = (page: Page, title: string) =>
  page.getByTestId("event-row").filter({ hasText: title });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /샘플 소설로 둘러보기/ }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
});

test("회차 만들기 → 사건 끌어 배치(여러 회차) · 서술 방식 · 순서 변경 · 새로고침 유지", async ({
  page,
}) => {
  await page.keyboard.press("Alt+4");
  await expect(page).toHaveURL(/\/narrative$/);
  await expect(page.getByTestId("event-row").first()).toContainText("미서술");

  await page.getByRole("button", { name: "첫 회차 만들기" }).click();
  const title = page.getByRole("textbox", { name: "1화 제목" });
  await title.fill("프롤로그");
  await title.press("Enter");

  await eventRow(page, "재의 불꽃 각성").dragTo(episode(page, 0));
  await expect(episode(page, 0).getByTestId("slot-row")).toHaveText(/재의 불꽃 각성/);
  await expect(eventRow(page, "재의 불꽃 각성")).toContainText("1회");

  // 2화: 같은 사건 다시 + 다른 사건
  await page.getByRole("button", { name: "회차", exact: true }).click();
  await eventRow(page, "왕의 서거").dragTo(episode(page, 1));
  await eventRow(page, "재의 불꽃 각성").dragTo(episode(page, 1));
  const second = episode(page, 1).getByTestId("slot-row");
  await expect(second).toHaveCount(2);
  await expect(eventRow(page, "재의 불꽃 각성")).toContainText("2회");

  // 서술 방식
  await episode(page, 0).getByRole("combobox", { name: "서술 방식" }).selectOption("회상");

  // 순서 변경: 2화 첫 슬롯을 두 번째 슬롯 아래쪽으로
  const firstTitle = (await second.first().getByRole("button").first().textContent())!;
  const box = (await second.nth(1).boundingBox())!;
  await second.first().dragTo(second.nth(1), {
    targetPosition: { x: box.width / 2, y: box.height - 2 },
  });
  await expect(second.nth(1)).toContainText(firstTitle);

  // 미서술만
  await page.getByRole("checkbox", { name: "미서술 사건만" }).check();
  await expect(eventRow(page, "왕의 서거")).toHaveCount(0);
  await expect(page.getByTestId("event-row").first()).toContainText("미서술");

  await page.waitForTimeout(800); // 자동 저장 500ms
  await page.reload();
  await expect(episode(page, 0)).toContainText("1화");
  await expect(page.getByRole("textbox", { name: "1화 제목" })).toHaveValue("프롤로그");
  await expect(episode(page, 0).getByRole("combobox", { name: "서술 방식" })).toHaveValue(
    "flashback",
  );
  await expect(episode(page, 1).getByTestId("slot-row").nth(1)).toContainText(firstTitle);
});

test("사건 문서 '배치된 회차' → 서술 탭 그 회차, 회차 삭제 확인 · 번호 당김", async ({ page }) => {
  await page.getByRole("link", { name: "서술" }).click();
  await page.getByRole("button", { name: "첫 회차 만들기" }).click();
  await page.getByRole("button", { name: "회차", exact: true }).click();
  await page.getByRole("textbox", { name: "2화 제목" }).fill("각성");
  await page.getByRole("textbox", { name: "2화 제목" }).press("Enter");
  await eventRow(page, "재의 불꽃 각성").dragTo(episode(page, 1));

  // 슬롯 제목 클릭 = 사전 문서
  await episode(page, 1).getByRole("button", { name: "재의 불꽃 각성" }).click();
  await expect(page).toHaveURL(/\/wiki\//);
  const placed = page.getByRole("button", { name: /2화\s*각성\s*정상 진행/ });
  await expect(placed).toBeVisible();
  await placed.click();
  await expect(page).toHaveURL(/\/narrative\?episode=/);

  // 배치 없는 1화는 바로 삭제, 번호 당김 → 배치 있는 회차는 확인
  await page.getByRole("button", { name: "1화 메뉴" }).click();
  await page.getByRole("menuitem", { name: "회차 삭제" }).click();
  await expect(page.getByTestId("episode")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "1화 제목" })).toHaveValue("각성");

  await page.getByRole("button", { name: "1화 메뉴" }).click();
  await page.getByRole("menuitem", { name: "회차 삭제" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("배치된 사건 1개");
  await dialog.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByRole("button", { name: "첫 회차 만들기" })).toBeVisible();
  await expect(eventRow(page, "재의 불꽃 각성")).toContainText("미서술");
});

test("보드 서술 비교: 읽기 경로 · 역행 강조 · 배지 · 미서술 흐림 · 범위 선택", async ({ page }) => {
  await page.getByRole("link", { name: "서술" }).click();
  await page.getByRole("button", { name: "첫 회차 만들기" }).click();
  await page.getByRole("button", { name: "회차", exact: true }).click();
  // 회차 머리에 놓기 = 끝에 추가. 각성(뒤 시점) → 서거(앞 시점)
  const head = (n: number) => episode(page, n).getByText(`${n + 1}화`, { exact: true });
  for (const n of [0, 1]) {
    await eventRow(page, "재의 불꽃 각성").dragTo(head(n));
    await eventRow(page, "왕의 서거").dragTo(head(n));
    await expect(episode(page, n).getByTestId("slot-row")).toHaveCount(2);
  }
  await episode(page, 1)
    .getByTestId("slot-row")
    .nth(1)
    .getByRole("combobox", { name: "서술 방식" })
    .selectOption("회상");

  await page.getByRole("button", { name: "보드에서 비교" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("button", { name: "서술 비교", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const paths = page.getByTestId("reading-path");
  // 1화 각성 → 서거(표시 없는 역행) → 2화 각성(정방향) → 서거(회상 = 의도된 역행)
  await expect(paths).toHaveCount(3);
  await expect(paths.nth(0)).toHaveAttribute("data-kind", "reverse");
  await expect(paths.nth(1)).toHaveAttribute("data-kind", "forward");
  await expect(paths.nth(2)).toHaveAttribute("data-kind", "intended");
  await expect(page.getByTestId("reverse-count")).toContainText("역행 1곳");
  await expect(page.getByTestId("reading-badges").filter({ hasText: "1화·1" })).toHaveText(
    "1화·12화·1",
  );

  // 서술되지 않은 사건은 흐리게
  const node = (title: string) => page.locator(".react-flow__node").filter({ hasText: title });
  await expect(node("예언서의 발견")).toHaveClass(/narr-dim/);
  await expect(node("왕의 서거")).not.toHaveClass(/narr-dim/);

  await page.getByRole("combobox", { name: "비교 범위" }).selectOption({ label: "2화" });
  await expect(paths).toHaveCount(1);
  await expect(paths.first()).toHaveAttribute("data-kind", "intended");
  await expect(page.getByTestId("reverse-count")).toContainText("역행 0곳");

  await page.getByRole("button", { name: "서술 비교 닫기" }).click();
  await expect(paths).toHaveCount(0);
  await expect(node("예언서의 발견")).not.toHaveClass(/narr-dim/);
  await page.getByRole("button", { name: "서술 비교", exact: true }).click();
  await expect(paths).toHaveCount(3);
});
