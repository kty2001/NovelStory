import { useEffect, useState } from "react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import Toast from "../../components/Toast";
import { useNovelStore } from "../../store/novelStore";
import { useWikiNav } from "./useWikiNav";

// 문서 링크 칩 (ui_guide wiki-link): 분류 색 점 + 대상의 현재 제목.
// 대상이 삭제됐으면 깨진 링크(점선 · 취소선 · 저장된 label), 클릭 시 안내 (UC-33)
export function DocLinkChip({ id, label }: { id: string; label: string }) {
  const doc = useNovelStore((s) => s.docs[id]);
  const color = useNovelStore((s) => (doc ? s.categories[doc.categoryId]?.color : undefined));
  const { openDoc } = useWikiNav();
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(false), 2000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <>
      <button
        type="button"
        data-testid="wiki-link"
        data-broken={doc ? undefined : ""}
        className={`wiki-link inline-flex items-center gap-1 rounded-xs pr-0.5 pl-1 align-baseline ${doc ? "bg-surface-card text-ink hover:bg-surface-strong" : "border border-dashed border-muted-soft text-muted line-through"}`}
        onClick={() => (doc ? openDoc(id) : setNotice(true))}
      >
        {doc && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: `var(--color-${color ?? "muted"})` }}
          />
        )}
        {doc?.title ?? label}
      </button>
      {notice && <Toast>삭제된 문서라 열 수 없어요</Toast>}
    </>
  );
}

// 본문 `@` 링크 노드 뷰
export default function MentionChip({ node }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="span">
      <DocLinkChip id={node.attrs.id as string} label={node.attrs.label as string} />
    </NodeViewWrapper>
  );
}
