import { expect, test, type Page } from "@playwright/test";
import { cdp, keyDuringComposition, setComposition } from "./helpers/ime";

const tick = (page: Page, t: number) => page.locator(`.tick-label[data-tick="${t}"]`);
const labelInput = (page: Page, t: number) => page.getByRole("textbox", { name: `눈금 ${t} 라벨` });

async function setLabel(page: Page, t: number, text: string) {
  await tick(page, t).click();
  await labelInput(page, t).fill(text);
  await labelInput(page, t).press("Enter");
  await expect(tick(page, t)).toHaveText(text);
}

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

test.describe("시간축", () => {
  test("처음 열면 0 눈금이 화면 가로 중앙", async ({ page }) => {
    await expect(page.getByTestId("time-axis")).toBeVisible();
    const board = (await page.getByTestId("board").boundingBox())!;
    const zero = (await tick(page, 0).boundingBox())!;
    expect(Math.abs(zero.x + zero.width / 2 - (board.x + board.width / 2))).toBeLessThan(4);
    await expect(tick(page, 1)).toHaveText("1");
  });

  test("라벨 편집: Enter 확정 · 굵게 · 새로고침 유지 · Esc 취소 · 비우면 숫자", async ({
    page,
  }) => {
    await setLabel(page, 1, "1년차 봄");
    await expect(tick(page, 1)).toHaveCSS("font-weight", "600");

    await tick(page, 2).click();
    await labelInput(page, 2).fill("취소될 라벨");
    await labelInput(page, 2).press("Escape");
    await expect(tick(page, 2)).toHaveText("2");

    await page.waitForTimeout(800); // 자동 저장 500ms
    await page.reload();
    await expect(tick(page, 1)).toHaveText("1년차 봄");

    await tick(page, 1).click();
    await labelInput(page, 1).fill("");
    await labelInput(page, 1).press("Enter");
    await expect(tick(page, 1)).toHaveText("1");
    await expect(tick(page, 1)).toHaveCSS("font-weight", "500");
  });

  test("한글 조합 중 Enter는 라벨을 확정하지 않음", async ({ page }) => {
    const s = await cdp(page);
    await tick(page, 3).click();
    for (const step of ["ㅎ", "하", "한"]) await setComposition(s, step);
    await keyDuringComposition(s, "Enter");
    await expect(labelInput(page, 3)).toBeVisible();
    await s.send("Input.insertText", { text: "한" });
    await labelInput(page, 3).press("Enter");
    await expect(tick(page, 3)).toHaveText("한");
  });

  test("우클릭 메뉴: 앞에 눈금 삽입 · 라벨 지우기", async ({ page }) => {
    await setLabel(page, 1, "봄");
    await tick(page, 1).click({ button: "right" });
    await page.getByRole("menuitem", { name: "앞에 눈금 삽입" }).click();
    await expect(tick(page, 1)).toHaveText("1");
    await expect(tick(page, 2)).toHaveText("봄");

    await tick(page, 1).click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: "라벨 지우기" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();

    await tick(page, 2).click({ button: "right" });
    await page.getByRole("menuitem", { name: "라벨 지우기" }).click();
    await expect(tick(page, 2)).toHaveText("2");
  });
});

test.describe("구간 접기", () => {
  test("Shift+클릭 두 눈금 → 접기 → 칩 · 구간 안 라벨 숨김 · 새로고침 유지 · 칩 클릭 펼치기", async ({
    page,
  }) => {
    await tick(page, 1).click({ modifiers: ["Shift"] });
    await tick(page, 4).click();
    await expect(page.getByTestId("tick-range")).toBeVisible();
    await page.getByRole("button", { name: "≈ 구간 1~4 접기" }).click();

    const chip = page.getByRole("button", { name: "구간 1~4 펼치기" });
    await expect(chip).toHaveText("≈ 1~4");
    await expect(tick(page, 2)).toHaveCount(0);
    await expect(tick(page, 4)).toBeVisible();
    // 접힌 폭(40px)만큼 4 눈금이 1 눈금 가까이
    const x1 = (await tick(page, 1).boundingBox())!.x;
    const x4 = (await tick(page, 4).boundingBox())!.x;
    expect(x4 - x1).toBeLessThan(80);

    await page.waitForTimeout(800); // 자동 저장
    await page.reload();
    await expect(chip).toBeVisible();

    await chip.click();
    await expect(chip).toBeHidden();
    await expect(tick(page, 2)).toBeVisible();
  });

  test("메뉴 '여기부터 구간 선택' · Esc로 선택 취소", async ({ page }) => {
    await tick(page, 2).click({ button: "right" });
    await page.getByRole("menuitem", { name: "여기부터 구간 선택" }).click();
    await tick(page, 0).click();
    await expect(page.getByRole("button", { name: "≈ 구간 0~2 접기" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("tick-range")).toBeHidden();
    // 선택이 끝나면 클릭은 다시 라벨 편집
    await tick(page, 0).click();
    await expect(labelInput(page, 0)).toBeVisible();
  });
});

test("미정 영역: 0 눈금 왼쪽 점선 상자 · 시간축과 세로 중앙 정렬", async ({ page }) => {
  const zone = page.getByTestId("undated-zone");
  await expect(zone).toContainText("시점 미정");
  await expect(zone).toHaveCSS("border-style", "dashed");
  const z = (await zone.boundingBox())!;
  const zero = (await tick(page, 0).boundingBox())!;
  const axis = (await page.getByTestId("time-axis").boundingBox())!;
  expect(z.x + z.width).toBeLessThan(zero.x);
  expect(Math.abs(z.y + z.height / 2 - (axis.y + axis.height / 2))).toBeLessThan(4);
});
