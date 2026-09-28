import type { StateItem } from "../../db/types";

// 보드 도구 (shortcuts.md 2.1). 배치 도구는 1회 배치 후 선택 도구로 복귀
export type Tool = "select" | "hand" | "event" | "state" | "sticky" | "text" | "frame" | "line";
export type PlaceTool = Extract<Tool, "event" | "state" | "sticky" | "text">;
export type StateType = StateItem["stateType"];

export const PLACE_TOOLS: readonly Tool[] = ["event", "state", "sticky", "text"];
export const isPlaceTool = (t: Tool): t is PlaceTool => PLACE_TOOLS.includes(t);

// 한/영 모드와 무관하도록 KeyboardEvent.code 기준 (C2)
export const TOOL_BY_CODE: Record<string, Tool> = {
  KeyV: "select",
  KeyH: "hand",
  KeyE: "event",
  KeyC: "state",
  KeyS: "sticky",
  KeyT: "text",
  KeyF: "frame",
  KeyL: "line",
};

// C 도구를 다시 누르면 등장 → 변화 → 퇴장 순환
export const STATE_CYCLE: StateType[] = ["appear", "change", "exit"];

// 텍스트 편집 중이면 보드 단축키 무시 (예외 키는 호출하는 쪽에서 처리)
export const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest("input, textarea, [contenteditable='true']");
