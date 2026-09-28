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

test("빈 보드: 미니맵에 시간축 · 미정 영역, 화면 맞춤은 둘을 기준으로", async ({ page }) => {
  const minimap = page.locator(".react-flow__minimap");
  await expect(minimap.locator("line.minimap-axis")).toHaveCount(1);
  await expect(minimap.locator("rect.minimap-undated")).toHaveCount(1);

  const zoomLabel = page.getByRole("button", { name: "100%로 보기" });
  await page.getByRole("button", { name: "화면 맞춤" }).click();
  await expect(zoomLabel).not.toHaveText("100%");
  await expect(page.getByTestId("undated-zone")).toBeInViewport();
  await expect(page.getByTestId("time-axis")).toBeInViewport();
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

// 눈금 t의 화면 x (라벨 가운데), 시간축 화면 y
async function tickX(page: Page, t: number) {
  const b = (await tick(page, t).boundingBox())!;
  return b.x + b.width / 2;
}
async function axisY(page: Page) {
  const b = (await page.getByTestId("time-axis").boundingBox())!;
  return b.y + b.height / 2;
}
const toolButton = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: typeof name === "string" });

// 도구 모음 버튼을 끌어 (x, y)에 놓기
async function dragTool(
  page: Page,
  name: string,
  x: number,
  y: number,
  opts: { alt?: boolean } = {},
) {
  const b = (await toolButton(page, name).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 8 });
  if (opts.alt) await page.keyboard.down("Alt");
  await page.mouse.move(x + 1, y, { steps: 2 });
  await page.mouse.up();
  if (opts.alt) await page.keyboard.up("Alt");
}

