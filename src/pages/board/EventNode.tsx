import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { NodeToolbar, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import type { ColorToken, EventItem } from "../../db/types";
import { moveItems, patchItems, renameDoc } from "../../store/boardActions";
import { beginBatch, endBatch, useNovelStore } from "../../store/novelStore";
import { useBoardUi } from "./boardContext";
import { EVENT_W, spanPlace } from "./flow";
import { snapTick, xToTick } from "./timeAxis";

// span = 기간 사건 (폭은 노드 width, 래퍼를 채움)
export type EventNodeType = Node<{ span?: boolean }, "event">;

// 블록 메뉴 색 (ui_guide 브랜드 색 중 잉크 글자가 읽히는 것)
const COLORS: { token: ColorToken; label: string }[] = [
  { token: "brand-peach", label: "피치" },
  { token: "brand-pink", label: "핑크" },
  { token: "brand-coral", label: "코랄" },
  { token: "brand-ochre", label: "오커" },
  { token: "brand-mint", label: "민트" },
  { token: "brand-lavender", label: "라벤더" },
];

// 제목 인라인 편집: Enter · Esc · 바깥 클릭 = 확정 (C6). 한글 조합 중 Enter 무시. 비우면 원래 제목
function TitleInput({
  docId,
  initial,
  onDone,
}: {
  docId: string;
  initial: string;
  onDone: () => void;
}) {
  const done = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  // React Flow는 크기를 잴 때까지 노드를 숨김 → 보일 때까지 몇 프레임 포커스 재시도
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const focus = () => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      if (document.activeElement === el) el.select();
      else if (tries++ < 20) frame = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(frame);
  }, []);
  const finish = (value: string) => {
    if (done.current) return;
    done.current = true;
    const title = value.trim();
    if (title && title !== initial) renameDoc(docId, title);
    onDone();
  };
  return (
    <input
      ref={ref}
      aria-label="사건 제목"
      defaultValue={initial}
      className="nodrag nopan nowheel w-full min-w-0 rounded-xs bg-canvas/70 px-1 text-block-label text-ink outline-none"
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter" || e.key === "Escape") finish(e.currentTarget.value);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

// 양 끝 핸들 끌기 → 기간 조절 (UC-11). 끌기 1회 = 실행 취소 1건
function useSpanResize(id: string) {
  const { screenToFlowPosition } = useReactFlow();
  return (side: "start" | "end", e: ReactPointerEvent) => {
    const item = useNovelStore.getState().items[id];
    if (item?.kind !== "event" || item.place.mode !== "timed") return;
    e.stopPropagation();
    e.preventDefault();
    const start = item.place;
    const fixed = side === "start" ? (start.tEnd ?? start.t) : start.t;
    beginBatch();
    const onMove = (ev: PointerEvent) => {
      const scale = useNovelStore.getState().board?.timeScale;
      if (!scale) return;
      const x = screenToFlowPosition({ x: ev.clientX, y: ev.clientY }).x;
      const t = (scale.snap && !ev.altKey ? snapTick(x, scale) : xToTick(x, scale)) ?? 0;
      moveItems({ [id]: spanPlace(start, fixed, t) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      endBatch();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
}

function Handle({
  side,
  onDown,
}: {
  side: "start" | "end";
  onDown: (e: ReactPointerEvent) => void;
}) {
  return (
    <span
      data-testid={`resize-${side}`}
      className={`nodrag nopan absolute top-1/2 h-6 w-2 -translate-y-1/2 cursor-ew-resize rounded-full bg-brand-teal ${side === "start" ? "-left-1" : "-right-1"}`}
      onPointerDown={onDown}
    />
  );
}

// 사건 블록 (ui_guide `event-block`): 채색 + 제목. 폭 = 단일 시점 고정 / 기간 사건은 기간 길이
export default function EventNode({ id, data, selected }: NodeProps<EventNodeType>) {
  const item = useNovelStore((s) => s.items[id]) as EventItem | undefined;
  const doc = useNovelStore((s) => (item ? s.docs[item.docId] : undefined));
  const { editId, setEditId, selectionSize } = useBoardUi();
  const resize = useSpanResize(id);
  if (item?.kind !== "event") return null;
  const editing = editId === id;
  const timed = item.place.mode === "timed";

  return (
    <>
      <NodeToolbar
        // 블록 메뉴는 이 블록 하나만 선택됐을 때
        isVisible={selected && selectionSize === 1 && !editing}
        position={Position.Top}
        offset={12}
      >
        <div
          role="toolbar"
          aria-label="블록 메뉴"
          className="flex items-center gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-float"
        >
          {COLORS.map((c) => (
            <button
              key={c.token}
              type="button"
              aria-label={`색: ${c.label}`}
              aria-pressed={item.color === c.token}
              className={`size-6 rounded-full ${item.color === c.token ? "ring-2 ring-ink ring-offset-1" : ""}`}
              style={{ background: `var(--color-${c.token})` }}
              onClick={() => patchItems([id], { color: c.token })}
            />
          ))}
        </div>
      </NodeToolbar>
      <div
        data-testid="event-block"
        className={`relative rounded-md px-3 py-2 text-block-label break-keep text-ink ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
        style={{ width: data.span ? "100%" : EVENT_W, background: `var(--color-${item.color})` }}
        onDoubleClick={() => setEditId(id)}
      >
        {editing && doc ? (
          <TitleInput docId={doc.id} initial={doc.title} onDone={() => setEditId(null)} />
        ) : (
          <p className="line-clamp-2">{doc?.title}</p>
        )}
        {selected && timed && !editing && (
          <>
            <Handle side="start" onDown={(e) => resize("start", e)} />
            <Handle side="end" onDown={(e) => resize("end", e)} />
          </>
        )}
      </div>
    </>
  );
}
