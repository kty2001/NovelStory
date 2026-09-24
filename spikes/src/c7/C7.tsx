import { useCallback, useEffect } from "react";
import {
  Background,
  NodeResizer,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { expose } from "../shared/expose";

type FrameNodeType = Node<{ title: string }, "frame">;

function FrameNode({ data, selected }: NodeProps<FrameNodeType>) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={160} minHeight={120} />
      <div className="h-full w-full rounded-2xl border-[1.5px] border-dashed border-muted">
        <span className="absolute -top-6 left-0 text-sm font-semibold">{data.title}</span>
      </div>
    </>
  );
}

const nodeTypes = { frame: FrameNode };

// 부모(프레임)가 자식보다 배열 앞에 와야 함
const initial: Node[] = [
  { id: "f1", type: "frame", position: { x: 100, y: 100 }, width: 400, height: 300, data: { title: "1부" } },
  { id: "f2", type: "frame", position: { x: 700, y: 420 }, width: 300, height: 200, data: { title: "2부" } },
  { id: "a", position: { x: 700, y: 150 }, data: { label: "사건 A" } },
  { id: "b", parentId: "f1", position: { x: 40, y: 60 }, data: { label: "사건 B" } },
];

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest("input, textarea, [contenteditable='true']");

function Board() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  const { getInternalNode, getNodes } = useReactFlow();

  const absOf = useCallback(
    (id: string) => getInternalNode(id)?.internals.positionAbsolute ?? { x: 0, y: 0 },
    [getInternalNode],
  );
  const sizeOf = useCallback(
    (id: string) => {
      const n = getInternalNode(id);
      return { w: n?.measured.width ?? n?.width ?? 0, h: n?.measured.height ?? n?.height ?? 0 };
    },
    [getInternalNode],
  );

  // 드래그 종료 시 중심점이 들어간 프레임을 부모로 지정 (프레임끼리는 중첩 금지)
  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      if (node.type === "frame") return;
      // WebKit에선 이 시점의 internals.positionAbsolute가 드래그 전 값일 수 있음 → 이벤트 인자 기준으로 계산
      const parentAbs = node.parentId ? absOf(node.parentId) : { x: 0, y: 0 };
      const abs = { x: parentAbs.x + node.position.x, y: parentAbs.y + node.position.y };
      const { w, h } = sizeOf(node.id);
      const cx = abs.x + w / 2;
      const cy = abs.y + h / 2;
      const frame = getNodes().find((f) => {
        if (f.type !== "frame") return false;
        const fa = absOf(f.id);
        const fs = sizeOf(f.id);
        return cx >= fa.x && cx <= fa.x + fs.w && cy >= fa.y && cy <= fa.y + fs.h;
      });
      if ((frame?.id ?? undefined) === node.parentId) return;
      const pa = frame ? absOf(frame.id) : { x: 0, y: 0 };
      setNodes((ns) =>
        ns.map((n) =>
          n.id === node.id ? { ...n, parentId: frame?.id, position: { x: abs.x - pa.x, y: abs.y - pa.y } } : n,
        ),
      );
    },
    [absOf, sizeOf, getNodes, setNodes],
  );

  // 삭제: 프레임을 지워도 자식은 절대 위치로 유지 (React Flow 기본 동작은 자식까지 삭제)
  const deleteSelected = useCallback(() => {
    const selected = new Set(getNodes().filter((n) => n.selected).map((n) => n.id));
    setNodes((ns) =>
      ns
        .filter((n) => !selected.has(n.id))
        .map((n) => (n.parentId && selected.has(n.parentId) ? { ...n, parentId: undefined, position: absOf(n.id) } : n)),
    );
  }, [getNodes, setNodes, absOf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.isComposing) return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected]);

  useEffect(() => {
    expose("c7", {
      getNodes: () => nodes.map((n) => ({ id: n.id, parentId: n.parentId, position: n.position, abs: absOf(n.id) })),
    });
  }, [nodes, absOf]);

  return (
    <div className="h-full">
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-3 text-sm shadow">
        C7 프레임 — 사건을 프레임 안·밖으로 끌기, 프레임 선택 후 Delete
      </div>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function C7() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  );
}
