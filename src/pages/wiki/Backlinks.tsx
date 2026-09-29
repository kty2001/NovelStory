import EmptyState from "../../components/EmptyState";
import { mentionContext } from "../../db/wikiDerived";
import { useNovelStore } from "../../store/novelStore";
import { useWikiNav } from "./useWikiNav";

// 역링크 "이 문서를 언급한 문서" (UC-33, W-1 ⑨): 분류 · 제목 · 언급 문맥
export default function Backlinks({ docId, title }: { docId: string; title: string }) {
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const { openDoc } = useWikiNav();
  const list = Object.values(docs)
    .filter((d) => d.id !== docId && d.mentions.includes(docId))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));

  return (
    <section aria-label="역링크" className="mt-12 border-t border-hairline pt-6">
      <h3 className="flex items-center gap-2 text-title-sm text-ink">
        이 문서를 언급한 문서
        <span className="text-caption text-muted">{list.length}</span>
      </h3>
      {list.length === 0 && (
        <EmptyState title="이 문서를 언급한 문서가 없어요">
          다른 문서 본문에서 @로 이 문서를 링크하면 여기에 모여요
        </EmptyState>
      )}
      <ul className="mt-2">
        {list.map((d) => {
          const category = categories[d.categoryId];
          const ctx = mentionContext(d.body, docId);
          return (
            <li key={d.id}>
              <button
                type="button"
                data-testid="backlink"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-body-sm hover:bg-surface-soft"
                onClick={() => openDoc(d.id)}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `var(--color-${category?.color ?? "muted"})` }}
                />
                <b className="shrink-0 font-semibold text-ink">{d.title}</b>
                <span className="shrink-0 text-caption text-muted">{category?.name}</span>
                {ctx && (
                  <span className="min-w-0 truncate text-muted">
                    {ctx.before}
                    <mark className="rounded-xs bg-surface-strong text-ink">{title}</mark>
                    {ctx.after}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
