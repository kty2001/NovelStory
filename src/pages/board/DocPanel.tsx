import { ExternalLink, GripVertical, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useNovelStore } from "../../store/novelStore";
import { familyOf } from "../wiki/categories";
import DocView from "../wiki/DocView";
import { OpenDocContext } from "../wiki/useWikiNav";

// 문서 → 보드 끌기 데이터 형식 (UC-22)
export const DOC_MIME = "application/x-whitenoard-doc";

// 보드 우측 사전 패널 (B-2 ④ · ⑥, UC-22): 문서 편집은 사전 화면과 같음(블록에 바로 반영),
// 머리 손잡이로 문서를 보드에 끌어 배치(사건 · 캐릭터), 패널 안 링크는 패널 안에서 전환
export default function DocPanel({
  docId,
  onOpen,
  onClose,
}: {
  docId: string;
  onOpen: (docId: string) => void;
  onClose: () => void;
}) {
  const doc = useNovelStore((s) => s.docs[docId]);
  const family = useNovelStore((s) => (doc ? familyOf(s.categories, doc.categoryId) : undefined));
  const { novelId } = useParams();
  const navigate = useNavigate();
  if (!doc) return null;
  const droppable = family === "event" || family === "character";

  return (
    <aside
      aria-label="사전 패널"
      data-doc-panel
      className="flex w-100 shrink-0 flex-col border-l border-hairline bg-canvas"
    >
      <div className="flex items-center gap-1 border-b border-hairline px-3 py-2">
        <span
          draggable={droppable}
          aria-label="보드로 끌기"
          aria-disabled={!droppable}
          title={droppable ? "보드에 끌어 놓아 배치" : "사건 · 캐릭터 문서만 보드에 놓을 수 있어요"}
          className={`flex items-center gap-1 rounded-sm px-2 py-1 text-caption ${droppable ? "cursor-grab text-ink hover:bg-surface-card" : "text-muted-soft"}`}
          onDragStart={(e) => {
            e.dataTransfer.setData(DOC_MIME, doc.id);
            e.dataTransfer.effectAllowed = "copy";
          }}
        >
          <GripVertical size={14} />
          보드로 끌기
        </span>
        <button
          type="button"
          className="ml-auto flex items-center gap-1 rounded-sm px-2 py-1 text-caption text-ink hover:bg-surface-card"
          onClick={() => navigate(`/novel/${novelId}/wiki/${doc.id}`)}
        >
          <ExternalLink size={14} />
          사전에서 열기
        </button>
        <button
          type="button"
          aria-label="패널 닫기"
          className="flex size-7 items-center justify-center rounded-sm text-muted hover:bg-surface-card"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <OpenDocContext.Provider value={onOpen}>
          <DocView key={doc.id} doc={doc} onDeleted={onClose} />
        </OpenDocContext.Provider>
      </div>
    </aside>
  );
}
