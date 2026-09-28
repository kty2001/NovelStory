import type { CSSProperties } from "react";

// 스토리 라인 테두리 (ui_guide `event-block` 표): 라인 순서로 모양 결정, 미지정은 기본 테두리(1px ink/20, 클래스)
export function lineBorder(index: number | undefined): CSSProperties {
  if (index === undefined) return {};
  if (index === 0) return { border: "2px solid var(--color-ink)" };
  if (index === 2) return { border: "1.5px dashed var(--color-muted)" };
  return { border: "1.5px solid var(--color-muted)" };
}

// 필터에서 미지정 라인을 가리키는 값 (UiState.filters.hiddenLineIds)
export const NO_LINE = "none";
