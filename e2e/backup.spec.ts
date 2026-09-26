import { expect, test, type Page } from "@playwright/test";

// 소설 생성 UI(F0) 전까지 쓰는 시드: 앱이 Dexie 스키마를 만든 뒤 원시 IndexedDB로 레코드 기록
async function seed(page: Page, stores: Record<string, object[]>) {
  await page.goto("/novel/seed/board"); // 로드 시도로 DB 생성
  await expect(page.getByRole("heading", { name: "소설을 찾을 수 없음" })).toBeVisible();
  await page.evaluate(
    (stores) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("whitenoard");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(Object.keys(stores), "readwrite");
          for (const [name, rows] of Object.entries(stores)) {
            for (const row of rows) tx.objectStore(name).put(row);
          }
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    stores,
  );
}

test("백업 알림: 미백업 소설에 표시, 나중에 → 숨김 유지", async ({ page }) => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  await seed(page, {
    novels: [{ id: "n1", title: "테스트 소설", createdAt: tenDaysAgo, updatedAt: tenDaysAgo }],
    boards: [
      {
        id: "n1",
        novelId: "n1",
        updatedAt: tenDaysAgo,
        timeScale: { pxPerTick: 120, collapsedPx: 40, tickLabels: {}, collapsed: [], snap: true },
        stateLanes: { enabled: false, order: [] },
      },
    ],
  });

  await page.goto("/novel/n1/board");
  await expect(page.getByRole("heading", { name: "테스트 소설" })).toBeVisible();
  const banner = page.getByText("아직 백업하지 않음");
  await expect(banner).toBeVisible();

  await page.getByRole("button", { name: "나중에" }).click();
  await expect(banner).toBeHidden();

  // 숨김 기간이 기록돼야 새로고침 후에도 숨김 (기록은 비동기)
  const readSnooze = () =>
    page.evaluate(
      () =>
        new Promise<string | undefined>((resolve) => {
          const open = indexedDB.open("whitenoard");
          open.onsuccess = () => {
            const get = open.result.transaction("uiState").objectStore("uiState").get("n1");
            get.onsuccess = () => resolve(get.result?.backupSnoozedUntil);
          };
        }),
    );
  await expect.poll(async () => Date.parse((await readSnooze()) ?? "") > Date.now()).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: "테스트 소설" })).toBeVisible();
  await expect(banner).toBeHidden();
});
