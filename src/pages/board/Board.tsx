import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type Viewport,
} from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import type { TimeScale } from "../../db/types";
import { patchUiState } from "../../db/uiState";
import { useNovelStore } from "../../store/novelStore";
import Axis from "./Axis";
import { AxisTrack, MiniMapNode, UndatedZone } from "./DecorNodes";
import { decorNodes } from "./flow";

// 스파이크 C4에서 라벨 겹침 없음을 확인한 줌 범위
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
// 이 배율 미만이면 블록 간략 표시 (C3): 노드는 `.board-simple` 아래에서 제목만 표시
const SIMPLE_ZOOM = 0.5;
const ZOOM_MS = 200;
// 연결선은 연결선 구현 시 스토어에서 변환
const NO_EDGES: Edge[] = [];

const nodeTypes = { undated: UndatedZone, axis: AxisTrack };

const zoomButton = "flex h-9 min-w-9 items-center justify-center rounded-sm text-button text-ink";

// 우하단 줌 컨트롤 (−, %, +, 화면 맞춤). 미니맵 왼쪽에 배치
function ZoomControls() {
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

function Canvas({
  novelId,
  viewport,
  timeScale,
}: {
  novelId: string;
  viewport: Viewport;
  timeScale: TimeScale;
}) {
  const simple = useStore((s) => s.transform[2] < SIMPLE_ZOOM);
  const items = useNovelStore((s) => s.items);
  const nodes = useMemo(() => decorNodes(timeScale, items), [timeScale, items]);
  return (
    <ReactFlow
      className={simple ? "board-simple" : undefined}
      nodes={nodes}
      edges={NO_EDGES}
      nodeTypes={nodeTypes}
      defaultViewport={viewport}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      // 빈 곳 드래그 = 박스 선택, 팬 = Space+드래그 · 가운데 버튼 (shortcuts.md 2.4)
      selectionOnDrag
      panOnDrag={[1]}
      panActivationKeyCode="Space"
      // 삭제는 보드에서 직접 처리 (프레임 자식 유지, C7)
      deleteKeyCode={null}
      // 화면 밖 렌더 생략 (C3)
      onlyRenderVisibleElements
      attributionPosition="bottom-left"
      onMoveEnd={(_, vp) => void patchUiState(novelId, { viewport: vp })}
    >
      <Background variant={BackgroundVariant.Dots} color="var(--color-hairline)" size={2} />
      <MiniMap
        pannable
        style={{ width: 200, height: 130 }}
        className="overflow-hidden rounded-md border border-hairline shadow-float max-md:hidden"
        bgColor="var(--color-canvas)"
        maskColor="rgb(10 10 10 / 0.04)"
        nodeComponent={MiniMapNode}
      />
      <Axis scale={timeScale} />
      <ZoomControls />
    </ReactFlow>
  );
}

// 보드 캔버스: 소설 데이터가 준비된 뒤 표시
export default function Board({ novelId, viewport }: { novelId: string; viewport: Viewport }) {
  const timeScale = useNovelStore((s) => s.board?.timeScale);
  if (!timeScale) return null;
  return <Canvas novelId={novelId} viewport={viewport} timeScale={timeScale} />;
}
