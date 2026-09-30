import type { CSSProperties } from "react";
import type { ColorToken } from "../../db/types";

// 라인 색: "기본"(저장값 muted) = 순서별 ink · muted 테두리, 그 외 = 테두리 색 + 배지 점
export const DEFAULT_LINE_COLOR = "muted";
export const LINE_COLORS: { token: ColorToken; label: string }[] = [
  { token: DEFAULT_LINE_COLOR, label: "기본" },
  { token: "brand-coral", label: "코랄" },
  { token: "brand-pink", label: "핑크" },
  { token: "brand-peach", label: "피치" },
  { token: "brand-ochre", label: "오커" },
  { token: "brand-mint", label: "민트" },
  { token: "brand-lavender", label: "라벤더" },
  { token: "brand-teal", label: "틸" },
];

// 배지 점 · 목록 점 색 (기본이면 없음)
export const lineDotColor = (color: ColorToken | undefined) =>
  color && color !== DEFAULT_LINE_COLOR ? `var(--color-${color})` : undefined;

// 스토리 라인 테두리 (ui_guide `event-block` 표): 라인 순서로 굵기 · 점선 결정, 미지정은 기본 테두리(1px ink/20, 클래스).
// 라인 색을 고르면 색만 바뀜
export function lineBorder(index: number | undefined, color?: ColorToken): CSSProperties {
  if (index === undefined) return {};
  const custom = lineDotColor(color);
  if (index === 0) return { border: `2px solid ${custom ?? "var(--color-ink)"}` };
  const c = custom ?? "var(--color-muted)";
  if (index === 2) return { border: `1.5px dashed ${c}` };
  return { border: `1.5px solid ${c}` };
}

// 필터에서 미지정 라인을 가리키는 값 (UiState.filters.hiddenLineIds)
export const NO_LINE = "none";
