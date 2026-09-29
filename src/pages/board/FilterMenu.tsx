import { useCallback, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { useDismiss } from "../../components/useDismiss";
import { sortedLines } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import { lineBorder, NO_LINE } from "./lines";

// 필터 메뉴 (B-5): 스토리 라인별 표시 · 숨김 (미지정 포함), 사건 수, 라인 편집. 숨긴 항목이 있으면 눌린 상태 + 개수
export default function FilterMenu({
  hiddenLineIds,
  onChange,
  onEditLines,
}: {
  hiddenLineIds: string[];
  onChange: (hiddenLineIds: string[]) => void;
  onEditLines: () => void;
}) {
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const lines = sortedLines(useNovelStore((s) => s.lines));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(ref, open, close);

  // 라인별 사건 수
  const counts = new Map<string, number>();
  for (const item of Object.values(items)) {
    if (item.kind !== "event") continue;
    const key = docs[item.docId]?.lineId ?? NO_LINE;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [
    ...lines.map((l, i) => ({ key: l.id, name: l.name, index: i as number | undefined })),
    { key: NO_LINE, name: "미지정", index: undefined },
  ];
  const hidden = new Set(hiddenLineIds);
  const toggle = (key: string) =>
    onChange(hidden.has(key) ? hiddenLineIds.filter((k) => k !== key) : [...hiddenLineIds, key]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-pressed={hidden.size > 0}
        title="필터"
        className={`flex h-10 items-center gap-1.5 rounded-md px-3 text-button ${hidden.size > 0 ? "bg-surface-card text-ink" : "text-muted hover:bg-surface-card"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Filter size={16} />
        {/* 좁은 캔버스에선 아이콘만 (Toolbar 글자와 같은 기준) */}
        <span className="@max-3xl:sr-only">필터</span>
        {hidden.size > 0 && (
          <span
            data-testid="filter-count"
            className="rounded-full bg-primary px-1.5 text-caption text-on-primary tabular-nums"
          >
            {hidden.size}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="필터"
          className="absolute top-full right-0 z-20 mt-2 w-64 rounded-md border border-hairline bg-canvas p-3 shadow-float"
        >
          <p className="mb-2 text-caption text-muted">스토리 라인</p>
          <ul className="flex flex-col gap-1">
            {rows.map((r) => (
              <li key={r.key}>
                <label className="flex items-center gap-2 rounded-xs px-1 py-1 text-body-sm text-ink hover:bg-surface-card">
                  <input
                    type="checkbox"
                    checked={!hidden.has(r.key)}
                    onChange={() => toggle(r.key)}
                  />
                  <span
                    className="h-3 w-5 rounded-xs bg-surface-card"
                    style={lineBorder(r.index)}
                  />
                  <span className="flex-1">{r.name}</span>
                  <span className="text-caption text-muted tabular-nums">
                    {counts.get(r.key) ?? 0}
                  </span>
                </label>
              </li>
            ))}
          </ul>
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
            <button type="button" className="text-button text-muted" onClick={() => onChange([])}>
              모두 표시
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
