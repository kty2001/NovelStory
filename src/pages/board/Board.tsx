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
import { db } from "../../db/db";
import type { BoardItem, TimeScale, UiState } from "../../db/types";
import { patchUiState } from "../../db/uiState";
import {
  addEvent,
  addFrame,
  addState,
  addSticky,
  addText,
  adopt,
  deleteItems,
  setLanes,
  updateItems,
} from "../../store/boardActions";
import { setTimeScale, useNovelStore } from "../../store/novelStore";
import Axis from "./Axis";
import BlockMenu from "./BlockMenu";
import { BoardUiContext } from "./boardContext";
import { AxisTrack, MiniMapNode, UndatedZone } from "./DecorNodes";
import EventNode from "./EventNode";
import FilterMenu from "./FilterMenu";
import {
  decorNodes,
  dropPatches,
  EVENT_H,
  EVENT_W,
  FRAME_SIZE,
  frameAt,
  freeRect,
  itemNode,
  laneOrder,
  STATE_W,
  timePlace,
  withFrames,
  type Dropped,
} from "./flow";
import { FrameNode, StickyNode, TextNode } from "./FreeNodes";
import Lanes from "./Lanes";
import Leaders, { type Rect } from "./Leaders";
import LineEditDialog from "./LineEditDialog";
import { NO_LINE } from "./lines";
import PlacePreview, { FrameDraft, type Preview } from "./PlacePreview";
import StateNode from "./StateNode";
import StatePanel, { CharacterPicker } from "./StatePanel";
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
import ZoomControls from "./ZoomControls";

// 스파이크 C4에서 라벨 겹침 없음을 확인한 줌 범위
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
// 이 배율 미만이면 블록 간략 표시 (C3): 노드는 `.board-simple` 아래에서 제목만 표시
const SIMPLE_ZOOM = 0.5;
const MULTI_SELECT_KEYS = ["Shift", "Control", "Meta"];
// Ctrl+G 로 만드는 프레임의 여백 (제목 자리 포함)
const GROUP_PAD = 24;
// 연결선은 연결선 구현 시 스토어에서 변환
const NO_EDGES: Edge[] = [];

const nodeTypes = {
  undated: UndatedZone,
  axis: AxisTrack,
  event: EventNode,
  state: StateNode,
  sticky: StickyNode,
  text: TextNode,
  frame: FrameNode,
};

const STATE_COLOR = {
  appear: "var(--color-brand-mint)",
  change: "var(--color-brand-lavender)",
  exit: "var(--color-brand-teal)",
} as const;

// 구현된 도구만 활성 (나머지는 각 항목 구현 시 추가)
const ENABLED_TOOLS: ReadonlySet<Tool> = new Set([
  "select",
  "hand",
  "event",
  "state",
  "sticky",
  "text",
  "frame",
]);

// React Flow가 알려 주는 노드 화면 상태 (크기 · 선택 · 끌기/크기 조절 중 위치 · 크기). 데이터는 스토어가 원본
type NodeUi = {
  measured?: { width: number; height: number };
  selected?: boolean;
  position?: XYPosition;
  size?: { width: number; height: number };
};

