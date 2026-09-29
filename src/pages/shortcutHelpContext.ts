import { createContext } from "react";

// 단축키 도움말 열기 (작업공간 상단 바 · ⋯ 메뉴 · `?` · 빈 보드 안내 카드)
export const ShortcutHelpContext = createContext<() => void>(() => {});
