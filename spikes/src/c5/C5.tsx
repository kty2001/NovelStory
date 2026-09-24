import { useEffect, useRef, useState } from "react";
import { Background, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Node } from "@xyflow/react";
import { expose } from "../shared/expose";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

const initial: Node[] = [
  { id: "a", position: { x: 200, y: 200 }, data: { label: "사건 A" } },
  { id: "b", position: { x: 450, y: 320 }, data: { label: "사건 B" } },
];

function Board() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const touches = useRef(new Set<number>());

  // 길게 누르기: 터치 1개가 500ms 동안 10px 이내로 유지되면 메뉴
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    touches.current.add(e.pointerId);
    cancelPress();
    if (touches.current.size > 1) return; // 두 손가락 = 줌·팬
    const { clientX: x, clientY: y } = e;
    press.current = { x, y, timer: window.setTimeout(() => setMenu({ x, y }), LONG_PRESS_MS) };
  };
  const onPointerMoveCapture = (e: React.PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress();
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId);
    cancelPress();
  };

  // 도구 모음 → 캔버스 배치 (Pointer Events, 마우스·터치 공통)
  const onPaletteDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setGhost({ x: e.clientX, y: e.clientY });
  };
  const onPaletteMove = (e: React.PointerEvent) => {
    if (ghost) setGhost({ x: e.clientX, y: e.clientY });
  };
  const onPaletteUp = (e: React.PointerEvent) => {
    if (!ghost) return;
    setGhost(null);
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target?.closest(".react-flow__pane, .react-flow__renderer")) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes((ns) => [...ns, { id: `n${ns.length}`, position, data: { label: "새 사건" } }]);
  };

  useEffect(() => {
    expose("c5", {
      getViewport,
      getNodes: () => nodes.map((n) => ({ id: n.id, position: n.position })),
      menuOpen: () => menu !== null,
      closeMenu: () => setMenu(null),
      toFlow: (x: number, y: number) => screenToFlowPosition({ x, y }),
    });
  }, [getViewport, nodes, menu, screenToFlowPosition]);

  return (
    <div
      className="h-full"
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerEnd}
      onPointerCancelCapture={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-2 rounded-2xl border border-hairline bg-canvas p-2 shadow">
        <button
          data-testid="palette-event"
          className="h-11 touch-none rounded-xl bg-[#ffb084] px-4 text-sm font-semibold select-none"
          onPointerDown={onPaletteDown}
          onPointerMove={onPaletteMove}
          onPointerUp={onPaletteUp}
        >
          사건 끌어오기
        </button>
      </div>
      {ghost && (
        <div
          className="pointer-events-none fixed z-20 rounded-xl bg-[#ffb084]/80 px-3 py-2 text-sm"
          style={{ left: ghost.x, top: ghost.y }}
        >
          새 사건
        </div>
      )}
      {menu && (
        <ul
          data-testid="context-menu"
          className="fixed z-30 rounded-lg border border-hairline bg-white text-sm shadow"
          style={{ left: menu.x, top: menu.y }}
          onClick={() => setMenu(null)}
        >
          <li className="px-4 py-3">포스트잇 추가</li>
          <li className="px-4 py-3">붙여넣기</li>
        </ul>
      )}
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} defaultViewport={{ x: 0, y: 0, zoom: 1 }}>
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function C5() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  );
}
