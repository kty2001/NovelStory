import { useViewport, ViewportPortal } from "@xyflow/react";

// 보드 좌표 x < 0 = 시점 미정 (xToTick → null). 상자는 그 영역의 안내 표시
// 블록 구현 시 미정 블록 범위에 맞춰 높이 확장
const WIDTH = 240;
const GAP = 40; // 0 눈금과의 간격
const HEIGHT = 560; // 시간축(y = 0) 기준 세로 중앙

// 시간축 왼쪽 "시점 미정" 영역 (UC-16, ui_guide `undated-zone`)
export default function UndatedZone() {
  const { zoom } = useViewport();
  return (
    <ViewportPortal>
      <div
        data-testid="undated-zone"
        className="absolute rounded-lg border-dashed border-muted bg-surface-soft"
        style={{
          transform: `translate(${-(GAP + WIDTH)}px, ${-HEIGHT / 2}px)`,
          width: WIDTH,
          height: HEIGHT,
          borderWidth: 1.5 / zoom,
        }}
      >
        {/* 화면 크기 고정: 1/zoom 역배율 */}
        <div
          className="px-3 py-2 text-caption whitespace-nowrap text-muted"
          style={{ transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}
        >
          시점 미정
        </div>
      </div>
    </ViewportPortal>
  );
}
