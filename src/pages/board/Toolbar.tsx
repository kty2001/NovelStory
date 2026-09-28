import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Panel } from "@xyflow/react";
import {
  Frame,
  Hand,
  Magnet,
  MousePointer2,
  RectangleHorizontal,
  Spline,
  StickyNote,
  Type,
  UserRound,
} from "lucide-react";
import { isPlaceTool, type StateType, type Tool } from "./tools";

const STATE_LABEL: Record<StateType, string> = { appear: "등장", change: "변화", exit: "퇴장" };

type ToolDef = { tool: Tool; label: string; key: string; icon: ReactNode };
const GROUPS: ToolDef[][] = [
  [
    { tool: "select", label: "선택", key: "V", icon: <MousePointer2 size={18} /> },
    { tool: "hand", label: "손", key: "H", icon: <Hand size={18} /> },
  ],
  [
    { tool: "event", label: "사건", key: "E", icon: <RectangleHorizontal size={18} /> },
    { tool: "state", label: "캐릭터 상태", key: "C", icon: <UserRound size={18} /> },
    { tool: "sticky", label: "포스트잇", key: "S", icon: <StickyNote size={18} /> },
    { tool: "text", label: "텍스트", key: "T", icon: <Type size={18} /> },
    { tool: "frame", label: "프레임", key: "F", icon: <Frame size={18} /> },
    { tool: "line", label: "연결선", key: "L", icon: <Spline size={18} /> },
  ],
];

const Sep = () => <span className="mx-1 h-6 w-px bg-hairline" />;

// 상단 중앙 도구 모음 (ui_guide `board-toolbar`). 배치 도구는 클릭 = 도구 선택, 끌기 = 캔버스에 배치
export default function Toolbar({
  tool,
  stateType,
  enabled,
  snap,
  onTool,
  onDragStart,
  onSnap,
  children,
}: {
  tool: Tool;
  stateType: StateType;
  enabled: ReadonlySet<Tool>;
  snap: boolean;
  onTool: (tool: Tool) => void;
  onDragStart: (tool: Tool, e: ReactPointerEvent) => void;
  onSnap: () => void;
  children?: ReactNode;
}) {
  return (
    <Panel
      position="top-center"
      className="flex items-center gap-0.5 rounded-lg border border-hairline bg-canvas p-1 shadow-float"
    >
      {GROUPS.map((group, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 && <Sep />}
          {group.map((d) => {
            const label = d.tool === "state" ? `${d.label}: ${STATE_LABEL[stateType]}` : d.label;
            const on = tool === d.tool;
            return (
              <button
                key={d.tool}
                type="button"
                aria-label={label}
                aria-pressed={on}
                title={enabled.has(d.tool) ? `${label} (${d.key})` : `${d.label} (준비 중)`}
                disabled={!enabled.has(d.tool)}
                className={`flex size-10 touch-none items-center justify-center rounded-md disabled:opacity-30 ${on ? "bg-primary text-on-primary" : "text-ink hover:bg-surface-card"}`}
                onClick={() => onTool(d.tool)}
                onPointerDown={(e) => {
                  if (e.button === 0 && isPlaceTool(d.tool)) onDragStart(d.tool, e);
                }}
              >
                {d.icon}
              </button>
            );
          })}
        </div>
      ))}
      <Sep />
      {children}
      <button
        type="button"
        aria-pressed={snap}
        title="눈금 스냅 (Alt 누른 채 끌면 일시 해제)"
        className={`flex h-10 items-center gap-1.5 rounded-md px-3 text-button ${snap ? "bg-surface-card text-ink" : "text-muted hover:bg-surface-card"}`}
        onClick={onSnap}
      >
        <Magnet size={16} />
        스냅
      </button>
    </Panel>
  );
}
