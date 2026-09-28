import { useCallback, useRef } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { useDismiss } from "../../components/useDismiss";
import { updateEdge } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { useBoardUi } from "./boardContext";
import { EDGE_COLOR, EDGE_SELECTED } from "./flow";
import { useFocusWhenVisible } from "./useFocusWhenVisible";

// 라벨 · 실선/점선 편집 (선 더블클릭 · F2 · Enter): Enter · Esc · 바깥 클릭 = 확정. 한글 조합 중 Enter 무시
function EdgeEditor({
  id,
  label,
  dashed,
  onDone,
}: {
  id: string;
  label: string;
  dashed: boolean;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useFocusWhenVisible(input);
  const finish = useCallback(() => {
    updateEdge(id, { label: input.current?.value.trim() ?? "" });
    onDone();
  }, [id, onDone]);
  useDismiss(ref, true, finish);
  return (
    <div
      ref={ref}
      className="flex items-center gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-float"
    >
      <input
        ref={input}
        aria-label="연결선 라벨"
        placeholder="예: 원인→결과"
        defaultValue={label}
        className="w-36 rounded-xs border border-hairline bg-canvas px-2 py-0.5 text-caption text-ink outline-none focus:border-ink"
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter" || e.key === "Escape") finish();
        }}
      />
      <button
        type="button"
        aria-pressed={dashed}
        className={`rounded-xs px-2 py-0.5 text-caption ${dashed ? "bg-primary text-on-primary" : "text-ink hover:bg-surface-card"}`}
        onClick={() => updateEdge(id, { dashed: !dashed })}
      >
        점선
      </button>
    </div>
  );
}

// 연결선 (ui_guide `board-edge`): 2px · 화살촉 · 점선 옵션 · 가운데 라벨 알약. 선택 시 brand-teal
export default function EdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
}: EdgeProps) {
  const edge = useNovelStore((s) => s.edges[id]);
  const { editId, setEditId } = useBoardUi();
  const [path, x, y] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  if (!edge) return null;
  const editing = editId === id;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? EDGE_SELECTED : EDGE_COLOR,
          strokeWidth: 2,
          strokeDasharray: edge.dashed ? "6 5" : undefined,
        }}
      />
      {(edge.label || editing) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
              pointerEvents: "all",
            }}
          >
            {editing ? (
              <EdgeEditor
                id={id}
                label={edge.label ?? ""}
                dashed={edge.dashed}
                onDone={() => setEditId(null)}
              />
            ) : (
              <span
                data-testid="edge-label"
                className={`rounded-full px-2 py-0.5 text-caption whitespace-nowrap ${selected ? "bg-brand-teal text-on-primary" : "bg-surface-card text-ink"}`}
                onDoubleClick={() => setEditId(id)}
              >
                {edge.label}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
