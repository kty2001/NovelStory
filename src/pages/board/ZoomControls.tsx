import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";

const ZOOM_MS = 200;
const zoomButton = "flex h-9 min-w-9 items-center justify-center rounded-sm text-button text-ink";

// 우하단 줌 컨트롤 (−, %, +, 화면 맞춤). 미니맵 왼쪽에 배치
export default function ZoomControls() {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  return (
    <Panel
      position="bottom-right"
      className="!right-[216px] flex gap-0.5 rounded-md border border-hairline bg-canvas p-1 shadow-float max-md:!right-0"
    >
      <button
        className={zoomButton}
        aria-label="축소"
        onClick={() => void zoomOut({ duration: ZOOM_MS })}
      >
        <Minus size={16} />
      </button>
      <button
        className={`${zoomButton} px-1`}
        aria-label="100%로 보기"
        onClick={() => void zoomTo(1, { duration: ZOOM_MS })}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        className={zoomButton}
        aria-label="확대"
        onClick={() => void zoomIn({ duration: ZOOM_MS })}
      >
        <Plus size={16} />
      </button>
      <button
        className={zoomButton}
        aria-label="화면 맞춤"
        onClick={() => void fitView({ duration: ZOOM_MS, maxZoom: 1 })}
      >
        <Maximize size={16} />
      </button>
    </Panel>
  );
}
