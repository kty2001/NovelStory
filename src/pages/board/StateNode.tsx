import type { NodeProps } from "@xyflow/react";
import type { PropChange, StateItem } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { useBoardUi } from "./boardContext";
import { STATE_W } from "./flow";
import { afterExit } from "./stateCalc";
import { STATE_LABEL } from "./tools";

// 유형별 색 · 기호 (ui_guide `state-block`: 등장 mint / 변화 lavender / 퇴장 teal 진한 채움)
const LOOK: Record<StateItem["stateType"], { mark: string; bg: string; fg: string }> = {
  appear: { mark: "▲", bg: "var(--color-brand-mint)", fg: "var(--color-ink)" },
  change: { mark: "◆", bg: "var(--color-brand-lavender)", fg: "var(--color-ink)" },
  exit: { mark: "▼", bg: "var(--color-brand-teal)", fg: "var(--color-on-primary)" },
};

const changeText = (c: PropChange) =>
  c.from ? `${c.key}: ${c.from} → ${c.to}` : `${c.key}: ${c.to}`;

// 캐릭터 상태 블록: 기호 + 캐릭터 이름 + 유형, 아래 줄에 속성 변경 요약(없으면 메모)
export default function StateNode({ id, selected }: NodeProps) {
  const item = useNovelStore((s) => s.items[id]) as StateItem | undefined;
  const name = useNovelStore((s) => (item ? s.docs[item.docId]?.title : undefined));
  const warn = useNovelStore((s) => (item?.kind === "state" ? afterExit(item, s.items) : false));
  const { setEditId } = useBoardUi();
  if (item?.kind !== "state") return null;
  const look = LOOK[item.stateType];
  const summary = item.changes.length
    ? changeText(item.changes[0]) +
      (item.changes.length > 1 ? ` 외 ${item.changes.length - 1}` : "")
    : item.note;

  return (
    <div
      data-testid="state-block"
      data-type={item.stateType}
      className={`rounded-sm px-2.5 py-1.5 break-keep ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
      style={{ width: STATE_W, background: look.bg, color: look.fg }}
      onDoubleClick={() => setEditId(id)}
    >
      <p className="flex items-center gap-1 text-block-label">
        <span aria-hidden>{look.mark}</span>
        <span className="truncate">{name ?? "캐릭터"}</span>
        <span className="text-caption opacity-80">{STATE_LABEL[item.stateType]}</span>
        {warn && (
          <span
            title="퇴장 이후 블록 (부활 · 재등장이면 무시)"
            aria-label="퇴장 이후"
            className="ml-auto"
          >
            ⚠
          </span>
        )}
      </p>
      {summary && <p className="state-detail truncate text-caption opacity-90">{summary}</p>}
    </div>
  );
}
