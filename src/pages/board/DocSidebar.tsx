import { useState } from "react";
import { Check, GripVertical, Search, X } from "lucide-react";
import { useNovelStore } from "../../store/novelStore";
import { usedDocIds } from "../wiki/categories";
import { DOC_MIME } from "./DocPanel";
import { categoryFamily, searchDocs } from "./stateCalc";

const GROUPS = [
  { system: "character", label: "캐릭터" },
  { system: "event", label: "사건" },
] as const;

// 보드 문서 목록 (보드 좌측, 사전 패널과 동시 표시 가능): 캐릭터 · 사건 문서를 끌어 놓아 배치
// (사전 패널 끌기와 같은 처리), 클릭 = 사전 패널에서 열기
export default function DocSidebar({
  onOpen,
  onClose,
}: {
  onOpen: (docId: string) => void;
  onClose: () => void;
}) {
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const items = useNovelStore((s) => s.items);
  const [query, setQuery] = useState("");
  const [unplaced, setUnplaced] = useState(false);
  const used = usedDocIds(items);

  return (
    <aside
      aria-label="문서 목록"
      className="flex w-60 shrink-0 flex-col border-r border-hairline bg-canvas"
    >
      <div className="flex items-center gap-1 border-b border-hairline px-3 py-2">
        <span className="text-body-sm font-semibold text-ink">문서 목록</span>
        <button
          type="button"
          aria-label="문서 목록 닫기"
          className="ml-auto flex size-7 items-center justify-center rounded-sm text-muted hover:bg-surface-card"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-2 border-b border-hairline p-3">
        <div className="relative">
          <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="문서 목록 검색"
            placeholder="제목 · 별칭"
            value={query}
            className="w-full rounded-sm border border-hairline bg-canvas py-1.5 pr-2 pl-8 text-body-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-caption text-body">
          <input
            type="checkbox"
            checked={unplaced}
            onChange={(e) => setUnplaced(e.target.checked)}
          />
          보드에 없는 문서만
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {GROUPS.map(({ system, label }) => {
          const family = categoryFamily(categories, system);
          const list = searchDocs(
            Object.values(docs).filter(
              (d) => family.has(d.categoryId) && !(unplaced && used.has(d.id)),
            ),
            query,
          ).sort((a, b) => a.title.localeCompare(b.title, "ko"));
          return (
            <section key={system} aria-label={label} className="mb-3">
              <h3 className="px-2 py-1 text-caption font-semibold text-muted">
                {label} · {list.length}
              </h3>
              <ul>
                {list.map((d) => (
                  <li
                    key={d.id}
                    draggable
                    data-testid="sidebar-doc"
                    title="보드에 끌어 놓아 배치 · 클릭 = 사전 패널"
                    className="group flex cursor-grab items-center rounded-sm hover:bg-surface-card"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DOC_MIME, d.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <GripVertical size={14} className="shrink-0 text-muted-soft" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-body-sm text-ink"
                      onClick={() => onOpen(d.id)}
                    >
                      {d.title || "제목 없음"}
                    </button>
                    {used.has(d.id) && (
                      <Check
                        size={14}
                        aria-label="보드에 있음"
                        className="mr-2 shrink-0 text-muted"
                      />
                    )}
                  </li>
                ))}
              </ul>
              {list.length === 0 && <p className="px-2 text-caption text-muted-soft">없음</p>}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
