import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../components/Button";
import { useDismiss } from "../components/useDismiss";
import { exportNovel } from "../db/novelExport";
import { flushSave, useNovelStore } from "../store/novelStore";
import StorageFullDialog from "./StorageFullDialog";

const SAVE_LABEL = { saving: "저장 중", saved: "저장됨" } as const;

// 상단 바 저장 상태 (UC-40 · 42). 실패면 버튼 → 다시 시도 · 내보내기 팝오버, 공간 부족이면 L-5 대화상자
export default function SaveStatus({ onExport }: { onExport: () => Promise<unknown> }) {
  const save = useNovelStore((s) => s.save);
  const novelId = useNovelStore((s) => s.novelId);
  const [popover, setPopover] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setPopover(false), []);
  const failed = save === "error" || save === "full";
  // 다시 시도 중(saving)에는 그대로, 저장되면 숨김 (다음 편집으로 저장된 경우 포함)
  const showPopover = popover && save !== "saved";
  useDismiss(ref, showPopover, close);

  const retry = async () => {
    await flushSave();
    if (useNovelStore.getState().save === "saved") {
      setPopover(false);
      setFullOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative ml-auto">
      {failed ? (
        <button
          type="button"
          aria-haspopup="dialog"
          className="flex items-center gap-1 text-caption text-error hover:underline"
          onClick={() => (save === "full" ? setFullOpen(true) : setPopover((v) => !v))}
        >
          <AlertTriangle size={14} />
          저장 실패 · 다시 시도
        </button>
      ) : (
        <span className="text-caption text-muted">{SAVE_LABEL[save]}</span>
      )}
      {showPopover && (
        <div
          role="dialog"
          aria-label="저장하지 못했습니다"
          className="absolute top-full right-0 z-40 mt-2 w-80 rounded-md border border-hairline bg-canvas p-4 shadow-float"
        >
          <p className="text-body-sm font-semibold text-ink">저장하지 못했습니다</p>
          <p className="mt-1 mb-3 text-caption text-muted">
            최근 변경이 아직 이 브라우저에 저장되지 않았어요. 다시 시도하거나 JSON으로 내보내
            두세요.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => void retry()}>
              다시 시도
            </Button>
            <Button size="sm" onClick={() => void onExport()}>
              JSON 내보내기
            </Button>
          </div>
        </div>
      )}
      <StorageFullDialog
        open={fullOpen && save !== "saved"}
        onClose={() => setFullOpen(false)}
        onExport={(id) => void (id === novelId ? onExport() : exportNovel(id))}
        onExportCurrent={() => void onExport()}
        onRetry={() => void retry()}
      />
    </div>
  );
}
