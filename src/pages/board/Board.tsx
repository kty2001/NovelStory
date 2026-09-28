import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeChange,
  type OnNodeDrag,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import { db } from "../../db/db";
import type { TimeScale, UiState } from "../../db/types";
import { patchUiState } from "../../db/uiState";
import { addEvent, moveItems } from "../../store/boardActions";
import { setTimeScale, useNovelStore } from "../../store/novelStore";
import Axis from "./Axis";
import { AxisTrack, MiniMapNode, UndatedZone } from "./DecorNodes";
import BlockMenu from "./BlockMenu";
import { BoardUiContext } from "./boardContext";
import EventNode from "./EventNode";
import FilterMenu from "./FilterMenu";
import { decorNodes, EVENT_H, itemNode, movedPlace, timePlace } from "./flow";
import Leaders from "./Leaders";
import LineEditDialog from "./LineEditDialog";
import { NO_LINE } from "./lines";
import PlacePreview, { type Preview } from "./PlacePreview";
import Toolbar from "./Toolbar";
import {
  isEditable,
  isPlaceTool,
  STATE_CYCLE,
  TOOL_BY_CODE,
  type PlaceTool,
  type StateType,
  type Tool,
} from "./tools";

// 스파이크 C4에서 라벨 겹침 없음을 확인한 줌 범위
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
// 이 배율 미만이면 블록 간략 표시 (C3): 노드는 `.board-simple` 아래에서 제목만 표시
const SIMPLE_ZOOM = 0.5;
const ZOOM_MS = 200;
const MULTI_SELECT_KEYS = ["Shift", "Control", "Meta"];
// 연결선은 연결선 구현 시 스토어에서 변환
const NO_EDGES: Edge[] = [];

const nodeTypes = { undated: UndatedZone, axis: AxisTrack, event: EventNode };

// 구현된 도구만 활성 (나머지는 각 블록 구현 시 추가)
const ENABLED_TOOLS: ReadonlySet<Tool> = new Set(["select", "hand", "event"]);

// React Flow가 알려 주는 노드 화면 상태 (크기 · 선택 · 드래그 중 위치). 데이터는 스토어가 원본
type NodeUi = {
  measured?: { width: number; height: number };
  selected?: boolean;
  position?: XYPosition;
};

function applyUi(prev: Record<string, NodeUi>, changes: NodeChange[]) {
  const next = { ...prev };
  for (const c of changes) {
    if (c.type === "dimensions" && c.dimensions)
      next[c.id] = { ...next[c.id], measured: c.dimensions };
    else if (c.type === "select") next[c.id] = { ...next[c.id], selected: c.selected };
    // 드래그 중 위치만 화면 상태로. 드래그가 끝나면 스토어 위치(스냅 결과)를 따름
    else if (c.type === "position")
      next[c.id] = { ...next[c.id], position: c.dragging ? c.position : undefined };
  }
  return next;
}

type Filters = NonNullable<UiState["filters"]>;
const NO_FILTERS: Filters = {
  hiddenDocIds: [],
  hiddenTags: [],
  hiddenCategoryIds: [],
  hiddenLineIds: [],
};

