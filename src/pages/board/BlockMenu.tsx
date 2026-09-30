import { useCallback, useRef, useState, type ReactNode } from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import {
  ChevronDown,
  Circle,
  Diamond,
  ListOrdered,
  NotebookPen,
  PanelRight,
  Square,
  Trash2,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { MenuList, type MenuItem } from "../../components/Menu";
import { useDismiss } from "../../components/useDismiss";
import type { BoardItem, ColorToken, ShapeKind } from "../../db/types";
import { deleteItems, patchItems, setDocsLine, sortedLines } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { lineBorder } from "./lines";
import { SHAPE_CYCLE, SHAPE_LABEL } from "./tools";

// 블록 메뉴 색: 사건 = 브랜드 색 중 잉크 글자가 읽히는 것, 포스트잇 = 포스트잇 색 (ui_guide)
const EVENT_COLORS: { token: ColorToken; label: string }[] = [
  { token: "brand-peach", label: "피치" },
  { token: "brand-pink", label: "핑크" },
  { token: "brand-coral", label: "코랄" },
  { token: "brand-ochre", label: "오커" },
  { token: "brand-mint", label: "민트" },
  { token: "brand-lavender", label: "라벤더" },
];
const STICKY_COLORS: { token: ColorToken; label: string }[] = [
  { token: "sticky-yellow", label: "노랑" },
  { token: "sticky-pink", label: "분홍" },
  { token: "sticky-mint", label: "민트" },
  { token: "sticky-lavender", label: "보라" },
  { token: "sticky-peach", label: "살구" },
];

const SHAPE_ICON: Record<ShapeKind, ReactNode> = {
  rect: <Square size={15} />,
  ellipse: <Circle size={15} />,
  diamond: <Diamond size={15} />,
};

const Sample = ({ index, color }: { index?: number; color?: ColorToken }) => (
  <span className="h-3 w-5 rounded-xs bg-surface-card" style={lineBorder(index, color)} />
);

const Sep = () => <span className="mx-1 h-5 w-px bg-hairline" />;

// 도형 채움 없음 = ""
const colorOf = (i: BoardItem | undefined) =>
  i?.kind === "event" || i?.kind === "sticky"
    ? i.color
    : i?.kind === "shape"
      ? (i.color ?? "")
      : "";

// 블록 메뉴 (B-2): 선택한 요소 위에 뜨는 바. 여러 개 선택이면 공통 항목만 한꺼번에 적용
// 사건 = 색 · 라인, 포스트잇 = 색 · 메모로(F5), 도형 = 채움(없음 · 포스트잇 색) · 모양,
// 사건 · 상태 하나 = 상세(사전 패널), 공통 = 삭제
export default function BlockMenu({
  itemIds,
  onEditLines,
  onDetail,
  onToMemo,
}: {
  itemIds: string[];
  onEditLines: () => void;
  onDetail: (docId: string) => void;
  onToMemo: () => void;
}) {
  const items = useNovelStore(useShallow((s) => itemIds.map((id) => s.items[id] as BoardItem)));
  const docs = useNovelStore((s) => s.docs);
  const lines = sortedLines(useNovelStore((s) => s.lines));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(ref, open, close);

  const kind = new Set(items.map((i) => i?.kind)).size === 1 ? items[0]?.kind : undefined;
  const colors =
    kind === "event" ? EVENT_COLORS : kind === "sticky" || kind === "shape" ? STICKY_COLORS : [];
  const shapes = new Set(items.map((i) => (i?.kind === "shape" ? i.shape : undefined)));
  const shape = shapes.size === 1 ? [...shapes][0] : undefined;
  const color = new Set(items.map(colorOf)).size === 1 ? colorOf(items[0]) : undefined;

  const docIds = items.flatMap((i) => (i?.kind === "event" ? [i.docId] : []));
  const lineIds = new Set(docIds.map((id) => docs[id]?.lineId));
  const common = lineIds.size === 1 ? [...lineIds][0] : null; // null = 섞임
  const current = lines.find((l) => l.id === common);
  const lineLabel = common === null ? "라인: 여러 개" : `라인: ${current?.name ?? "미지정"}`;

  const lineMenu: MenuItem[] = [
    ...lines.map((l, i) => ({
      label: l.name,
      icon: <Sample index={i} color={l.color} />,
      onSelect: () => setDocsLine(docIds, l.id),
    })),
    { label: "미지정", icon: <Sample />, onSelect: () => setDocsLine(docIds, undefined) },
    { label: "라인 편집…", icon: <ListOrdered size={14} />, onSelect: onEditLines },
  ];

  return (
    <NodeToolbar nodeId={itemIds} isVisible position={Position.Top} offset={12}>
      <div
        role="toolbar"
        aria-label="블록 메뉴"
        className="flex items-center gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-float"
      >
        {kind === "shape" && (
          <button
            type="button"
            aria-label="채움: 없음"
            aria-pressed={color === ""}
            className={`size-6 rounded-full border border-ink/30 bg-[linear-gradient(135deg,transparent_45%,var(--color-brand-coral)_45%,var(--color-brand-coral)_55%,transparent_55%)] ${color === "" ? "ring-2 ring-ink ring-offset-1" : ""}`}
            onClick={() => patchItems(itemIds, { color: undefined })}
          />
        )}
        {colors.map((c) => (
          <button
            key={c.token}
            type="button"
            aria-label={`${kind === "shape" ? "채움" : "색"}: ${c.label}`}
            aria-pressed={color === c.token}
            className={`size-6 rounded-full ${color === c.token ? "ring-2 ring-ink ring-offset-1" : ""}`}
            style={{ background: `var(--color-${c.token})` }}
            onClick={() => patchItems(itemIds, { color: c.token })}
          />
        ))}
        {kind === "event" && (
          <>
            <Sep />
            <div ref={ref} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex h-7 items-center gap-1 rounded-sm px-2 text-button whitespace-nowrap text-ink hover:bg-surface-card"
                onClick={() => setOpen((o) => !o)}
              >
                {lineLabel}
                <ChevronDown size={14} />
              </button>
              {open && (
                <MenuList
                  items={lineMenu}
                  onClose={close}
                  className="absolute top-full left-0 mt-1"
                />
              )}
            </div>
          </>
        )}
        {kind === "shape" && (
          <>
            <Sep />
            {SHAPE_CYCLE.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={`모양: ${SHAPE_LABEL[k]}`}
                aria-pressed={shape === k}
                className={`flex size-7 items-center justify-center rounded-sm text-ink ${shape === k ? "bg-surface-card" : "hover:bg-surface-card"}`}
                onClick={() => patchItems(itemIds, { shape: k })}
              >
                {SHAPE_ICON[k]}
              </button>
            ))}
          </>
        )}
        {colors.length > 0 && <Sep />}
        {kind === "sticky" && (
          <button
            type="button"
            title="메모 탭으로 옮기기"
            className="flex h-7 items-center gap-1 rounded-sm px-2 text-button whitespace-nowrap text-ink hover:bg-surface-card"
            onClick={onToMemo}
          >
            <NotebookPen size={15} />
            메모로
          </button>
        )}
        {items.length === 1 && items[0] && "docId" in items[0] && (
          <button
            type="button"
            title="상세 (Enter)"
            className="flex h-7 items-center gap-1 rounded-sm px-2 text-button text-ink hover:bg-surface-card"
            onClick={() => onDetail((items[0] as { docId: string }).docId)}
          >
            <PanelRight size={15} />
            상세
          </button>
        )}
        <button
          type="button"
          aria-label="삭제"
          title="삭제 (Delete)"
          className="flex size-7 items-center justify-center rounded-sm text-ink hover:bg-surface-card"
          onClick={() => deleteItems(itemIds)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </NodeToolbar>
  );
}
