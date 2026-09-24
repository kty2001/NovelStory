import { useEffect, useMemo, useState } from "react";
import { Background, ReactFlow, ReactFlowProvider, type Node } from "@xyflow/react";
import { useStore } from "zustand";
import { StickyNode } from "../shared/StickyNode";
import { expose } from "../shared/expose";
import { createBoardStore, trackDrag, undo } from "./store";

const nodeTypes = { sticky: StickyNode };

const initial: Node[] = [
  { id: "n1", type: "sticky", position: { x: 100, y: 100 }, data: { text: "포스트잇 1" } },
  { id: "n2", type: "sticky", position: { x: 320, y: 100 }, data: { text: "포스트잇 2" } },
  { id: "n3", type: "sticky", position: { x: 540, y: 100 }, data: { text: "포스트잇 3" } },
];

// 한/영 모드와 무관하도록 KeyboardEvent.code 기준
const TOOL_BY_CODE: Record<string, string> = {
  KeyV: "select",
  KeyE: "event",
  KeyS: "sticky",
  KeyT: "text",
  KeyF: "frame",
};

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest("input, textarea, [contenteditable='true']");

function Board() {
  const store = useMemo(() => createBoardStore(initial), []);
  const nodes = useStore(store, (s) => s.nodes);
  const onNodesChange = useStore(store, (s) => s.onNodesChange);
  const drag = useMemo(() => trackDrag(store), [store]);
  const [tool, setTool] = useState("select");
  const [lastKey, setLastKey] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (isEditable(e.target)) return; // 텍스트 편집 중엔 보드 단축키 무시
      setLastKey(`${e.key} / ${e.code}`);
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        undo(store);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const next = TOOL_BY_CODE[e.code];
      if (next) setTool(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  useEffect(() => {
    expose("c2", {
      getNodes: () => store.getState().nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
      getTool: () => tool,
      historyLength: () => store.temporal.getState().pastStates.length,
    });
  }, [store, tool]);

  return (
    <div className="h-full">
      <div className="absolute left-4 top-4 z-10 rounded-lg border border-hairline bg-white p-3 text-sm shadow">
        <p>
          도구: <b data-testid="tool">{tool}</b> (V·E·S·T·F)
        </p>
        <p className="text-muted">
          마지막 키: <span data-testid="last-key">{lastKey}</span>
        </p>
        <p className="text-muted">노드 수: {nodes.length}</p>
      </div>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onNodeDragStart={drag.onNodeDragStart}
        onNodeDragStop={drag.onNodeDragStop}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView={false}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function C2() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  );
}
