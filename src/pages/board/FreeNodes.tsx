import { useRef } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import type { FrameItem, ShapeItem, ShapeKind, StickyItem, TextItem } from "../../db/types";
import { updateItems } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { useBoardUi } from "./boardContext";
import Ports from "./Ports";
import { useFocusWhenVisible } from "./useFocusWhenVisible";

const isComposing = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229;

// 인라인 편집 (C6): 편집 중 드래그 = 글자 선택, 휠 = 텍스트 스크롤. Esc · 바깥 클릭 = 종료, 내용 유지. 편집 1회 = 1건
function InlineText({
  initial,
  label,
  className,
  multiline = true,
  onDone,
}: {
  initial: string;
  label: string;
  className: string;
  multiline?: boolean;
  onDone: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const done = useRef(false);
  useFocusWhenVisible(ref);
  const finish = (value: string) => {
    if (done.current) return;
    done.current = true;
    onDone(value);
  };
  const common = {
    ref,
    "aria-label": label,
    defaultValue: initial,
    className: `nodrag nopan nowheel bg-transparent outline-none ${className}`,
    onBlur: (e: React.FocusEvent<HTMLTextAreaElement & HTMLInputElement>) =>
      finish(e.currentTarget.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement & HTMLInputElement>) => {
      if (isComposing(e)) return;
      if (e.key === "Escape" || (!multiline && e.key === "Enter")) finish(e.currentTarget.value);
    },
  };
  return multiline ? <textarea {...common} /> : <input {...common} />;
}

function Resizer({ id, visible, min }: { id: string; visible: boolean; min: [number, number] }) {
  const { resized } = useBoardUi();
  return (
    <NodeResizer
      isVisible={visible}
      minWidth={min[0]}
      minHeight={min[1]}
      color="var(--color-brand-teal)"
      onResizeEnd={(_, p) => resized(id, p)}
    />
  );
}

// 포스트잇 (ui_guide `sticky-note`): 포스트잇 색 · 약한 그림자 · body-sm. 크기는 노드 width · height
export function StickyNode({ id, selected }: NodeProps) {
  const item = useNovelStore((s) => s.items[id]) as StickyItem | undefined;
  const { editId, setEditId } = useBoardUi();
  if (item?.kind !== "sticky") return null;
  const editing = editId === id;
  return (
    <>
      <Resizer id={id} visible={selected && !editing} min={[80, 80]} />
      <Ports />
      <div
        data-testid="sticky"
        className={`h-full w-full rounded-xs border border-ink/20 p-3 text-body-sm break-keep text-ink shadow-sticky ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
        style={{ background: `var(--color-${item.color})` }}
        onDoubleClick={() => setEditId(id)}
      >
        {editing ? (
          <InlineText
            label="포스트잇 내용"
            initial={item.text}
            className="h-full w-full resize-none"
            onDone={(text) => {
              updateItems({ [id]: { text } });
              setEditId(null);
            }}
          />
        ) : (
          <p className="sticky-text h-full overflow-hidden whitespace-pre-wrap">{item.text}</p>
        )}
      </div>
    </>
  );
}

// 자유 텍스트 (ui_guide `board-text`): 배경 없음 · title-md
export function TextNode({ id, selected }: NodeProps) {
  const item = useNovelStore((s) => s.items[id]) as TextItem | undefined;
  const { editId, setEditId } = useBoardUi();
  if (item?.kind !== "text") return null;
  const editing = editId === id;
  return (
    <>
      <Ports />
      <div
        data-testid="board-text"
        className={`min-h-8 w-full rounded-xs border border-ink/20 px-2 py-1 text-title-md break-keep text-ink ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
        onDoubleClick={() => setEditId(id)}
      >
        {editing ? (
          <InlineText
            label="텍스트 내용"
            initial={item.text}
            className="field-sizing-content min-h-8 w-full resize-none"
            onDone={(text) => {
              updateItems({ [id]: { text } });
              setEditId(null);
            }}
          />
        ) : (
          <p className={`whitespace-pre-wrap ${item.text ? "" : "text-muted-soft"}`}>
            {item.text || "텍스트"}
          </p>
        )}
      </div>
    </>
  );
}

// 도형 윤곽 (ui_guide `board-shape`): 노드 크기(px) 그대로 그려 선 굵기 일정. 배치 미리보기에서도 사용
export function ShapeOutline({
  shape,
  w,
  h,
  stroke = 2,
  fill = "none",
  dashed = false,
}: {
  shape: ShapeKind;
  w: number;
  h: number;
  stroke?: number;
  fill?: string;
  dashed?: boolean;
}) {
  const i = stroke / 2;
  const paint = {
    fill,
    stroke: "var(--color-ink)",
    strokeWidth: stroke,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashed ? `${stroke * 4} ${stroke * 3}` : undefined,
  };
  return (
    <svg className="absolute inset-0 overflow-visible" width={w} height={h} aria-hidden>
      {shape === "rect" && <rect x={i} y={i} width={w - stroke} height={h - stroke} {...paint} />}
      {shape === "ellipse" && (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - i} ry={h / 2 - i} {...paint} />
      )}
      {shape === "diamond" && (
        <polygon
          points={`${w / 2},${i} ${w - i},${h / 2} ${w / 2},${h - i} ${i},${h / 2}`}
          {...paint}
        />
      )}
    </svg>
  );
}

// 글자 영역: 도형 안쪽 (원 = 내접 사각형 ≈ 70%, 마름모 = 50%)
const SHAPE_PAD: Record<ShapeKind, string> = {
  rect: "p-2",
  ellipse: "px-[15%] py-[15%]",
  diamond: "px-[25%] py-[25%]",
};

// 도형: 사각형 · 원 · 마름모 + 가운데 글자. 크기는 노드 width · height (크기 조절 중에도 따라감)
export function ShapeNode({ id, selected, width, height }: NodeProps) {
  const item = useNovelStore((s) => s.items[id]) as ShapeItem | undefined;
  const { editId, setEditId } = useBoardUi();
  if (item?.kind !== "shape") return null;
  const editing = editId === id;
  const w = width ?? item.w;
  const h = height ?? item.h;
  return (
    <>
      <Resizer id={id} visible={selected && !editing} min={[40, 40]} />
      <Ports />
      <div
        data-testid="shape"
        data-shape={item.shape}
        className={`relative flex h-full w-full items-center justify-center text-body-sm break-keep text-ink ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
        onDoubleClick={() => setEditId(id)}
      >
        <ShapeOutline
          shape={item.shape}
          w={w}
          h={h}
          fill={item.color ? `var(--color-${item.color})` : "none"}
        />
        <div
          className={`relative flex h-full w-full items-center justify-center text-center ${SHAPE_PAD[item.shape]}`}
        >
          {editing ? (
            <InlineText
              label="도형 글자"
              initial={item.text}
              className="field-sizing-content max-h-full w-full resize-none text-center"
              onDone={(text) => {
                updateItems({ [id]: { text } });
                setEditId(null);
              }}
            />
          ) : (
            <p className="max-h-full overflow-hidden whitespace-pre-wrap">{item.text}</p>
          )}
        </div>
      </div>
    </>
  );
}

// 프레임 (ui_guide `frame`): 점선 영역 + 좌상단 바깥 제목. 제목 더블클릭 = 편집
export function FrameNode({ id, selected }: NodeProps) {
  const item = useNovelStore((s) => s.items[id]) as FrameItem | undefined;
  const { editId, setEditId } = useBoardUi();
  if (item?.kind !== "frame") return null;
  const editing = editId === id;
  return (
    <>
      <Resizer id={id} visible={selected && !editing} min={[160, 120]} />
      <div
        data-testid="frame"
        className={`h-full w-full rounded-lg border-[1.5px] border-dashed ${selected ? "border-brand-teal" : "border-muted"}`}
      >
        <div
          className="absolute -top-8 left-0 max-w-full text-title-sm whitespace-nowrap text-ink"
          onDoubleClick={() => setEditId(id)}
        >
          {editing ? (
            <InlineText
              label="프레임 제목"
              initial={item.title}
              multiline={false}
              className="w-48 border-b border-ink"
              onDone={(value) => {
                const title = value.trim();
                if (title) updateItems({ [id]: { title } });
                setEditId(null);
              }}
            />
          ) : (
            <span data-testid="frame-title">{item.title}</span>
          )}
        </div>
      </div>
    </>
  );
}
