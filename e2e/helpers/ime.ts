import type { CDPSession, Page } from "@playwright/test";

// 스파이크 C1·C2 이식: CDP로 Chromium 실제 IME 경로를 통해 한글 조합 재현
export async function cdp(page: Page): Promise<CDPSession> {
  return page.context().newCDPSession(page);
}

// 조합 중 상태 설정 (예: "ㅎ" → "하" → "한")
export async function setComposition(s: CDPSession, text: string) {
  await s.send("Input.imeSetComposition", {
    text,
    selectionStart: text.length,
    selectionEnd: text.length,
  });
}

// 조합 중 키 입력: 실제 IME처럼 keyCode 229로 전달
export async function keyDuringComposition(s: CDPSession, key: string, code = key) {
  await s.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    windowsVirtualKeyCode: 229,
  });
  await s.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: 229 });
}
