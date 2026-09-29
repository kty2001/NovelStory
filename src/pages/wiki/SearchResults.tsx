import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { particle } from "../../lib/particle";
import { useNovelStore } from "../../store/novelStore";
import { addDoc } from "../../store/wikiActions";
import { searchWiki, type Hit } from "./search";
import { useWikiNav } from "./useWikiNav";

const Mark = ({ hit }: { hit: Hit }) => (
  <>
    {hit.before}
    <mark className="rounded-xs bg-surface-strong px-0.5 text-ink">{hit.match}</mark>
    {hit.after}
  </>
);

// 검색 결과 (W-4): 분류별 결과 수 탭 + 제목 · 분류 · 일치 위치 · 강조 문맥. 클릭 = 문서 열기
// 결과 0건 (W-7): 검색어로 새 문서(선택 분류) · 검색 지우기
export default function SearchResults({
  query,
  categoryId,
  onClear,
}: {
  query: string;
  categoryId?: string;
  onClear: () => void;
}) {
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const { openDoc } = useWikiNav();
  const [tab, setTab] = useState<string | null>(null);
  const hits = searchWiki(docs, query);

  const counts = new Map<string, number>();
  for (const h of hits) counts.set(h.doc.categoryId, (counts.get(h.doc.categoryId) ?? 0) + 1);
  const current = tab && counts.has(tab) ? tab : null;
  const shown = current ? hits.filter((h) => h.doc.categoryId === current) : hits;

  const tabClass = (on: boolean) =>
    `rounded-full px-3 py-1 text-button ${on ? "bg-surface-card text-ink" : "text-muted"}`;

  return (
    <section aria-label="검색 결과">
      <h2 className="flex items-center gap-3 text-title-lg text-ink">
        '{query.trim()}' 검색 결과
        <span className="text-body-sm text-muted">{hits.length}</span>
      </h2>
      {counts.size > 0 && (
        <div role="tablist" className="mt-4 flex flex-wrap gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={!current}
            className={tabClass(!current)}
            onClick={() => setTab(null)}
          >
            전체 {hits.length}
          </button>
          {[...counts].map(([id, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={current === id}
              className={tabClass(current === id)}
              onClick={() => setTab(id)}
            >
              {categories[id]?.name} {n}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-4 border-t border-hairline">
        {shown.map((h) => {
          const category = categories[h.doc.categoryId];
          return (
            <li key={h.doc.id} className="border-b border-hairline">
              <button
                type="button"
                data-testid="search-hit"
                className="flex w-full flex-col items-start gap-0.5 px-2 py-3 text-left hover:bg-surface-soft"
                onClick={() => {
                  onClear();
                  openDoc(h.doc.id);
                }}
              >
                <span className="flex items-center gap-2 text-body-sm">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: `var(--color-${category?.color ?? "muted"})` }}
                  />
                  <b className="font-semibold text-ink">
                    {h.where === "title" ? <Mark hit={h} /> : h.doc.title}
                  </b>
                  <span className="text-caption text-muted">
                    {category?.name} ·{" "}
                    {h.where === "title" ? (
                      "제목"
                    ) : h.where === "alias" ? (
                      <>
                        별칭 "<Mark hit={h} />"
                      </>
                    ) : (
                      "본문"
                    )}
                  </span>
                </span>
                {h.where === "body" && (
                  <span className="text-body-sm text-muted">
                    <Mark hit={h} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {hits.length === 0 && (
        <EmptyState
          boxed
          title={`'${query.trim()}'${particle(query, "과", "와")} 일치하는 문서가 없어요`}
          actions={
            <>
              {categoryId && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const id = addDoc(categoryId, query.trim());
                    if (id) openDoc(id);
                  }}
                >
                  <Plus size={16} />'{query.trim()}' 문서 만들기
                </Button>
              )}
              <Button variant="text" onClick={onClear}>
                검색 지우기
              </Button>
            </>
          }
        >
          제목 · 별칭 · 본문에서 찾았어요
        </EmptyState>
      )}
    </section>
  );
}
