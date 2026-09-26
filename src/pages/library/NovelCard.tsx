import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import BlobImage from "../../components/BlobImage";
import Menu from "../../components/Menu";
import { db } from "../../db/db";
import type { Novel } from "../../db/types";
import { relativeTime } from "../../lib/relativeTime";

type Props = {
  novel: Novel;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
};

// novel-card: 표지 3:4 · 제목 · 장르 배지 · 최근 수정일 · ⋯ 메뉴 (L-1)
export default function NovelCard({
  novel,
  onOpen,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: Props) {
  const cover = useLiveQuery(
    () => (novel.coverImageId ? db.images.get(novel.coverImageId) : undefined),
    [novel.coverImageId],
  );

  return (
    <article className="rounded-lg bg-surface-card p-3">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="block aspect-[3/4] w-full overflow-hidden rounded-md bg-surface-strong"
        onClick={onOpen}
      >
        {cover ? (
          <BlobImage blob={cover.blob} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center p-4 font-serif text-title-md text-ink">
            {novel.title}
          </span>
        )}
      </button>
      <div className="mt-3 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="line-clamp-2 text-left text-title-sm text-ink"
            onClick={onOpen}
          >
            {novel.title}
          </button>
          <div className="mt-1 flex items-center gap-2">
            {novel.genre && (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-caption text-body">
                {novel.genre}
              </span>
            )}
            <span className="text-caption text-muted">{relativeTime(novel.updatedAt)}</span>
          </div>
        </div>
        <Menu
          label={`${novel.title} 메뉴`}
          trigger={<MoreHorizontal size={18} />}
          items={[
            { label: "정보 수정", icon: <Pencil size={14} />, onSelect: onEdit },
            { label: "복제", icon: <Copy size={14} />, onSelect: onDuplicate },
            { label: "JSON 내보내기", icon: <Download size={14} />, onSelect: onExport },
            { label: "삭제", icon: <Trash2 size={14} />, onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </article>
  );
}
