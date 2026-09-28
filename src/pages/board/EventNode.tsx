import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import type { EventItem } from "../../db/types";
import { moveItems, renameDoc, sortedLines } from "../../store/boardActions";
import { beginBatch, endBatch, useNovelStore } from "../../store/novelStore";
import { useBoardUi } from "./boardContext";
import { EVENT_W, spanPlace } from "./flow";
import { lineBorder } from "./lines";
import Ports from "./Ports";
import { snapTick, xToTick } from "./timeAxis";
import { useFocusWhenVisible } from "./useFocusWhenVisible";

// span = 기간 사건 (폭은 노드 width, 래퍼를 채움)
export type EventNodeType = Node<{ span?: boolean }, "event">;

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
  useFocusWhenVisible(ref);
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
  // 스토리 라인: 순서(테두리 모양) · 이름(배지). 미지정 = -1
  const lineIndex = useNovelStore((s) =>
    doc?.lineId ? sortedLines(s.lines).findIndex((l) => l.id === doc.lineId) : -1,
  );
  const lineName = useNovelStore((s) => (doc?.lineId ? s.lines[doc.lineId]?.name : undefined));
  const { editId, setEditId } = useBoardUi();
  const resize = useSpanResize(id);
  if (item?.kind !== "event") return null;
  const editing = editId === id;
  const timed = item.place.mode === "timed";

  return (
    <>
      <Ports />
      <div
        data-testid="event-block"
        className={`relative rounded-md px-3 py-2 text-block-label break-keep text-ink ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
        data-line={lineName ?? ""}
        style={{
          width: data.span ? "100%" : EVENT_W,
          background: `var(--color-${item.color})`,
          ...lineBorder(lineIndex < 0 ? undefined : lineIndex),
        }}
        onDoubleClick={() => setEditId(id)}
      >
        {editing && doc ? (
          <TitleInput docId={doc.id} initial={doc.title} onDone={() => setEditId(null)} />
        ) : (
          <p className="line-clamp-2">{doc?.title}</p>
        )}
        {lineName && !editing && (
          <span className="line-badge mt-1 inline-block rounded-full bg-canvas/70 px-2 text-caption text-ink">
            {lineName}
          </span>
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
