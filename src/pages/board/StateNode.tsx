import type { NodeProps } from "@xyflow/react";
import type { StateItem } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { changeText } from "../wiki/boardLinks";
import { useBoardUi } from "./boardContext";
import { STATE_W } from "./flow";
import Ports from "./Ports";
import { afterExit } from "./stateCalc";
import { STATE_LABEL, STATE_LOOK } from "./tools";

// 캐릭터 상태 블록: 기호 + 캐릭터 이름 + 유형, 아래 줄에 속성 변경 요약(없으면 메모)
export default function StateNode({ id, selected }: NodeProps) {
  const item = useNovelStore((s) => s.items[id]) as StateItem | undefined;
  const name = useNovelStore((s) => (item ? s.docs[item.docId]?.title : undefined));
  const warn = useNovelStore((s) => (item?.kind === "state" ? afterExit(item, s.items) : false));
  const { setEditId } = useBoardUi();
  if (item?.kind !== "state") return null;
  const look = STATE_LOOK[item.stateType];
  const summary = item.changes.length
    ? changeText(item.changes[0]) +
      (item.changes.length > 1 ? ` 외 ${item.changes.length - 1}` : "")
    : item.note;

  return (
    <>
      <Ports />
      <div
        data-testid="state-block"
        data-type={item.stateType}
        className={`rounded-sm border border-ink/20 px-2.5 py-1.5 break-keep ${selected ? "outline-2 outline-offset-2 outline-brand-teal" : ""}`}
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
    </>
  );
}
