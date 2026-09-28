import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import {
  addLine,
  deleteLine,
  renameLine,
  reorderLines,
  sortedLines,
} from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { lineBorder } from "./lines";

// 라인 편집 (B-6): 이름 바로 수정 · ⋮⋮ 끌어서 순서 변경(테두리 모양이 순서를 따름) · 추가 · 삭제
export default function LineEditDialog({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: (lineId: string) => void;
}) {
  const lines = sortedLines(useNovelStore((s) => s.lines));
  const docs = useNovelStore((s) => s.docs);
  const items = useNovelStore((s) => s.items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // 라인별 사건 수 (보드 블록이 없는 사건 문서도 포함)
  const eventDocIds = new Set(
    Object.values(items).flatMap((i) => (i.kind === "event" ? [i.docId] : [])),
  );
  const used = (lineId: string) =>
    Object.values(docs).filter((d) => d.lineId === lineId && eventDocIds.has(d.id)).length;

  const remove = (lineId: string) => {
    deleteLine(lineId);
    onDeleted(lineId);
    setConfirmId(null);
  };

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = lines.map((l) => l.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    reorderLines(ids);
    setDragId(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="스토리 라인 편집"
      footer={
        <Button variant="primary" onClick={onClose}>
          완료
        </Button>
      }
    >
      <ul className="flex flex-col gap-1">
        {lines.map((l, i) => {
          const n = used(l.id);
          return (
            <li
              key={l.id}
              data-testid="line-row"
              className={`rounded-md ${dragId === l.id ? "opacity-40" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(l.id)}
            >
              <div className="flex items-center gap-2 py-1">
                <span
                  draggable
                  aria-label={`${l.name} 순서 변경`}
                  className="cursor-grab text-muted"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(l.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                >
                  <GripVertical size={16} />
                </span>
                <span
                  className="h-3 w-5 shrink-0 rounded-xs bg-surface-card"
                  style={lineBorder(i)}
                />
                <input
                  key={l.name}
                  aria-label={`라인 ${i + 1} 이름`}
                  defaultValue={l.name}
                  className="min-w-0 flex-1 rounded-sm border border-hairline bg-canvas px-2 py-1 text-body-sm text-ink focus:border-ink focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  onBlur={(e) => {
                    const name = e.currentTarget.value.trim();
                    if (name && name !== l.name) renameLine(l.id, name);
                    else e.currentTarget.value = l.name;
                  }}
                />
                <span className="w-12 text-right text-caption text-muted tabular-nums">
                  사건 {n}
                </span>
                <button
                  type="button"
                  aria-label={`${l.name} 삭제`}
                  className="flex size-8 items-center justify-center rounded-sm text-muted hover:bg-surface-card"
                  onClick={() => (n > 0 ? setConfirmId(l.id) : remove(l.id))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {confirmId === l.id && (
                <div
                  role="alert"
                  className="mb-1 flex items-center gap-2 rounded-sm bg-surface-card px-3 py-2 text-body-sm"
                >
                  <span className="flex-1">사건 {n}개가 미지정이 됩니다</span>
                  <Button size="sm" onClick={() => setConfirmId(null)}>
                    취소
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(l.id)}>
                    삭제
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {lines.length === 0 && (
        <p className="py-2 text-body-sm text-muted">라인이 없으면 배지 · 테두리 없이 표시돼요.</p>
      )}
      <button
        type="button"
        className="mt-2 flex items-center gap-1 text-button text-ink"
        onClick={() => addLine("새 라인")}
      >
        <Plus size={16} />
        라인 추가
      </button>
      <p className="mt-3 text-caption text-muted">
        4번째 라인부터는 실선 테두리 + 배지로 구분돼요. 라인 색 지정은 추후 지원.
      </p>
    </Dialog>
  );
}
