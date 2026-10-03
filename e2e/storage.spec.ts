import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// 저장 실패 · 공간 부족 (UC-42): IndexedDB 쓰기를 QuotaExceededError로 막고 다시 시도 · 내보내기

const memoText = (page: Page) =>
  page.getByTestId("memo").first().getByRole("textbox", { name: "메모 내용" });
const setFull = (page: Page, on: boolean) =>
  page.evaluate((v) => ((window as unknown as { __quotaFull: boolean }).__quotaFull = v), on);

test.beforeEach(async ({ page }) => {
  // 플래그가 켜져 있으면 IndexedDB 쓰기가 공간 부족으로 실패
  await page.addInitScript(() => {
    const w = window as unknown as { __quotaFull: boolean };
    w.__quotaFull = false;
    const block = <T extends object>(proto: T, name: keyof T) => {
      const orig = proto[name] as (...args: unknown[]) => unknown;
      Object.assign(proto, {
        [name](this: unknown, ...args: unknown[]) {
          if (w.__quotaFull) throw new DOMException("가득 참", "QuotaExceededError");
          return orig.apply(this, args);
        },
      });
    };
    block(IDBObjectStore.prototype, "put");
    block(IDBObjectStore.prototype, "add");
    block(IDBCursor.prototype, "update");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "새 소설" }).first().click();
  await page.getByRole("dialog").getByLabel("제목").fill("공간 소설");
  await page.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
  await page.keyboard.press("Alt+5");
  await page.getByRole("button", { name: "첫 메모 쓰기" }).click();
  await memoText(page).fill("저장된 메모");
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
});

test("공간 부족: 저장 실패 표시 → 대화상자(사용량) → 내보내기에 미저장 변경 포함 → 다시 시도 → 유지", async ({
  page,
}) => {
  await setFull(page, true);
  await memoText(page).fill("저장 안 된 메모");
  const failed = page.getByRole("button", { name: "저장 실패 · 다시 시도" });
  await expect(failed).toBeVisible();

  await failed.click();
  const dialog = page.getByRole("dialog", { name: "저장 공간이 부족합니다" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("storage-usage")).toHaveText(/\d.* \/ \d/);

  const downloading = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "이 소설 내보내기" }).click();
  const file = JSON.parse(await readFile((await (await downloading).path())!, "utf8"));
  expect(file.memos.map((m: { body: string }) => m.body)).toEqual(["저장 안 된 메모"]);

  // 계속 실패하면 대화상자 유지
  await dialog.getByRole("button", { name: "다시 시도" }).click();
  await expect(dialog).toBeVisible();

  await setFull(page, false);
  await dialog.getByRole("button", { name: "다시 시도" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();

  await page.reload();
  await expect(memoText(page)).toHaveValue("저장 안 된 메모");
});

test("그 외 저장 실패: 팝오버 다시 시도", async ({ page }) => {
  await page.evaluate(() => {
    // 공간 부족이 아닌 오류
    const orig = IDBObjectStore.prototype.put;
    const w = window as unknown as { __restore: () => void };
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("읽기 전용", "ReadOnlyError");
    };
    w.__restore = () => (IDBObjectStore.prototype.put = orig);
  });
  await memoText(page).fill("다른 오류");
  await page.getByRole("button", { name: "저장 실패 · 다시 시도" }).click();
  const pop = page.getByRole("dialog", { name: "저장하지 못했습니다" });
  await expect(pop.getByRole("button", { name: "JSON 내보내기" })).toBeVisible();

  await page.evaluate(() => (window as unknown as { __restore: () => void }).__restore());
  await pop.getByRole("button", { name: "다시 시도" }).click();
  await expect(pop).toBeHidden();
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
});
