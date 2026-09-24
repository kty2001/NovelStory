import { expect, test, type Page } from "@playwright/test";
import { cdp, commit, keyDuringComposition, setComposition, typeKorean, 한글 } from "./helpers/ime";

type JSONNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: JSONNode[] };

const api = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window.__spike.c1 as Record<string, (...x: unknown[]) => unknown>)[f as string](...(a as unknown[])), [fn, args] as const);

const json = (page: Page) => api(page, "getJSON") as Promise<JSONNode>;
const text = (page: Page) => api(page, "getText") as Promise<string>;

async function open(page: Page, html = "") {
  await page.goto("/c1");
  await page.waitForFunction(() => !!window.__spike?.c1);
  await api(page, "setContent", html);
  await page.locator(".tiptap").click();
  await api(page, "focusEnd");
}

test.describe("C1 한글 IME (CDP 조합)", () => {
  test("① 빈 줄 첫 글자", async ({ page }) => {
    await open(page);
    const s = await cdp(page);
    await typeKorean(s, 한글);
    expect(await text(page)).toBe("한글");
  });

  test("② 문단 중간 입력", async ({ page }) => {
    await open(page, "<p>가나다</p>");
    await api(page, "setSelection", 2); // '가' 뒤
    const s = await cdp(page);
    await typeKorean(s, [["ㅎ", "하", "한"]]);
    expect(await text(page)).toBe("가한나다");
  });

  for (const [name, html, type] of [
    ["제목", "<h2></h2>", "heading"],
    ["목록", "<ul><li><p></p></li></ul>", "bulletList"],
    ["인용", "<blockquote><p></p></blockquote>", "blockquote"],
  ] as const) {
    test(`③ ${name} 안 입력`, async ({ page }) => {
      await open(page, html);
      await api(page, "focusStart"); // StarterKit의 뒤쪽 빈 문단이 아닌 첫 블록에 커서
      const s = await cdp(page);
      await typeKorean(s, 한글);
      const doc = await json(page);
      expect(doc.content?.[0].type).toBe(type);
      expect((await text(page)).trim()).toBe("한글");
    });
  }

  test("④ 굵게 적용 직후 입력", async ({ page }) => {
    await open(page);
    await api(page, "toggleBold");
    const s = await cdp(page);
    await typeKorean(s, 한글);
    const t = (await json(page)).content?.[0].content?.[0];
    expect(t?.text).toBe("한글");
    expect(t?.marks?.map((m) => m.type)).toEqual(["bold"]);
  });

  test("⑤ 조합 중 Backspace (조합 취소)", async ({ page }) => {
    await open(page, "<p>가나다</p>");
    const s = await cdp(page);
    await setComposition(s, "ㅎ");
    await setComposition(s, "하");
    await keyDuringComposition(s, "Backspace");
    await setComposition(s, "ㅎ");
    await keyDuringComposition(s, "Backspace");
    await setComposition(s, "");
    await commit(s, "");
    expect(await text(page)).toBe("가나다");
  });

  test("⑥ @ 멘션: 한글 조회 → 조합 중 Enter는 확정만 → Enter로 선택", async ({ page }) => {
    await open(page);
    await page.keyboard.type("@");
    const s = await cdp(page);
    await typeKorean(s, [["ㅎ", "호", "홍"]]);
    await setComposition(s, "ㄱ");
    await setComposition(s, "기");
    await setComposition(s, "길");
    await expect(page.getByTestId("suggestions").locator("li")).toHaveCount(1);
    // 조합 중 Enter: 실제 IME처럼 keyCode 229 → 조합 확정
    await keyDuringComposition(s, "Enter");
    await commit(s, "길");
    expect(await api(page, "getJSON")).not.toMatchObject({ content: [{ content: [{ type: "mention" }] }] });
    await expect(page.getByTestId("suggestions")).toBeVisible();
    // 확정 후 Enter: 후보 선택
    await page.keyboard.press("Enter");
    const para = (await json(page)).content?.[0].content ?? [];
    const mention = para.find((n) => n.type === "mention");
    expect(mention?.attrs).toMatchObject({ id: "d1", label: "홍길동" });
    expect(para.some((n) => n.text?.includes("홍길"))).toBe(false);
  });

  test("⑥-2 별칭 검색: @의적 → 홍길동·활빈당", async ({ page }) => {
    await open(page);
    await page.keyboard.type("@");
    const s = await cdp(page);
    await typeKorean(s, [["ㅇ", "의"], ["ㅈ", "저", "적"]]);
    const ids = await page.getByTestId("suggestions").locator("li").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
    expect(ids).toEqual(["d1", "d2"]);
  });

  test("⑦ 실행 취소", async ({ page }) => {
    await open(page, "<p>가나다</p>");
    const s = await cdp(page);
    await typeKorean(s, 한글);
    expect(await text(page)).toBe("가나다한글");
    await page.keyboard.press("Control+z");
    const after = await text(page);
    // 조합 잔여 자모 없이 이전 상태로 복귀해야 함
    expect(after).toMatch(/^가나다(한)?$/);
    expect(after).not.toMatch(/[ㄱ-ㅎㅏ-ㅣ]/);
  });
});

test.describe("C1 기본 입력 @webkit", () => {
  test("한글 텍스트 입력 + @ 멘션 선택 @webkit", async ({ page }) => {
    await open(page);
    await page.keyboard.type("안녕 ");
    await page.keyboard.type("@홍길");
    await expect(page.getByTestId("suggestions").locator("li")).toHaveCount(1);
    await page.keyboard.press("Enter");
    const para = (await json(page)).content?.[0].content ?? [];
    expect(para[0].text).toBe("안녕 ");
    expect(para.find((n) => n.type === "mention")?.attrs).toMatchObject({ id: "d1" });
  });
});
