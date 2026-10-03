import type { KeyboardEvent as ReactKeyboardEvent } from "react";

// 한글 조합 중 키 (C1·C2): 조합 확정용 Enter 등은 단축키 · 확정으로 처리하지 않음
export function isImeKey(e: KeyboardEvent | ReactKeyboardEvent) {
  const native = "nativeEvent" in e ? e.nativeEvent : e;
  return native.isComposing || native.keyCode === 229;
}

// 입력칸 공통: 한글 조합 중 키 무시, Enter = 확정(blur), Esc = 이전 값 복원
export function commitKeys(e: ReactKeyboardEvent<HTMLInputElement>, previous: string) {
  if (isImeKey(e)) return;
  if (e.key === "Escape") e.currentTarget.value = previous;
  if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
}
