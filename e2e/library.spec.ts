import { expect, test, type Page } from "@playwright/test";

// 1×1 PNG (표지 업로드용)
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const card = (page: Page, title: string) =>
  page.getByRole("article").filter({ has: page.getByRole("button", { name: title, exact: true }) });

// 서재에서 새 소설 → 보드 → 서재로 복귀
async function newNovel(page: Page, title: string) {
  await page.getByRole("button", { name: "새 소설" }).first().click();
  await page.getByRole("dialog").getByLabel("제목").fill(title);
  await page.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("link", { name: "← 서재" }).click();
  await expect(card(page, title)).toBeVisible();
}

async function menu(page: Page, title: string, item: string) {
  await page.getByRole("button", { name: `${title} 메뉴` }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("빈 서재 → 새 소설 → 보드 → 서재 카드", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "아직 소설이 없어요" })).toBeVisible();
  await newNovel(page, "첫 소설");
  await expect(page.getByText("아직 소설이 없어요")).toBeHidden();
});

test("정보 수정·표지·복제·정렬 유지", async ({ page }) => {
  await newNovel(page, "나무");
  await newNovel(page, "가람");

  await menu(page, "나무", "정보 수정");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("제목").fill("다람쥐");
  await dialog
    .getByLabel("표지 이미지")
    .setInputFiles({ name: "c.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByAltText("표지 미리보기")).toBeVisible();
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(card(page, "다람쥐").locator("img")).toBeVisible();

  await menu(page, "다람쥐", "복제");
  await expect(card(page, "다람쥐 (사본)")).toBeVisible();
  await expect(card(page, "다람쥐 (사본)").locator("img")).toBeVisible(); // 표지도 복제

  await page.getByRole("tab", { name: "제목순" }).click();
  const titles = page.getByRole("article").getByRole("button", { name: /^(가람|다람쥐)/ });
  await expect(titles.first()).toHaveText("가람");
  await page.reload();
  await expect(page.getByRole("tab", { name: "제목순" })).toHaveAttribute("aria-selected", "true");
});

test("삭제 → 되돌리기 / 알림이 끝나면 삭제", async ({ page }) => {
  await newNovel(page, "지울 소설");
  await menu(page, "지울 소설", "삭제");
  await expect(page.getByRole("dialog", { name: "'지울 소설'을 삭제할까요?" })).toBeVisible();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("'지울 소설' 삭제됨");
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(card(page, "지울 소설")).toBeVisible();

  await menu(page, "지울 소설", "삭제");
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("status")).toBeHidden({ timeout: 8000 });
  await expect(page.getByRole("heading", { name: "아직 소설이 없어요" })).toBeVisible();

  // 소프트 삭제가 아니라 하위 레코드까지 물리 삭제됐는지 DB 확인
  const counts = () =>
    page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const open = indexedDB.open("whitenoard");
          open.onsuccess = () => {
            const tx = open.result.transaction(["novels", "boards", "wikiCategories"]);
            const stores = ["novels", "boards", "wikiCategories"].map((s) => tx.objectStore(s));
            Promise.all(
              stores.map(
                (s) =>
                  new Promise<number>((r) => {
                    const req = s.count();
                    req.onsuccess = () => r(req.result);
                  }),
              ),
            ).then(resolve);
          };
        }),
    );
  await expect.poll(counts).toEqual([0, 0, 0]);
});

test("내보내기 → 가져오기, 잘못된 파일은 안내", async ({ page }) => {
  await newNovel(page, "백업 소설");
  const downloading = page.waitForEvent("download");
  await menu(page, "백업 소설", "JSON 내보내기");
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^백업 소설_\d{8}\.whitenoard\.json$/);

  const fileInput = page.getByLabel("JSON 파일 가져오기");
  await fileInput.setInputFiles((await download.path())!);
  await expect(card(page, "백업 소설")).toHaveCount(2);

  await fileInput.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello":1}'),
  });
  const dialog = page.getByRole("dialog", { name: "가져올 수 없는 파일입니다" });
  await expect(dialog).toContainText("WhiteNoard 백업 파일이 아닙니다");
  await dialog.getByRole("button", { name: "닫기" }).click();
  await expect(dialog).toBeHidden();
});

test("샘플 소설로 둘러보기", async ({ page }) => {
  await page.getByRole("button", { name: /샘플 소설로 둘러보기/ }).click();
  await expect(page).toHaveURL(/\/novel\/[^/]+\/board$/);
  await expect(page.getByRole("heading", { name: "잿빛 왕관 (샘플)" })).toBeVisible();
  await page.getByRole("link", { name: "← 서재" }).click();
  await expect(card(page, "잿빛 왕관 (샘플)")).toBeVisible();
});

test("작업공간: 마지막 탭 복귀, 소설 정보 수정, 내보내기", async ({ page }) => {
  await newNovel(page, "탭 소설");
  await card(page, "탭 소설").getByRole("button", { name: "탭 소설", exact: true }).click();
  await page.getByRole("link", { name: "사전" }).click();
  await expect(page).toHaveURL(/\/wiki$/);
  await page.getByRole("link", { name: "← 서재" }).click();
  await card(page, "탭 소설").getByRole("button", { name: "탭 소설", exact: true }).click();
  await expect(page).toHaveURL(/\/wiki$/);

  await page.getByRole("button", { name: "소설 메뉴" }).click();
  await page.getByRole("menuitem", { name: "소설 정보" }).click();
  await page.getByRole("dialog").getByLabel("제목").fill("바뀐 제목");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("heading", { name: "바뀐 제목" })).toBeVisible();

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "소설 메뉴" }).click();
  await page.getByRole("menuitem", { name: "내보내기" }).click();
  expect((await downloading).suggestedFilename()).toMatch(/^바뀐 제목_/);

  await page.getByRole("link", { name: "← 서재" }).click();
  await expect(card(page, "바뀐 제목")).toBeVisible();
});
