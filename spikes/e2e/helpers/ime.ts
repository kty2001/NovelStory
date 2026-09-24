import type { CDPSession, Page } from "@playwright/test";

// CDP로 Chromium 실제 IME 경로를 통해 한글 조합 재현
export async function cdp(page: Page): Promise<CDPSession> {
  return page.context().newCDPSession(page);
}

// 조합 중 상태 설정 (예: "ㅎ" → "하" → "한")
export async function setComposition(s: CDPSession, text: string) {
  await s.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
}

// 조합 확정
export async function commit(s: CDPSession, text: string) {
  await s.send("Input.insertText", { text });
}

// 음절 단위 입력: [["ㅎ","하","한"], ["ㄱ","그","글"]] → "한글"
export async function typeKorean(s: CDPSession, syllables: string[][]) {
  for (const steps of syllables) {
    for (const step of steps) await setComposition(s, step);
    await commit(s, steps.at(-1)!);
  }
}

// 조합 중 키 입력: 실제 IME처럼 keyCode 229로 전달
export async function keyDuringComposition(s: CDPSession, key: string, code = key) {
  await s.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: 229 });
  await s.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: 229 });
}

// 한글 입력 모드에서 편집 영역 밖 키 입력: key는 한글 자모, code는 물리 키
export async function koreanModeKey(s: CDPSession, key: string, code: string, vk: number) {
  await s.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk });
  await s.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
}

export const 한글 = [
  ["ㅎ", "하", "한"],
  ["ㄱ", "그", "글"],
];
