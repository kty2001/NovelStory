import { useCallback, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { useDismiss } from "../../components/useDismiss";
import { useNovelStore } from "../../store/novelStore";
import { filterRows, NO_FILTERS, type FilterRow, type Filters } from "./filters";
import { lineBorder } from "./lines";

type ListKey = keyof Filters;

// 필터 메뉴 (B-5): 스토리 라인(미지정 포함) · 캐릭터 · 태그 · 분류별 표시 · 숨김 + 블록 수, 라인 편집.
// 숨긴 항목이 있으면 눌린 상태 + 개수
export default function FilterMenu({
  filters,
  onChange,
  onEditLines,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onEditLines: () => void;
}) {
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const lines = useNovelStore((s) => s.lines);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(ref, open, close);

  const { lineRows, charRows, tagRows, catRows } = filterRows(items, docs, categories, lines);
  const groups: { list: ListKey; title: string; empty: string; rows: FilterRow[] }[] = [
    { list: "hiddenLineIds", title: "스토리 라인", empty: "", rows: lineRows },
    { list: "hiddenDocIds", title: "캐릭터", empty: "캐릭터 없음", rows: charRows },
    { list: "hiddenTags", title: "태그", empty: "태그 없음", rows: tagRows },
    { list: "hiddenCategoryIds", title: "분류", empty: "분류 없음", rows: catRows },
  ];
  // 지금 목록에 있는 숨김 항목만 셈 (삭제된 문서 · 사라진 태그의 남은 값 제외)
  const hiddenCount = groups.reduce((n, g) => {
    const hidden = new Set(filters[g.list]);
    return n + g.rows.filter((r) => hidden.has(r.key)).length;
  }, 0);
  const toggle = (list: ListKey, key: string) => {
    const cur = filters[list];
    onChange({ [list]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-pressed={hiddenCount > 0}
        title="필터"
        className={`flex h-10 items-center gap-1.5 rounded-md px-3 text-button ${hiddenCount > 0 ? "bg-surface-card text-ink" : "text-muted hover:bg-surface-card"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Filter size={16} />
        {/* 좁은 캔버스에선 아이콘만 (Toolbar 글자와 같은 기준) */}
        <span className="@max-3xl:sr-only">필터</span>
        {hiddenCount > 0 && (
          <span
            data-testid="filter-count"
            className="rounded-full bg-primary px-1.5 text-caption text-on-primary tabular-nums"
          >
            {hiddenCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="필터"
          className="absolute top-full right-0 z-20 mt-2 flex max-h-[70vh] w-64 flex-col rounded-md border border-hairline bg-canvas p-3 shadow-float"
        >
          <div className="-mx-1 min-h-0 overflow-y-auto px-1">
            {groups.map((g, gi) => {
              const hidden = new Set(filters[g.list]);
              return (
                <section
                  key={g.list}
                  aria-label={g.title}
                  className={gi > 0 ? "mt-2 border-t border-hairline pt-2" : ""}
                >
                  <p className="mb-2 text-caption text-muted">{g.title}</p>
                  {g.rows.length === 0 ? (
                    <p className="px-1 py-1 text-body-sm text-muted">{g.empty}</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {g.rows.map((r) => (
                        <li key={r.key}>
                          <label className="flex items-center gap-2 rounded-xs px-1 py-1 text-body-sm text-ink hover:bg-surface-card">
                            <input
                              type="checkbox"
                              checked={!hidden.has(r.key)}
                              onChange={() => toggle(g.list, r.key)}
                            />
                            {g.list === "hiddenLineIds" ? (
                              <span
                                className="h-3 w-5 rounded-xs bg-surface-card"
                                style={lineBorder(r.index, r.color)}
                              />
                            ) : (
                              r.color && (
                                <span
                                  className="size-2 shrink-0 rounded-full"
                                  style={{ background: `var(--color-${r.color})` }}
                                />
                              )
                            )}
                            <span className="flex-1 truncate">{r.name}</span>
                            <span className="text-caption text-muted tabular-nums">{r.count}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-hairline pt-2">
            <button
              type="button"
              className="text-button text-ink"
              onClick={() => {
                close();
                onEditLines();
              }}
            >
              라인 편집…
            </button>
            <button
              type="button"
              className="text-button text-muted"
              onClick={() => onChange(NO_FILTERS)}
            >
              모두 표시
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
