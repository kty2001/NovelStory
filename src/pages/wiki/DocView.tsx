import { useState } from "react";
import { FolderInput, MoreHorizontal, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import Menu from "../../components/Menu";
import type { WikiDoc } from "../../db/types";
import { renameDoc, setDocsLine, sortedLines } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { deleteDoc, moveDoc, updateDoc } from "../../store/wikiActions";
import BodyEditor from "./BodyEditor";
import { blockCount, categoryPath, familyOf, flatCategories, usedDocIds } from "./categories";
import ChipInput from "./ChipInput";
import DocImage from "./DocImage";
import PropsTable from "./PropsTable";
import { useWikiNav } from "./useWikiNav";

// 분류 이동: 트리 순서 목록. 보드에 쓰인 문서는 다른 계열 분류 비활성 (data_model 5장)
function MoveDocDialog({ doc, onClose }: { doc: WikiDoc; onClose: () => void }) {
  const categories = useNovelStore((s) => s.categories);
  const used = usedDocIds(useNovelStore((s) => s.items)).has(doc.id);
  const family = familyOf(categories, doc.categoryId);
  return (
    <Dialog open onClose={onClose} title="분류 이동">
      {used && (
        <p className="mb-2 text-caption text-muted">
          보드에 쓰인 문서라 같은 계열 분류로만 옮길 수 있어요.
        </p>
      )}
      <ul className="max-h-80 overflow-y-auto">
        {flatCategories(categories).map(({ category: c, depth }) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={c.id === doc.categoryId || (used && familyOf(categories, c.id) !== family)}
              className="flex w-full items-center gap-2 rounded-sm py-2 pr-2 text-left text-body-sm text-ink hover:bg-surface-card disabled:text-muted-soft disabled:hover:bg-transparent"
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => {
                moveDoc(doc.id, c.id);
                onClose();
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--color-${c.color})` }}
              />
              {c.name}
              {c.id === doc.categoryId && <span className="text-caption">현재</span>}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

// 사전 문서 편집 (W-1 · W-2, UC-31): 제목 · 별칭 · 태그 · 라인(사건) · 속성 + 대표 이미지 · 본문
export default function DocView({ doc }: { doc: WikiDoc }) {
  const categories = useNovelStore((s) => s.categories);
  const lines = useNovelStore((s) => s.lines);
  const items = useNovelStore((s) => s.items);
  const { openCategory } = useWikiNav();
  const [dialog, setDialog] = useState<"move" | "delete" | null>(null);

  const path = categoryPath(categories, doc.categoryId);
  const category = path.at(-1);
  const blocks = blockCount(items, doc.id);

  return (
    <article aria-label={`${doc.title} 문서`}>
      <div className="flex items-center gap-2 text-body-sm text-muted">
        <span
          className="size-2 rounded-full"
          style={{ background: `var(--color-${category?.color})` }}
        />
        {path.map((c) => c.name).join(" › ")}
        <span className="ml-auto" />
        <Menu
          label="문서 메뉴"
          trigger={<MoreHorizontal size={18} />}
          items={[
            {
              label: "분류 이동",
              icon: <FolderInput size={14} />,
              onSelect: () => setDialog("move"),
            },
            {
              label: "삭제",
              icon: <Trash2 size={14} />,
              danger: true,
              disabled: blocks > 0,
              hint: blocks ? `보드 블록 ${blocks}개 — 보드에서 먼저 삭제` : undefined,
              onSelect: () => setDialog("delete"),
            },
          ]}
        />
      </div>

      <input
        key={doc.title}
        aria-label="제목"
        defaultValue={doc.title}
        className="mt-2 w-full rounded-sm text-display text-ink focus:bg-surface-soft focus:outline-none"
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Escape") e.currentTarget.value = doc.title;
          if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
        }}
        // 비우면 이전 제목 유지 (보드 블록 제목과 같은 규칙)
        onBlur={(e) => {
          const title = e.currentTarget.value.trim();
          if (title && title !== doc.title) renameDoc(doc.id, title);
          else e.currentTarget.value = doc.title;
        }}
      />

      <div className="mt-3 flex flex-col gap-2">
        <ChipInput
          label="별칭"
          values={doc.aliases}
          onChange={(aliases) => updateDoc(doc.id, { aliases })}
        />
        <ChipInput
          label="태그"
          values={doc.tags}
          onChange={(tags) => updateDoc(doc.id, { tags })}
        />
        {familyOf(categories, doc.categoryId) === "event" && (
          <label className="flex items-center gap-1.5">
            <span className="w-12 shrink-0 text-caption text-muted">라인</span>
            <select
              aria-label="스토리 라인"
              value={doc.lineId ?? ""}
              className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-body-sm text-ink"
              onChange={(e) => setDocsLine([doc.id], e.target.value || undefined)}
            >
              <option value="">미지정</option>
              {sortedLines(lines).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6 flex items-start gap-8">
        <div className="min-w-0 flex-1">
          <PropsTable props={doc.props} onChange={(props) => updateDoc(doc.id, { props })} />
        </div>
        <DocImage doc={doc} />
      </div>

      <div className="mt-8">
        <BodyEditor docId={doc.id} initial={doc.body} />
      </div>

      {dialog === "move" && <MoveDocDialog doc={doc} onClose={() => setDialog(null)} />}
      <Dialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`'${doc.title}' 문서를 삭제할까요?`}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>취소</Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteDoc(doc.id);
                openCategory(doc.categoryId);
              }}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-body-sm">대표 이미지도 함께 삭제돼요.</p>
      </Dialog>
    </article>
  );
}
