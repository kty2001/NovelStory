import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../../components/Button";
import { useNovelStore } from "../../store/novelStore";
import { addDoc } from "../../store/wikiActions";
import { subtreeDocs } from "./categories";
import CategorySettings from "./CategorySettings";
import { useWikiNav } from "./useWikiNav";

const TABS = { list: "문서 목록", settings: "설정" } as const;

// 분류 화면: 머리(색 · 이름 · 문서 수 · 새 문서) + 탭(문서 목록(하위 분류 포함) · 설정)
export default function CategoryView({ categoryId }: { categoryId: string }) {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const { openDoc } = useWikiNav();
  const [tab, setTab] = useState<keyof typeof TABS>("list");
  const category = categories[categoryId];
  if (!category) return null;
  const list = subtreeDocs(categories, docs, categoryId).sort((a, b) =>
    a.title.localeCompare(b.title, "ko"),
  );

  return (
    <section aria-label={`${category.name} 분류`}>
      <div className="flex items-center gap-3">
        <span
          className="size-3 rounded-full"
          style={{ background: `var(--color-${category.color})` }}
        />
        <h2 className="text-title-lg text-ink">{category.name}</h2>
        <span className="text-body-sm text-muted">문서 {list.length}</span>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          onClick={() => {
            const id = addDoc(categoryId);
            if (id) openDoc(id);
          }}
        >
          <Plus size={14} />새 문서
        </Button>
      </div>
      <div role="tablist" className="mt-4 flex gap-1">
        {Object.entries(TABS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`rounded-full px-4 py-1.5 text-button ${tab === key ? "bg-surface-card text-ink" : "text-muted"}`}
            onClick={() => setTab(key as keyof typeof TABS)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "settings" ? (
        <div className="mt-6">
          <CategorySettings category={category} />
        </div>
      ) : (
        <>
          <ul className="mt-6 border-t border-hairline">
            {list.map((d) => (
              <li key={d.id} className="border-b border-hairline">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-surface-soft"
                  onClick={() => openDoc(d.id)}
                >
                  <span className="text-body-md text-ink">{d.title || "제목 없음"}</span>
                  {d.categoryId !== categoryId && (
                    <span className="text-caption text-muted">
                      {categories[d.categoryId]?.name}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className="mt-4 text-body-sm text-muted">문서 없음</p>}
        </>
      )}
    </section>
  );
}
