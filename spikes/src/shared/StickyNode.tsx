import { useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

export type StickyData = { text: string };
export type StickyNodeType = Node<StickyData, "sticky">;

// 포스트잇: 더블클릭으로 편집. 편집 영역은 nodrag·nowheel·nopan으로 캔버스 조작과 분리 (C6)
export function StickyNode({ id, data, selected }: NodeProps<StickyNodeType>) {
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);

  return (
    <div
      data-testid={`sticky-${id}`}
      className={`w-40 h-40 rounded-md bg-[#fff1b8] p-2 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.12)] ${
        selected ? "outline-2 outline-[#1a3a3a]" : ""
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <textarea
          data-testid={`sticky-input-${id}`}
          className="nodrag nowheel nopan h-full w-full resize-none bg-transparent outline-none break-keep"
          autoFocus
          value={data.text}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <p className="h-full overflow-hidden whitespace-pre-wrap break-keep">{data.text}</p>
      )}
    </div>
  );
}
