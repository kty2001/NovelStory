import type { ShapeKind, StateItem } from "../../db/types";

// 보드 도구 (shortcuts.md 2.1). 배치 도구는 1회 배치 후 선택 도구로 복귀
export type Tool =
  "select" | "hand" | "event" | "state" | "sticky" | "text" | "shape" | "frame" | "line";
export type PlaceTool = Extract<Tool, "event" | "state" | "sticky" | "text" | "shape">;
export type StateType = StateItem["stateType"];

const PLACE_TOOLS: readonly Tool[] = ["event", "state", "sticky", "text", "shape"];
export const isPlaceTool = (t: Tool): t is PlaceTool => PLACE_TOOLS.includes(t);

// 한/영 모드와 무관하도록 KeyboardEvent.code 기준 (C2)
export const TOOL_BY_CODE: Record<string, Tool> = {
  KeyV: "select",
  KeyH: "hand",
  KeyE: "event",
  KeyC: "state",
  KeyS: "sticky",
  KeyT: "text",
  KeyR: "shape",
  KeyF: "frame",
  KeyL: "line",
};

// C 도구를 다시 누르면 등장 → 변화 → 퇴장 순환
export const STATE_CYCLE: StateType[] = ["appear", "change", "exit"];
export const STATE_LABEL: Record<StateType, string> = {
  appear: "등장",
  change: "변화",
  exit: "퇴장",
};

// 상태 블록 유형별 색 · 기호 (ui_guide `state-block`: 등장 mint / 변화 lavender / 퇴장 teal 진한 채움)
export const STATE_LOOK: Record<StateType, { mark: string; bg: string; fg: string }> = {
  appear: { mark: "▲", bg: "var(--color-brand-mint)", fg: "var(--color-ink)" },
  change: { mark: "◆", bg: "var(--color-brand-lavender)", fg: "var(--color-ink)" },
  exit: { mark: "▼", bg: "var(--color-brand-teal)", fg: "var(--color-on-primary)" },
};

// R 도구를 다시 누르면 사각형 → 원 → 마름모 순환 (O = 원으로 바로)
export const SHAPE_CYCLE: ShapeKind[] = ["rect", "ellipse", "diamond"];
export const SHAPE_LABEL: Record<ShapeKind, string> = {
  rect: "사각형",
  ellipse: "원",
  diamond: "마름모",
};

// 텍스트 편집 · 목록 선택 중이면 보드 단축키 무시 (예외 키는 호출하는 쪽에서 처리)
export const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest("input, textarea, select, [contenteditable='true']");
