import { useEffect } from "react";
import { Background, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Node } from "@xyflow/react";
import { StickyNode } from "../shared/StickyNode";
import { expose } from "../shared/expose";

const nodeTypes = { sticky: StickyNode };
const LONG_TEXT = Array.from({ length: 30 }, (_, i) => `${i + 1}번째 줄 설정 메모`).join("\n");

const initial: Node[] = [
  { id: "s1", type: "sticky", position: { x: 200, y: 150 }, data: { text: "더블클릭해서 편집" } },
  { id: "s2", type: "sticky", position: { x: 450, y: 150 }, data: { text: LONG_TEXT } },
];

function Board() {
  const [nodes, , onNodesChange] = useNodesState(initial);
  const { getViewport } = useReactFlow();

  useEffect(() => {
    expose("c6", {
      getViewport,
      getNode: (id: string) => {
        const n = nodes.find((x) => x.id === id);
        return n && { position: n.position, data: n.data };
      },
    });
  }, [getViewport, nodes]);

  return (
    <div className="h-full">
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} nodeTypes={nodeTypes} defaultViewport={{ x: 0, y: 0, zoom: 1 }}>
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function C6() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  );
}