// 도구 모음을 끌어 캔버스 위에서 놓았는지 (도구 모음 · 미니맵 등 패널 위는 제외)
const overCanvas = (x: number, y: number) => {
  const el = document.elementFromPoint(x, y);
  return !!el?.closest(".react-flow") && !el.closest(".react-flow__panel");
};

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
  const docs = useNovelStore((s) => s.docs);
  const { screenToFlowPosition } = useReactFlow();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [linesOpen, setLinesOpen] = useState(false);

  // 필터는 소설별로 기억 (UiState.filters)
  useEffect(() => {
    let alive = true;
    void db.uiState.get(novelId).then((s) => {
      if (alive && s?.filters) setFilters({ ...NO_FILTERS, ...s.filters });
    });
    return () => {
      alive = false;
    };
  }, [novelId]);
  const changeFilters = useCallback(
    (patch: Partial<Filters>) =>
      setFilters((f) => {
        const next = { ...f, ...patch };
        void patchUiState(novelId, { filters: next });
        return next;
      }),
    [novelId],
  );

  // 필터로 숨긴 블록 (스토리 라인: 사건 문서의 lineId, 미지정 = NO_LINE)
  const hiddenIds = useMemo(() => {
    const lines = new Set(filters.hiddenLineIds);
    const out = new Set<string>();
    if (!lines.size) return out;
    for (const item of Object.values(items)) {
      if (item.kind === "event" && lines.has(docs[item.docId]?.lineId ?? NO_LINE)) out.add(item.id);
    }
    return out;
  }, [items, docs, filters.hiddenLineIds]);
  const [ui, setUi] = useState<Record<string, NodeUi>>({});
  const [tool, setTool] = useState<Tool>("select");
  const [stateType, setStateType] = useState<StateType>("appear");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const heightOf = useCallback((id: string) => ui[id]?.measured?.height ?? EVENT_H, [ui]);
  // 블록 메뉴 대상: 선택된 (보이는) 사건 블록
  const selectedEvents = useMemo(
    () =>
      Object.values(items)
        .filter((i) => i.kind === "event" && ui[i.id]?.selected && !hiddenIds.has(i.id))
        .map((i) => i.id),
    [items, ui, hiddenIds],
  );
  const boardUi = useMemo(() => ({ editId, setEditId }), [editId]);

  const nodes = useMemo(() => {
    const all: Node[] = [
      ...decorNodes(timeScale, items, (item) => heightOf(item.id)),
      ...Object.values(items).flatMap((item) => {
        const n = itemNode(item, timeScale);
        return n ? [hiddenIds.has(item.id) ? { ...n, hidden: true } : n] : [];
      }),
    ];
    return all.map((n) => {
      const u = ui[n.id];
      if (!u) return n;
      return {
        ...n,
        measured: u.measured,
        selected: u.selected,
        position: u.position ?? n.position,
      };
    });
  }, [timeScale, items, ui, heightOf, hiddenIds]);
  // 키 처리기에서 최신 선택 상태를 읽기 위한 참조
  const uiRef = useRef(ui);
  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setUi((u) => applyUi(u, changes)),
    [],
  );

  // 도구 선택: C를 다시 누르면 상태 유형 순환
  const chooseTool = useCallback(
    (next: Tool) => {
      if (!ENABLED_TOOLS.has(next)) return;
      if (next === "state" && tool === "state") {
        setStateType((t) => STATE_CYCLE[(STATE_CYCLE.indexOf(t) + 1) % STATE_CYCLE.length]);
      }
      setTool(next);
      setPreview(null);
    },
    [tool],
  );

  // 화면 좌표에 배치 → 선택 도구로 복귀
  const place = useCallback(
    (placeTool: PlaceTool, client: XYPosition, alt: boolean) => {
      const p = screenToFlowPosition(client);
      const snap = timeScale.snap && !alt;
      // 사건: 배치 직후 제목 입력 (UC-10)
      if (placeTool === "event")
        setEditId(addEvent(timePlace(p.x, p.y - EVENT_H / 2, timeScale, snap)));
      setTool("select");
      setPreview(null);
    },
    [screenToFlowPosition, timeScale],
  );

  const showPreview = useCallback(
    (placeTool: PlaceTool, client: XYPosition, alt: boolean) => {
      const p = screenToFlowPosition(client);
      setPreview({ tool: placeTool, x: p.x, y: p.y, snap: timeScale.snap && !alt });
    },
    [screenToFlowPosition, timeScale.snap],
  );

  // 도구 모음에서 끌어 놓기 (Pointer Events). 4px 미만 이동은 클릭(도구 선택)으로 처리
  const startToolDrag = useCallback(
    (dragTool: Tool, e: ReactPointerEvent) => {
      if (!isPlaceTool(dragTool) || !ENABLED_TOOLS.has(dragTool)) return;
      const start = { x: e.clientX, y: e.clientY };
      let moved = false;
      const onMove = (ev: PointerEvent) => {
        if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
        moved = true;
        const at = { x: ev.clientX, y: ev.clientY };
        if (overCanvas(at.x, at.y)) showPreview(dragTool, at, ev.altKey);
        else setPreview(null);
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (!moved) return;
        if (overCanvas(ev.clientX, ev.clientY))
          place(dragTool, { x: ev.clientX, y: ev.clientY }, ev.altKey);
        else setPreview(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [place, showPreview],
  );

  // 도구 단축키 (텍스트 편집 · 한글 조합 중 무시, 한/영 무관하게 code 기준)
  // 화면에 보이기 전에 등록 (보드가 보이자마자 누른 키도 처리)
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || isEditable(e.target)) return;
      if (e.target instanceof Element && e.target.closest("dialog")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // F2: 선택한 블록 하나의 제목 편집
      if (e.key === "F2") {
        const ids = Object.keys(useNovelStore.getState().items).filter(
          (id) => uiRef.current[id]?.selected,
        );
        if (ids.length === 1) setEditId(ids[0]);
        return;
      }
      if (e.key === "Escape") {
        setTool("select");
        setPreview(null);
        return;
      }
      const next = TOOL_BY_CODE[e.code];
      if (next) chooseTool(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooseTool]);

  // 끌기 종료: 눈금 스냅(Alt = 해제) · 미정 영역 판정 후 스토어에 1건으로 기록
  const onNodeDragStop = useCallback<OnNodeDrag>(
    (e, _node, dragged) => {
      const current = useNovelStore.getState().items;
      const snap = timeScale.snap && !e.altKey;
      const places = Object.fromEntries(
        dragged.flatMap((n) => {
          const item = current[n.id];
          if (item?.kind === "event" || item?.kind === "state") {
            return [[n.id, movedPlace(item, n.position, timeScale, snap)]];
          }
          return [];
        }),
      );
      moveItems(places);
      setUi((u) => {
        const next = { ...u };
        for (const n of dragged) next[n.id] = { ...next[n.id], position: undefined };
        return next;
      });
    },
    [timeScale],
  );

  const placing = isPlaceTool(tool);
  return (
    <BoardUiContext.Provider value={boardUi}>
      <ReactFlow
        className={`${simple ? "board-simple" : ""} ${placing ? "tool-place" : ""}`}
        nodes={nodes}
        edges={NO_EDGES}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        zoomOnDoubleClick={false}
        onPaneClick={(e) => {
          if (placing) place(tool, { x: e.clientX, y: e.clientY }, e.altKey);
        }}
        onPaneMouseMove={(e) => {
          if (placing) showPreview(tool, { x: e.clientX, y: e.clientY }, e.altKey);
        }}
        onPaneMouseLeave={() => placing && setPreview(null)}
        defaultViewport={viewport}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        // 빈 곳 드래그 = 박스 선택, 팬 = Space+드래그 · 가운데 버튼 · 손 도구 (shortcuts.md 2.4)
        selectionOnDrag={tool === "select"}
        // Shift · Ctrl(⌘)+클릭 = 선택 추가·해제 (UC-20)
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        panOnDrag={tool === "hand" ? true : [1]}
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
          nodeColor={(n) => {
            const item = items[n.id];
            return item?.kind === "event"
              ? `var(--color-${item.color})`
              : "var(--color-surface-strong)";
          }}
        />
        <Leaders items={items} hiddenIds={hiddenIds} scale={timeScale} heightOf={heightOf} />
        {selectedEvents.length > 0 && !editId && (
          <BlockMenu itemIds={selectedEvents} onEditLines={() => setLinesOpen(true)} />
        )}
        <Axis scale={timeScale} />
        {preview && <PlacePreview preview={preview} scale={timeScale} />}
        <Toolbar
          tool={tool}
          stateType={stateType}
          enabled={ENABLED_TOOLS}
          snap={timeScale.snap}
          onTool={chooseTool}
          onDragStart={startToolDrag}
          onSnap={() => setTimeScale({ snap: !timeScale.snap })}
        >
          <FilterMenu
            hiddenLineIds={filters.hiddenLineIds}
            onChange={(hiddenLineIds) => changeFilters({ hiddenLineIds })}
            onEditLines={() => setLinesOpen(true)}
          />
        </Toolbar>
        <ZoomControls />
        <LineEditDialog
          open={linesOpen}
          onClose={() => setLinesOpen(false)}
          onDeleted={(id) =>
            changeFilters({ hiddenLineIds: filters.hiddenLineIds.filter((k) => k !== id) })
          }
        />
      </ReactFlow>
    </BoardUiContext.Provider>
  );
}

// 보드 캔버스: 소설 데이터가 준비된 뒤 표시
export default function Board({ novelId, viewport }: { novelId: string; viewport: Viewport }) {
  const timeScale = useNovelStore((s) => s.board?.timeScale);
  if (!timeScale) return null;
  return <Canvas novelId={novelId} viewport={viewport} timeScale={timeScale} />;
}
