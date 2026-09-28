import { useCallback, useRef, useState } from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import { ChevronDown, ListOrdered } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { MenuList, type MenuItem } from "../../components/Menu";
import { useDismiss } from "../../components/useDismiss";
import type { ColorToken, EventItem } from "../../db/types";
import { patchItems, setDocsLine, sortedLines } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { lineBorder } from "./lines";

// 블록 메뉴 색 (ui_guide 브랜드 색 중 잉크 글자가 읽히는 것)
const COLORS: { token: ColorToken; label: string }[] = [
  { token: "brand-peach", label: "피치" },
  { token: "brand-pink", label: "핑크" },
  { token: "brand-coral", label: "코랄" },
  { token: "brand-ochre", label: "오커" },
  { token: "brand-mint", label: "민트" },
  { token: "brand-lavender", label: "라벤더" },
];

const Sample = ({ index }: { index?: number }) => (
  <span className="h-3 w-5 rounded-xs bg-surface-card" style={lineBorder(index)} />
);

// 블록 메뉴 (B-2): 선택한 사건 블록 위에 뜨는 바. 여러 개 선택이면 공통 항목(색 · 라인)을 한꺼번에 적용
export default function BlockMenu({
  itemIds,
  onEditLines,
}: {
  itemIds: string[];
  onEditLines: () => void;
}) {
  const items = useNovelStore(useShallow((s) => itemIds.map((id) => s.items[id] as EventItem)));
  const docs = useNovelStore((s) => s.docs);
  const lines = sortedLines(useNovelStore((s) => s.lines));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(ref, open, close);

  const docIds = items.map((i) => i.docId);
  const lineIds = new Set(docIds.map((id) => docs[id]?.lineId));
  const common = lineIds.size === 1 ? [...lineIds][0] : null; // null = 섞임
  const current = lines.find((l) => l.id === common);
  const lineLabel = common === null ? "라인: 여러 개" : `라인: ${current?.name ?? "미지정"}`;
  const color = new Set(items.map((i) => i.color)).size === 1 ? items[0]?.color : undefined;

  const lineMenu: MenuItem[] = [
    ...lines.map((l, i) => ({
      label: l.name,
      icon: <Sample index={i} />,
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
        {COLORS.map((c) => (
          <button
            key={c.token}
            type="button"
            aria-label={`색: ${c.label}`}
            aria-pressed={color === c.token}
            className={`size-6 rounded-full ${color === c.token ? "ring-2 ring-ink ring-offset-1" : ""}`}
            style={{ background: `var(--color-${c.token})` }}
            onClick={() => patchItems(itemIds, { color: c.token })}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-hairline" />
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
            <MenuList items={lineMenu} onClose={close} className="absolute top-full left-0 mt-1" />
          )}
        </div>
      </div>
    </NodeToolbar>
  );
}