function applyUi(prev: Record<string, NodeUi>, changes: NodeChange[]) {
  const next = { ...prev };
  for (const c of changes) {
    if (c.type === "dimensions" && c.dimensions) {
      next[c.id] = {
        ...next[c.id],
        measured: c.dimensions,
        ...(c.resizing ? { size: c.dimensions } : {}),
      };
    } else if (c.type === "select") next[c.id] = { ...next[c.id], selected: c.selected };
    // 끌기 중 위치만 화면 상태로 (끝나면 스토어 위치 = 스냅 결과). dragging 없음 = 크기 조절 중 위치
    else if (c.type === "position") {
      next[c.id] = { ...next[c.id], position: c.dragging === false ? undefined : c.position };
    }
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

const union = (rects: Rect[]) => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const w = Math.max(...rects.map((r) => r.x + r.w)) - x;
  const h = Math.max(...rects.map((r) => r.y + r.h)) - y;
  return { x, y, w, h };
};

const minimapColor = (item: BoardItem | undefined) => {
  if (item?.kind === "event" || item?.kind === "sticky") return `var(--color-${item.color})`;
  if (item?.kind === "state") return STATE_COLOR[item.stateType];
  return "var(--color-surface-strong)";
};

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
  const [ui, setUi] = useState<Record<string, NodeUi>>({});
  const [tool, setTool] = useState<Tool>("select");
  const [stateType, setStateType] = useState<StateType>("appear");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  // 상태 도구로 놓은 자리: 캐릭터를 고르면 블록 생성 (B-3 ①)
  const [pending, setPending] = useState<{
    place: ReturnType<typeof timePlace>;
    client: XYPosition;
    type: StateType;
  } | null>(null);
  // 프레임 도구로 그리는 중인 영역 (보드 좌표)
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );

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

  // 캐릭터별 정렬 (UC-13): 켜져 있으면 캐릭터 → 레인 번호
  const stateLanes = useNovelStore((s) => s.board?.stateLanes);
  const laneIds = useMemo(
    () => (stateLanes?.enabled ? laneOrder(stateLanes.order, items) : []),
    [stateLanes, items],
  );
  const laneMap = useMemo(
    () => (stateLanes?.enabled ? new Map(laneIds.map((id, i) => [id, i])) : undefined),
    [stateLanes?.enabled, laneIds],
  );

  const nodes = useMemo(() => {
    const blocks = Object.values(items).flatMap((item) => {
      const n = itemNode(item, timeScale, laneMap);
      return n ? [hiddenIds.has(item.id) ? { ...n, hidden: true } : n] : [];
    });
    const all: Node[] = [
      ...decorNodes(timeScale, items, (item) => ui[item.id]?.measured?.height ?? EVENT_H),
      ...withFrames(blocks, items),
    ];
    return all.map((n) => {
      const u = ui[n.id];
      if (!u) return n;
      return {
        ...n,
        measured: u.measured,
        selected: u.selected,
        position: u.position ?? n.position,
        ...(u.size ?? {}),
      };
    });
  }, [timeScale, items, ui, hiddenIds, laneMap]);

  // 노드 사각형 (보드 절대 좌표, 왼쪽 위 기준): 지시선 · 연결 · 묶기 · 패널 위치용
  const rects = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const out = new Map<string, Rect>();
    for (const n of nodes) {
      const w = n.measured?.width ?? n.width ?? (n.type === "state" ? STATE_W : EVENT_W);
      const h = n.measured?.height ?? n.height ?? EVENT_H;
      const ox = n.origin?.[0] ?? 0;
      const parent = n.parentId ? byId.get(n.parentId)?.position : undefined;
      const x = n.position.x + (parent?.x ?? 0) - w * ox;
      const y = n.position.y + (parent?.y ?? 0);
      out.set(n.id, { x, y, w, h });
    }
    return out;
  }, [nodes]);
  const rectOf = useCallback((id: string) => rects.get(id), [rects]);

  // 선택된 (보이는) 요소: 블록 메뉴 · 삭제 · 묶기 대상
  const selectedIds = useMemo(
    () => Object.keys(items).filter((id) => ui[id]?.selected && !hiddenIds.has(id)),
    [items, ui, hiddenIds],
  );
  // 키 처리기에서 최신 값을 읽기 위한 참조
  const latest = useRef({ selectedIds, rects });
  useEffect(() => {
    latest.current = { selectedIds, rects };
  }, [selectedIds, rects]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setUi((u) => applyUi(u, changes)),
    [],
  );
  const clearUi = useCallback((ids: string[], keys: (keyof NodeUi)[]) => {
    setUi((u) => {
      const next = { ...u };
      for (const id of ids) {
        const entry = { ...next[id] };
        for (const k of keys) delete entry[k];
        next[id] = entry;
      }
      return next;
    });
  }, []);

  // 크기 조절 끝 (NodeResizer, 노드 좌표 = 프레임 자식이면 프레임 기준) → 절대 좌표로 기록 (1건)
  const resized = useCallback(
    (id: string, r: { x: number; y: number; width: number; height: number }) => {
      const { items: cur } = useNovelStore.getState();
      const frame = cur[cur[id]?.parentFrameId ?? ""];
      const parent = frame?.kind === "frame" ? frame.place : undefined;
      const x = r.x + (parent?.x ?? 0);
      const y = r.y + (parent?.y ?? 0);
      updateItems({ [id]: { place: { mode: "free", x, y }, w: r.width, h: r.height } });
      clearUi([id], ["size", "position"]);
    },
    [clearUi],
  );
  const boardUi = useMemo(() => ({ editId, setEditId, resized }), [editId, resized]);

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

  // 화면 좌표에 배치 → 선택 도구로 복귀. 프레임 안에 놓으면 그 프레임 소속
  const place = useCallback(
    (placeTool: PlaceTool, client: XYPosition, alt: boolean) => {
      const p = screenToFlowPosition(client);
      const snap = timeScale.snap && !alt;
      const at = timePlace(p.x, p.y - EVENT_H / 2, timeScale, snap);
      const frame = frameAt(p, useNovelStore.getState().items);
      let id: string | null = null;
      // 사건: 배치 직후 제목 입력 (UC-10) / 상태: 캐릭터 선택 후 생성 (UC-12) / 포스트잇 · 텍스트: 바로 편집 (UC-17)
      if (placeTool === "event") id = addEvent(at);
      else if (placeTool === "state") setPending({ place: at, client, type: stateType });
      else {
        const r = freeRect(placeTool, p.x, p.y);
        id = placeTool === "sticky" ? addSticky(r.x, r.y) : addText(r.x, r.y);
      }
      if (id) {
        adopt([id], frame);
        setEditId(id);
      }
      setTool("select");
      setPreview(null);
    },
    [screenToFlowPosition, timeScale, stateType],
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

  // 프레임 도구 (UC-18): 빈 곳을 끌어 영역 그리기, 클릭만 하면 기본 크기. 안에 중심점이 든 요소는 소속
  const startFrameDraw = (e: ReactPointerEvent) => {
    if (tool !== "frame" || e.button !== 0) return;
    if (!(e.target as Element).closest(".react-flow__pane")) return;
    const s = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDraft({ x0: s.x, y0: s.y, x1: s.x, y1: s.y });
    const onMove = (ev: PointerEvent) => {
      const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      setDraft({ x0: s.x, y0: s.y, x1: p.x, y1: p.y });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDraft(null);
      const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const drawn = {
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      };
      const rect = drawn.w < 20 || drawn.h < 20 ? { x: s.x, y: s.y, ...FRAME_SIZE } : drawn;
      const cur = useNovelStore.getState().items;
      const inside = Object.values(cur)
        .filter((i) => i.kind !== "frame" && !i.parentFrameId)
        .map((i) => i.id)
        .filter((id) => {
          const r = latest.current.rects.get(id);
          if (!r) return false;
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h;
        });
      setEditId(addFrame(rect, inside));
      setTool("select");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 선택 요소를 감싸는 프레임 (Ctrl+G) / 선택 프레임 풀기 (Ctrl+Shift+G, 자식은 그 자리에)
  const group = useCallback(() => {
    const cur = useNovelStore.getState().items;
    const ids = latest.current.selectedIds.filter((id) => cur[id]?.kind !== "frame");
    const rs = ids.flatMap((id) => latest.current.rects.get(id) ?? []);
    if (!rs.length) return;
    const u = union(rs);
    const rect = {
      x: u.x - GROUP_PAD,
      y: u.y - GROUP_PAD,
      w: u.w + GROUP_PAD * 2,
      h: u.h + GROUP_PAD * 2,
    };
    setEditId(addFrame(rect, ids));
  }, []);
  const ungroup = useCallback(() => {
    const cur = useNovelStore.getState().items;
    deleteItems(latest.current.selectedIds.filter((id) => cur[id]?.kind === "frame"));
  }, []);

  // 보드 단축키 (텍스트 편집 · 한글 조합 중 무시, 한/영 무관하게 code 기준)
  // 화면에 보이기 전에 등록 (보드가 보이자마자 누른 키도 처리)
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || isEditable(e.target)) return;
      if (e.target instanceof Element && e.target.closest("dialog")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === "KeyG") {
        e.preventDefault();
        if (e.shiftKey) ungroup();
        else group();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteItems(latest.current.selectedIds);
        return;
      }
      // F2: 선택한 요소 하나 편집 (제목 · 내용)
      if (e.key === "F2") {
        const ids = latest.current.selectedIds;
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
  }, [chooseTool, group, ungroup]);

  // 끌기 종료: 눈금 스냅(Alt = 해제) · 미정 영역 · 프레임 소속 판정 후 스토어에 1건으로 기록
  const onNodeDragStop = useCallback<OnNodeDrag>(
    (e, _node, dragged) => {
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const dropped: Dropped[] = dragged.map((n) => {
        const parent = n.parentId ? byId.get(n.parentId)?.position : undefined;
        return {
          id: n.id,
          x: n.position.x + (parent?.x ?? 0),
          y: n.position.y + (parent?.y ?? 0),
          w: n.measured?.width ?? n.width ?? EVENT_W,
          h: n.measured?.height ?? n.height ?? EVENT_H,
          ox: n.origin?.[0] ?? 0,
        };
      });
      const snap = timeScale.snap && !e.altKey;
      const cur = useNovelStore.getState().items;
      updateItems(dropPatches(dropped, cur, timeScale, snap, !!stateLanes?.enabled));
      clearUi(
        dragged.map((n) => n.id),
        ["position"],
      );
    },
    [nodes, timeScale, stateLanes?.enabled, clearUi],
  );

  const editState = editId && items[editId]?.kind === "state" ? editId : null;
  const placing = isPlaceTool(tool) || tool === "frame";
  return (
    <BoardUiContext.Provider value={boardUi}>
      <ReactFlow
        className={`${simple ? "board-simple" : ""} ${placing ? "tool-place" : ""}`}
        nodes={nodes}
        edges={NO_EDGES}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onPointerDown={startFrameDraw}
        zoomOnDoubleClick={false}
        onPaneClick={(e) => {
          if (isPlaceTool(tool)) place(tool, { x: e.clientX, y: e.clientY }, e.altKey);
        }}
        onPaneMouseMove={(e) => {
          if (isPlaceTool(tool)) showPreview(tool, { x: e.clientX, y: e.clientY }, e.altKey);
        }}
        onPaneMouseLeave={() => isPlaceTool(tool) && setPreview(null)}
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
          nodeColor={(n) => minimapColor(items[n.id])}
        />
        {stateLanes?.enabled && (
          <Lanes
            order={laneIds}
            items={items}
            scale={timeScale}
            onReorder={(order) => setLanes({ order })}
          />
        )}
        <Leaders
          items={items}
          hiddenIds={hiddenIds}
          scale={timeScale}
          lanes={!!stateLanes?.enabled}
          rectOf={rectOf}
        />
        {editState && (
          <StatePanel
            key={editState}
            itemId={editState}
            rect={rects.get(editState)}
            onClose={() => setEditId(null)}
          />
        )}
        {pending && (
          <CharacterPicker
            at={pending.client}
            onCancel={() => setPending(null)}
            onPick={(docId) => {
              const id = addState(pending.place, docId, pending.type);
              if (id) adopt([id], frameAt(screenToFlowPosition(pending.client), items));
              setEditId(id);
              setPending(null);
            }}
          />
        )}
        {selectedIds.length > 0 && !editId && (
          <BlockMenu itemIds={selectedIds} onEditLines={() => setLinesOpen(true)} />
        )}
        <Axis scale={timeScale} />
        {preview && <PlacePreview preview={preview} scale={timeScale} />}
        {draft && (
          <FrameDraft
            rect={{
              x: Math.min(draft.x0, draft.x1),
              y: Math.min(draft.y0, draft.y1),
              w: Math.abs(draft.x1 - draft.x0),
              h: Math.abs(draft.y1 - draft.y0),
            }}
          />
        )}
        <Toolbar
          tool={tool}
          stateType={stateType}
          enabled={ENABLED_TOOLS}
          snap={timeScale.snap}
          onTool={chooseTool}
          onDragStart={startToolDrag}
          onSnap={() => setTimeScale({ snap: !timeScale.snap })}
          lanes={!!stateLanes?.enabled}
          onLanes={() =>
            setLanes({
              enabled: !stateLanes?.enabled,
              order: laneOrder(stateLanes?.order ?? [], items),
            })
          }
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
