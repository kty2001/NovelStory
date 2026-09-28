import { useEffect } from "react";
import { Handle, Position, useNodeId, useUpdateNodeInternals } from "@xyflow/react";
import { useBoardUi } from "./boardContext";

const SIDES = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
] as const;

// 연결 핸들 (UC-19): 네 면 (마우스를 올리거나 선택하면 표시). 연결선 도구 중에는 요소 전체가 시작점 · 도착점
export default function Ports() {
  const { tool } = useBoardUi();
  const id = useNodeId();
  const updateInternals = useUpdateNodeInternals();
  const line = tool === "line";
  // 핸들이 생기고 없어질 때 React Flow가 핸들 위치를 다시 재도록
  useEffect(() => {
    if (id) updateInternals(id);
  }, [id, line, updateInternals]);
  return (
    <>
      {SIDES.map(([side, pos]) => (
        <Handle key={side} id={side} type="source" position={pos} className="board-port" />
      ))}
      {line && <Handle id="any" type="source" position={Position.Top} className="board-port-any" />}
    </>
  );
}