test.describe("도구 모음 · 배치", () => {
  test("도구 단축키(한/영 무관 code 기준) · Esc로 선택 복귀 · 미구현 도구 비활성", async ({
    page,
  }) => {
    await expect(toolButton(page, "선택")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("KeyE");
    await expect(toolButton(page, "사건")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(toolButton(page, "선택")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("KeyH");
    await expect(toolButton(page, "손")).toHaveAttribute("aria-pressed", "true");
    await expect(toolButton(page, "포스트잇")).toBeDisabled();
  });

  test("사건 도구를 끌어 놓으면 가까운 눈금에 스냅 · 선택 도구로 복귀", async ({ page }) => {
    const x2 = await tickX(page, 2);
    const y = (await axisY(page)) - 90;
    const b = (await toolButton(page, "사건").boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(x2 + 30, y, { steps: 8 });
    await expect(page.getByTestId("place-tick")).toHaveText("2");
    await page.mouse.up();
    // 배치 직후 제목 입력 (UC-10)
    await expect(page.getByRole("textbox", { name: "사건 제목" })).toBeFocused();
    await page.keyboard.press("Enter");

    const block = page.getByTestId("event-block");
    await expect(block).toHaveText("새 사건");
    const bb = (await block.boundingBox())!;
    expect(bb.width).toBeCloseTo(160, 0); // 단일 시점 사건 고정 폭
    expect(Math.abs(bb.x + bb.width / 2 - x2)).toBeLessThan(2);
    await expect(page.getByTestId("place-preview")).toBeHidden();
    await expect(toolButton(page, "선택")).toHaveAttribute("aria-pressed", "true");

    await page.waitForTimeout(800); // 자동 저장
    await page.reload();
    await expect(page.getByTestId("event-block")).toHaveText("새 사건");
  });

  test("도구 선택 후 클릭 배치 · 미정 영역에 놓으면 시점 없음", async ({ page }) => {
    await toolButton(page, "사건").click();
    const x3 = await tickX(page, 3);
    const y = (await axisY(page)) - 90;
    await page.mouse.move(x3 - 20, y);
    await expect(page.getByTestId("place-tick")).toHaveText("3");
    await page.mouse.click(x3 - 20, y);
    const bb = (await page.getByTestId("event-block").boundingBox())!;
    expect(Math.abs(bb.x + bb.width / 2 - x3)).toBeLessThan(2);

    const zone = (await page.getByTestId("undated-zone").boundingBox())!;
    await dragTool(page, "사건", zone.x + zone.width / 2, zone.y + 120);
    await expect(page.getByTestId("event-block")).toHaveCount(2);
    const undated = (await page.getByTestId("event-block").nth(1).boundingBox())!;
    expect(Math.abs(undated.x + undated.width / 2 - (zone.x + zone.width / 2))).toBeLessThan(2);
  });

  test("스냅 끄기 · Alt 누른 채 끌면 눈금 사이에 배치", async ({ page }) => {
    const x2 = await tickX(page, 2);
    const x3 = await tickX(page, 3);
    const y = (await axisY(page)) - 90;
    const mid = (x2 + x3) / 2;

    await dragTool(page, "사건", mid, y, { alt: true });
    const a = (await page.getByTestId("event-block").boundingBox())!;
    expect(Math.abs(a.x + a.width / 2 - (mid + 1))).toBeLessThan(2);

    await page.getByRole("button", { name: "스냅" }).click();
    await expect(page.getByRole("button", { name: "스냅" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await dragTool(page, "사건", mid, y - 100);
    const b = (await page.getByTestId("event-block").nth(1).boundingBox())!;
    expect(Math.abs(b.x + b.width / 2 - (mid + 1))).toBeLessThan(2);
  });

  test("손 도구: 빈 곳 드래그 = 화면 이동", async ({ page }) => {
    await expect(page.getByTestId("time-axis")).toBeVisible(); // 보드 로드 후 키 입력
    await page.keyboard.press("KeyH");
    await expect(toolButton(page, "손")).toHaveAttribute("aria-pressed", "true");
    const before = await tickX(page, 0);
    const y = (await axisY(page)) - 200;
    await page.mouse.move(before + 300, y);
    await page.mouse.down();
    await page.mouse.move(before + 400, y, { steps: 5 });
    await page.mouse.up();
    expect(await tickX(page, 0)).toBeCloseTo(before + 100, 0);
  });
});

// 눈금 t 위(기본 축 위 90px)에 사건 배치 + 제목 입력
async function placeEvent(page: Page, t: number, title: string, dy = -90) {
  await dragTool(page, "사건", await tickX(page, t), (await axisY(page)) + dy);
  const input = page.getByRole("textbox", { name: "사건 제목" });
  await input.fill(title);
  await input.press("Enter");
  const block = page.getByTestId("event-block").filter({ hasText: title });
  await expect(block).toBeVisible();
  return block;
}

// 요소를 (x, y)로 끌기
async function dragTo(
  page: Page,
  target: import("@playwright/test").Locator,
  x: number,
  y: number,
) {
  const b = (await target.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

const center = async (l: import("@playwright/test").Locator) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, width: b.width, left: b.x };
};

test.describe("사건 블록", () => {
  test("제목: 배치 직후 입력 · 새로고침 유지 · 더블클릭 재편집 · 비우면 유지", async ({ page }) => {
    const block = await placeEvent(page, 2, "왕도 습격");
    await page.waitForTimeout(800);
    await page.reload();
    await expect(block).toBeVisible();

    await block.dblclick();
    const input = page.getByRole("textbox", { name: "사건 제목" });
    await input.fill("왕도 함락");
    await input.press("Enter");
    await expect(page.getByTestId("event-block")).toHaveText("왕도 함락");

    await page.getByTestId("event-block").dblclick();
    await input.fill("   ");
    await input.press("Enter");
    await expect(page.getByTestId("event-block")).toHaveText("왕도 함락");
  });

  test("끌어서 시점 이동(스냅) · 미정 영역 오가기 · 지시선", async ({ page }) => {
    const block = await placeEvent(page, 2, "첫 만남");
    await expect(page.getByTestId("leader")).toHaveCount(1);

    const x4 = await tickX(page, 4);
    const c0 = await center(block);
    await dragTo(page, block, x4 + 20, c0.y);
    await expect.poll(async () => Math.round((await center(block)).x - x4)).toBe(0);

    const zone = (await page.getByTestId("undated-zone").boundingBox())!;
    await dragTo(page, block, zone.x + zone.width / 2, zone.y + 150);
    const inZone = await center(block);
    expect(inZone.x).toBeGreaterThan(zone.x);
    expect(inZone.x).toBeLessThan(zone.x + zone.width);
    await expect(page.getByTestId("leader")).toHaveCount(0);

    const x1 = await tickX(page, 1);
    await dragTo(page, block, x1 - 25, c0.y);
    await expect.poll(async () => Math.round((await center(block)).x - x1)).toBe(0);
    await expect(page.getByTestId("leader")).toHaveCount(1);
  });

  test("양 끝 핸들로 기간 조절 · 시작으로 되돌리면 단일 시점", async ({ page }) => {
    const block = await placeEvent(page, 2, "원정");
    await block.click();
    const x2 = await tickX(page, 2);
    const x5 = await tickX(page, 5);
    await dragTo(page, page.getByTestId("resize-end"), x5 + 10, (await center(block)).y);
    await expect.poll(async () => Math.round((await center(block)).left - x2)).toBe(0);
    expect(Math.abs((await center(block)).width - (x5 - x2))).toBeLessThan(2);
    await expect(page.getByTestId("leader")).toHaveCount(2);

    await block.click();
    await dragTo(page, page.getByTestId("resize-end"), x2 + 5, (await center(block)).y);
    await expect.poll(async () => Math.round((await center(block)).width)).toBe(160);
    expect(Math.abs((await center(block)).x - x2)).toBeLessThan(2);
  });

  test("블록 메뉴: 색 변경", async ({ page }) => {
    const block = await placeEvent(page, 2, "밀약");
    await block.click();
    await page.getByRole("button", { name: "색: 민트" }).click();
    await expect(block).toHaveCSS("background-color", "rgb(164, 212, 197)");
    await expect(page.getByRole("button", { name: "색: 민트" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

test.describe("스토리 라인", () => {
  const lineButton = (page: Page) => page.getByRole("button", { name: /^라인:/ });

  async function setLine(page: Page, block: import("@playwright/test").Locator, line: string) {
    await block.click();
    await lineButton(page).click();
    await page.getByRole("menuitem", { name: line, exact: true }).click();
  }

  test("블록 메뉴로 지정 → 배지 · 라인별 테두리 (메인 굵은 실선 / 사이드 점선)", async ({
    page,
  }) => {
    const block = await placeEvent(page, 2, "왕도 습격");
    await setLine(page, block, "메인");
    await expect(block).toHaveAttribute("data-line", "메인");
    await expect(block.locator(".line-badge")).toHaveText("메인");
    await expect(block).toHaveCSS("border-top-width", "2px");
    await expect(block).toHaveCSS("border-top-style", "solid");

    await setLine(page, block, "사이드");
    await expect(block).toHaveCSS("border-top-style", "dashed");

    await setLine(page, block, "미지정");
    await expect(block).toHaveAttribute("data-line", "");
    await expect(block).toHaveCSS("border-top-width", "0px");
  });

  test("여러 블록 선택(Shift+클릭) 후 한꺼번에 지정", async ({ page }) => {
    const a = await placeEvent(page, 1, "가");
    const b = await placeEvent(page, 3, "나");
    await a.click();
    await b.click({ modifiers: ["Shift"] });
    await expect(lineButton(page)).toHaveText("라인: 미지정");
    await lineButton(page).click();
    await page.getByRole("menuitem", { name: "서브", exact: true }).click();
    await expect(a).toHaveAttribute("data-line", "서브");
    await expect(b).toHaveAttribute("data-line", "서브");
  });

  test("필터: 라인 숨김 · 개수 배지 · 새로고침 유지 · 모두 표시", async ({ page }) => {
    const main = await placeEvent(page, 1, "핵심");
    await setLine(page, main, "메인");
    const other = await placeEvent(page, 3, "곁가지");

    await page.getByRole("button", { name: "필터" }).click();
    const filter = page.getByRole("dialog", { name: "필터" });
    await filter.getByRole("checkbox").first().uncheck(); // 메인
    await expect(main).toBeHidden();
    await expect(other).toBeVisible();
    await expect(page.getByTestId("filter-count")).toHaveText("1");

    await page.waitForTimeout(800); // 자동 저장 500ms
    await page.reload();
    await expect(page.getByTestId("event-block").filter({ hasText: "곁가지" })).toBeVisible();
    await expect(page.getByTestId("event-block").filter({ hasText: "핵심" })).toBeHidden();

    await page.getByRole("button", { name: "필터" }).click();
    await page.getByRole("button", { name: "모두 표시" }).click();
    await expect(page.getByTestId("event-block").filter({ hasText: "핵심" })).toBeVisible();
  });

  test("라인 편집: 이름 변경 · 추가 · 끌어서 순서 변경 · 사용 중인 라인 삭제 확인", async ({
    page,
  }) => {
    const block = await placeEvent(page, 2, "회상 장면");
    await setLine(page, block, "사이드");
    await block.click();
    await lineButton(page).click();
    await page.getByRole("menuitem", { name: "라인 편집…" }).click();
    const dialog = page.getByRole("dialog", { name: "스토리 라인 편집" });

    const third = dialog.getByRole("textbox", { name: "라인 3 이름" });
    await third.fill("회상");
    await third.press("Enter");
    await expect(block).toHaveAttribute("data-line", "회상");

    await dialog.getByRole("button", { name: "라인 추가" }).click();
    await expect(dialog.getByTestId("line-row")).toHaveCount(4);

    // 회상(3번째)을 맨 위로 → 메인 자리(굵은 실선)
    await dialog.getByLabel("회상 순서 변경").dragTo(dialog.getByTestId("line-row").first());
    await expect(dialog.getByRole("textbox", { name: "라인 1 이름" })).toHaveValue("회상");
    await expect(block).toHaveCSS("border-top-width", "2px");

    await dialog.getByRole("button", { name: "회상 삭제" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(/사건 1개가 미지정이 됩니다/);
    await dialog.getByRole("alert").getByRole("button", { name: "삭제" }).click();
    await expect(dialog.getByTestId("line-row")).toHaveCount(3);
    await expect(block).toHaveAttribute("data-line", "");
    await dialog.getByRole("button", { name: "완료" }).click();
    await expect(dialog).toBeHidden();
  });
});
